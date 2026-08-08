/**
 * C2D / C2DR1 / C2DR2 / C2DR3 — versioned learner-state persistence, export/import, adapters.
 * Evidence: LRN-003 reload derivation, HUB-003 tags/notes export, REV-002 export/import.
 */

import { describe, expect, it } from "vitest";
import {
  LEARNER_EVENT_SCHEMA_VERSION,
  LEARNER_STATE_SCHEMA_VERSION,
  MASTERY_REDUCER_VERSION,
  PERSISTENCE_LIMITS,
  PersistenceError,
  REVIEW_SCHEDULER_ID,
  REVIEW_SCHEDULER_VERSION,
  createEmptyLearnerState,
  createInMemoryLearnerStateAdapter,
  createKeyValueLearnerStateAdapter,
  createMigrationRegistry,
  createNewReviewCard,
  exportLearnerStateJson,
  hydrateLearnerState,
  importLearnerStateJson,
  loadAndHydrateLearnerState,
  parseLearnerStateEnvelope,
  parseLearnerStateJson,
  reduceAllConceptMastery,
  serializeCanonicalLearnerState,
  type BrowserLikeKeyValueStore,
  type ContentBundleIdentity,
  type HydrateOptions,
  type LearnerStateEnvelope,
  type ParseLearnerStateOptions,
  type PublishedContentEntityKind,
  type PublishedContentResolver,
} from "@german-learning/learning";

const NOW = new Date("2026-08-08T12:00:00.000Z");
const EXPORT_AT = "2026-08-08T15:00:00.000Z";
const SESSION = "11111111-1111-4111-8111-111111111111";

const EXPECTED_BUNDLE: ContentBundleIdentity = Object.freeze({
  schemaVersion: "1.0.0",
  bundleId: "alpha-lessons-01-02",
});

/** Explicit kind map — tests must not rely on id-prefix inference. */
const ENTITY_KINDS: Readonly<Record<string, PublishedContentEntityKind>> =
  Object.freeze({
    "lesson:01": "Lesson",
    "activity:01-overview": "LearningActivity",
    "lex:ingenieur": "Concept",
    "lex:arzt": "Concept",
    "lex:published-only": "Concept",
    "template:recall-de": "Template",
    "template:recognition-de": "Template",
  });

const LESSON_STAGES: Readonly<Record<string, ReadonlySet<string>>> =
  Object.freeze({
    "lesson:01": Object.freeze(
      new Set(["stage:learn", "stage:practise"]),
    ) as ReadonlySet<string>,
  });

const STAGE_ACTIVITIES: Readonly<Record<string, ReadonlySet<string>>> =
  Object.freeze({
    "lesson:01\0stage:learn": Object.freeze(
      new Set(["activity:01-overview"]),
    ) as ReadonlySet<string>,
    "lesson:01\0stage:practise": Object.freeze(
      new Set(["activity:01-overview"]),
    ) as ReadonlySet<string>,
  });

function makePublishedResolver(
  kinds: Readonly<Record<string, PublishedContentEntityKind>> = ENTITY_KINDS,
  lessonStages: Readonly<Record<string, ReadonlySet<string>>> = LESSON_STAGES,
  stageActivities: Readonly<
    Record<string, ReadonlySet<string>>
  > = STAGE_ACTIVITIES,
): PublishedContentResolver {
  return {
    isPublished: (id) => Object.prototype.hasOwnProperty.call(kinds, id),
    entityKind: (id) => kinds[id] ?? null,
    lessonOwnsStage: (lessonId, stageId) =>
      lessonStages[lessonId]?.has(stageId) ?? false,
    stageOwnsActivity: (lessonId, stageId, activityId) =>
      stageActivities[`${lessonId}\0${stageId}`]?.has(activityId) ?? false,
  };
}

const publishedIds: PublishedContentResolver = makePublishedResolver();

const parseOpts: ParseLearnerStateOptions = {
  publishedIds,
  expectedContentBundle: EXPECTED_BUNDLE,
};

const hydrateOpts: HydrateOptions = {
  publishedIds,
  expectedContentBundle: EXPECTED_BUNDLE,
  now: NOW,
};

const adapterOpts = {
  publishedIds,
  expectedContentBundle: EXPECTED_BUNDLE,
};

const exportOpts = {
  exportedAt: EXPORT_AT,
  publishedIds,
  expectedContentBundle: EXPECTED_BUNDLE,
};

function eid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `22222222-2222-4222-8222-${hex}`;
}

function nid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `aaaaaaaa-aaaa-4aaa-8aaa-${hex}`;
}

function rid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `bbbbbbbb-bbbb-4bbb-8bbb-${hex}`;
}

function recallEvent(
  n: number,
  ts: string,
  outcome: "correct" | "partial" | "incorrect",
  conceptId = "lex:ingenieur",
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "objectiveAttempt",
    eventId: eid(n),
    sessionId: SESSION,
    timestamp: ts,
    conceptId,
    taskFamily: "typedRecall",
    graderOutcome: outcome,
    latencyMs: 900,
    hintsUsed: 0,
    measuredDimensions: ["recall"],
    sourceActivityMode: "recall",
    ...extras,
  };
}

function reviewedCard(partial: {
  cardId: string;
  conceptId: string;
  templateId: string;
  due: string;
  lastReview: string;
  lapses?: number;
  reps?: number;
  state?: "review" | "relearning" | "learning";
}): Record<string, unknown> {
  return {
    cardId: partial.cardId,
    conceptId: partial.conceptId,
    templateId: partial.templateId,
    measuredDimension: "recall",
    due: partial.due,
    stability: 5,
    difficulty: 5,
    elapsedDays: 3,
    scheduledDays: 5,
    reps: partial.reps ?? 3,
    lapses: partial.lapses ?? 0,
    state: partial.state ?? "review",
    lastReview: partial.lastReview,
    schedulerId: REVIEW_SCHEDULER_ID,
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
  };
}

function baseEnvelope(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
    masteryReducerVersion: MASTERY_REDUCER_VERSION,
    reviewSchedulerVersion: REVIEW_SCHEDULER_VERSION,
    learnerEventSchemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    contentBundle: { ...EXPECTED_BUNDLE },
    settings: { preferredAudioSpeed: 1, timezone: "Europe/Berlin" },
    resume: null,
    tags: [],
    notes: [],
    events: [],
    reviewCards: [],
    recordings: [],
    ...overrides,
  };
}

function parse(raw: unknown): LearnerStateEnvelope {
  return parseLearnerStateEnvelope(raw, parseOpts);
}

function memoryStore(): {
  store: BrowserLikeKeyValueStore;
  map: Map<string, string>;
} {
  const map = new Map<string, string>();
  return {
    map,
    store: {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        map.set(k, v);
      },
      removeItem: (k) => {
        map.delete(k);
      },
    },
  };
}

describe("C2D persistence — empty state and schema pins", () => {
  it("creates empty envelope with current version pins", () => {
    const empty = createEmptyLearnerState({
      contentBundle: { ...EXPECTED_BUNDLE },
    });
    expect(empty.schemaVersion).toBe("1.0.0");
    expect(empty.masteryReducerVersion).toBe(MASTERY_REDUCER_VERSION);
    expect(empty.reviewSchedulerVersion).toBe(REVIEW_SCHEDULER_VERSION);
    expect(empty.events).toEqual([]);
    expect(empty.resume).toBeNull();
  });

  it("rejects unsupported future envelope schemaVersion", () => {
    expect(() =>
      parse(baseEnvelope({ schemaVersion: "9.9.9" })),
    ).toThrow(PersistenceError);
    try {
      parse(baseEnvelope({ schemaVersion: "9.9.9" }));
    } catch (e) {
      expect(e).toBeInstanceOf(PersistenceError);
      expect((e as PersistenceError).code).toBe("UNSUPPORTED_VERSION");
    }
  });

  it("rejects unsupported masteryReducerVersion", () => {
    try {
      parse(baseEnvelope({ masteryReducerVersion: "2.0.0" }));
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNSUPPORTED_VERSION");
      expect((e as PersistenceError).field).toBe("masteryReducerVersion");
    }
  });

  it("rejects unsupported reviewSchedulerVersion", () => {
    try {
      parse(baseEnvelope({ reviewSchedulerVersion: "2.0.0" }));
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNSUPPORTED_VERSION");
    }
  });

  it("rejects unsupported content bundle schemaVersion", () => {
    try {
      parse(
        baseEnvelope({
          contentBundle: { schemaVersion: "9.0.0", bundleId: EXPECTED_BUNDLE.bundleId },
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNSUPPORTED_VERSION");
    }
  });
});

describe("C2D persistence — adapter immutability and replace semantics", () => {
  it("in-memory load returns null when empty", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    expect(await adapter.load()).toBeNull();
  });

  it("in-memory replace/load/clear round-trip with freeze detachment", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    const state = parse(
      baseEnvelope({
        tags: [{ contentId: "lex:ingenieur", tag: "Favorite" }],
      }),
    );
    await adapter.replace(state);
    const loaded = await adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.tags).toEqual(state.tags);
    // Mutating returned object must not affect storage (frozen + detached copy)
    expect(() => {
      (loaded as unknown as { tags: unknown[] }).tags = [];
    }).toThrow();
    expect(() => {
      (loaded!.tags as unknown as { contentId: string; tag: string }[]).push({
        contentId: "lex:arzt",
        tag: "Exam",
      });
    }).toThrow();
    const again = await adapter.load();
    expect(again!.tags).toHaveLength(1);
    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });

  it("replace fully overwrites prior state (no merge)", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    await adapter.replace(
      parse(
        baseEnvelope({
          events: [recallEvent(1, "2026-08-01T10:00:00.000Z", "correct")],
          tags: [{ contentId: "lex:ingenieur", tag: "Difficult" }],
        }),
      ),
    );
    await adapter.replace(parse(baseEnvelope()));
    const loaded = await adapter.load();
    expect(loaded!.events).toHaveLength(0);
    expect(loaded!.tags).toHaveLength(0);
  });

  it("key-value adapter persists canonical JSON", async () => {
    const { store, map } = memoryStore();
    const adapter = createKeyValueLearnerStateAdapter({
      store,
      ...adapterOpts,
    });
    const state = parse(
      baseEnvelope({
        notes: [
          {
            noteId: nid(1),
            contentId: "lex:ingenieur",
            text: "remember article",
            updatedAt: "2026-08-07T10:00:00.000Z",
          },
        ],
      }),
    );
    await adapter.replace(state);
    expect(map.size).toBe(1);
    const loaded = await adapter.load();
    expect(loaded!.notes[0]!.text).toBe("remember article");
    await adapter.clear();
    expect(map.size).toBe(0);
  });

  it("key-value getItem failure surfaces STORAGE_FAILURE", async () => {
    const store: BrowserLikeKeyValueStore = {
      getItem: () => {
        throw new Error("boom");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const adapter = createKeyValueLearnerStateAdapter({ store, ...adapterOpts });
    await expect(adapter.load()).rejects.toMatchObject({
      code: "STORAGE_FAILURE",
    });
  });

  it("key-value setItem failure surfaces STORAGE_FAILURE", async () => {
    const store: BrowserLikeKeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    const adapter = createKeyValueLearnerStateAdapter({ store, ...adapterOpts });
    await expect(adapter.replace(parse(baseEnvelope()))).rejects.toMatchObject({
      code: "STORAGE_FAILURE",
    });
  });

  it("caller cannot mutate frozen parsed envelope arrays", () => {
    const state = parse(
      baseEnvelope({
        tags: [{ contentId: "lex:ingenieur", tag: "Exam" }],
      }),
    );
    expect(Object.isFrozen(state)).toBe(true);
    expect(() => {
      (state.tags as { contentId: string; tag: string }[]).push({
        contentId: "lex:arzt",
        tag: "Favorite",
      });
    }).toThrow();
  });
});

describe("C2D persistence — canonical export byte equality", () => {
  it("same logical state + same timestamp is byte-identical", () => {
    const a = parse(
      baseEnvelope({
        tags: [
          { contentId: "lex:arzt", tag: "Teacher" },
          { contentId: "lex:ingenieur", tag: "Favorite" },
        ],
        events: [
          recallEvent(2, "2026-08-02T10:00:00.000Z", "correct"),
          recallEvent(1, "2026-08-01T10:00:00.000Z", "correct"),
        ],
      }),
    );
    const b = parse(
      baseEnvelope({
        events: [
          recallEvent(1, "2026-08-01T10:00:00.000Z", "correct"),
          recallEvent(2, "2026-08-02T10:00:00.000Z", "correct"),
        ],
        tags: [
          { contentId: "lex:ingenieur", tag: "Favorite" },
          { contentId: "lex:arzt", tag: "Teacher" },
        ],
      }),
    );
    const ja = exportLearnerStateJson(a, exportOpts);
    const jb = exportLearnerStateJson(b, exportOpts);
    expect(ja).toBe(jb);
  });

  it("export metadata declares includesRawAudioBytes false", () => {
    const json = exportLearnerStateJson(parse(baseEnvelope()), exportOpts);
    const obj = JSON.parse(json) as { exportMeta: { includesRawAudioBytes: boolean } };
    expect(obj.exportMeta.includesRawAudioBytes).toBe(false);
  });

  it("stable ordering sorts tags/notes/events/cards by id", () => {
    const state = parse(
      baseEnvelope({
        tags: [
          { contentId: "lex:arzt", tag: "Difficult" },
          { contentId: "lex:ingenieur", tag: "Confusing" },
        ],
      }),
    );
    expect(state.tags[0]!.contentId).toBe("lex:arzt");
    const json = serializeCanonicalLearnerState(state);
    const parsed = JSON.parse(json) as { tags: Array<{ contentId: string }> };
    expect(parsed.tags[0]!.contentId).toBe("lex:arzt");
  });

  it("rejects invalid exportedAt", () => {
    expect(() =>
      exportLearnerStateJson(parse(baseEnvelope()), {
        ...exportOpts,
        exportedAt: "not-a-date",
      }),
    ).toThrow(PersistenceError);
  });
});

describe("C2D persistence — hydrate, mastery replay, due cards", () => {
  it("replays multi-concept events including lapse recovery", () => {
    const events = [
      recallEvent(1, "2026-08-01T10:00:00.000Z", "correct"),
      recallEvent(2, "2026-08-01T11:00:00.000Z", "correct"),
      recallEvent(3, "2026-08-02T10:00:00.000Z", "incorrect"), // lapse
      recallEvent(4, "2026-08-03T10:00:00.000Z", "correct"),
      recallEvent(5, "2026-08-03T11:00:00.000Z", "correct"), // recovery strong×2
      recallEvent(10, "2026-08-01T10:00:00.000Z", "correct", "lex:arzt"),
      recallEvent(11, "2026-08-01T11:00:00.000Z", "correct", "lex:arzt"),
    ];
    const cards = [
      reviewedCard({
        cardId: "card:ing-recall",
        conceptId: "lex:ingenieur",
        templateId: "template:recall-de",
        due: "2026-08-07T12:00:00.000Z",
        lastReview: "2026-08-04T12:00:00.000Z",
        lapses: 1,
        reps: 4,
      }),
      reviewedCard({
        cardId: "card:arzt-recall",
        conceptId: "lex:arzt",
        templateId: "template:recognition-de",
        due: "2026-08-20T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    ];
    const state = parse(
      baseEnvelope({
        events,
        reviewCards: cards,
        tags: [
          { contentId: "lex:ingenieur", tag: "Difficult" },
          { contentId: "lex:arzt", tag: "Favorite" },
        ],
        notes: [
          {
            noteId: nid(1),
            contentId: "lex:ingenieur",
            text: "der Ingenieur",
            updatedAt: "2026-08-06T09:00:00.000Z",
          },
        ],
        resume: {
          lessonId: "lesson:01",
          activityId: "activity:01-overview",
          stageId: "stage:learn",
          position: 2,
        },
      }),
    );

    const hydration = hydrateLearnerState(state, hydrateOpts);

    const ing = hydration.masteryByConcept.get("lex:ingenieur")!;
    expect(ing.dimensionRecovery.recall.recovered).toBe(true);
    expect(ing.dimensionRecovery.recall.latestLapseEventId).toBe(eid(3));
    expect(hydration.dueCards.map((c) => c.cardId)).toEqual(["card:ing-recall"]);
    expect(hydration.state.resume?.position).toBe(2);
    expect(hydration.state.notes[0]!.text).toBe("der Ingenieur");

    // Direct reducer equivalence
    const direct = reduceAllConceptMastery(events);
    expect(ing.status).toBe(direct.get("lex:ingenieur")!.status);
    expect(ing.dimensionRecovery.recall).toEqual(
      direct.get("lex:ingenieur")!.dimensionRecovery.recall,
    );
  });

  it("export → import → reload reproduces mastery, due, tags, notes, resume", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    const events = [
      recallEvent(1, "2026-08-01T10:00:00.000Z", "correct"),
      recallEvent(2, "2026-08-01T11:00:00.000Z", "correct"),
      recallEvent(3, "2026-08-02T10:00:00.000Z", "incorrect"),
      recallEvent(4, "2026-08-03T10:00:00.000Z", "correct"),
      recallEvent(5, "2026-08-03T11:00:00.000Z", "correct"),
    ];
    const original = parse(
      baseEnvelope({
        events,
        reviewCards: [
          reviewedCard({
            cardId: "card:ing-recall",
            conceptId: "lex:ingenieur",
            templateId: "template:recall-de",
            due: "2026-08-07T12:00:00.000Z",
            lastReview: "2026-08-04T12:00:00.000Z",
            lapses: 1,
            reps: 4,
          }),
        ],
        tags: [{ contentId: "lex:ingenieur", tag: "Confusing" }],
        notes: [
          {
            noteId: nid(2),
            contentId: "lex:ingenieur",
            text: "note-A",
            updatedAt: "2026-08-06T09:00:00.000Z",
          },
        ],
        resume: {
          lessonId: "lesson:01",
          activityId: "activity:01-overview",
          stageId: "stage:practise",
          position: 5,
        },
        recordings: [
          {
            recordingId: rid(1),
            conceptId: "lex:ingenieur",
            createdAt: "2026-08-06T12:00:00.000Z",
            mimeType: "audio/webm",
            byteLength: 2048,
            gestureProduced: true,
            pronunciationAccuracy: null,
          },
        ],
      }),
    );

    const h1 = hydrateLearnerState(original, hydrateOpts);
    await adapter.replace(h1.state);

    const json = exportLearnerStateJson(h1.state, exportOpts);
    await adapter.clear();
    await adapter.replace(
      parse(
        baseEnvelope({
          tags: [{ contentId: "lex:arzt", tag: "Exam" }],
        }),
      ),
    );

    const h2 = await importLearnerStateJson(adapter, json, {
      ...adapterOpts,
      now: NOW,
    });

    expect(h2.state.resume?.position).toBe(5);
    expect(h2.state.tags).toEqual([{ contentId: "lex:ingenieur", tag: "Confusing" }]);
    expect(h2.state.notes[0]!.text).toBe("note-A");
    expect(h2.state.recordings[0]!.pronunciationAccuracy).toBeNull();
    expect(h2.dueCards[0]!.due).toBe("2026-08-07T12:00:00.000Z");
    expect(h2.masteryByConcept.get("lex:ingenieur")!.dimensionRecovery.recall).toEqual(
      h1.masteryByConcept.get("lex:ingenieur")!.dimensionRecovery.recall,
    );

    const reloaded = await loadAndHydrateLearnerState(adapter, hydrateOpts);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.state.resume).toEqual(h2.state.resume);
    expect(
      reloaded!.masteryByConcept.get("lex:ingenieur")!.appliedEventIds,
    ).toEqual(h2.masteryByConcept.get("lex:ingenieur")!.appliedEventIds);
  });
});

describe("C2D persistence — transactional rollback on malformed import", () => {
  async function seedAdapter() {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    const seeded = parse(
      baseEnvelope({
        tags: [{ contentId: "lex:ingenieur", tag: "Favorite" }],
        notes: [
          {
            noteId: nid(9),
            contentId: "lex:ingenieur",
            text: "keep-me",
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ],
      }),
    );
    await adapter.replace(seeded);
    return adapter;
  }

  async function expectUnchanged(
    adapter: ReturnType<typeof createInMemoryLearnerStateAdapter>,
    json: string,
  ) {
    await expect(
      importLearnerStateJson(adapter, json, { ...adapterOpts, now: NOW }),
    ).rejects.toBeInstanceOf(PersistenceError);
    const loaded = await adapter.load();
    expect(loaded!.tags[0]!.tag).toBe("Favorite");
    expect(loaded!.notes[0]!.text).toBe("keep-me");
  }

  it("rolls back on unknown future version", async () => {
    const adapter = await seedAdapter();
    const bad = {
      ...baseEnvelope(),
      schemaVersion: "99.0.0",
    };
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on oversize JSON", async () => {
    const adapter = await seedAdapter();
    const huge = "x".repeat(PERSISTENCE_LIMITS.maxJsonBytes + 10);
    await expectUnchanged(adapter, huge);
  });

  it("rolls back on duplicate event IDs", async () => {
    const adapter = await seedAdapter();
    const bad = baseEnvelope({
      events: [
        recallEvent(1, "2026-08-01T10:00:00.000Z", "correct"),
        recallEvent(1, "2026-08-01T11:00:00.000Z", "correct"),
      ],
    });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on duplicate card IDs", async () => {
    const adapter = await seedAdapter();
    const card = reviewedCard({
      cardId: "card:dup",
      conceptId: "lex:ingenieur",
      templateId: "template:recall-de",
      due: "2026-08-07T12:00:00.000Z",
      lastReview: "2026-08-04T12:00:00.000Z",
    });
    const bad = baseEnvelope({ reviewCards: [card, { ...card }] });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on unpublished content IDs", async () => {
    const adapter = await seedAdapter();
    const bad = baseEnvelope({
      tags: [{ contentId: "lex:unknown-draft", tag: "Favorite" }],
    });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on prototype-pollution keys", async () => {
    const adapter = await seedAdapter();
    const raw = `{"schemaVersion":"1.0.0","masteryReducerVersion":"1.0.0","reviewSchedulerVersion":"1.0.0","learnerEventSchemaVersion":"1.0.0","contentBundle":{"schemaVersion":"1.0.0","bundleId":"alpha-lessons-01-02"},"settings":{"preferredAudioSpeed":1,"timezone":"UTC","__proto__":{"x":1}},"resume":null,"tags":[],"notes":[],"events":[],"reviewCards":[],"recordings":[]}`;
    const withConstructor = raw.replace(
      '"__proto__":{"x":1}',
      '"constructor":{"x":1}',
    );
    await expectUnchanged(adapter, withConstructor);
  });

  it("rolls back on HTML-shaped note text without echoing content", async () => {
    const adapter = await seedAdapter();
    const secretNote = "<script>steal()</script>";
    const bad = baseEnvelope({
      notes: [
        {
          noteId: nid(3),
          contentId: "lex:ingenieur",
          text: secretNote,
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });
    try {
      await importLearnerStateJson(adapter, JSON.stringify(bad), {
        ...adapterOpts,
        now: NOW,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PersistenceError);
      expect((e as PersistenceError).code).toBe("HTML_CONTENT");
      expect((e as Error).message).not.toContain("steal");
      expect((e as Error).message).not.toContain(secretNote);
    }
    const loaded = await adapter.load();
    expect(loaded!.notes[0]!.text).toBe("keep-me");
  });

  it("rolls back on malformed event", async () => {
    const adapter = await seedAdapter();
    const bad = baseEnvelope({
      events: [{ kind: "nope", eventId: eid(1) }],
    });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on malformed review card", async () => {
    const adapter = await seedAdapter();
    const bad = baseEnvelope({
      reviewCards: [{ cardId: "x", state: "bogus" }],
    });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on bad cross-ref event.cardId", async () => {
    const adapter = await seedAdapter();
    const bad = baseEnvelope({
      events: [
        recallEvent(1, "2026-08-01T10:00:00.000Z", "correct", "lex:ingenieur", {
          cardId: "card:missing",
        }),
      ],
    });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on invalid tag enum", async () => {
    const adapter = await seedAdapter();
    const bad = baseEnvelope({
      tags: [{ contentId: "lex:ingenieur", tag: "CustomDeck" }],
    });
    await expectUnchanged(adapter, JSON.stringify(bad));
  });

  it("rolls back on oversize notes array", async () => {
    const adapter = await seedAdapter();
    const notes = Array.from({ length: PERSISTENCE_LIMITS.maxNotes + 1 }, (_, i) => ({
      noteId: nid(i + 1),
      contentId: "lex:ingenieur",
      text: "n",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }));
    await expectUnchanged(adapter, JSON.stringify(baseEnvelope({ notes })));
  });
});

describe("C2D persistence — derived state and rewards rejected", () => {
  it("rejects derived mastery fields on envelope", () => {
    const bad = {
      ...baseEnvelope(),
      masteryByConcept: { "lex:ingenieur": { status: "mastered" } },
    };
    try {
      parse(bad);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("DERIVED_STATE_FORBIDDEN");
    }
  });

  it("rejects status injection on envelope", () => {
    try {
      parse({ ...baseEnvelope(), status: "mastered" });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("DERIVED_STATE_FORBIDDEN");
    }
  });

  it("rejects XP/reward fields", () => {
    try {
      parse({ ...baseEnvelope(), xp: 100 });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("REWARD_FIELD_FORBIDDEN");
    }
  });

  it("rejects unknown envelope fields", () => {
    try {
      parse({ ...baseEnvelope(), mystery: true });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNKNOWN_FIELD");
    }
  });
});

describe("C2D persistence — recordings unscored and bytes excluded", () => {
  it("preserves null pronunciationAccuracy and rejects audioBytes", () => {
    const ok = parse(
      baseEnvelope({
        recordings: [
          {
            recordingId: rid(2),
            conceptId: "lex:ingenieur",
            activityId: "activity:01-overview",
            createdAt: "2026-08-06T12:00:00.000Z",
            mimeType: "audio/webm",
            byteLength: 100,
            gestureProduced: true,
            pronunciationAccuracy: null,
          },
        ],
      }),
    );
    expect(ok.recordings[0]!.pronunciationAccuracy).toBeNull();
    const json = exportLearnerStateJson(ok, exportOpts);
    expect(json).not.toContain("audioBytes");
    expect(JSON.parse(json).exportMeta.includesRawAudioBytes).toBe(false);

    try {
      parse(
        baseEnvelope({
          recordings: [
            {
              recordingId: rid(3),
              conceptId: "lex:ingenieur",
              createdAt: "2026-08-06T12:00:00.000Z",
              mimeType: "audio/webm",
              byteLength: 100,
              gestureProduced: true,
              pronunciationAccuracy: null,
              audioBytes: "AAAA",
            },
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("SECRET_OR_BLOB_FORBIDDEN");
    }
  });

  it("rejects non-null pronunciationAccuracy", () => {
    try {
      parse(
        baseEnvelope({
          recordings: [
            {
              recordingId: rid(4),
              conceptId: "lex:ingenieur",
              createdAt: "2026-08-06T12:00:00.000Z",
              mimeType: "audio/webm",
              byteLength: 100,
              gestureProduced: true,
              pronunciationAccuracy: 0.9,
            },
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("INVALID_RECORDING");
    }
  });
});

describe("C2D persistence — tags, notes, resume, unpublished IDs", () => {
  it("accepts exactly the five built-in tags", () => {
    const tags = [
      "Favorite",
      "Difficult",
      "Confusing",
      "Exam",
      "Teacher",
    ] as const;
    const state = parse(
      baseEnvelope({
        tags: tags.map((tag) => ({ contentId: "lex:ingenieur", tag })),
      }),
    );
    expect(state.tags).toHaveLength(5);
  });

  it("resume requires published lesson and activity IDs", () => {
    try {
      parse(
        baseEnvelope({
          resume: {
            lessonId: "lesson:99",
            activityId: "activity:01-overview",
            stageId: "stage:learn",
            position: 0,
          },
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNPUBLISHED_ID");
    }
  });

  it("rejects review/draft IDs via resolver", () => {
    const resolver = makePublishedResolver({
      "lex:published-only": "Concept",
    });
    try {
      parseLearnerStateEnvelope(
        baseEnvelope({
          tags: [{ contentId: "lex:review-queue", tag: "Favorite" }],
        }),
        { publishedIds: resolver, expectedContentBundle: EXPECTED_BUNDLE },
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNPUBLISHED_ID");
    }
  });

  it("notes are size-limited", () => {
    try {
      parse(
        baseEnvelope({
          notes: [
            {
              noteId: nid(5),
              contentId: "lex:ingenieur",
              text: "x".repeat(PERSISTENCE_LIMITS.maxNoteTextLength + 1),
              updatedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("OVERSIZE_STRING");
      expect((e as Error).message).not.toContain("xxx");
    }
  });
});

describe("C2D persistence — migration registry", () => {
  it("identity migration accepts current version", () => {
    const registry = createMigrationRegistry([]);
    const state = registry.migrateToCurrent(baseEnvelope(), parseOpts);
    expect(state.schemaVersion).toBe(LEARNER_STATE_SCHEMA_VERSION);
  });

  it("unknown version fails without inventing lossy migration", () => {
    const registry = createMigrationRegistry([]);
    try {
      registry.migrateToCurrent(
        { ...baseEnvelope(), schemaVersion: "0.0.1" },
        parseOpts,
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("UNSUPPORTED_VERSION");
    }
  });

  it("version-to-version migration is revalidated before return", () => {
    const registry = createMigrationRegistry([
      {
        fromVersion: "0.9.0",
        toVersion: LEARNER_STATE_SCHEMA_VERSION,
        migrate: (raw) => {
          const obj = raw as Record<string, unknown>;
          return {
            ...obj,
            schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
            masteryReducerVersion: MASTERY_REDUCER_VERSION,
            reviewSchedulerVersion: REVIEW_SCHEDULER_VERSION,
            learnerEventSchemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
          };
        },
      },
    ]);
    const migrated = registry.migrateToCurrent(
      {
        ...baseEnvelope(),
        schemaVersion: "0.9.0",
      },
      parseOpts,
    );
    expect(migrated.schemaVersion).toBe("1.0.0");
  });
});

describe("C2D persistence — parse JSON helper and new cards", () => {
  it("parseLearnerStateJson applies byte limit and parses", () => {
    const json = JSON.stringify(baseEnvelope());
    const state = parseLearnerStateJson(json, parseOpts);
    expect(state.schemaVersion).toBe("1.0.0");
  });

  it("accepts createNewReviewCard inside envelope", () => {
    const card = createNewReviewCard({
      cardId: "card:new-1",
      conceptId: "lex:ingenieur",
      templateId: "template:recall-de",
      measuredDimension: "recall",
      now: NOW,
    });
    const state = parse(baseEnvelope({ reviewCards: [card] }));
    expect(state.reviewCards[0]!.state).toBe("new");
  });

  it("rejects absolute paths in string fields", () => {
    try {
      parse(
        baseEnvelope({
          contentBundle: {
            schemaVersion: "1.0.0",
            bundleId: "C:\\\\secrets\\\\bundle",
          },
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
    }
  });

  it("rejects invalid JSON text", () => {
    try {
      parseLearnerStateJson("{not-json", parseOpts);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("INVALID_JSON");
    }
  });
});

describe("C2DR1 persistence — fail-closed boundary adversarial", () => {
  it("rejects poisoned KV load without prior import", async () => {
    const { store, map } = memoryStore();
    const adapter = createKeyValueLearnerStateAdapter({
      store,
      ...adapterOpts,
    });
    map.set(
      "german-learning:learner-state:v1",
      JSON.stringify({
        ...baseEnvelope(),
        masteryByConcept: { "lex:ingenieur": { status: "mastered" } },
        xp: 999,
      }),
    );
    await expect(adapter.load()).rejects.toMatchObject({
      code: "DERIVED_STATE_FORBIDDEN",
    });
  });

  it("invalid direct replace leaves prior state on in-memory adapter", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    await adapter.replace(
      parse(
        baseEnvelope({
          tags: [{ contentId: "lex:ingenieur", tag: "Favorite" }],
        }),
      ),
    );
    await expect(
      adapter.replace({
        ...baseEnvelope(),
        tags: [{ contentId: "lex:unpublished", tag: "Favorite" }],
      } as unknown as LearnerStateEnvelope),
    ).rejects.toMatchObject({ code: "UNPUBLISHED_ID" });
    const loaded = await adapter.load();
    expect(loaded!.tags[0]!.tag).toBe("Favorite");
    expect(loaded!.tags[0]!.contentId).toBe("lex:ingenieur");
  });

  it("invalid direct replace leaves prior state on key-value adapter", async () => {
    const { store } = memoryStore();
    const adapter = createKeyValueLearnerStateAdapter({
      store,
      ...adapterOpts,
    });
    await adapter.replace(
      parse(
        baseEnvelope({
          notes: [
            {
              noteId: nid(7),
              contentId: "lex:ingenieur",
              text: "stable",
              updatedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );
    await expect(
      adapter.replace({
        ...baseEnvelope(),
        schemaVersion: "99.0.0",
      } as unknown as LearnerStateEnvelope),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_VERSION" });
    const loaded = await adapter.load();
    expect(loaded!.notes[0]!.text).toBe("stable");
  });

  it("fails stably when validation context is missing publishedIds", () => {
    try {
      parseLearnerStateEnvelope(baseEnvelope(), {
        expectedContentBundle: EXPECTED_BUNDLE,
      } as unknown as ParseLearnerStateOptions);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("REQUIRED_FIELD");
      expect((e as PersistenceError).field).toBe("publishedIds");
    }
  });

  it("fails stably when expectedContentBundle is missing", () => {
    try {
      createInMemoryLearnerStateAdapter({
        publishedIds,
      } as unknown as typeof adapterOpts);
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("REQUIRED_FIELD");
      expect((e as PersistenceError).field).toBe("expectedContentBundle");
    }
  });

  it("rejects content-bundle bundleId spoof", () => {
    try {
      parse(
        baseEnvelope({
          contentBundle: {
            schemaVersion: "1.0.0",
            bundleId: "spoofed-other-bundle",
          },
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as PersistenceError).field).toBe("contentBundle.bundleId");
    }
  });

  it("object-envelope byte cap cannot be under-reported by callers", () => {
    // Build an envelope whose serialized form exceeds the limit via a huge note.
    // Cap is measured internally — there is no jsonByteLength option to under-report.
    const hugeNote = "n".repeat(PERSISTENCE_LIMITS.maxNoteTextLength);
    const notes = Array.from({ length: 2000 }, (_, i) => ({
      noteId: nid(i + 100),
      contentId: "lex:ingenieur",
      text: hugeNote,
      updatedAt: "2026-08-01T00:00:00.000Z",
    }));
    // 2000 * ~4k chars >> 5MB once serialized with envelope scaffolding
    const oversized = baseEnvelope({ notes });
    try {
      parseLearnerStateEnvelope(oversized, parseOpts);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PersistenceError);
      const code = (e as PersistenceError).code;
      expect(["OVERSIZE_JSON", "OVERSIZE_ARRAY"].includes(code)).toBe(true);
    }
    // Confirm public options have no caller byte override surface
    const optsKeys = Object.keys(parseOpts).sort();
    expect(optsKeys).toEqual(["expectedContentBundle", "publishedIds"]);
    expect("jsonByteLength" in parseOpts).toBe(false);
    expect("skipByteLimit" in parseOpts).toBe(false);
  });

  it("public hydration always validates (no alreadyValidated bypass)", () => {
    expect("alreadyValidated" in hydrateOpts).toBe(false);
    try {
      hydrateLearnerState(
        {
          ...baseEnvelope(),
          xp: 42,
        },
        hydrateOpts,
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("REWARD_FIELD_FORBIDDEN");
    }
  });

  it("rejects event.cardId when card conceptId mismatches without echoing answers", () => {
    try {
      parse(
        baseEnvelope({
          events: [
            recallEvent(1, "2026-08-01T10:00:00.000Z", "correct", "lex:ingenieur", {
              cardId: "card:mismatch",
            }),
          ],
          reviewCards: [
            reviewedCard({
              cardId: "card:mismatch",
              conceptId: "lex:arzt",
              templateId: "template:recognition-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
          notes: [
            {
              noteId: nid(8),
              contentId: "lex:ingenieur",
              text: "TOP-SECRET-NOTE-BODY",
              updatedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as Error).message).not.toContain("TOP-SECRET-NOTE-BODY");
      expect((e as Error).message).toBe("Event cardId concept mismatch");
    }
  });

  it("learner-facing import does not accept per-call migrationRegistry", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    const json = JSON.stringify(baseEnvelope());
    // Type-level: ImportLearnerStateOptions has no migrationRegistry.
    // Runtime: custom migration is ignored even if smuggled on the options object.
    const smuggled = {
      ...adapterOpts,
      now: NOW,
      migrationRegistry: createMigrationRegistry([
        {
          fromVersion: "1.0.0",
          toVersion: "9.9.9",
          migrate: () => {
            throw new Error("must-not-run");
          },
        },
      ]),
    };
    const hydration = await importLearnerStateJson(
      adapter,
      json,
      smuggled as unknown as typeof adapterOpts & { now: Date },
    );
    expect(hydration.state.schemaVersion).toBe("1.0.0");
  });
});

describe("C2DR2 persistence — export safety, relational ownership, immutability", () => {
  it("rejects export of event with token:TOPSECRET without leaking the value", () => {
    const poisoned = {
      ...baseEnvelope({
        events: [
          {
            ...recallEvent(1, "2026-08-01T10:00:00.000Z", "correct"),
            token: "TOPSECRET",
          },
        ],
      }),
    };
    try {
      exportLearnerStateJson(
        poisoned as unknown as LearnerStateEnvelope,
        exportOpts,
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PersistenceError);
      expect((e as PersistenceError).code).toBe("SECRET_OR_BLOB_FORBIDDEN");
      expect((e as Error).message).not.toContain("TOPSECRET");
      const jsonAttempt = JSON.stringify(poisoned);
      expect(jsonAttempt).toContain("TOPSECRET"); // present in input only
    }
  });

  it("export does not freeze original settings/tag/event objects", () => {
    const settings = { preferredAudioSpeed: 1, timezone: "UTC" };
    const tag = { contentId: "lex:ingenieur", tag: "Favorite" as const };
    const event = recallEvent(1, "2026-08-01T10:00:00.000Z", "correct");
    const mutable = {
      ...baseEnvelope({
        settings,
        tags: [tag],
        events: [event],
      }),
    };
    expect(Object.isFrozen(settings)).toBe(false);
    expect(Object.isFrozen(tag)).toBe(false);
    expect(Object.isFrozen(event)).toBe(false);

    const json = exportLearnerStateJson(
      mutable as unknown as LearnerStateEnvelope,
      exportOpts,
    );
    expect(json).toContain("Favorite");

    expect(Object.isFrozen(settings)).toBe(false);
    expect(Object.isFrozen(tag)).toBe(false);
    expect(Object.isFrozen(event)).toBe(false);
    settings.timezone = "Europe/Berlin";
    (tag as { tag: string }).tag = "Exam";
    (event as { latencyMs: number }).latencyMs = 42;
    expect(settings.timezone).toBe("Europe/Berlin");
    expect(tag.tag).toBe("Exam");
    expect(event.latencyMs).toBe(42);
  });

  it("rejects export when content bundle does not match expected identity", () => {
    const wrongBundle = parse(
      baseEnvelope({
        contentBundle: { ...EXPECTED_BUNDLE },
      }),
    );
    try {
      exportLearnerStateJson(wrongBundle, {
        ...exportOpts,
        expectedContentBundle: {
          schemaVersion: "1.0.0",
          bundleId: "other-bundle-id",
        },
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as PersistenceError).field).toBe("contentBundle.bundleId");
    }
  });

  it("rejects resume when stage does not belong to lesson", () => {
    try {
      parse(
        baseEnvelope({
          resume: {
            lessonId: "lesson:01",
            activityId: "activity:01-overview",
            stageId: "stage:unknown",
            position: 0,
          },
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as PersistenceError).field).toBe("resume.stageId");
    }
  });

  it("rejects resume when activity does not belong to lesson stage", () => {
    const resolver = makePublishedResolver(
      {
        ...ENTITY_KINDS,
        "activity:other": "LearningActivity",
      },
      LESSON_STAGES,
      {
        "lesson:01\0stage:learn": new Set(["activity:01-overview"]),
      },
    );
    try {
      parseLearnerStateEnvelope(
        baseEnvelope({
          resume: {
            lessonId: "lesson:01",
            activityId: "activity:other",
            stageId: "stage:learn",
            position: 0,
          },
        }),
        { publishedIds: resolver, expectedContentBundle: EXPECTED_BUNDLE },
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as PersistenceError).field).toBe("resume.activityId");
    }
  });

  it("rejects resume when lesson id is published but wrong kind", () => {
    const resolver = makePublishedResolver({
      ...ENTITY_KINDS,
      "lesson:01": "Concept", // spoofed kind — no prefix inference
    });
    try {
      parseLearnerStateEnvelope(
        baseEnvelope({
          resume: {
            lessonId: "lesson:01",
            activityId: "activity:01-overview",
            stageId: "stage:learn",
            position: 0,
          },
        }),
        { publishedIds: resolver, expectedContentBundle: EXPECTED_BUNDLE },
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as PersistenceError).field).toBe("resume.lessonId");
    }
  });

  it("rejects boolean-only resolver missing relational methods", () => {
    try {
      parseLearnerStateEnvelope(baseEnvelope(), {
        publishedIds: {
          isPublished: () => true,
        } as unknown as PublishedContentResolver,
        expectedContentBundle: EXPECTED_BUNDLE,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("REQUIRED_FIELD");
      expect((e as PersistenceError).field).toBe("publishedIds");
    }
  });

  it("rejects event for concept A referencing concept B card", () => {
    try {
      parse(
        baseEnvelope({
          events: [
            recallEvent(1, "2026-08-01T10:00:00.000Z", "correct", "lex:ingenieur", {
              cardId: "card:cross-concept",
            }),
          ],
          reviewCards: [
            reviewedCard({
              cardId: "card:cross-concept",
              conceptId: "lex:arzt",
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as Error).message).toBe("Event cardId concept mismatch");
    }
  });

  it("rejects event/card dimension mismatch", () => {
    try {
      parse(
        baseEnvelope({
          events: [
            recallEvent(1, "2026-08-01T10:00:00.000Z", "correct", "lex:ingenieur", {
              cardId: "card:dim-mismatch",
            }),
          ],
          reviewCards: [
            {
              ...reviewedCard({
                cardId: "card:dim-mismatch",
                conceptId: "lex:ingenieur",
                templateId: "template:recognition-de",
                due: "2026-08-07T12:00:00.000Z",
                lastReview: "2026-08-04T12:00:00.000Z",
              }),
              measuredDimension: "recognition",
            },
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("CROSS_REFERENCE");
      expect((e as Error).message).toBe("Event cardId dimension mismatch");
    }
  });

  it("rejects normalizedAnswer absolute path without echoing the value", () => {
    try {
      parse(
        baseEnvelope({
          events: [
            recallEvent(1, "2026-08-01T10:00:00.000Z", "correct", "lex:ingenieur", {
              normalizedAnswer: "/etc/passwd",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
      expect((e as Error).message).not.toContain("/etc/passwd");
      expect((e as PersistenceError).field).toBe("events[0].normalizedAnswer");
    }
  });

  it("accepts legitimate German plain-text normalizedAnswer", () => {
    const state = parse(
      baseEnvelope({
        events: [
          recallEvent(1, "2026-08-01T10:00:00.000Z", "correct", "lex:ingenieur", {
            normalizedAnswer: "der Ingenieur",
          }),
        ],
      }),
    );
    expect(
      (state.events[0] as { normalizedAnswer?: string }).normalizedAnswer,
    ).toBe("der Ingenieur");
  });

  it("masteryByConcept rejects cast clear/set/delete and keeps internal state", () => {
    const hydration = hydrateLearnerState(
      baseEnvelope({
        events: [recallEvent(1, "2026-08-01T10:00:00.000Z", "correct")],
      }),
      hydrateOpts,
    );
    const map = hydration.masteryByConcept;
    expect(map.has("lex:ingenieur")).toBe(true);
    expect(Object.isFrozen(map.get("lex:ingenieur"))).toBe(true);

    const adversarial = map as unknown as Map<string, unknown>;
    expect(typeof adversarial.set).not.toBe("function");
    expect(typeof adversarial.delete).not.toBe("function");
    expect(typeof adversarial.clear).not.toBe("function");
    expect(() => adversarial.set("lex:arzt", { status: "mastered" })).toThrow();
    expect(() => adversarial.delete("lex:ingenieur")).toThrow();
    expect(() => adversarial.clear()).toThrow();

    expect(map.size).toBe(1);
    expect(map.has("lex:ingenieur")).toBe(true);
    expect(map.has("lex:arzt")).toBe(false);

    const seen: string[] = [];
    map.forEach((snap, key) => {
      expect(Object.isFrozen(snap)).toBe(true);
      seen.push(key);
    });
    expect(seen).toEqual(["lex:ingenieur"]);
  });

  it("adapters and hydration share exact bundle identity + typed resolver", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    await adapter.replace(parse(baseEnvelope()));
    const loaded = await loadAndHydrateLearnerState(adapter, hydrateOpts);
    expect(loaded!.state.contentBundle).toEqual(EXPECTED_BUNDLE);

    await expect(
      createKeyValueLearnerStateAdapter({
        store: memoryStore().store,
        publishedIds,
        expectedContentBundle: {
          schemaVersion: "1.0.0",
          bundleId: "wrong-bundle",
        },
      }).replace(parse(baseEnvelope())),
    ).rejects.toMatchObject({ code: "CROSS_REFERENCE" });
  });
});

describe("C2DR3 persistence — review-card string firewall", () => {
  const priorEnvelope = () =>
    baseEnvelope({
      tags: [{ contentId: "lex:ingenieur", tag: "Favorite" }],
      reviewCards: [
        reviewedCard({
          cardId: "card:prior-stable",
          conceptId: "lex:ingenieur",
          templateId: "template:recall-de",
          due: "2026-08-07T12:00:00.000Z",
          lastReview: "2026-08-04T12:00:00.000Z",
        }),
      ],
    });

  it("rejects absolute-path cardId without echoing the value", () => {
    const pathValue = "/etc/passwd";
    try {
      parse(
        baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: pathValue,
              conceptId: "lex:ingenieur",
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
      expect((e as PersistenceError).field).toBe("reviewCards[0].cardId");
      expect((e as Error).message).not.toContain(pathValue);
    }
  });

  it("rejects 513-character cardId without echoing the value", () => {
    const longId = "c".repeat(513);
    try {
      parse(
        baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: longId,
              conceptId: "lex:ingenieur",
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("OVERSIZE_STRING");
      expect((e as PersistenceError).field).toBe("reviewCards[0].cardId");
      expect((e as Error).message).not.toContain(longId);
      expect((e as Error).message).not.toContain("c".repeat(20));
    }
  });

  it("rejects path-shaped conceptId (Windows drive) without echoing", () => {
    const pathValue = "C:\\secrets\\concept";
    try {
      parse(
        baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: "card:path-concept",
              conceptId: pathValue,
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
      expect((e as PersistenceError).field).toBe("reviewCards[0].conceptId");
      expect((e as Error).message).not.toContain(pathValue);
    }
  });

  it("rejects path-shaped templateId (UNC) without echoing", () => {
    const pathValue = "\\\\server\\share\\template";
    try {
      parse(
        baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: "card:path-template",
              conceptId: "lex:ingenieur",
              templateId: pathValue,
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
      expect((e as PersistenceError).field).toBe("reviewCards[0].templateId");
      expect((e as Error).message).not.toContain(pathValue);
      expect((e as Error).message).not.toContain("\\\\server");
    }
  });

  it("rejects file-URI cardId without echoing", () => {
    const pathValue = "file:///tmp/card-id";
    try {
      parse(
        baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: pathValue,
              conceptId: "lex:ingenieur",
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect.fail("expected throw");
    } catch (e) {
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
      expect((e as PersistenceError).field).toBe("reviewCards[0].cardId");
      expect((e as Error).message).not.toContain(pathValue);
      expect((e as Error).message).not.toContain("file://");
    }
  });

  it("preserves legitimate content IDs and ISO due/lastReview timestamps", () => {
    const state = parse(
      baseEnvelope({
        reviewCards: [
          reviewedCard({
            cardId: "card:legit-ids",
            conceptId: "lex:ingenieur",
            templateId: "template:recall-de",
            due: "2026-08-07T12:00:00.000Z",
            lastReview: "2026-08-04T12:00:00.000Z",
          }),
        ],
      }),
    );
    const card = state.reviewCards[0]!;
    expect(card.cardId).toBe("card:legit-ids");
    expect(card.conceptId).toBe("lex:ingenieur");
    expect(card.templateId).toBe("template:recall-de");
    expect(card.due).toBe("2026-08-07T12:00:00.000Z");
    expect(card.lastReview).toBe("2026-08-04T12:00:00.000Z");
    expect(card.schedulerId).toBe(REVIEW_SCHEDULER_ID);
    expect(card.schedulerVersion).toBe(REVIEW_SCHEDULER_VERSION);
  });

  it("invalid direct replace with absolute cardId leaves prior state unchanged", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    await adapter.replace(parse(priorEnvelope()));
    await expect(
      adapter.replace({
        ...baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: "/var/lib/poison",
              conceptId: "lex:ingenieur",
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      } as unknown as LearnerStateEnvelope),
    ).rejects.toMatchObject({ code: "ABSOLUTE_PATH_FORBIDDEN" });
    const loaded = await adapter.load();
    expect(loaded!.reviewCards).toHaveLength(1);
    expect(loaded!.reviewCards[0]!.cardId).toBe("card:prior-stable");
    expect(loaded!.tags[0]!.tag).toBe("Favorite");
  });

  it("invalid direct replace with 513-char cardId leaves prior KV state unchanged", async () => {
    const { store } = memoryStore();
    const adapter = createKeyValueLearnerStateAdapter({
      store,
      ...adapterOpts,
    });
    await adapter.replace(parse(priorEnvelope()));
    const longId = "k".repeat(513);
    await expect(
      adapter.replace({
        ...baseEnvelope({
          reviewCards: [
            reviewedCard({
              cardId: longId,
              conceptId: "lex:ingenieur",
              templateId: "template:recall-de",
              due: "2026-08-07T12:00:00.000Z",
              lastReview: "2026-08-04T12:00:00.000Z",
            }),
          ],
        }),
      } as unknown as LearnerStateEnvelope),
    ).rejects.toMatchObject({ code: "OVERSIZE_STRING" });
    const loaded = await adapter.load();
    expect(loaded!.reviewCards[0]!.cardId).toBe("card:prior-stable");
  });

  it("import with absolute-path cardId fails closed and leaves prior state unchanged", async () => {
    const adapter = createInMemoryLearnerStateAdapter(adapterOpts);
    await adapter.replace(parse(priorEnvelope()));
    const poisoned = JSON.stringify(
      baseEnvelope({
        reviewCards: [
          reviewedCard({
            cardId: "/etc/shadow",
            conceptId: "lex:ingenieur",
            templateId: "template:recall-de",
            due: "2026-08-07T12:00:00.000Z",
            lastReview: "2026-08-04T12:00:00.000Z",
          }),
        ],
      }),
    );
    await expect(
      importLearnerStateJson(adapter, poisoned, { ...adapterOpts, now: NOW }),
    ).rejects.toMatchObject({ code: "ABSOLUTE_PATH_FORBIDDEN" });
    const loaded = await adapter.load();
    expect(loaded!.reviewCards[0]!.cardId).toBe("card:prior-stable");
    expect(loaded!.tags[0]!.contentId).toBe("lex:ingenieur");
  });

  it("export rejects absolute-path cardId without leaking the value", () => {
    const pathValue = "C:/Windows/System32/card";
    const poisoned = {
      ...baseEnvelope({
        reviewCards: [
          reviewedCard({
            cardId: pathValue,
            conceptId: "lex:ingenieur",
            templateId: "template:recall-de",
            due: "2026-08-07T12:00:00.000Z",
            lastReview: "2026-08-04T12:00:00.000Z",
          }),
        ],
      }),
    };
    try {
      exportLearnerStateJson(
        poisoned as unknown as LearnerStateEnvelope,
        exportOpts,
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PersistenceError);
      expect((e as PersistenceError).code).toBe("ABSOLUTE_PATH_FORBIDDEN");
      expect((e as Error).message).not.toContain(pathValue);
      expect((e as Error).message).not.toContain("C:/Windows");
    }
  });
});
