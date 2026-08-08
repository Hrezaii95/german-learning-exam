/**
 * C2B / C2BR1 / C2BR2 / C2BR3 — event-sourced six-dimensional mastery engine tests.
 * Evidence IDs: ENGINE-MASTERY-01, ENGINE-MASTERY-ANTI-LUCK-01, ENGINE-REWARD-SEPARATION-01
 */

import { describe, expect, it } from "vitest";
import {
  aggregateMastery,
  assertNoRewardFieldsOnMastery,
  DEFAULT_MASTERY_POLICY,
  LEARNER_EVENT_SCHEMA_VERSION,
  MASTERY_DIMENSIONS,
  MasteryError,
  parseLearnerEvent,
  reduceAllConceptMastery,
  reduceConceptMastery,
  selectConceptMastery,
  STABILITY_EVIDENCE_KIND,
  TASK_FAMILY_DIMENSION,
  validateMasteryPolicy,
  type ConceptMasterySnapshot,
  type LearnerEvent,
  type MasteryDimension,
  type MasteryPolicy,
} from "@german-learning/learning";

const SESSION = "11111111-1111-4111-8111-111111111111";
const CONCEPT = "lex:ingenieur";

function eid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `22222222-2222-4222-8222-${hex}`;
}

function base(partial: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    sessionId: SESSION,
    conceptId: CONCEPT,
    sourceActivityMode: "recall",
    ...partial,
  };
}

function exposure(n: number, ts: string, kind: "page" | "card" | "visual" = "page") {
  return base({
    kind: "exposure",
    eventId: eid(n),
    timestamp: ts,
    exposureKind: kind,
    measuredDimensions: ["exposure"],
    sourceActivityMode: "see",
  });
}

function mcq(n: number, ts: string, outcome: "correct" | "partial" | "incorrect", latency = 800) {
  return base({
    kind: "objectiveAttempt",
    eventId: eid(n),
    timestamp: ts,
    taskFamily: "multipleChoice",
    graderOutcome: outcome,
    latencyMs: latency,
    hintsUsed: 0,
    measuredDimensions: ["recognition"],
    sourceActivityMode: "check",
  });
}

function recall(
  n: number,
  ts: string,
  outcome: "correct" | "partial" | "incorrect",
  opts: { latency?: number; hints?: number } = {},
) {
  return base({
    kind: "objectiveAttempt",
    eventId: eid(n),
    timestamp: ts,
    taskFamily: "typedRecall",
    graderOutcome: outcome,
    latencyMs: opts.latency ?? 900,
    hintsUsed: opts.hints ?? 0,
    measuredDimensions: ["recall"],
    sourceActivityMode: "recall",
  });
}

function formAttempt(n: number, ts: string, outcome: "correct" | "incorrect" = "correct") {
  return base({
    kind: "objectiveAttempt",
    eventId: eid(n),
    timestamp: ts,
    taskFamily: "formManipulation",
    graderOutcome: outcome,
    latencyMs: 700,
    hintsUsed: 0,
    measuredDimensions: ["form"],
    sourceActivityMode: "notice",
  });
}

function listeningTask(n: number, ts: string, outcome: "correct" | "incorrect" = "correct") {
  return base({
    kind: "audioInteraction",
    eventId: eid(n),
    timestamp: ts,
    hasLinkedTask: true,
    audioSpeed: 1,
    graderOutcome: outcome,
    latencyMs: 1100,
    hintsUsed: 0,
    measuredDimensions: ["listening"],
    sourceActivityMode: "hear",
  });
}

function audioPlay(n: number, ts: string) {
  return base({
    kind: "audioInteraction",
    eventId: eid(n),
    timestamp: ts,
    hasLinkedTask: false,
    audioSpeed: 1,
    measuredDimensions: ["exposure", "listening"],
    sourceActivityMode: "hear",
  });
}

function productionTask(n: number, ts: string, outcome: "correct" | "incorrect" = "correct") {
  return base({
    kind: "objectiveAttempt",
    eventId: eid(n),
    timestamp: ts,
    taskFamily: "productionTask",
    graderOutcome: outcome,
    latencyMs: 1500,
    hintsUsed: 0,
    measuredDimensions: ["production"],
    sourceActivityMode: "use",
  });
}

function recording(
  n: number,
  ts: string,
  steps: {
    listen?: boolean;
    record?: boolean;
    playback?: boolean;
    selfCheck?: boolean;
    rating?: "again" | "hard" | "good" | "easy";
  },
) {
  return base({
    kind: "recordingCycle",
    eventId: eid(n),
    timestamp: ts,
    listenCompleted: steps.listen ?? false,
    recordCompleted: steps.record ?? false,
    playbackCompleted: steps.playback ?? false,
    selfCheckCompleted: steps.selfCheck ?? false,
    ...(steps.rating ? { selfRating: steps.rating } : {}),
    latencyMs: 2000,
    hintsUsed: 0,
    measuredDimensions: ["production"],
    sourceActivityMode: "repeat",
  });
}

function flashcardSelf(
  n: number,
  ts: string,
  rating: "again" | "hard" | "good" | "easy",
  opts: { latency?: number; hints?: number } = {},
) {
  return base({
    kind: "selfRatedAttempt",
    eventId: eid(n),
    timestamp: ts,
    taskFamily: "flashcard",
    rating,
    latencyMs: opts.latency ?? 800,
    hintsUsed: opts.hints ?? 0,
    measuredDimensions: ["recall"],
    sourceActivityMode: "review",
  });
}

function recognitionBatch(count: number, startN: number, day: string): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < count; i++) {
    const sec = String(i % 60).padStart(2, "0");
    const min = String(Math.floor(i / 60) % 60).padStart(2, "0");
    out.push(mcq(startN + i, `${day}T12:${min}:${sec}.000Z`, "correct"));
  }
  return out;
}

/** Multi-day multi-dimension history that can reach mastered. */
function validMasteryHistory(): unknown[] {
  const days = ["2026-01-01", "2026-01-03", "2026-01-05", "2026-01-07"];
  const events: unknown[] = [exposure(1, `${days[0]}T08:00:00.000Z`)];
  let n = 10;
  for (const day of days) {
    events.push(mcq(n++, `${day}T09:00:00.000Z`, "correct"));
    events.push(mcq(n++, `${day}T09:01:00.000Z`, "correct"));
    events.push(recall(n++, `${day}T10:00:00.000Z`, "correct"));
    events.push(recall(n++, `${day}T10:05:00.000Z`, "correct"));
    events.push(listeningTask(n++, `${day}T11:00:00.000Z`, "correct"));
    events.push(listeningTask(n++, `${day}T11:05:00.000Z`, "correct"));
    events.push(formAttempt(n++, `${day}T12:00:00.000Z`, "correct"));
    events.push(formAttempt(n++, `${day}T12:05:00.000Z`, "correct"));
    events.push(productionTask(n++, `${day}T13:00:00.000Z`, "correct"));
    events.push(productionTask(n++, `${day}T13:05:00.000Z`, "correct"));
  }
  return events;
}

/** Post-lapse recovery days — spaced strong evidence to re-earn checkpoints. */
function recoveryDays(startN: number, days: string[]): unknown[] {
  const events: unknown[] = [];
  let n = startN;
  for (const day of days) {
    events.push(mcq(n++, `${day}T09:00:00.000Z`, "correct"));
    events.push(recall(n++, `${day}T10:00:00.000Z`, "correct"));
    events.push(listeningTask(n++, `${day}T11:00:00.000Z`, "correct"));
    events.push(formAttempt(n++, `${day}T12:00:00.000Z`, "correct"));
    events.push(productionTask(n++, `${day}T13:00:00.000Z`, "correct"));
  }
  return events;
}

describe("C2B mastery dimensions contract", () => {
  it("exports exactly six mastery dimension keys", () => {
    expect([...MASTERY_DIMENSIONS]).toEqual([
      "exposure",
      "recognition",
      "recall",
      "listening",
      "form",
      "production",
    ]);
    expect(STABILITY_EVIDENCE_KIND).toBe("stability");
    expect(MASTERY_DIMENSIONS).not.toContain("stability");
    expect(MASTERY_DIMENSIONS).not.toContain("review-stability");
  });

  it("snapshot dimensions use exact six labelled keys", () => {
    const snap = reduceConceptMastery(CONCEPT, []);
    expect(Object.keys(snap.dimensions).sort()).toEqual([...MASTERY_DIMENSIONS].sort());
    expect(snap.stability.kind).toBe("stability");
  });

  it("exports exact task-family dimension table", () => {
    expect(TASK_FAMILY_DIMENSION).toEqual({
      multipleChoice: "recognition",
      pictureRecognition: "recognition",
      typedRecall: "recall",
      flashcard: "recall",
      formManipulation: "form",
      sentenceOrder: "form",
      listeningTask: "listening",
      productionTask: "production",
    });
  });
});

describe("ENGINE-MASTERY-01 labelled independent dimensions", () => {
  it("derives labelled independent dimensions from representative events", () => {
    const events = [
      exposure(1, "2026-02-01T08:00:00.000Z"),
      mcq(2, "2026-02-01T09:00:00.000Z", "correct"),
      recall(3, "2026-02-01T10:00:00.000Z", "correct"),
      listeningTask(4, "2026-02-01T11:00:00.000Z", "correct"),
      formAttempt(5, "2026-02-01T12:00:00.000Z", "correct"),
      productionTask(6, "2026-02-01T13:00:00.000Z", "correct"),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.dimensions.exposure.exposureTouches).toBe(1);
    expect(snap.dimensions.recognition.successes).toBe(1);
    expect(snap.dimensions.recall.successes).toBe(1);
    expect(snap.dimensions.listening.successes).toBe(1);
    expect(snap.dimensions.form.successes).toBe(1);
    expect(snap.dimensions.production.successes).toBe(1);
    expect(snap.pronunciationAccuracy).toBeNull();
  });

  it("reproduces identically from the same event history (reload derivation)", () => {
    const events = validMasteryHistory();
    const a = reduceConceptMastery(CONCEPT, events);
    const b = reduceConceptMastery(CONCEPT, events);
    expect(a).toEqual(b);
    expect(a.status).toBe(b.status);
    expect(a.appliedEventIds).toEqual(b.appliedEventIds);
  });
});

describe("ENGINE-MASTERY-ANTI-LUCK-01", () => {
  it("page views alone stay exploring and never Strong/Mastered", () => {
    const events = [
      exposure(1, "2026-02-01T08:00:00.000Z", "page"),
      exposure(2, "2026-02-01T09:00:00.000Z", "card"),
      exposure(3, "2026-02-01T10:00:00.000Z", "visual"),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.status).toBe("exploring");
    expect(snap.dimensions.recognition.successes).toBe(0);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });

  it("repeated audio without task is exposure only, not correct listening", () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      audioPlay(i + 1, `2026-02-01T08:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.dimensions.listening.successes).toBe(0);
    expect(snap.dimensions.listening.exposureTouches).toBe(20);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });

  it("100 correct MCQs cannot produce Strong or Mastered", () => {
    const events = [
      exposure(1, "2026-02-01T07:00:00.000Z"),
      ...recognitionBatch(100, 10, "2026-02-01"),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.dimensions.recognition.successes).toBe(100);
    expect(snap.dimensions.recall.successes).toBe(0);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });

  it("one lucky recall cannot create Strong or Mastered", () => {
    const events = [
      exposure(1, "2026-02-01T08:00:00.000Z"),
      recall(2, "2026-02-01T09:00:00.000Z", "correct"),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.dimensions.recall.successes).toBe(1);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });

  it("valid multi-day multi-dimensional history can reach Mastered", () => {
    const snap = reduceConceptMastery(CONCEPT, validMasteryHistory());
    expect(snap.status).toBe("mastered");
    expect(snap.stability.readyForMastery).toBe(true);
    expect(snap.stability.distinctUtcDates).toBeGreaterThanOrEqual(2);
    for (const d of DEFAULT_MASTERY_POLICY.requiredDimensions) {
      expect(snap.dimensions[d].successes).toBeGreaterThanOrEqual(
        DEFAULT_MASTERY_POLICY.minSuccessesPerDimension,
      );
    }
  });
});

describe("recording cycle", () => {
  it("incomplete recording does not credit production practice", () => {
    const snap = reduceConceptMastery(CONCEPT, [
      recording(1, "2026-02-01T08:00:00.000Z", {
        listen: true,
        record: true,
        playback: false,
        selfCheck: false,
      }),
    ]);
    expect(snap.dimensions.production.attempts).toBe(0);
    expect(snap.dimensions.exposure.exposureTouches).toBe(1);
    expect(snap.pronunciationAccuracy).toBeNull();
  });

  it("complete recording credits production and keeps pronunciationAccuracy null", () => {
    const snap = reduceConceptMastery(CONCEPT, [
      recording(1, "2026-02-01T08:00:00.000Z", {
        listen: true,
        record: true,
        playback: true,
        selfCheck: true,
        rating: "good",
      }),
    ]);
    expect(snap.dimensions.production.successes).toBe(1);
    expect(snap.pronunciationAccuracy).toBeNull();
  });

  it("rejects pronunciation scoring fields on recording events", () => {
    expect(() =>
      parseLearnerEvent({
        ...recording(1, "2026-02-01T08:00:00.000Z", {
          listen: true,
          record: true,
          playback: true,
          selfCheck: true,
          rating: "good",
        }),
        pronunciationAccuracy: 0.92,
      }),
    ).toThrow(MasteryError);
  });
});

describe("ordering, duplicates, lapses, hints, latency", () => {
  it("applies out-of-order input by event timestamp", () => {
    const events = [
      recall(2, "2026-02-01T10:00:00.000Z", "correct"),
      exposure(1, "2026-02-01T08:00:00.000Z"),
      recall(3, "2026-02-01T09:00:00.000Z", "incorrect"),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.appliedEventIds).toEqual([eid(1), eid(3), eid(2)]);
    expect(snap.dimensions.recall.failures).toBe(1);
    expect(snap.dimensions.recall.successes).toBe(1);
  });

  it("orders equal timestamps by eventId lexicographically", () => {
    const ts = "2026-02-01T12:00:00.000Z";
    const a = recall(30, ts, "correct");
    const b = recall(5, ts, "incorrect");
    const snap = reduceConceptMastery(CONCEPT, [a, b]);
    expect(snap.appliedEventIds[0]).toBe(eid(5));
    expect(snap.appliedEventIds[1]).toBe(eid(30));
  });

  it("deduplicates identical event IDs", () => {
    const e = recall(1, "2026-02-01T10:00:00.000Z", "correct");
    const snap = reduceConceptMastery(CONCEPT, [e, { ...e }]);
    expect(snap.dimensions.recall.successes).toBe(1);
    expect(snap.appliedEventIds).toHaveLength(1);
  });

  it("rejects conflicting duplicate event IDs", () => {
    const a = recall(1, "2026-02-01T10:00:00.000Z", "correct");
    const b = { ...a, graderOutcome: "incorrect" };
    expect(() => reduceConceptMastery(CONCEPT, [a, b])).toThrow(/CONFLICTING_EVENT_ID|Conflicting/);
  });

  it("keeps lapse after success in history and interrupts readiness", () => {
    const events = [
      ...validMasteryHistory(),
      recall(900, "2026-01-10T10:00:00.000Z", "incorrect"),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.dimensions.recall.failures).toBeGreaterThanOrEqual(1);
    const before = reduceConceptMastery(CONCEPT, validMasteryHistory());
    expect(snap.dimensions.recall.failures).toBeGreaterThan(before.dimensions.recall.failures);
    expect(snap.dimensions.recall.successes).toBe(before.dimensions.recall.successes);
    expect(snap.stability.readyForMastery).toBe(false);
    expect(snap.status).not.toBe("mastered");
    expect(snap.status).not.toBe("strong");
  });

  it("hints reduce evidence strength deterministically", () => {
    const withHints = reduceConceptMastery(CONCEPT, [
      recall(1, "2026-02-01T10:00:00.000Z", "correct", { hints: 2 }),
      recall(2, "2026-02-01T10:05:00.000Z", "correct", { hints: 2 }),
    ]);
    const clean = reduceConceptMastery(CONCEPT, [
      recall(1, "2026-02-01T10:00:00.000Z", "correct", { hints: 0 }),
      recall(2, "2026-02-01T10:05:00.000Z", "correct", { hints: 0 }),
    ]);
    expect(withHints.dimensions.recall.successes).toBe(2);
    expect(withHints.dimensions.recall.strongEvidenceCount).toBe(0);
    expect(clean.dimensions.recall.strongEvidenceCount).toBe(2);
    expect(withHints.dimensions.recall.hintsSum).toBe(4);
  });

  it("zero/rapid latency is not strong evidence", () => {
    const snap = reduceConceptMastery(CONCEPT, [
      recall(1, "2026-02-01T10:00:00.000Z", "correct", { latency: 0 }),
      recall(2, "2026-02-01T10:05:00.000Z", "correct", { latency: 50 }),
    ]);
    expect(snap.dimensions.recall.successes).toBe(2);
    expect(snap.dimensions.recall.strongEvidenceCount).toBe(0);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });
});

describe("validation fail-closed", () => {
  it("rejects malformed discriminant", () => {
    expect(() =>
      parseLearnerEvent(base({ kind: "telepathy", eventId: eid(1), timestamp: "2026-02-01T08:00:00.000Z", measuredDimensions: ["exposure"] })),
    ).toThrow(MasteryError);
    try {
      parseLearnerEvent(base({ kind: "telepathy", eventId: eid(1), timestamp: "2026-02-01T08:00:00.000Z", measuredDimensions: ["exposure"] }));
    } catch (e) {
      expect(e).toBeInstanceOf(MasteryError);
      expect((e as MasteryError).code).toBe("INVALID_DISCRIMINANT");
    }
  });

  it("rejects invalid UUID and timestamp without timezone", () => {
    try {
      parseLearnerEvent(
        base({
          kind: "exposure",
          eventId: "not-a-uuid",
          timestamp: "2026-02-01T08:00:00.000Z",
          exposureKind: "page",
          measuredDimensions: ["exposure"],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_UUID");
    }
    try {
      parseLearnerEvent(
        base({
          kind: "exposure",
          eventId: eid(1),
          timestamp: "2026-02-01T08:00:00",
          exposureKind: "page",
          measuredDimensions: ["exposure"],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_TIMESTAMP");
    }
  });

  it("rejects negative/NaN latency and invalid audio speed", () => {
    try {
      parseLearnerEvent({
        ...mcq(1, "2026-02-01T08:00:00.000Z", "correct"),
        latencyMs: -1,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_LATENCY");
    }
    try {
      parseLearnerEvent({
        ...mcq(1, "2026-02-01T08:00:00.000Z", "correct"),
        latencyMs: Number.NaN,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_LATENCY");
    }
    try {
      parseLearnerEvent({
        ...audioPlay(1, "2026-02-01T08:00:00.000Z"),
        audioSpeed: 0,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_AUDIO_SPEED");
    }
  });

  it("rejects dimension-event mismatch for MCQ measuring recall", () => {
    try {
      parseLearnerEvent({
        ...mcq(1, "2026-02-01T08:00:00.000Z", "correct"),
        measuredDimensions: ["recall"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
    }
  });

  it("rejects future schema versions and HTML-shaped strings", () => {
    try {
      parseLearnerEvent({
        ...exposure(1, "2026-02-01T08:00:00.000Z"),
        schemaVersion: "9.9.9",
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_SCHEMA_VERSION");
    }
    try {
      parseLearnerEvent({
        ...mcq(1, "2026-02-01T08:00:00.000Z", "correct"),
        normalizedAnswer: "<b>Ingenieur</b>",
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("HTML_CONTENT");
    }
  });

  it("rejects unknown/impossible policy dimensions", () => {
    try {
      validateMasteryPolicy({
        ...DEFAULT_MASTERY_POLICY,
        requiredDimensions: ["telepathy"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_DIMENSION");
    }
    try {
      validateMasteryPolicy({
        ...DEFAULT_MASTERY_POLICY,
        requiredDimensions: ["exposure"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_POLICY");
    }
  });

  it("wrong objective answer is failure regardless of any confidence field attempt", () => {
    const event = parseLearnerEvent(mcq(1, "2026-02-01T08:00:00.000Z", "incorrect"));
    const snap = reduceConceptMastery(CONCEPT, [event]);
    expect(snap.dimensions.recognition.failures).toBe(1);
    expect(snap.dimensions.recognition.successes).toBe(0);
  });
});

describe("immutability and selectors", () => {
  it("returns immutable snapshots", () => {
    const snap = reduceConceptMastery(CONCEPT, [
      exposure(1, "2026-02-01T08:00:00.000Z"),
      recall(2, "2026-02-01T09:00:00.000Z", "correct"),
    ]);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.dimensions)).toBe(true);
    expect(Object.isFrozen(snap.dimensions.recall)).toBe(true);
    expect(Object.isFrozen(snap.dimensionRecovery)).toBe(true);
    expect(Object.isFrozen(snap.dimensionRecovery.recall)).toBe(true);
    expect(() => {
      (snap as { status: string }).status = "mastered";
    }).toThrow();
  });

  it("selectConceptMastery and aggregateMastery keep labelled dimensions", () => {
    const map = reduceAllConceptMastery([
      ...validMasteryHistory(),
      {
        ...exposure(500, "2026-02-01T08:00:00.000Z"),
        conceptId: "lex:arzt",
        eventId: eid(500),
      },
    ]);
    const one = selectConceptMastery(map, CONCEPT);
    expect(one?.status).toBe("mastered");
    const agg = aggregateMastery(map);
    expect(agg.conceptIds).toEqual(["lex:arzt", CONCEPT].sort());
    expect(Object.keys(agg.dimensionTotals).sort()).toEqual([...MASTERY_DIMENSIONS].sort());
    expect(agg).not.toHaveProperty("masteryPercent");
    expect(agg).not.toHaveProperty("overallScore");
  });
});

describe("ENGINE-REWARD-SEPARATION-01", () => {
  it("rejects XP/streak/badge fields on events and snapshots lack them", () => {
    try {
      parseLearnerEvent({
        ...exposure(1, "2026-02-01T08:00:00.000Z"),
        xp: 50,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("REWARD_FIELD_FORBIDDEN");
    }

    const snap = reduceConceptMastery(CONCEPT, validMasteryHistory());
    assertNoRewardFieldsOnMastery(snap);
    expect(snap).not.toHaveProperty("xp");
    expect(snap).not.toHaveProperty("streak");
    expect(snap).not.toHaveProperty("badge");

    type Forbidden = "xp" | "streak" | "badge" | "badges" | "streakDays";
    type HasReward = Forbidden & keyof ConceptMasterySnapshot;
    const _assertNoReward: HasReward extends never ? true : false = true;
    expect(_assertNoReward).toBe(true);
  });
});

describe("policy defaults and exposure gating", () => {
  it("exposes default policy thresholds", () => {
    expect(DEFAULT_MASTERY_POLICY.requiredDimensions).toEqual([
      "recognition",
      "recall",
      "listening",
      "form",
      "production",
    ]);
    expect(DEFAULT_MASTERY_POLICY.minSuccessesPerDimension).toBe(2);
    expect(DEFAULT_MASTERY_POLICY.minDelayedCheckpoints).toBe(2);
    expect(DEFAULT_MASTERY_POLICY.minCheckpointIntervalDays).toBe(1);
    expect(DEFAULT_MASTERY_POLICY.minValidLatencyMs).toBe(250);
    expect(DEFAULT_MASTERY_POLICY.minRetrievalSuccessesForStrong).toBe(2);
  });

  it("exposure events cannot measure non-exposure dimensions", () => {
    try {
      parseLearnerEvent({
        ...exposure(1, "2026-02-01T08:00:00.000Z"),
        measuredDimensions: ["recognition"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
    }
  });

  it("self-rated flashcard maps again to failure", () => {
    const event = parseLearnerEvent(flashcardSelf(1, "2026-02-01T08:00:00.000Z", "again"));
    const snap = reduceConceptMastery(CONCEPT, [event]);
    expect(snap.dimensions.recall.failures).toBe(1);
  });

  it("parseLearnerEvent returns typed LearnerEvent variants", () => {
    const e = parseLearnerEvent(exposure(1, "2026-02-01T08:00:00.000Z")) as LearnerEvent;
    expect(e.kind).toBe("exposure");
    const dims: MasteryDimension[] = [...MASTERY_DIMENSIONS];
    expect(dims).toHaveLength(6);
  });
});

describe("C2BR1 UTC calendar dates", () => {
  it("offset spellings of the same UTC date do not count as distinct dates", () => {
    // 2026-01-01T22:00:00-05:00 === 2026-01-02T03:00:00Z (UTC calendar day 2026-01-02)
    const spaced: unknown[] = [
      exposure(1, "2026-01-01T08:00:00.000Z"),
      mcq(10, "2026-01-01T09:00:00.000Z", "correct"),
      mcq(11, "2026-01-01T09:01:00.000Z", "correct"),
      recall(12, "2026-01-01T10:00:00.000Z", "correct"),
      recall(13, "2026-01-01T10:05:00.000Z", "correct"),
      listeningTask(14, "2026-01-01T11:00:00.000Z", "correct"),
      listeningTask(15, "2026-01-01T11:05:00.000Z", "correct"),
      formAttempt(16, "2026-01-01T12:00:00.000Z", "correct"),
      formAttempt(17, "2026-01-01T12:05:00.000Z", "correct"),
      productionTask(18, "2026-01-01T13:00:00.000Z", "correct"),
      productionTask(19, "2026-01-01T13:05:00.000Z", "correct"),
      recall(20, "2026-01-02T12:00:00.000Z", "correct"),
      recall(21, "2026-01-01T22:00:00-05:00", "correct"),
      mcq(22, "2026-01-02T09:00:00.000Z", "correct"),
      listeningTask(23, "2026-01-02T11:00:00.000Z", "correct"),
      formAttempt(24, "2026-01-02T12:00:00.000Z", "correct"),
      productionTask(25, "2026-01-02T13:00:00.000Z", "correct"),
    ];
    const snap = reduceConceptMastery(CONCEPT, spaced);
    const checkpointDates = snap.stability.delayedCheckpoints.map((c) => c.utcDate);
    expect(checkpointDates).toContain("2026-01-01");
    expect(checkpointDates).toContain("2026-01-02");
    expect(new Set(checkpointDates).size).toBe(snap.stability.distinctUtcDates);
    expect(checkpointDates.filter((d) => d === "2026-01-02").length).toBe(1);
  });
});

describe("C2BR1 lapse revoke and recovery", () => {
  it("mastered → incorrect → not-ready/not-mastered → new delayed evidence recovers", () => {
    const mastered = reduceConceptMastery(CONCEPT, validMasteryHistory());
    expect(mastered.status).toBe("mastered");
    expect(mastered.stability.readyForMastery).toBe(true);

    const afterLapse = reduceConceptMastery(CONCEPT, [
      ...validMasteryHistory(),
      recall(900, "2026-01-10T10:00:00.000Z", "incorrect"),
    ]);
    expect(afterLapse.stability.readyForMastery).toBe(false);
    expect(afterLapse.status).not.toBe("mastered");
    expect(afterLapse.status).not.toBe("strong");
    expect(afterLapse.dimensions.recall.successes).toBe(mastered.dimensions.recall.successes);
    expect(afterLapse.dimensions.recall.failures).toBeGreaterThan(0);

    const recovered = reduceConceptMastery(CONCEPT, [
      ...validMasteryHistory(),
      recall(900, "2026-01-10T10:00:00.000Z", "incorrect"),
      ...recoveryDays(1000, ["2026-01-12", "2026-01-14"]),
    ]);
    expect(recovered.stability.readyForMastery).toBe(true);
    expect(recovered.status).toBe("mastered");
  });

  it("partial lapse on a required dimension also revokes readiness", () => {
    const snap = reduceConceptMastery(CONCEPT, [
      ...validMasteryHistory(),
      recall(901, "2026-01-10T10:00:00.000Z", "partial"),
    ]);
    expect(snap.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });
});

describe("C2BR1 self-rating anti-bypass", () => {
  it("rejects selfRatedAttempt for non-flashcard task families", () => {
    try {
      parseLearnerEvent(
        base({
          kind: "selfRatedAttempt",
          eventId: eid(1),
          timestamp: "2026-02-01T08:00:00.000Z",
          taskFamily: "typedRecall",
          rating: "easy",
          latencyMs: 900,
          hintsUsed: 0,
          measuredDimensions: ["recall"],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_DISCRIMINANT");
    }
  });

  it("self-rated flashcards never produce strong evidence or checkpoints", () => {
    const events = [
      flashcardSelf(1, "2026-01-01T10:00:00.000Z", "easy"),
      flashcardSelf(2, "2026-01-02T10:00:00.000Z", "good"),
      flashcardSelf(3, "2026-01-08T10:00:00.000Z", "easy", { latency: 2000, hints: 0 }),
    ];
    const snap = reduceConceptMastery(CONCEPT, events);
    expect(snap.dimensions.recall.successes).toBe(3);
    expect(snap.dimensions.recall.strongEvidenceCount).toBe(0);
    expect(snap.stability.delayedCheckpoints).toHaveLength(0);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });

  it("self-rated or task-family-laundered events cannot achieve Strong/Mastered", () => {
    const flood = Array.from({ length: 40 }, (_, i) => {
      const day = String(1 + (i % 20)).padStart(2, "0");
      return flashcardSelf(100 + i, `2026-01-${day}T10:00:00.000Z`, "easy");
    });
    const snap = reduceConceptMastery(CONCEPT, flood);
    expect(["strong", "mastered"]).not.toContain(snap.status);
    expect(snap.stability.readyForMastery).toBe(false);
  });
});

describe("C2BR1 dimension laundering rejection", () => {
  it("rejects typedRecall measuring listening", () => {
    try {
      parseLearnerEvent({
        ...recall(1, "2026-02-01T08:00:00.000Z", "correct"),
        measuredDimensions: ["listening"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
    }
  });

  it("rejects productionTask measuring recall+production", () => {
    try {
      parseLearnerEvent({
        ...productionTask(1, "2026-02-01T08:00:00.000Z", "correct"),
        measuredDimensions: ["recall", "production"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
    }
  });

  it("rejects objective attempt that appends exposure", () => {
    try {
      parseLearnerEvent({
        ...mcq(1, "2026-02-01T08:00:00.000Z", "correct"),
        measuredDimensions: ["recognition", "exposure"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
    }
  });

  it("rejects linked audio measuring anything other than listening alone", () => {
    try {
      parseLearnerEvent({
        ...listeningTask(1, "2026-02-01T08:00:00.000Z", "correct"),
        measuredDimensions: ["listening", "recall"],
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
    }
  });
});

describe("C2BR1 strict timestamps", () => {
  it("rejects impossible Gregorian dates and accepts leap day", () => {
    try {
      parseLearnerEvent(exposure(1, "2026-02-30T10:00:00Z"));
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_TIMESTAMP");
    }
    expect(() => parseLearnerEvent(exposure(2, "2024-02-29T10:00:00Z"))).not.toThrow();
    try {
      parseLearnerEvent(exposure(3, "2026-02-01T25:00:00Z"));
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_TIMESTAMP");
    }
  });
});

describe("C2BR1 successive checkpoint spacing", () => {
  it("day1/day2/day8 fails for 3 checkpoints with 7-day successive interval; spaced sequence passes", () => {
    const tightPolicy: MasteryPolicy = validateMasteryPolicy({
      ...DEFAULT_MASTERY_POLICY,
      minDelayedCheckpoints: 3,
      minCheckpointIntervalDays: 7,
    });

    const failHistory = (days: string[]): unknown[] => {
      const events: unknown[] = [exposure(1, `${days[0]}T08:00:00.000Z`)];
      let n = 10;
      for (const day of days) {
        events.push(mcq(n++, `${day}T09:00:00.000Z`, "correct"));
        events.push(mcq(n++, `${day}T09:01:00.000Z`, "correct"));
        events.push(recall(n++, `${day}T10:00:00.000Z`, "correct"));
        events.push(recall(n++, `${day}T10:05:00.000Z`, "correct"));
        events.push(listeningTask(n++, `${day}T11:00:00.000Z`, "correct"));
        events.push(listeningTask(n++, `${day}T11:05:00.000Z`, "correct"));
        events.push(formAttempt(n++, `${day}T12:00:00.000Z`, "correct"));
        events.push(formAttempt(n++, `${day}T12:05:00.000Z`, "correct"));
        events.push(productionTask(n++, `${day}T13:00:00.000Z`, "correct"));
        events.push(productionTask(n++, `${day}T13:05:00.000Z`, "correct"));
      }
      return events;
    };

    const failSnap = reduceConceptMastery(
      CONCEPT,
      failHistory(["2026-01-01", "2026-01-02", "2026-01-08"]),
      tightPolicy,
    );
    expect(failSnap.stability.distinctUtcDates).toBe(3);
    expect(failSnap.stability.readyForMastery).toBe(false);
    expect(failSnap.status).not.toBe("mastered");

    const passSnap = reduceConceptMastery(
      CONCEPT,
      failHistory(["2026-01-01", "2026-01-08", "2026-01-15"]),
      tightPolicy,
    );
    expect(passSnap.stability.readyForMastery).toBe(true);
    expect(passSnap.status).toBe("mastered");
  });
});

describe("C2BR1 hint boundary", () => {
  it("maxHintsForStrongEvidence 0/1 boundary: hintsUsed > max blocks; equal allowed", () => {
    const atZero = reduceConceptMastery(CONCEPT, [
      recall(1, "2026-02-01T10:00:00.000Z", "correct", { hints: 0 }),
    ]);
    expect(atZero.dimensions.recall.strongEvidenceCount).toBe(1);

    const overZero = reduceConceptMastery(CONCEPT, [
      recall(1, "2026-02-01T10:00:00.000Z", "correct", { hints: 1 }),
    ]);
    expect(overZero.dimensions.recall.strongEvidenceCount).toBe(0);

    const allowOne = validateMasteryPolicy({
      ...DEFAULT_MASTERY_POLICY,
      maxHintsForStrongEvidence: 1,
    });
    const atOne = reduceConceptMastery(
      CONCEPT,
      [recall(1, "2026-02-01T10:00:00.000Z", "correct", { hints: 1 })],
      allowOne,
    );
    expect(atOne.dimensions.recall.strongEvidenceCount).toBe(1);
    const overOne = reduceConceptMastery(
      CONCEPT,
      [recall(1, "2026-02-01T10:00:00.000Z", "correct", { hints: 2 })],
      allowOne,
    );
    expect(overOne.dimensions.recall.strongEvidenceCount).toBe(0);
  });
});

describe("C2BR1 linked-audio required metrics", () => {
  it("rejects linked audio missing latencyMs or hintsUsed (no zero coercion)", () => {
    const linked = listeningTask(1, "2026-02-01T08:00:00.000Z", "correct") as Record<
      string,
      unknown
    >;
    const { latencyMs: _l, ...noLatency } = linked;
    void _l;
    try {
      parseLearnerEvent(noLatency);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("REQUIRED_FIELD");
    }
    const { hintsUsed: _h, ...noHints } = linked;
    void _h;
    try {
      parseLearnerEvent(noHints);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("REQUIRED_FIELD");
    }
  });
});

describe("C2BR1 policy unknown keys and inconsistencies", () => {
  it("rejects unknown mastery-policy keys", () => {
    try {
      validateMasteryPolicy({
        ...DEFAULT_MASTERY_POLICY,
        xpBoost: 10,
      } as unknown as MasteryPolicy);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_POLICY");
    }
  });

  it("rejects strong-evidence threshold above success threshold", () => {
    try {
      validateMasteryPolicy({
        ...DEFAULT_MASTERY_POLICY,
        minSuccessesPerDimension: 2,
        minStrongEvidencePerDimension: 3,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_POLICY");
    }
  });

  it("rejects minDelayedCheckpoints < 2", () => {
    try {
      validateMasteryPolicy({
        ...DEFAULT_MASTERY_POLICY,
        minDelayedCheckpoints: 1,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("INVALID_POLICY");
    }
  });
});

describe("C2BR2 flashcard event-kind boundary", () => {
  it("rejects objectiveAttempt with taskFamily flashcard", () => {
    try {
      parseLearnerEvent(
        base({
          kind: "objectiveAttempt",
          eventId: eid(1),
          timestamp: "2026-02-01T08:00:00.000Z",
          taskFamily: "flashcard",
          graderOutcome: "correct",
          latencyMs: 900,
          hintsUsed: 0,
          measuredDimensions: ["recall"],
          sourceActivityMode: "recall",
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as MasteryError).code).toBe("DIMENSION_EVENT_MISMATCH");
      expect((e as MasteryError).field).toBe("taskFamily");
    }
  });

  it("self-rated flashcard flood never yields strong evidence, checkpoints, or mastery", () => {
    const flood = Array.from({ length: 60 }, (_, i) => {
      const day = String(1 + (i % 28)).padStart(2, "0");
      return flashcardSelf(200 + i, `2026-01-${day}T10:00:00.000Z`, "easy", {
        latency: 2000,
        hints: 0,
      });
    });
    const snap = reduceConceptMastery(CONCEPT, flood);
    expect(snap.dimensions.recall.successes).toBe(60);
    expect(snap.dimensions.recall.strongEvidenceCount).toBe(0);
    expect(snap.stability.delayedCheckpoints).toHaveLength(0);
    expect(snap.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(snap.status);
  });

  it("objective typedRecall remains the valid graded recall path (strong evidence + mastery)", () => {
    const alone = reduceConceptMastery(CONCEPT, [
      recall(1, "2026-02-01T10:00:00.000Z", "correct", { latency: 900, hints: 0 }),
    ]);
    expect(alone.dimensions.recall.strongEvidenceCount).toBe(1);

    const mastered = reduceConceptMastery(CONCEPT, validMasteryHistory());
    expect(mastered.status).toBe("mastered");
    expect(mastered.dimensions.recall.strongEvidenceCount).toBeGreaterThanOrEqual(2);
    expect(mastered.stability.delayedCheckpoints.length).toBeGreaterThanOrEqual(2);
  });

  it("after mastery, incorrect and partial recognition each revoke readiness under recognition policy", () => {
    const policy = validateMasteryPolicy({
      ...DEFAULT_MASTERY_POLICY,
      requiredDimensions: ["recognition", "recall", "listening", "form", "production"],
    });
    expect(policy.requiredDimensions).toContain("recognition");

    const mastered = reduceConceptMastery(CONCEPT, validMasteryHistory(), policy);
    expect(mastered.status).toBe("mastered");
    expect(mastered.stability.readyForMastery).toBe(true);

    const afterIncorrect = reduceConceptMastery(
      CONCEPT,
      [...validMasteryHistory(), mcq(900, "2026-01-10T09:00:00.000Z", "incorrect")],
      policy,
    );
    expect(afterIncorrect.stability.readyForMastery).toBe(false);
    expect(afterIncorrect.status).not.toBe("mastered");
    expect(afterIncorrect.status).not.toBe("strong");
    expect(afterIncorrect.dimensions.recognition.failures).toBeGreaterThan(0);

    const afterPartial = reduceConceptMastery(
      CONCEPT,
      [...validMasteryHistory(), mcq(901, "2026-01-10T09:00:00.000Z", "partial")],
      policy,
    );
    expect(afterPartial.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(afterPartial.status);
    expect(afterPartial.dimensions.recognition.partials).toBeGreaterThan(0);
  });
});

describe("C2BR3 per-dimension lapse recovery", () => {
  /** Recall-only spaced strong successes — must not recover a production lapse. */
  function recallOnlyDays(startN: number, days: string[]): unknown[] {
    const events: unknown[] = [];
    let n = startN;
    for (const day of days) {
      events.push(recall(n++, `${day}T10:00:00.000Z`, "correct"));
      events.push(recall(n++, `${day}T10:05:00.000Z`, "correct"));
    }
    return events;
  }

  it("production incorrect → recall-only spaced successes stay not-ready and below Strong", () => {
    const history = validMasteryHistory();
    const mastered = reduceConceptMastery(CONCEPT, history);
    expect(mastered.status).toBe("mastered");
    expect(mastered.dimensionRecovery.production.recovered).toBe(true);

    const afterLapse = reduceConceptMastery(CONCEPT, [
      ...history,
      productionTask(900, "2026-01-10T13:00:00.000Z", "incorrect"),
    ]);
    expect(afterLapse.dimensionRecovery.production.recovered).toBe(false);
    expect(afterLapse.dimensionRecovery.production.latestLapseEventId).toBe(eid(900));
    expect(afterLapse.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(0);
    expect(afterLapse.dimensions.production.strongEvidenceCount).toBe(
      mastered.dimensions.production.strongEvidenceCount,
    );
    expect(afterLapse.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(afterLapse.status);

    const recallOnly = reduceConceptMastery(CONCEPT, [
      ...history,
      productionTask(900, "2026-01-10T13:00:00.000Z", "incorrect"),
      ...recallOnlyDays(1000, ["2026-01-12", "2026-01-14"]),
    ]);
    expect(recallOnly.stability.delayedCheckpoints.length).toBeGreaterThanOrEqual(2);
    expect(recallOnly.dimensionRecovery.production.recovered).toBe(false);
    expect(recallOnly.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(0);
    expect(recallOnly.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(recallOnly.status);
  });

  it("sufficient post-lapse production strong evidence recovers dimension; mastery needs spacing", () => {
    const history = validMasteryHistory();
    const base = [
      ...history,
      productionTask(900, "2026-01-10T13:00:00.000Z", "incorrect"),
      ...recallOnlyDays(1000, ["2026-01-12", "2026-01-14"]),
    ];

    // One strong production — below default minStrongEvidencePerDimension (2).
    const oneStrong = reduceConceptMastery(CONCEPT, [
      ...base,
      productionTask(1100, "2026-01-14T13:00:00.000Z", "correct"),
    ]);
    expect(oneStrong.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(1);
    expect(oneStrong.dimensionRecovery.production.recovered).toBe(false);
    expect(oneStrong.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(oneStrong.status);

    // Dimension recovered via second strong production on an already-checkpointed day —
    // global spacing already earned via recall days, so readiness/mastery return.
    const recovered = reduceConceptMastery(CONCEPT, [
      ...base,
      productionTask(1100, "2026-01-14T13:00:00.000Z", "correct"),
      productionTask(1101, "2026-01-14T13:05:00.000Z", "correct"),
    ]);
    expect(recovered.dimensionRecovery.production.recovered).toBe(true);
    expect(recovered.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(2);
    expect(recovered.stability.readyForMastery).toBe(true);
    expect(recovered.status).toBe("mastered");

    // Recover dimension without re-earning spaced checkpoints after a later lapse clear.
    const dimOnly = reduceConceptMastery(CONCEPT, [
      ...history,
      productionTask(900, "2026-01-10T13:00:00.000Z", "incorrect"),
      productionTask(1100, "2026-01-10T13:10:00.000Z", "correct"),
      productionTask(1101, "2026-01-10T13:15:00.000Z", "correct"),
    ]);
    expect(dimOnly.dimensionRecovery.production.recovered).toBe(true);
    expect(dimOnly.stability.delayedCheckpoints.length).toBeLessThan(
      DEFAULT_MASTERY_POLICY.minDelayedCheckpoints,
    );
    expect(dimOnly.stability.readyForMastery).toBe(false);
    expect(dimOnly.status).not.toBe("mastered");
  });

  it("partial production lapse behaves identically to incorrect", () => {
    const history = validMasteryHistory();
    const partialEvent = {
      ...productionTask(901, "2026-01-10T13:00:00.000Z", "incorrect"),
      graderOutcome: "partial" as const,
    };
    const after = reduceConceptMastery(CONCEPT, [...history, partialEvent]);
    expect(after.dimensionRecovery.production.recovered).toBe(false);
    expect(after.dimensionRecovery.production.latestLapseEventId).toBe(eid(901));
    expect(after.dimensions.production.partials).toBeGreaterThan(0);
    expect(after.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(after.status);

    const recallOnly = reduceConceptMastery(CONCEPT, [
      ...history,
      partialEvent,
      ...recallOnlyDays(1000, ["2026-01-12", "2026-01-14"]),
    ]);
    expect(recallOnly.dimensionRecovery.production.recovered).toBe(false);
    expect(recallOnly.stability.readyForMastery).toBe(false);
    expect(["strong", "mastered"]).not.toContain(recallOnly.status);
  });

  it("lapse in a non-required dimension does not invalidate a custom policy", () => {
    const policy = validateMasteryPolicy({
      ...DEFAULT_MASTERY_POLICY,
      requiredDimensions: ["recall", "listening", "form", "production"],
    });
    expect(policy.requiredDimensions).not.toContain("recognition");

    const mastered = reduceConceptMastery(CONCEPT, validMasteryHistory(), policy);
    expect(mastered.status).toBe("mastered");
    expect(mastered.stability.readyForMastery).toBe(true);

    const afterRecognitionLapse = reduceConceptMastery(
      CONCEPT,
      [...validMasteryHistory(), mcq(900, "2026-01-10T09:00:00.000Z", "incorrect")],
      policy,
    );
    expect(afterRecognitionLapse.dimensionRecovery.recognition.recovered).toBe(false);
    expect(afterRecognitionLapse.dimensionRecovery.recognition.latestLapseEventId).toBe(
      eid(900),
    );
    // Recognition is not required — global readiness and mastery preserved.
    expect(afterRecognitionLapse.stability.readyForMastery).toBe(true);
    expect(afterRecognitionLapse.status).toBe("mastered");
    expect(afterRecognitionLapse.stability.delayedCheckpoints.length).toBe(
      mastered.stability.delayedCheckpoints.length,
    );
  });

  it("equal-timestamp lapse/success order is deterministic by event ID", () => {
    const ts = "2026-01-10T13:00:00.000Z";
    // eid(900) < eid(901) lexicographically → lapse first, then strong success counts since lapse.
    const lapseThenSuccess = reduceConceptMastery(CONCEPT, [
      ...validMasteryHistory(),
      productionTask(900, ts, "incorrect"),
      productionTask(901, ts, "correct"),
    ]);
    expect(lapseThenSuccess.appliedEventIds.slice(-2)).toEqual([eid(900), eid(901)]);
    expect(lapseThenSuccess.dimensionRecovery.production.latestLapseEventId).toBe(eid(900));
    expect(lapseThenSuccess.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(1);
    expect(lapseThenSuccess.dimensionRecovery.production.recovered).toBe(false);

    // eid(901) lapse after eid(900) success → success is pre-lapse; since-lapse stays 0.
    const successThenLapse = reduceConceptMastery(CONCEPT, [
      ...validMasteryHistory(),
      productionTask(900, ts, "correct"),
      productionTask(901, ts, "incorrect"),
    ]);
    expect(successThenLapse.appliedEventIds.slice(-2)).toEqual([eid(900), eid(901)]);
    expect(successThenLapse.dimensionRecovery.production.latestLapseEventId).toBe(eid(901));
    expect(successThenLapse.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(0);
    expect(successThenLapse.dimensionRecovery.production.recovered).toBe(false);
  });

  it("replay/out-of-order input derives identical recovery state", () => {
    const events = [
      productionTask(900, "2026-01-10T13:00:00.000Z", "incorrect"),
      ...validMasteryHistory(),
      productionTask(1101, "2026-01-14T13:05:00.000Z", "correct"),
      recall(1000, "2026-01-12T10:00:00.000Z", "correct"),
      productionTask(1100, "2026-01-14T13:00:00.000Z", "correct"),
      recall(1001, "2026-01-14T10:00:00.000Z", "correct"),
    ];
    const shuffled = [...events].reverse();
    const a = reduceConceptMastery(CONCEPT, events);
    const b = reduceConceptMastery(CONCEPT, shuffled);
    expect(a.dimensionRecovery).toEqual(b.dimensionRecovery);
    expect(a.stability).toEqual(b.stability);
    expect(a.status).toBe(b.status);
    expect(a.appliedEventIds).toEqual(b.appliedEventIds);
    expect(a.dimensionRecovery.production.recovered).toBe(true);
    expect(a.dimensionRecovery.production.strongEvidenceSinceLapse).toBe(2);
    expect(a.stability.readyForMastery).toBe(true);
    expect(a.status).toBe("mastered");
  });

  it("exposes immutable inspectable recovery evidence for all six dimensions", () => {
    const snap = reduceConceptMastery(CONCEPT, [
      ...validMasteryHistory(),
      productionTask(900, "2026-01-10T13:00:00.000Z", "incorrect"),
    ]);
    expect(Object.keys(snap.dimensionRecovery).sort()).toEqual([...MASTERY_DIMENSIONS].sort());
    for (const d of MASTERY_DIMENSIONS) {
      const rec = snap.dimensionRecovery[d];
      expect(typeof rec.strongEvidenceSinceLapse).toBe("number");
      expect(typeof rec.recovered).toBe("boolean");
      expect(
        rec.latestLapseTimestamp === null || typeof rec.latestLapseTimestamp === "string",
      ).toBe(true);
      expect(
        rec.latestLapseEventId === null || typeof rec.latestLapseEventId === "string",
      ).toBe(true);
      expect(Object.isFrozen(rec)).toBe(true);
    }
    expect(snap.dimensionRecovery.production.latestLapseTimestamp).toBe(
      "2026-01-10T13:00:00.000Z",
    );
    expect(snap.dimensionRecovery.recall.latestLapseEventId).toBeNull();
    expect(snap.dimensionRecovery.recall.recovered).toBe(true);
    expect(MASTERY_DIMENSIONS).toHaveLength(6);
    expect(snap).not.toHaveProperty("masteryPercent");
  });
});
