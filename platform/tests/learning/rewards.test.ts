import { describe, expect, it } from "vitest";
import {
  LEARNER_EVENT_SCHEMA_VERSION,
  RewardsError,
  createEmptyLearnerState,
  deriveRewards,
  exportLearnerStateJson,
  parseLearnerStateEnvelope,
  type PublishedContentResolver,
} from "@german-learning/learning";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const CONCEPT_ID = "lex:architekt";

function eventId(sequence: number): string {
  return `22222222-2222-4222-8222-${sequence.toString(16).padStart(12, "0")}`;
}

function baseEvent(
  sequence: number,
  timestamp: string,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  return {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    eventId: eventId(sequence),
    sessionId: SESSION_ID,
    timestamp,
    conceptId: CONCEPT_ID,
    sourceActivityMode: "mission",
    ...overrides,
  };
}

function objectiveEvent(
  sequence: number,
  timestamp: string,
  graderOutcome: "incorrect" | "partial" | "correct",
  options: {
    conceptId?: string;
    taskFamily?: "multipleChoice" | "typedRecall" | "formManipulation";
  } = {},
): Record<string, unknown> {
  const taskFamily = options.taskFamily ?? "multipleChoice";
  const dimension = {
    multipleChoice: "recognition",
    typedRecall: "recall",
    formManipulation: "form",
  }[taskFamily];
  return baseEvent(sequence, timestamp, {
    kind: "objectiveAttempt",
    conceptId: options.conceptId ?? CONCEPT_ID,
    taskFamily,
    graderOutcome,
    latencyMs: 800,
    hintsUsed: 0,
    measuredDimensions: [dimension],
  });
}

function selfRatedEvent(sequence: number, timestamp: string): Record<string, unknown> {
  return baseEvent(sequence, timestamp, {
    kind: "selfRatedAttempt",
    taskFamily: "flashcard",
    rating: "again",
    latencyMs: 500,
    hintsUsed: 0,
    measuredDimensions: ["recall"],
  });
}

function audioEvent(
  sequence: number,
  timestamp: string,
  linked: boolean,
): Record<string, unknown> {
  return baseEvent(sequence, timestamp, {
    kind: "audioInteraction",
    hasLinkedTask: linked,
    audioSpeed: 1,
    ...(linked
      ? { graderOutcome: "partial", latencyMs: 900, hintsUsed: 0 }
      : {}),
    measuredDimensions: linked ? ["listening"] : ["exposure", "listening"],
  });
}

function recordingEvent(
  sequence: number,
  timestamp: string,
  complete: boolean,
): Record<string, unknown> {
  return baseEvent(sequence, timestamp, {
    kind: "recordingCycle",
    listenCompleted: false,
    recordCompleted: true,
    playbackCompleted: complete,
    selfCheckCompleted: complete,
    measuredDimensions: ["production"],
  });
}

function exposureEvent(sequence: number, timestamp: string): Record<string, unknown> {
  return baseEvent(sequence, timestamp, {
    kind: "exposure",
    exposureKind: "page",
    measuredDimensions: ["exposure"],
  });
}

describe("P4C derived rewards — XP policy", () => {
  it("awards only the documented event-derived values", () => {
    const events = [
      exposureEvent(1, "2026-08-01T08:00:00.000Z"),
      audioEvent(2, "2026-08-01T08:01:00.000Z", false),
      objectiveEvent(3, "2026-08-01T08:02:00.000Z", "incorrect"),
      objectiveEvent(4, "2026-08-01T08:03:00.000Z", "partial", {
        taskFamily: "typedRecall",
      }),
      objectiveEvent(5, "2026-08-01T08:04:00.000Z", "correct", {
        taskFamily: "formManipulation",
      }),
      selfRatedEvent(6, "2026-08-01T08:05:00.000Z"),
      audioEvent(7, "2026-08-01T08:06:00.000Z", true),
      recordingEvent(8, "2026-08-01T08:07:00.000Z", false),
      recordingEvent(9, "2026-08-01T08:08:00.000Z", true),
    ];

    const rewards = deriveRewards(events, {
      now: "2026-08-01T12:00:00.000Z",
      timezone: "UTC",
    });

    expect(rewards.totalXp).toBe(33);
    expect(rewards.meaningfulEventCount).toBe(6);
    expect(rewards.meaningfulDayCount).toBe(1);
    expect(rewards.dailyXpRows).toEqual([
      { localDate: "2026-08-01", xp: 33, meaningfulEventCount: 6 },
    ]);
  });

  it("deduplicates exact event IDs, is input-order independent, and rejects conflicts", () => {
    const first = objectiveEvent(10, "2026-08-01T08:00:00.000Z", "correct");
    const second = objectiveEvent(11, "2026-08-02T08:00:00.000Z", "partial");
    const options = { now: new Date("2026-08-02T12:00:00.000Z"), timezone: "UTC" };

    const forward = deriveRewards([first, second, first], options);
    const reversed = deriveRewards([second, first], options);
    expect(forward).toEqual(reversed);
    expect(forward.totalXp).toBe(15);
    expect(forward.meaningfulEventCount).toBe(2);

    const conflict = { ...first, graderOutcome: "incorrect" };
    expect(() => deriveRewards([first, conflict], options)).toThrow(RewardsError);
    try {
      deriveRewards([first, conflict], options);
    } catch (error) {
      expect((error as RewardsError).code).toBe("CONFLICTING_EVENT_ID");
    }
  });

  it("caps a concept/kind/task-family signature at three awards per local day", () => {
    const events = [
      ...Array.from({ length: 5 }, (_, index) =>
        objectiveEvent(20 + index, `2026-08-01T08:0${index}:00.000Z`, "correct"),
      ),
      objectiveEvent(30, "2026-08-01T09:00:00.000Z", "correct", {
        taskFamily: "typedRecall",
      }),
      objectiveEvent(31, "2026-08-01T10:00:00.000Z", "correct", {
        conceptId: "lex:aerztin",
      }),
      objectiveEvent(32, "2026-08-02T08:00:00.000Z", "correct"),
    ];

    const rewards = deriveRewards(events, {
      now: "2026-08-02T12:00:00.000Z",
      timezone: "UTC",
    });

    expect(rewards.totalXp).toBe(60);
    expect(rewards.meaningfulEventCount).toBe(6);
    expect(rewards.dailyXpRows).toEqual([
      { localDate: "2026-08-01", xp: 50, meaningfulEventCount: 5 },
      { localDate: "2026-08-02", xp: 10, meaningfulEventCount: 1 },
    ]);
  });

  it("uses full accepted timestamp precision when selecting the first three capped events", () => {
    const events = [
      objectiveEvent(200, "2026-08-01T08:00:00.000000004Z", "incorrect"),
      objectiveEvent(203, "2026-08-01T08:00:00.000000001Z", "correct"),
      objectiveEvent(202, "2026-08-01T08:00:00.000000002Z", "incorrect"),
      objectiveEvent(201, "2026-08-01T08:00:00.000000003Z", "partial"),
    ];

    const rewards = deriveRewards(events, {
      now: "2026-08-01T09:00:00.000000000Z",
      timezone: "UTC",
    });

    expect(rewards.totalXp).toBe(17);
    expect(rewards.meaningfulEventCount).toBe(3);
  });

  it("does not pre-award future events or let them erase a current streak", () => {
    const rewards = deriveRewards(
      [
        objectiveEvent(210, "2026-08-01T08:00:00.000Z", "correct"),
        objectiveEvent(211, "2026-08-02T08:00:00.000Z", "correct"),
      ],
      { now: "2026-08-01T12:00:00.000Z", timezone: "UTC" },
    );

    expect(rewards.totalXp).toBe(10);
    expect(rewards.meaningfulDayCount).toBe(1);
    expect(rewards.currentStreak).toBe(1);
    expect(rewards.longestStreak).toBe(1);
  });
});

describe("P4C derived rewards — local calendar streaks", () => {
  it("groups events by the configured timezone instead of slicing UTC timestamps", () => {
    const rewards = deriveRewards(
      [
        objectiveEvent(40, "2026-01-02T00:30:00.000Z", "correct"),
        objectiveEvent(41, "2026-01-02T07:30:00.000Z", "correct", {
          taskFamily: "typedRecall",
        }),
      ],
      {
        now: "2026-01-02T20:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
    );

    expect(rewards.dailyXpRows.map((row) => row.localDate)).toEqual(["2026-01-01"]);
    expect(rewards.currentStreak).toBe(1);
  });

  it("counts consecutive calendar dates safely across a DST transition", () => {
    const rewards = deriveRewards(
      [
        objectiveEvent(50, "2026-03-07T17:00:00.000Z", "correct"),
        objectiveEvent(51, "2026-03-08T16:00:00.000Z", "correct"),
        objectiveEvent(52, "2026-03-09T16:00:00.000Z", "correct"),
      ],
      {
        now: "2026-03-09T20:00:00.000Z",
        timezone: "America/New_York",
      },
    );

    expect(rewards.currentStreak).toBe(3);
    expect(rewards.longestStreak).toBe(3);
    expect(rewards.meaningfulDayCount).toBe(3);
  });

  it("keeps accepted four-digit early years canonical and consecutive", () => {
    const rewards = deriveRewards(
      [
        objectiveEvent(220, "0099-12-31T12:00:00.000Z", "correct"),
        objectiveEvent(221, "0100-01-01T12:00:00.000Z", "correct"),
      ],
      { now: "0100-01-01T20:00:00.000Z", timezone: "UTC" },
    );

    expect(rewards.dailyXpRows.map((row) => row.localDate)).toEqual([
      "0099-12-31",
      "0100-01-01",
    ]);
    expect(rewards.currentStreak).toBe(2);
    expect(rewards.longestStreak).toBe(2);
  });

  it("returns zero current streak when the latest meaningful day is older than yesterday", () => {
    const rewards = deriveRewards(
      [objectiveEvent(60, "2026-08-01T08:00:00.000Z", "correct")],
      { now: "2026-08-04T08:00:00.000Z", timezone: "UTC" },
    );

    expect(rewards.currentStreak).toBe(0);
    expect(rewards.longestStreak).toBe(1);
  });
});

describe("P4C derived rewards — badges and integrity", () => {
  it("derives the five evidence-backed badges without inventing listening progress", () => {
    const events: Record<string, unknown>[] = [];
    for (let day = 1; day <= 7; day += 1) {
      const date = `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`;
      events.push(objectiveEvent(70 + day, date, "correct"));
    }
    events.push(
      objectiveEvent(90, "2026-08-02T09:00:00.000Z", "correct", {
        taskFamily: "typedRecall",
      }),
      objectiveEvent(91, "2026-08-03T09:00:00.000Z", "correct", {
        taskFamily: "formManipulation",
      }),
      recordingEvent(92, "2026-08-04T09:00:00.000Z", true),
    );

    const rewards = deriveRewards(events, {
      now: "2026-08-07T20:00:00.000Z",
      timezone: "UTC",
    });

    expect(rewards.badges).toHaveLength(5);
    expect(rewards.badges.every((item) => item.earned)).toBe(true);
    expect(rewards.badges.every((item) => !item.locked)).toBe(true);
    expect(rewards.badges.map((item) => item.id)).toEqual([
      "first-meaningful-attempt",
      "three-dimensions-practised",
      "same-concept-two-days",
      "spoken-recording-cycle",
      "seven-day-streak",
    ]);
    expect(rewards.badges.find((item) => item.id === "seven-day-streak")).toMatchObject({
      earnedLocalDate: "2026-08-07",
      evidenceCount: 7,
    });
    expect(rewards.badges.some((item) => item.id.includes("listening"))).toBe(false);
  });

  it("returns a deeply immutable projection", () => {
    const rewards = deriveRewards(
      [objectiveEvent(100, "2026-08-01T08:00:00.000Z", "correct")],
      { now: "2026-08-01T12:00:00.000Z", timezone: "UTC" },
    );

    expect(Object.isFrozen(rewards)).toBe(true);
    expect(Object.isFrozen(rewards.dailyXpRows)).toBe(true);
    expect(Object.isFrozen(rewards.dailyXpRows[0])).toBe(true);
    expect(Object.isFrozen(rewards.badges)).toBe(true);
    expect(Object.isFrozen(rewards.badges[0])).toBe(true);
    expect(() => {
      (rewards.dailyXpRows as DailyRowMutationTarget).push({
        localDate: "2099-01-01",
        xp: 999,
        meaningfulEventCount: 1,
      });
    }).toThrow();
  });

  it("fails closed for malformed events, impossible dates, now, and timezones", () => {
    expect(() =>
      deriveRewards([exposureEvent(110, "2026-02-30T08:00:00.000Z")], {
        now: "2026-08-01T12:00:00.000Z",
        timezone: "UTC",
      }),
    ).toThrow();
    expect(() =>
      deriveRewards([{ kind: "telepathy" }], {
        now: "2026-08-01T12:00:00.000Z",
        timezone: "UTC",
      }),
    ).toThrow();
    expect(() =>
      deriveRewards([], { now: "2026-02-30T12:00:00.000Z", timezone: "UTC" }),
    ).toThrow(RewardsError);
    expect(() =>
      deriveRewards([], {
        now: "2026-08-01T12:00:00.000Z",
        timezone: "Mars/Olympus_Mons",
      }),
    ).toThrow(RewardsError);
    expect(() =>
      deriveRewards([], {
        now: "2026-08-01T12:00:00.000Z",
        timezone: "+03:30",
      }),
    ).toThrow(RewardsError);
  });

  it("does not add derived reward authority to serialized learner state", () => {
    const contentBundle = { schemaVersion: "1.0.0", bundleId: "alpha-lessons-01-02" };
    const publishedIds: PublishedContentResolver = {
      isPublished: (id) => id === CONCEPT_ID,
      entityKind: (id) => (id === CONCEPT_ID ? "Concept" : null),
      lessonOwnsStage: () => false,
      stageOwnsActivity: () => false,
    };
    const event = objectiveEvent(120, "2026-08-01T08:00:00.000Z", "correct");
    const emptyState = createEmptyLearnerState({ contentBundle });
    const state = parseLearnerStateEnvelope(
      { ...emptyState, events: [event] },
      { publishedIds, expectedContentBundle: contentBundle },
    );
    expect(
      deriveRewards(state.events, {
        now: "2026-08-01T12:00:00.000Z",
        timezone: "UTC",
      }).totalXp,
    ).toBe(10);
    const json = exportLearnerStateJson(state, {
      exportedAt: "2026-08-01T12:00:00.000Z",
      publishedIds,
      expectedContentBundle: contentBundle,
    });
    const serialized = JSON.parse(json) as Record<string, unknown>;

    const forbiddenRewardFields = [
      "xp",
      "totalXp",
      "streak",
      "currentStreak",
      "longestStreak",
      "badge",
      "badges",
      "rewards",
      "dailyXpRows",
      "meaningfulEventCount",
      "meaningfulDayCount",
    ];
    for (const forbidden of forbiddenRewardFields) {
      expect(JSON.stringify(serialized)).not.toContain(`\"${forbidden}\"`);
    }

    const rewardView = deriveRewards(state.events, {
      now: "2026-08-01T12:00:00.000Z",
      timezone: "UTC",
    });
    for (const [field, value] of [
      ["rewards", rewardView],
      ["totalXp", rewardView.totalXp],
      ["currentStreak", rewardView.currentStreak],
      ["longestStreak", rewardView.longestStreak],
      ["badges", rewardView.badges],
    ] as const) {
      expect(() =>
        parseLearnerStateEnvelope(
          { ...state, [field]: value },
          { publishedIds, expectedContentBundle: contentBundle },
        ),
      ).toThrow();
    }
  });
});

type DailyRowMutationTarget = Array<{
  localDate: string;
  xp: number;
  meaningfulEventCount: number;
}>;
