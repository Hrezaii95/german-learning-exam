import { describe, expect, it } from "vitest";
import {
  LEARNER_EVENT_SCHEMA_VERSION,
  parseLearnerEvent,
  type BrowserLikeKeyValueStore,
  type LearnerEvent,
} from "@german-learning/learning";
import { conversationActivityId } from "../../apps/web/lib/conversation/conversation-content.js";
import { CONVERSATION_LEVEL_IDS } from "../../apps/web/lib/conversation/level-ids.js";
import { practiceActivityId } from "../../apps/web/lib/games/game-prompts.js";
import {
  ALPHA_CONTENT_BUNDLE,
  REVIEW_GAME_IDS,
  REVIEW_TEMPLATE_IDS,
  REVIEW_TEMPLATES,
  assertExactLearnerStateRegistry,
  buildDailyReviewMission,
  buildReviewCandidates,
  createLearnerStateController,
  learnerPublishedContentResolver,
  learnerStateRegistrySnapshot,
  normalizeConversationEventForPersistence,
  normalizePracticeEventForPersistence,
  reviewTemplateForGame,
  stableCardIdForTemplate,
  type ReviewGameId,
} from "../../apps/web/lib/learner-state/index.js";

const SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NOW = new Date("2026-08-13T10:00:00.000Z");

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function syntheticPracticeEvent(gameId: ReviewGameId, eventId = uuid(1)): LearnerEvent {
  const template = reviewTemplateForGame(gameId)!;
  if (gameId === "flashcards") {
    return parseLearnerEvent({
      schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
      kind: "selfRatedAttempt",
      eventId,
      sessionId: SESSION_ID,
      timestamp: NOW.toISOString(),
      conceptId: template.conceptId,
      activityId: practiceActivityId(gameId),
      sourceActivityMode: "review",
      measuredDimensions: ["recall"],
      taskFamily: "flashcard",
      rating: "good",
      latencyMs: 1200,
      hintsUsed: 0,
    });
  }
  const taskFamily = gameId === "picture-word-match"
    ? "pictureRecognition"
    : gameId === "article-choice"
      ? "multipleChoice"
      : gameId === "word-order"
        ? "sentenceOrder"
        : "formManipulation";
  return parseLearnerEvent({
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "objectiveAttempt",
    eventId,
    sessionId: SESSION_ID,
    timestamp: NOW.toISOString(),
    conceptId: template.conceptId,
    activityId: practiceActivityId(gameId),
    sourceActivityMode: "review",
    measuredDimensions: [template.modality],
    taskFamily,
    graderOutcome: "correct",
    latencyMs: 1500,
    hintsUsed: 0,
  });
}

function syntheticConversationEvent(
  levelId: (typeof CONVERSATION_LEVEL_IDS)[number],
  eventId = uuid(20),
): LearnerEvent {
  const base = {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    eventId,
    sessionId: SESSION_ID,
    timestamp: NOW.toISOString(),
    conceptId: "qa:profession-casual-main",
    activityId: conversationActivityId(levelId),
  };
  if (levelId === "model") {
    return parseLearnerEvent({
      ...base,
      kind: "exposure",
      sourceActivityMode: "use",
      measuredDimensions: ["exposure"],
      exposureKind: "page",
    });
  }
  if (levelId === "spoken-role-play") {
    return parseLearnerEvent({
      ...base,
      kind: "recordingCycle",
      sourceActivityMode: "repeat",
      measuredDimensions: ["production"],
      listenCompleted: false,
      recordCompleted: true,
      playbackCompleted: true,
      selfCheckCompleted: true,
      selfRating: "good",
    });
  }
  const shape = levelId === "guided-recognition"
    ? ["recognition", "multipleChoice"]
    : levelId === "substitution"
      ? ["form", "formManipulation"]
      : ["production", "productionTask"];
  return parseLearnerEvent({
    ...base,
    kind: "objectiveAttempt",
    sourceActivityMode: "use",
    measuredDimensions: [shape[0]],
    taskFamily: shape[1],
    graderOutcome: "correct",
    latencyMs: 2000,
    hintsUsed: 0,
  });
}

class MemoryStore implements BrowserLikeKeyValueStore {
  value: string | null = null;
  writes = 0;
  failNextWrite = false;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("private raw storage failure");
    }
    this.writes += 1;
    this.value = value;
  }

  removeItem(): void {
    this.value = null;
  }
}

describe("P4C exact learner-safe registry", () => {
  it("contains exactly projected lessons/activities/concepts plus seven templates", () => {
    assertExactLearnerStateRegistry();
    const snapshot = learnerStateRegistrySnapshot();
    expect(snapshot.lessonIds).toHaveLength(2);
    expect(snapshot.activityIds).toHaveLength(23);
    expect(snapshot.conceptIds).toHaveLength(141);
    expect(snapshot.templateIds).toEqual([...REVIEW_TEMPLATE_IDS].sort());
    expect(snapshot.allEntityIds).toHaveLength(173);
    expect(REVIEW_TEMPLATES).toHaveLength(7);
    expect(REVIEW_TEMPLATES.filter((row) => row.modality === "listening")).toHaveLength(0);
    expect(REVIEW_TEMPLATES.find((row) => row.id === "template:profession-qa-production"))
      .toMatchObject({ modality: "production", rendererId: "qa-production", gameId: null });
  });

  it("proves kinds and relational ownership without prefix inference", () => {
    expect(learnerPublishedContentResolver.entityKind("lesson:02")).toBe("Lesson");
    expect(learnerPublishedContentResolver.entityKind("lex:architekt")).toBe("Concept");
    expect(learnerPublishedContentResolver.entityKind(REVIEW_TEMPLATE_IDS[0]!)).toBe("Template");
    expect(learnerPublishedContentResolver.entityKind("activity:lesson-02-core-professions"))
      .toBe("LearningActivity");
    expect(learnerPublishedContentResolver.stageOwnsActivity(
      "lesson:02",
      "learn",
      "activity:lesson-02-core-professions",
    )).toBe(true);
    expect(learnerPublishedContentResolver.stageOwnsActivity(
      "lesson:01",
      "learn",
      "activity:lesson-02-core-professions",
    )).toBe(false);
    expect(learnerPublishedContentResolver.isPublished("collection:teacher-professions")).toBe(false);
    expect(learnerPublishedContentResolver.isPublished("activity:lesson-02-teacher-professions-deck"))
      .toBe(false);
    expect(learnerPublishedContentResolver.entityKind("template:anything-else")).toBeNull();
    expect(learnerPublishedContentResolver.entityKind("lex:synthetic")).toBeNull();
  });
});

describe("P4C persistent event normalization", () => {
  it("maps all six enabled games to real activities and rejects audio/shape drift", () => {
    expect(REVIEW_GAME_IDS).toHaveLength(6);
    for (let index = 0; index < REVIEW_GAME_IDS.length; index += 1) {
      const gameId = REVIEW_GAME_IDS[index]!;
      const template = reviewTemplateForGame(gameId)!;
      const normalized = normalizePracticeEventForPersistence({
        gameId,
        event: syntheticPracticeEvent(gameId, uuid(index + 1)),
      });
      expect(normalized.activityId).toBe(template.activityId);
      expect(normalized.cardId).toBeUndefined();
      expect(normalized.sourceActivityMode).toBe("review");
    }

    expect(() => normalizePracticeEventForPersistence({
      gameId: "audio-match",
      event: syntheticPracticeEvent("flashcards"),
    })).toThrow(/registry/i);
    const mismatched = { ...syntheticPracticeEvent("flashcards"), conceptId: "verb:sein" };
    expect(() => normalizePracticeEventForPersistence({
      gameId: "flashcards",
      event: mismatched as LearnerEvent,
    })).toThrow();
  });

  it("maps all five conversation levels and permits only real production review", () => {
    for (let index = 0; index < CONVERSATION_LEVEL_IDS.length; index += 1) {
      const levelId = CONVERSATION_LEVEL_IDS[index]!;
      const normalized = normalizeConversationEventForPersistence({
        levelId,
        event: syntheticConversationEvent(levelId, uuid(index + 30)),
      });
      expect(normalized.activityId).toBe("activity:lesson-02-profession-qa-builder");
      expect(normalized.sourceActivityMode).toBe(levelId === "spoken-role-play" ? "repeat" : "use");
    }

    const productionCard = stableCardIdForTemplate("template:profession-qa-production");
    const mission = normalizeConversationEventForPersistence({
      levelId: "independent-construction",
      event: syntheticConversationEvent("independent-construction", uuid(40)),
      review: {
        cardId: productionCard,
        templateId: "template:profession-qa-production",
      },
    });
    expect(mission.cardId).toBe(productionCard);
    expect(mission.sourceActivityMode).toBe("mission");
    expect(() => normalizeConversationEventForPersistence({
      levelId: "model",
      event: syntheticConversationEvent("model", uuid(41)),
      review: {
        cardId: productionCard,
        templateId: "template:profession-qa-production",
      },
    })).toThrow();
  });
});

describe("P4C atomic learner-state controller and mission construction", () => {
  it("initializes, serializes rapid writes, builds exact cards, and schedules once", async () => {
    const store = new MemoryStore();
    let uuidIndex = 100;
    const controller = createLearnerStateController({
      store,
      now: () => new Date(NOW),
      uuid: () => uuid(uuidIndex++),
    });
    expect(controller.getSnapshot().status).toBe("loading");
    await controller.initialize();
    expect(controller.getSnapshot().status).toBe("ready");
    expect(store.writes).toBe(1);

    await Promise.all([
      controller.addReviewCardsForConcept("lex:architekt"),
      controller.addReviewCardsForConcept("verb:sein"),
      controller.addReviewCardsForConcept("qa:profession-casual-main"),
      controller.toggleTag("lex:architekt", "Difficult"),
      controller.toggleTag("qa:profession-casual-main", "Teacher"),
    ]);
    const state = controller.getSnapshot().hydration!.state;
    expect(state.reviewCards).toHaveLength(7);
    expect(new Set(state.reviewCards.map((card) => card.cardId)).size).toBe(7);
    expect(state.tags).toHaveLength(2);

    const candidates = buildReviewCandidates({
      state,
      masteryByConcept: controller.getSnapshot().hydration!.masteryByConcept,
      now: NOW,
    });
    expect(candidates).toHaveLength(7);
    expect(candidates.find((row) => row.templateId === "template:profession-qa-production"))
      .toMatchObject({ modality: "production", teacherAssignment: true });
    expect(candidates.filter((row) => row.modality === "listening")).toHaveLength(0);

    const missionView = buildDailyReviewMission({
      state,
      masteryByConcept: controller.getSnapshot().hydration!.masteryByConcept,
      now: NOW,
    });
    expect(missionView.candidateCount).toBe(7);
    expect(missionView.newCount).toBe(7);
    expect(missionView.mission.newCardsSelected).toBe(4);
    expect(missionView.availabilityNote).toMatch(/no listening-approved/i);
    const lessonOne = buildDailyReviewMission({
      state,
      masteryByConcept: controller.getSnapshot().hydration!.masteryByConcept,
      now: NOW,
      filters: { lessonId: "lesson:01" },
    });
    expect(lessonOne.candidateCount).toBe(0);
    expect(lessonOne.mission.selected).toHaveLength(0);

    const templateId = "template:architekt-flashcard-recall" as const;
    const cardId = stableCardIdForTemplate(templateId);
    const missionEvent = normalizePracticeEventForPersistence({
      gameId: "flashcards",
      event: syntheticPracticeEvent("flashcards", uuid(60)),
      review: { cardId, templateId },
    });
    await controller.appendMissionEvent(missionEvent);
    expect(controller.getSnapshot().hydration!.state.events).toHaveLength(1);
    expect(controller.getSnapshot().hydration!.state.reviewCards.find((card) => card.cardId === cardId)?.reps)
      .toBe(1);
    const conflictingSynthetic = parseLearnerEvent({
      ...syntheticPracticeEvent("flashcards", uuid(60)),
      rating: "again",
    });
    const conflicting = normalizePracticeEventForPersistence({
      gameId: "flashcards",
      event: conflictingSynthetic,
      review: { cardId, templateId },
    });
    await expect(controller.appendMissionEvent(conflicting)).rejects.toMatchObject({
      code: "CONFLICTING_EVENT_ID",
    });
    expect(controller.getSnapshot().hydration!.state.events).toHaveLength(1);
    expect(controller.getSnapshot().hydration!.state.reviewCards.find((card) => card.cardId === cardId)?.reps)
      .toBe(1);
    await controller.appendMissionEvent(missionEvent);
    expect(controller.getSnapshot().hydration!.state.events).toHaveLength(1);
    expect(controller.getSnapshot().hydration!.state.reviewCards.find((card) => card.cardId === cardId)?.reps)
      .toBe(1);
  });

  it("rebases an in-flight commit onto an external write instead of clobbering it", async () => {
    const store = new MemoryStore();
    const controllerA = createLearnerStateController({ store, now: () => new Date(NOW) });
    const controllerB = createLearnerStateController({ store, now: () => new Date(NOW) });
    await controllerA.initialize();
    await controllerB.initialize();

    // Second-tab write lands after controller A hydrated its (now stale) base
    // and before A's own commit reaches the shared store.
    await controllerB.toggleTag("lex:architekt", "Difficult");
    await controllerA.toggleTag("qa:profession-casual-main", "Teacher");

    const persisted = JSON.parse(store.value!) as {
      tags: readonly { contentId: string; tag: string }[];
    };
    expect(persisted.tags).toHaveLength(2);
    expect(persisted.tags).toEqual(expect.arrayContaining([
      { contentId: "lex:architekt", tag: "Difficult" },
      { contentId: "qa:profession-casual-main", tag: "Teacher" },
    ]));
    expect(controllerA.getSnapshot().hydration!.state.tags).toHaveLength(2);
  });

  it("rolls back failed storage writes and never overwrites corrupt initialization", async () => {
    const store = new MemoryStore();
    const controller = createLearnerStateController({ store, now: () => new Date(NOW) });
    await controller.initialize();
    const prior = controller.getSnapshot().hydration!.state;
    store.failNextWrite = true;
    await expect(controller.toggleTag("lex:architekt", "Favorite")).rejects.toThrow();
    expect(controller.getSnapshot().status).toBe("error");
    expect(controller.getSnapshot().error).toMatchObject({ code: "STORAGE_FAILURE" });
    expect(controller.getSnapshot().error?.message).not.toContain("private raw storage failure");
    expect(controller.getSnapshot().hydration!.state).toBe(prior);
    expect(controller.getSnapshot().hydration!.state.tags).toHaveLength(0);

    const corruptStore = new MemoryStore();
    corruptStore.value = "{not json";
    const corrupt = createLearnerStateController({ store: corruptStore });
    await corrupt.initialize();
    expect(corrupt.getSnapshot()).toMatchObject({ status: "error", recoveryRequired: true });
    expect(corruptStore.writes).toBe(0);
    expect(corruptStore.value).toBe("{not json");
    await corrupt.reset(true);
    expect(corrupt.getSnapshot()).toMatchObject({ status: "ready", recoveryRequired: false });
    expect(corruptStore.writes).toBe(1);
    expect(corruptStore.value).not.toBe("{not json");
  });

  it("persists bounded notes/tags/resume, and exports no reward or audio-byte authority", async () => {
    const store = new MemoryStore();
    const controller = createLearnerStateController({
      store,
      now: () => new Date(NOW),
      uuid: () => uuid(500),
    });
    await controller.initialize();
    await controller.saveNote("lex:architekt", "Remember the article.");
    await controller.toggleTag("lex:architekt", "Favorite");
    await controller.setResume({
      lessonId: "lesson:02",
      stageId: "learn",
      activityId: "activity:lesson-02-core-professions",
      position: 0,
    });
    await controller.addRecording({
      recordingId: uuid(501),
      conceptId: "qa:profession-casual-main",
      activityId: "activity:lesson-02-profession-qa-builder",
      createdAt: NOW.toISOString(),
      mimeType: "audio/webm",
      byteLength: 1200,
      gestureProduced: true,
      pronunciationAccuracy: null,
    });
    const exported = controller.exportJson();
    const parsed = JSON.parse(exported) as Record<string, unknown>;
    expect(exported).not.toMatch(/"(?:xp|streak|badges?|pronunciationScore|audioBytes|rawAudio|blob)"/i);
    expect(parsed.contentBundle).toEqual(ALPHA_CONTENT_BUNDLE);
    expect(parsed.exportMeta).toMatchObject({ includesRawAudioBytes: false });
    await expect(controller.saveNote("lex:architekt", "<script>bad</script>")).rejects.toThrow();
    expect(controller.getSnapshot().hydration!.state.notes[0]?.text).toBe("Remember the article.");
  });
});
