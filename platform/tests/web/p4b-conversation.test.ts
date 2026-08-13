/**
 * P4B — conversation levels, published German pins, events, routes, progress.
 */
import { describe, expect, it } from "vitest";
import {
  parseLearnerEvent,
  type LearnerEvent,
} from "@german-learning/learning";
import {
  CONVERSATION_ANSWER_REALIZATIONS,
  CONVERSATION_LEVEL_IDS,
  CONVERSATION_QUESTION,
  assertExactConversationLevelIds,
  conversationCanonicalPath,
  conversationLevelIdDiff,
  conversationRawColonPath,
  createConversationTimestamp,
  createConversationUuid,
  emitGuidedRecognitionAttempt,
  emitIndependentConstructionAttempt,
  emitModelStudied,
  emitRecordingCycle,
  emitSubstitutionAttempt,
  isExactConversationLevelIdOrder,
  joinConversationTokens,
  publishedSubstitutionFragments,
  tryDecodeConversationEntitySegment,
  advanceAfterComplete,
  canAccessConversationLevel,
  initialConversationProgress,
  listCanonicalConversationPaths,
} from "../../apps/web/lib/conversation/index.js";
import {
  decideLearnerPathRequest,
  listCanonicalConversationRoutePaths,
  resolveLearnerRoute,
} from "../../apps/web/lib/content/routes.js";
import { loadLearnerDetailProjection } from "../../apps/web/lib/content/access.js";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";
import { isSafeNavigationPath } from "../../apps/web/lib/content/navigation-context.js";
import { QA_PROFESSION_CASUAL_CANONICAL } from "../../apps/web/lib/content/detail-canonical-contract.js";

describe("P4B exact five-level order", () => {
  it("pins exact IDs in order and fails closed on drift", () => {
    expect([...CONVERSATION_LEVEL_IDS]).toEqual([
      "model",
      "guided-recognition",
      "substitution",
      "independent-construction",
      "spoken-role-play",
    ]);
    expect(isExactConversationLevelIdOrder(CONVERSATION_LEVEL_IDS)).toBe(true);
    assertExactConversationLevelIds([...CONVERSATION_LEVEL_IDS]);

    expect(() =>
      assertExactConversationLevelIds([
        "model",
        "guided-recognition",
        "independent-construction",
        "substitution",
        "spoken-role-play",
      ]),
    ).toThrow(/order/i);

    expect(() =>
      assertExactConversationLevelIds([
        "model",
        "guided-recognition",
        "substitution",
        "independent-construction",
        "spoken-role-play",
        "extra",
      ]),
    ).toThrow();

    const diff = conversationLevelIdDiff([
      "model",
      "guided-recognition",
      "telepathy",
    ]);
    expect(diff.missing).toContain("substitution");
    expect(diff.unknown).toContain("telepathy");
  });
});

describe("P4B published German pins", () => {
  it("uses only P3D informal Q&A realizations", () => {
    expect(CONVERSATION_QUESTION).toBe(
      QA_PROFESSION_CASUAL_CANONICAL.questionRealization,
    );
    expect([...CONVERSATION_ANSWER_REALIZATIONS]).toEqual([
      ...QA_PROFESSION_CASUAL_CANONICAL.answerRealizations,
    ]);
    expect(CONVERSATION_ANSWER_REALIZATIONS).toHaveLength(3);
    const fragments = publishedSubstitutionFragments();
    for (const token of fragments) {
      expect(
        CONVERSATION_ANSWER_REALIZATIONS.some((a) => a.split(/\s+/).includes(token)),
      ).toBe(true);
    }
    for (const bad of [
      "Ich bin Architekt.",
      "Architekten",
      "Was sind Sie von Beruf?",
    ]) {
      expect(CONVERSATION_ANSWER_REALIZATIONS.join("\n")).not.toContain(bad);
    }
  });
});

describe("P4B parseLearnerEvent emissions", () => {
  const sessionId = createConversationUuid();
  const ts = createConversationTimestamp(new Date("2026-08-13T10:00:00.000Z"));

  it("model emits exposure", () => {
    const result = emitModelStudied({
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(result.emitted).toBe(true);
    if (!result.emitted) return;
    const event = parseLearnerEvent(result.event);
    expect(event.kind).toBe("exposure");
    expect(event.measuredDimensions).toEqual(["exposure"]);
  });

  it("guided-recognition emits multipleChoice recognition", () => {
    const result = emitGuidedRecognitionAttempt({
      selectedRealization: CONVERSATION_ANSWER_REALIZATIONS[0]!,
      revealed: false,
      hintsUsed: 0,
      latencyMs: 400,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(result.emitted).toBe(true);
    if (!result.emitted) return;
    const event = parseLearnerEvent(result.event) as Extract<
      LearnerEvent,
      { kind: "objectiveAttempt" }
    >;
    expect(event.taskFamily).toBe("multipleChoice");
    expect(event.measuredDimensions).toEqual(["recognition"]);
    expect(event.graderOutcome).toBe("correct");
  });

  it("guided-recognition reveal/hint emits partial never correct", () => {
    const revealed = emitGuidedRecognitionAttempt({
      selectedRealization: CONVERSATION_ANSWER_REALIZATIONS[0]!,
      revealed: true,
      hintsUsed: 1,
      latencyMs: 400,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(revealed.emitted).toBe(true);
    if (!revealed.emitted) return;
    const event = parseLearnerEvent(revealed.event) as Extract<
      LearnerEvent,
      { kind: "objectiveAttempt" }
    >;
    expect(event.graderOutcome).toBe("partial");
    expect(event.graderOutcome).not.toBe("correct");
    expect(revealed.grade?.outcome).toBe("partial");
  });

  it("substitution emits formManipulation form", () => {
    const assembled = joinConversationTokens(
      CONVERSATION_ANSWER_REALIZATIONS[1]!.split(/\s+/),
    );
    const result = emitSubstitutionAttempt({
      assembled,
      revealed: false,
      hintsUsed: 0,
      latencyMs: 500,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(result.emitted).toBe(true);
    if (!result.emitted) return;
    const event = parseLearnerEvent(result.event) as Extract<
      LearnerEvent,
      { kind: "objectiveAttempt" }
    >;
    expect(event.taskFamily).toBe("formManipulation");
    expect(event.measuredDimensions).toEqual(["form"]);
    expect(event.graderOutcome).toBe("correct");
  });

  it("substitution reveal/hint emits partial never correct", () => {
    const assembled = joinConversationTokens(
      CONVERSATION_ANSWER_REALIZATIONS[1]!.split(/\s+/),
    );
    const revealed = emitSubstitutionAttempt({
      assembled,
      revealed: true,
      hintsUsed: 1,
      latencyMs: 500,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(revealed.emitted).toBe(true);
    if (!revealed.emitted) return;
    const event = parseLearnerEvent(revealed.event) as Extract<
      LearnerEvent,
      { kind: "objectiveAttempt" }
    >;
    expect(event.graderOutcome).toBe("partial");
    expect(event.graderOutcome).not.toBe("correct");
    expect(revealed.grade?.outcome).toBe("partial");
  });

  it("independent-construction emits productionTask; hint blocks correct", () => {
    const ok = emitIndependentConstructionAttempt({
      rawAnswer: CONVERSATION_ANSWER_REALIZATIONS[2]!,
      revealed: false,
      hintsUsed: 0,
      latencyMs: 600,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(ok.emitted).toBe(true);
    if (ok.emitted) {
      const event = parseLearnerEvent(ok.event) as Extract<
        LearnerEvent,
        { kind: "objectiveAttempt" }
      >;
      expect(event.taskFamily).toBe("productionTask");
      expect(event.measuredDimensions).toEqual(["production"]);
      expect(event.graderOutcome).toBe("correct");
    }

    const hinted = emitIndependentConstructionAttempt({
      rawAnswer: CONVERSATION_ANSWER_REALIZATIONS[2]!,
      revealed: false,
      hintsUsed: 1,
      latencyMs: 600,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(hinted.emitted).toBe(true);
    if (hinted.emitted) {
      const event = parseLearnerEvent(hinted.event) as Extract<
        LearnerEvent,
        { kind: "objectiveAttempt" }
      >;
      expect(event.graderOutcome).toBe("partial");
    }
  });

  it("recordingCycle only after record+playback+self-check; no score fields", () => {
    const incomplete = emitRecordingCycle({
      listenCompleted: true,
      recordCompleted: true,
      playbackCompleted: false,
      selfCheckCompleted: true,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(incomplete.emitted).toBe(false);

    const complete = emitRecordingCycle({
      listenCompleted: true,
      recordCompleted: true,
      playbackCompleted: true,
      selfCheckCompleted: true,
      selfRating: "good",
      sessionId,
      eventId: createConversationUuid(),
      timestamp: ts,
    });
    expect(complete.emitted).toBe(true);
    if (!complete.emitted) return;
    const event = parseLearnerEvent(complete.event);
    expect(event.kind).toBe("recordingCycle");
    expect(JSON.stringify(event)).not.toMatch(/pronunciationAccuracy|pronunciationScore/);
  });
});

describe("P4B in-session progress", () => {
  it("locks later levels until completed; allows back", () => {
    let progress = initialConversationProgress();
    expect(canAccessConversationLevel(progress, "model")).toBe(true);
    expect(canAccessConversationLevel(progress, "guided-recognition")).toBe(
      false,
    );
    expect(canAccessConversationLevel(progress, "substitution")).toBe(false);

    progress = advanceAfterComplete(progress, "model");
    expect(progress.currentLevelId).toBe("guided-recognition");
    expect(canAccessConversationLevel(progress, "guided-recognition")).toBe(
      true,
    );
    expect(canAccessConversationLevel(progress, "substitution")).toBe(false);

    progress = advanceAfterComplete(progress, "guided-recognition");
    expect(canAccessConversationLevel(progress, "substitution")).toBe(true);
    expect(canAccessConversationLevel(progress, "spoken-role-play")).toBe(
      false,
    );
  });
});

describe("P4B conversation routes", () => {
  const projection = loadLearnerProjection();
  const details = loadLearnerDetailProjection();

  it("resolves canonical encoded path and redirects raw-colon", () => {
    const canonical = conversationCanonicalPath();
    expect(canonical).toBe("/conversation/qa%3Aprofession-casual-main");
    const ok = resolveLearnerRoute(canonical, projection, details);
    expect(ok.kind).toBe("conversation");
    if (ok.kind === "conversation") {
      expect(ok.entityId).toBe("qa:profession-casual-main");
    }

    const raw = conversationRawColonPath();
    const decision = decideLearnerPathRequest(raw, "", projection, details);
    expect(decision.action).toBe("redirect");
    if (decision.action === "redirect") {
      expect(decision.location).toBe(canonical);
      expect(decision.status).toBe(308);
    }
  });

  it("404s unknown / wrong-kind / malformed / extra", () => {
    for (const path of [
      "/conversation/qa%3Aprofession-formal-main",
      "/conversation/lex%3Aarchitekt",
      "/conversation/unknown",
      "/conversation/qa%3Aprofession-casual-main/extra",
    ]) {
      const resolved = resolveLearnerRoute(path, projection, details);
      expect(resolved.kind).toBe("not-found");
    }
    expect(tryDecodeConversationEntitySegment("lex%3Aarchitekt")).toBeNull();
    expect(listCanonicalConversationPaths()).toEqual(
      listCanonicalConversationRoutePaths(),
    );
    expect(isSafeNavigationPath(canonicalSafe())).toBe(true);
  });
  it("detail projection conversationLevels bind to exact ID constant/order", () => {
    const qa = details.representativesById["qa:profession-casual-main"];
    expect(qa.kind).toBe("QAPair");
    if (qa.kind !== "QAPair") return;
    const ids = qa.conversationLevels.map((level) => level.id);
    expect(ids).toEqual([...CONVERSATION_LEVEL_IDS]);
    assertExactConversationLevelIds(ids);
  });
});

function canonicalSafe() {
  return "/conversation/qa%3Aprofession-casual-main";
}
