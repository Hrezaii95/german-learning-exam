import { describe, expect, it } from "vitest";
import { parseLearnerEvent, type BrowserLikeKeyValueStore, type LearnerEvent } from "@german-learning/learning";
import projection from "../../apps/web/generated/learner-projection.json";
import { buildActivityPracticePlan } from "../../apps/web/components/activities/activity-content.js";
import { getEnrichedActivity } from "../../apps/web/lib/content/enrichment-client.js";
import type { LearnerActivity } from "../../apps/web/lib/content/types.js";
import {
  buildActivityReviewQueue,
  createLearnerStateController,
  persistentConceptForActivityTarget,
} from "../../apps/web/lib/learner-state/index.js";

const NOW = new Date("2026-10-05T10:00:00.000Z");
const ACTIVITY = "activity:lesson-01-greetings-by-context";

class MemoryStore implements BrowserLikeKeyValueStore {
  value: string | null = null;
  getItem(): string | null { return this.value; }
  setItem(_key: string, value: string): void { this.value = value; }
  removeItem(): void { this.value = null; }
}

function attempt(index: number, patch: Record<string, unknown> = {}): LearnerEvent {
  return parseLearnerEvent({
    schemaVersion: "1.0.0", kind: "objectiveAttempt",
    eventId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    sessionId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    timestamp: new Date(NOW.getTime() + index * 1000).toISOString(),
    conceptId: "lex:guten-morgen", activityId: ACTIVITY, sourceActivityMode: "see",
    measuredDimensions: ["recognition"], taskFamily: "multipleChoice",
    graderOutcome: "incorrect", latencyMs: 2500, hintsUsed: 0, ...patch,
  });
}

describe("published lesson activity evidence", () => {
  it("does not silently discard a published question's actual assessed target", () => {
    for (const projected of projection.activities) {
      const activity = projected as LearnerActivity;
      const plan = buildActivityPracticePlan(activity, getEnrichedActivity(activity.id));
      for (const question of plan.questions) {
        if (question.targetId === null) continue;
        expect(persistentConceptForActivityTarget(activity.id, question.targetId), question.id)
          .toBe(question.targetId);
      }
    }
  });

  it("accepts actual L1/L2 targets and rejects unrelated or invented concepts", () => {
    expect(persistentConceptForActivityTarget(ACTIVITY, "lex:guten-morgen")).toBe("lex:guten-morgen");
    expect(persistentConceptForActivityTarget("activity:lesson-01-checkpoint-summary", "qa:wellbeing-casual")).toBe("qa:wellbeing-casual");
    expect(persistentConceptForActivityTarget("activity:lesson-02-core-professions", "lex:lehrerin")).toBe("lex:lehrerin");
    expect(persistentConceptForActivityTarget(ACTIVITY, "lex:architekt")).toBeNull();
    expect(persistentConceptForActivityTarget(ACTIVITY, "lex:invented")).toBeNull();
    expect(persistentConceptForActivityTarget("activity:invented", "lex:guten-morgen")).toBeNull();
    expect(persistentConceptForActivityTarget("activity:lesson-01-alphabet-listen-spell", null)).toBeNull();
  });

  it("keeps a first-lesson mistake after reload and offers its original activity without mastery", async () => {
    const store = new MemoryStore();
    const controller = createLearnerStateController({ store, now: () => NOW });
    await controller.initialize();
    await controller.appendEvent(attempt(1));
    const reloaded = createLearnerStateController({ store, now: () => NOW });
    const snapshot = await reloaded.initialize();
    expect(snapshot.status).toBe("ready");
    const hydration = snapshot.hydration!;
    expect(hydration.state.events).toHaveLength(1);
    expect(hydration.state.reviewCards).toHaveLength(0);
    const review = buildActivityReviewQueue({ state: hydration.state });
    expect(review).toHaveLength(1);
    expect(review[0]).toMatchObject({
      activityId: ACTIVITY, conceptId: "lex:guten-morgen", lessonId: "lesson:01",
      taskFamily: "multipleChoice", assistedRetry: false,
    });
    const retryUrl = new URL(review[0]!.href, "https://lingovo.invalid");
    expect(retryUrl.pathname).toMatch(/^\/lessons\/01\/activity\/id-[a-f0-9]+$/);
    expect(retryUrl.searchParams.get("reviewTarget")).toBe("lex:guten-morgen");
    expect(retryUrl.searchParams.get("reviewFamily")).toBe("multipleChoice");
    expect(retryUrl.hash).toBe("#activity-practice-heading");
    const mastery = hydration.masteryByConcept.get("lex:guten-morgen")!;
    expect(mastery.dimensions.recognition).toMatchObject({ failures: 1, successes: 0, strongEvidenceCount: 0 });
    expect(["strong", "mastered"]).not.toContain(mastery.status);
    expect(mastery.pronunciationAccuracy).toBeNull();
  });

  it("retains a hinted correction until an unaided retry, preserving all attempt history", async () => {
    const controller = createLearnerStateController({ store: new MemoryStore(), now: () => NOW });
    await controller.initialize();
    await controller.appendEvent(attempt(1));
    await controller.appendEvent(attempt(2, { graderOutcome: "correct", hintsUsed: 1 }));
    let state = controller.getSnapshot().hydration!.state;
    expect(buildActivityReviewQueue({ state })).toHaveLength(1);
    expect(buildActivityReviewQueue({ state })[0]!.assistedRetry).toBe(true);
    // Recognition elsewhere cannot erase the originating task's difficulty.
    await controller.appendEvent(attempt(3, {
      activityId: "activity:lesson-01-greeting-farewell-match", graderOutcome: "correct",
    }));
    expect(buildActivityReviewQueue({ state: controller.getSnapshot().hydration!.state })).toHaveLength(1);
    await controller.appendEvent(attempt(4, { graderOutcome: "correct" }));
    state = controller.getSnapshot().hydration!.state;
    expect(buildActivityReviewQueue({ state })).toHaveLength(0);
    expect(state.events).toHaveLength(4);
    expect(state.reviewCards).toHaveLength(0);
  });

  it("does not turn completed exposure into assessed evidence", async () => {
    const controller = createLearnerStateController({ store: new MemoryStore(), now: () => NOW });
    await controller.initialize();
    await controller.completeActivity({ lessonId: "lesson:01", stageId: "learn", activityId: ACTIVITY }, null);
    const hydration = controller.getSnapshot().hydration!;
    expect(hydration.state.activityProgress).toHaveLength(1);
    expect(hydration.state.events).toHaveLength(0);
    expect(hydration.masteryByConcept.size).toBe(0);
    expect(buildActivityReviewQueue({ state: hydration.state })).toHaveLength(0);
  });

  it("preserves legacy review cards and keeps them out of the lesson retry queue", async () => {
    const store = new MemoryStore();
    const controller = createLearnerStateController({ store, now: () => NOW });
    await controller.initialize();
    await controller.addReviewCardsForConcept("lex:architekt");
    await controller.appendEvent(attempt(1, {
      conceptId: "lex:architekt", activityId: "activity:lesson-02-core-professions", sourceActivityMode: "review",
    }));
    const oldCards = controller.getSnapshot().hydration!.state.reviewCards;
    const reloaded = createLearnerStateController({ store, now: () => NOW });
    const snapshot = await reloaded.initialize();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.hydration!.state.reviewCards).toEqual(oldCards);
    expect(buildActivityReviewQueue({ state: snapshot.hydration!.state })).toHaveLength(0);
  });
});
