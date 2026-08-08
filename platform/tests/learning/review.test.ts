/**
 * C2C / C2CR1 — ReviewScheduler + deterministic mission generator.
 * Evidence IDs: ENGINE-SCHEDULER-01, ENGINE-MISSION-MIX-01
 */

import { describe, expect, it } from "vitest";
import {
  ALPHA_DESIRED_RETENTION,
  REVIEW_HARD_FACTOR,
  REVIEW_GOOD_FACTOR,
  REVIEW_EASY_FACTOR,
  REVIEW_SCHEDULER_ID,
  REVIEW_SCHEDULER_VERSION,
  ReviewError,
  STABILITY_MULT,
  createAlphaReviewScheduler,
  createNewReviewCard,
  deriveMasteryDimensionReviewState,
  exclusiveSelectionCategory,
  formatMissionReasonText,
  generateDailyMission,
  isDifficultCandidate,
  mapObjectiveGradeToRating,
  parseReviewCardState,
  parseReviewCandidate,
  parseReviewCandidates,
  previewEqualsIndependentReviews,
  ratingFromRecordingSelfCheck,
  reduceConceptMastery,
  resumeMissionFromCardIds,
  shortenMissionAt,
  LEARNER_EVENT_SCHEMA_VERSION,
  type ConceptMasterySnapshot,
  type ReviewCardState,
  type ReviewCandidate,
  type ReviewRating,
} from "@german-learning/learning";

const NOW = new Date("2026-08-08T12:00:00.000Z");
const SESSION = "11111111-1111-4111-8111-111111111111";

function eid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `33333333-3333-4333-8333-${hex}`;
}

function newCard(
  ids: { cardId: string; conceptId: string; templateId: string },
  dim: ReviewCardState["measuredDimension"] = "recall",
  now: Date = NOW,
): ReviewCardState {
  return createNewReviewCard({
    ...ids,
    measuredDimension: dim,
    now,
  });
}

function reviewedCard(
  overrides: Partial<ReviewCardState> &
    Pick<ReviewCardState, "cardId" | "conceptId" | "templateId">,
): ReviewCardState {
  return parseReviewCardState({
    measuredDimension: "recall",
    due: "2026-08-07T12:00:00.000Z",
    stability: 5,
    difficulty: 5,
    elapsedDays: 3,
    scheduledDays: 5,
    reps: 3,
    lapses: 0,
    state: "review",
    lastReview: "2026-08-04T12:00:00.000Z",
    schedulerId: REVIEW_SCHEDULER_ID,
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
    ...overrides,
  });
}

function candidate(
  partial: Partial<ReviewCandidate> & {
    cardId: string;
    conceptId: string;
    templateId: string;
    modality: ReviewCandidate["modality"];
    lessonId: string;
  },
): ReviewCandidate {
  const card =
    partial.card ??
    newCard(
      {
        cardId: partial.cardId,
        conceptId: partial.conceptId,
        templateId: partial.templateId,
      },
      partial.measuredDimension ??
        (partial.modality === "recognition"
          ? "recognition"
          : partial.modality === "listening"
            ? "listening"
            : partial.modality === "form"
              ? "form"
              : partial.modality === "production"
                ? "production"
                : "recall"),
    );
  return parseReviewCandidate({
    publicationStatus: "published",
    unlocked: true,
    conceptLabel: partial.conceptId,
    measuredDimension: card.measuredDimension,
    sourcePriority: 10,
    tags: [],
    recentFailureOrDifficult: false,
    stageBlocking: false,
    olderMaintenance: false,
    teacherAssignment: false,
    ...partial,
    card,
    cardId: partial.cardId,
    conceptId: partial.conceptId,
    templateId: partial.templateId,
  });
}

function overdueRecall(
  n: number,
  dueIso: string,
  opts: Partial<ReviewCandidate> = {},
): ReviewCandidate {
  const cardId = `card:recall:${n}`;
  const conceptId = `lex:c${n}`;
  const templateId = `tmpl:recall:${n}`;
  return candidate({
    cardId,
    conceptId,
    templateId,
    modality: "recall",
    lessonId: "lesson:01",
    card: reviewedCard({
      cardId,
      conceptId,
      templateId,
      due: dueIso,
      measuredDimension: "recall",
      lastReview: "2026-07-01T12:00:00.000Z",
    }),
    ...opts,
  });
}

// ─── ENGINE-SCHEDULER-01 ───────────────────────────────────────────────────

describe("ENGINE-SCHEDULER-01 Alpha ReviewScheduler", () => {
  const scheduler = createAlphaReviewScheduler();

  it("exports adapter identity and global retention default (not personalized FSRS)", () => {
    expect(REVIEW_SCHEDULER_ID).toBe("alpha-deterministic");
    expect(REVIEW_SCHEDULER_VERSION).toBe("1.0.0");
    expect(ALPHA_DESIRED_RETENTION).toBe(0.9);
    expect(STABILITY_MULT.again).toBe(0.2);
    expect(REVIEW_HARD_FACTOR).toBeLessThanOrEqual(REVIEW_GOOD_FACTOR);
    expect(REVIEW_GOOD_FACTOR).toBeLessThanOrEqual(REVIEW_EASY_FACTOR);
  });

  it("createNewReviewCard yields validated new state due at injected now", () => {
    const card = newCard({
      cardId: "card:a",
      conceptId: "lex:a",
      templateId: "tmpl:a",
    });
    expect(card.state).toBe("new");
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.elapsedDays).toBe(0);
    expect(card.scheduledDays).toBe(0);
    expect(card.lastReview).toBeNull();
    expect(card.due).toBe(NOW.toISOString());
    expect(Object.isFrozen(card)).toBe(true);
  });

  it("deterministic clock: same card+now+rating always same result", () => {
    const card = reviewedCard({
      cardId: "card:d",
      conceptId: "lex:d",
      templateId: "tmpl:d",
    });
    const a = scheduler.review(card, "good", NOW);
    const b = scheduler.review(card, "good", NOW);
    expect(a).toEqual(b);
    expect(a.card.due).toBe(b.card.due);
    expect(a.card.stability).toBe(b.card.stability);
  });

  it("interval ordering Again <= Hard <= Good <= Easy for new cards", () => {
    const card = newCard({
      cardId: "card:n",
      conceptId: "lex:n",
      templateId: "tmpl:n",
    });
    const p = scheduler.preview(card, NOW);
    expect(p.again.intervalMs).toBeLessThanOrEqual(p.hard.intervalMs);
    expect(p.hard.intervalMs).toBeLessThanOrEqual(p.good.intervalMs);
    expect(p.good.intervalMs).toBeLessThanOrEqual(p.easy.intervalMs);
  });

  it("interval ordering for learning, review, and relearning states", () => {
    const states: Array<ReviewCardState> = [
      parseReviewCardState({
        ...newCard({ cardId: "card:l", conceptId: "lex:l", templateId: "tmpl:l" }),
        state: "learning",
        reps: 1,
        lapses: 0,
        lastReview: "2026-08-08T11:00:00.000Z",
        difficulty: 5,
        stability: 0.1,
        due: "2026-08-08T11:10:00.000Z",
      }),
      reviewedCard({ cardId: "card:r", conceptId: "lex:r", templateId: "tmpl:r" }),
      reviewedCard({
        cardId: "card:rl",
        conceptId: "lex:rl",
        templateId: "tmpl:rl",
        state: "relearning",
        lapses: 1,
        reps: 4,
        stability: 1,
        scheduledDays: 0,
        due: "2026-08-08T11:50:00.000Z",
        lastReview: "2026-08-08T11:40:00.000Z",
      }),
    ];
    for (const card of states) {
      const p = scheduler.preview(card, NOW);
      expect(p.again.intervalMs).toBeLessThanOrEqual(p.hard.intervalMs);
      expect(p.hard.intervalMs).toBeLessThanOrEqual(p.good.intervalMs);
      expect(p.good.intervalMs).toBeLessThanOrEqual(p.easy.intervalMs);
    }
  });

  it("Again increases lapses and enters relearning from review", () => {
    const card = reviewedCard({
      cardId: "card:again",
      conceptId: "lex:again",
      templateId: "tmpl:again",
      lapses: 2,
      reps: 5,
    });
    const result = scheduler.review(card, "again", NOW);
    expect(result.card.state).toBe("relearning");
    expect(result.card.lapses).toBe(3);
    expect(result.card.reps).toBe(6);
    expect(result.card.stability).toBeLessThan(card.stability);
  });

  it("Hard/Good/Easy keep review state and clamp difficulty/stability", () => {
    const card = reviewedCard({
      cardId: "card:hge",
      conceptId: "lex:hge",
      templateId: "tmpl:hge",
      difficulty: 9.5,
      stability: 10,
    });
    for (const rating of ["hard", "good", "easy"] as ReviewRating[]) {
      const r = scheduler.review(card, rating, NOW);
      expect(r.card.state).toBe("review");
      expect(r.card.difficulty).toBeGreaterThanOrEqual(1);
      expect(r.card.difficulty).toBeLessThanOrEqual(10);
      expect(r.card.stability).toBeGreaterThanOrEqual(0.1);
      expect(r.card.stability).toBeLessThanOrEqual(36500);
      expect(r.card.lapses).toBe(card.lapses);
    }
  });

  it("objective incorrect always maps to Again regardless of confidence", () => {
    expect(mapObjectiveGradeToRating("incorrect")).toBe("again");
    expect(mapObjectiveGradeToRating("partial")).toBe("hard");
    expect(mapObjectiveGradeToRating("correct")).toBe("good");
    const card = reviewedCard({
      cardId: "card:obj",
      conceptId: "lex:obj",
      templateId: "tmpl:obj",
    });
    const viaMap = scheduler.review(card, mapObjectiveGradeToRating("incorrect"), NOW);
    const viaAgain = scheduler.review(card, "again", NOW);
    expect(viaMap).toEqual(viaAgain);
  });

  it("recording self-rating requires explicit rating and does not claim objective correctness", () => {
    expect(ratingFromRecordingSelfCheck("hard")).toBe("hard");
    expect(() => ratingFromRecordingSelfCheck("correct")).toThrow(ReviewError);
    expect(() => ratingFromRecordingSelfCheck(undefined)).toThrow(ReviewError);
  });

  it("preview equals four independent review projections and mutates nothing", () => {
    const card = reviewedCard({
      cardId: "card:prev",
      conceptId: "lex:prev",
      templateId: "tmpl:prev",
    });
    const before = JSON.stringify(card);
    expect(previewEqualsIndependentReviews(scheduler, card, NOW)).toBe(true);
    expect(JSON.stringify(card)).toBe(before);
    const preview = scheduler.preview(card, NOW);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.good.card)).toBe(true);
  });

  it("rejects invalid dates, future/unknown versions, NaN/negative counters", () => {
    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:x", conceptId: "lex:x", templateId: "tmpl:x" }),
        due: "not-a-date",
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:x2", conceptId: "lex:x2", templateId: "tmpl:x2" }),
        schedulerVersion: "99.0.0",
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:x3", conceptId: "lex:x3", templateId: "tmpl:x3" }),
        schedulerId: "ts-fsrs-personalized",
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:x4", conceptId: "lex:x4", templateId: "tmpl:x4" }),
        reps: -1,
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:x5", conceptId: "lex:x5", templateId: "tmpl:x5" }),
        stability: Number.NaN,
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:x6", conceptId: "lex:x6", templateId: "tmpl:x6" }),
        lapses: 9,
        reps: 3,
      }),
    ).toThrow(ReviewError);
  });

  it("rejects HTML-shaped and duplicate IDs", () => {
    expect(() =>
      newCard({
        cardId: "<script>x</script>",
        conceptId: "lex:ok",
        templateId: "tmpl:ok",
      }),
    ).toThrow(ReviewError);

    expect(() =>
      newCard({
        cardId: "same",
        conceptId: "same",
        templateId: "tmpl:ok",
      }),
    ).toThrow(ReviewError);
  });

  it("rejects now-before-lastReview (clock regression)", () => {
    const card = reviewedCard({
      cardId: "card:clock",
      conceptId: "lex:clock",
      templateId: "tmpl:clock",
      lastReview: "2026-08-08T11:00:00.000Z",
      due: "2026-08-08T15:00:00.000Z",
    });
    const earlier = new Date("2026-08-08T10:00:00.000Z");
    expect(() => scheduler.review(card, "good", earlier)).toThrow(ReviewError);
    expect(() => scheduler.preview(card, earlier)).toThrow(ReviewError);
  });

  it("rejects invalid now Date", () => {
    const card = newCard({
      cardId: "card:now",
      conceptId: "lex:now",
      templateId: "tmpl:now",
    });
    expect(() => scheduler.review(card, "good", new Date("invalid"))).toThrow(ReviewError);
  });

  it("Easy graduates new card to review; Good keeps first-step learning", () => {
    const card = newCard({
      cardId: "card:grad",
      conceptId: "lex:grad",
      templateId: "tmpl:grad",
    });
    const easy = scheduler.review(card, "easy", NOW);
    expect(easy.card.state).toBe("review");
    expect(easy.card.scheduledDays).toBeGreaterThanOrEqual(1);

    const good = scheduler.review(card, "good", NOW);
    expect(good.card.state).toBe("learning");
  });

  it("review results are immutable and leave input untouched", () => {
    const card = reviewedCard({
      cardId: "card:im",
      conceptId: "lex:im",
      templateId: "tmpl:im",
    });
    const snap = { ...card };
    const result = scheduler.review(card, "good", NOW);
    expect(card).toEqual(snap);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.card)).toBe(true);
  });
});

// ─── ENGINE-MISSION-MIX-01 ─────────────────────────────────────────────────

describe("ENGINE-MISSION-MIX-01 deterministic mission generator", () => {
  function mixPool(): ReviewCandidate[] {
    const out: ReviewCandidate[] = [];
    for (let i = 0; i < 8; i++) {
      out.push(
        overdueRecall(i, `2026-08-0${(i % 7) + 1}T10:00:00.000Z`, {
          sourcePriority: 5,
        }),
      );
    }
    for (let i = 0; i < 5; i++) {
      const cardId = `card:listen:${i}`;
      const conceptId = `lex:listen:${i}`;
      const templateId = `tmpl:listen:${i}`;
      out.push(
        candidate({
          cardId,
          conceptId,
          templateId,
          modality: "listening",
          lessonId: "lesson:01",
          sourcePriority: 8,
          card: reviewedCard({
            cardId,
            conceptId,
            templateId,
            measuredDimension: "listening",
            due: `2026-08-07T0${i}:00:00.000Z`,
            lastReview: "2026-08-01T12:00:00.000Z",
          }),
        }),
      );
    }
    for (let i = 0; i < 4; i++) {
      const cardId = `card:form:${i}`;
      const conceptId = `lex:form:${i}`;
      const templateId = `tmpl:form:${i}`;
      out.push(
        candidate({
          cardId,
          conceptId,
          templateId,
          modality: "form",
          lessonId: "lesson:02",
          card: reviewedCard({
            cardId,
            conceptId,
            templateId,
            measuredDimension: "form",
            due: `2026-08-06T0${i}:00:00.000Z`,
            lastReview: "2026-08-01T12:00:00.000Z",
          }),
        }),
      );
    }
    out.push(
      candidate({
        cardId: "card:diff:0",
        conceptId: "lex:diff:0",
        templateId: "tmpl:diff:0",
        modality: "recall",
        lessonId: "lesson:01",
        recentFailureOrDifficult: true,
        tags: ["Difficult"],
        card: reviewedCard({
          cardId: "card:diff:0",
          conceptId: "lex:diff:0",
          templateId: "tmpl:diff:0",
          due: "2026-08-08T11:00:00.000Z",
          lastReview: "2026-08-07T11:00:00.000Z",
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:prod:0",
        conceptId: "lex:prod:0",
        templateId: "tmpl:prod:0",
        modality: "production",
        lessonId: "lesson:02",
        card: reviewedCard({
          cardId: "card:prod:0",
          conceptId: "lex:prod:0",
          templateId: "tmpl:prod:0",
          measuredDimension: "production",
          due: "2026-08-07T18:00:00.000Z",
          lastReview: "2026-08-01T12:00:00.000Z",
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:older:0",
        conceptId: "lex:older:0",
        templateId: "tmpl:older:0",
        modality: "recognition",
        lessonId: "lesson:01",
        olderMaintenance: true,
        card: reviewedCard({
          cardId: "card:older:0",
          conceptId: "lex:older:0",
          templateId: "tmpl:older:0",
          measuredDimension: "recognition",
          due: "2026-07-01T12:00:00.000Z",
          lastReview: "2026-06-01T12:00:00.000Z",
          stability: 30,
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:new:0",
        conceptId: "lex:new:0",
        templateId: "tmpl:new:0",
        modality: "recall",
        lessonId: "lesson:01",
      }),
    );
    out.push(
      candidate({
        cardId: "card:stage:0",
        conceptId: "lex:stage:0",
        templateId: "tmpl:stage:0",
        modality: "form",
        lessonId: "lesson:02",
        stageBlocking: true,
        card: reviewedCard({
          cardId: "card:stage:0",
          conceptId: "lex:stage:0",
          templateId: "tmpl:stage:0",
          measuredDimension: "form",
          due: "2026-08-08T09:00:00.000Z",
          lastReview: "2026-08-07T09:00:00.000Z",
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:locked:0",
        conceptId: "lex:locked:0",
        templateId: "tmpl:locked:0",
        modality: "recall",
        lessonId: "lesson:01",
        unlocked: false,
        card: reviewedCard({
          cardId: "card:locked:0",
          conceptId: "lex:locked:0",
          templateId: "tmpl:locked:0",
          due: "2026-01-01T00:00:00.000Z",
          lastReview: "2025-12-01T00:00:00.000Z",
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:draft:0",
        conceptId: "lex:draft:0",
        templateId: "tmpl:draft:0",
        modality: "recall",
        lessonId: "lesson:01",
        publicationStatus: "draft",
        card: reviewedCard({
          cardId: "card:draft:0",
          conceptId: "lex:draft:0",
          templateId: "tmpl:draft:0",
          due: "2026-01-01T00:00:00.000Z",
          lastReview: "2025-12-01T00:00:00.000Z",
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:reviewpub:0",
        conceptId: "lex:reviewpub:0",
        templateId: "tmpl:reviewpub:0",
        modality: "listening",
        lessonId: "lesson:01",
        publicationStatus: "review",
        card: reviewedCard({
          cardId: "card:reviewpub:0",
          conceptId: "lex:reviewpub:0",
          templateId: "tmpl:reviewpub:0",
          measuredDimension: "listening",
          due: "2026-01-01T00:00:00.000Z",
          lastReview: "2025-12-01T00:00:00.000Z",
        }),
      }),
    );
    out.push(
      candidate({
        cardId: "card:blocked:0",
        conceptId: "lex:blocked:0",
        templateId: "tmpl:blocked:0",
        modality: "production",
        lessonId: "lesson:01",
        publicationStatus: "blocked",
        card: reviewedCard({
          cardId: "card:blocked:0",
          conceptId: "lex:blocked:0",
          templateId: "tmpl:blocked:0",
          measuredDimension: "production",
          due: "2026-01-01T00:00:00.000Z",
          lastReview: "2025-12-01T00:00:00.000Z",
        }),
      }),
    );
    return out;
  }

  it("selects due-first and includes all five modalities when available", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 20,
      newCardLimit: 2,
    });
    expect(mission.selected.length).toBeGreaterThan(0);
    const first = mission.selected[0]!;
    expect(Date.parse(first.candidate.card.due)).toBeLessThanOrEqual(NOW.getTime());

    const modalities = new Set(mission.selected.map((s) => s.candidate.modality));
    expect(modalities.has("recall")).toBe(true);
    expect(modalities.has("listening")).toBe(true);
    expect(modalities.has("form")).toBe(true);
    expect(modalities.has("production")).toBe(true);
    expect(modalities.has("recognition")).toBe(true);
  });

  it("excludes locked, draft, review, and blocked candidates", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 30,
      newCardLimit: 5,
    });
    const ids = mission.selected.map((s) => s.candidate.cardId);
    expect(ids).not.toContain("card:locked:0");
    expect(ids).not.toContain("card:draft:0");
    expect(ids).not.toContain("card:reviewpub:0");
    expect(ids).not.toContain("card:blocked:0");
    for (const s of mission.selected) {
      expect(s.candidate.publicationStatus).toBe("published");
      expect(s.candidate.unlocked).toBe(true);
    }
  });

  it("never duplicates a card", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 25,
      newCardLimit: 3,
    });
    const ids = mission.selected.map((s) => s.candidate.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stable ties use due, priority, conceptId, cardId", () => {
    const c1 = candidate({
      cardId: "card:tie:a",
      conceptId: "lex:tie:a",
      templateId: "tmpl:tie:a",
      modality: "recall",
      lessonId: "lesson:01",
      sourcePriority: 1,
      card: reviewedCard({
        cardId: "card:tie:a",
        conceptId: "lex:tie:a",
        templateId: "tmpl:tie:a",
        due: "2026-08-01T10:00:00.000Z",
        lastReview: "2026-07-01T10:00:00.000Z",
      }),
    });
    const c2 = candidate({
      cardId: "card:tie:b",
      conceptId: "lex:tie:b",
      templateId: "tmpl:tie:b",
      modality: "recall",
      lessonId: "lesson:01",
      sourcePriority: 1,
      card: reviewedCard({
        cardId: "card:tie:b",
        conceptId: "lex:tie:b",
        templateId: "tmpl:tie:b",
        due: "2026-08-01T10:00:00.000Z",
        lastReview: "2026-07-01T10:00:00.000Z",
      }),
    });
    const m1 = generateDailyMission({
      candidates: [c2, c1],
      now: NOW,
      dailyCardLimit: 2,
      newCardLimit: 0,
    });
    const m2 = generateDailyMission({
      candidates: [c1, c2],
      now: NOW,
      dailyCardLimit: 2,
      newCardLimit: 0,
    });
    expect(m1.selected.map((s) => s.candidate.cardId)).toEqual(
      m2.selected.map((s) => s.candidate.cardId),
    );
    expect(m1.selected[0]!.candidate.cardId).toBe("card:tie:a");
  });

  it("respects onlyDifficult, teacherAssignment, and lessonId filters", () => {
    const pool = mixPool();
    pool.push(
      candidate({
        cardId: "card:teacher:0",
        conceptId: "lex:teacher:0",
        templateId: "tmpl:teacher:0",
        modality: "recall",
        lessonId: "lesson:02",
        teacherAssignment: true,
        recentFailureOrDifficult: true,
        card: reviewedCard({
          cardId: "card:teacher:0",
          conceptId: "lex:teacher:0",
          templateId: "tmpl:teacher:0",
          due: "2026-08-01T08:00:00.000Z",
          lastReview: "2026-07-01T08:00:00.000Z",
        }),
      }),
    );

    const difficultOnly = generateDailyMission({
      candidates: pool,
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 0,
      filters: { onlyDifficult: true },
    });
    expect(difficultOnly.selected.length).toBeGreaterThan(0);
    for (const s of difficultOnly.selected) {
      expect(isDifficultCandidate(s.candidate)).toBe(true);
    }

    const teacher = generateDailyMission({
      candidates: pool,
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 0,
      filters: { teacherAssignment: true },
    });
    expect(teacher.selected.every((s) => s.candidate.teacherAssignment)).toBe(true);

    const lesson = generateDailyMission({
      candidates: pool,
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 0,
      filters: { lessonId: "lesson:02" },
    });
    expect(lesson.selected.every((s) => s.candidate.lessonId === "lesson:02")).toBe(true);
  });

  it("fails closed on unknown filters, unknown lesson IDs, and invalid limits", () => {
    const pool = mixPool();
    expect(() =>
      generateDailyMission({
        candidates: pool,
        now: NOW,
        dailyCardLimit: 5,
        newCardLimit: 1,
        filters: { unknownFilter: true } as never,
      }),
    ).toThrow(ReviewError);

    expect(() =>
      generateDailyMission({
        candidates: pool,
        now: NOW,
        dailyCardLimit: 5,
        newCardLimit: 1,
        filters: { lessonId: "lesson:99" },
      }),
    ).toThrow(ReviewError);

    expect(() =>
      generateDailyMission({
        candidates: pool,
        now: NOW,
        dailyCardLimit: -1,
        newCardLimit: 1,
      }),
    ).toThrow(ReviewError);

    expect(() =>
      generateDailyMission({
        candidates: pool,
        now: NOW,
        dailyCardLimit: 1.5,
        newCardLimit: 1,
      }),
    ).toThrow(ReviewError);
  });

  it("does not invent modalities when unavailable; backfills and reports actual counts", () => {
    const recallOnly = [
      overdueRecall(1, "2026-08-01T10:00:00.000Z"),
      overdueRecall(2, "2026-08-02T10:00:00.000Z"),
      overdueRecall(3, "2026-08-03T10:00:00.000Z"),
    ];
    const mission = generateDailyMission({
      candidates: recallOnly,
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 0,
      targetCount: 5,
    });
    expect(mission.selected.length).toBe(3);
    expect(mission.selected.every((s) => s.candidate.modality === "recall")).toBe(true);
    expect(mission.categoryCounts.listening).toBe(0);
    expect(mission.reason.listening).toBe(0);
    expect(mission.reasonText.includes("listening")).toBe(false);
  });

  it("reason summary matches selected cards and omits absent categories", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 15,
      newCardLimit: 1,
    });
    expect(mission.reasonText).toBe(formatMissionReasonText(mission.reason));
    if (mission.reason.due === 0) expect(mission.reasonText.includes("due")).toBe(false);
    if (mission.reason.listening === 0) {
      expect(mission.reasonText.includes("listening")).toBe(false);
    }
    const dueCount = mission.selected.filter(
      (s) => Date.parse(s.candidate.card.due) <= NOW.getTime(),
    ).length;
    expect(mission.reason.due).toBe(dueCount);
  });

  it("shortening returns deterministic prefix without mutating inputs", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 12,
      newCardLimit: 1,
    });
    const before = JSON.stringify(mission);
    const short = shortenMissionAt(mission, 4, NOW);
    expect(short.selected.length).toBe(4);
    expect(short.selected.map((s) => s.candidate.cardId)).toEqual(
      mission.selected.slice(0, 4).map((s) => s.candidate.cardId),
    );
    expect(JSON.stringify(mission)).toBe(before);
  });

  it("resume from card IDs is stable and rejects unknowns", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 1,
    });
    const ids = mission.selected.slice(0, 3).map((s) => s.candidate.cardId);
    const resumed = resumeMissionFromCardIds(mission, [ids[2]!, ids[0]!], NOW);
    expect(resumed.selected.map((s) => s.candidate.cardId)).toEqual([ids[2], ids[0]]);
    expect(() => resumeMissionFromCardIds(mission, ["card:missing"], NOW)).toThrow(
      ReviewError,
    );
  });

  it("respects daily and new-card limits", () => {
    const mission = generateDailyMission({
      candidates: mixPool(),
      now: NOW,
      dailyCardLimit: 5,
      newCardLimit: 0,
    });
    expect(mission.selected.length).toBeLessThanOrEqual(5);
    expect(mission.newCardsSelected).toBe(0);
    expect(mission.selected.every((s) => s.candidate.card.state !== "new")).toBe(true);
  });

  it("mission generation does not mutate candidate card scheduler state", () => {
    const pool = mixPool();
    const before = JSON.stringify(pool.map((c) => c.card));
    generateDailyMission({
      candidates: pool,
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 1,
    });
    expect(JSON.stringify(pool.map((c) => c.card))).toBe(before);
  });

  it("rejects duplicate candidate cardIds", () => {
    const c = overdueRecall(1, "2026-08-01T10:00:00.000Z");
    expect(() => parseReviewCandidates([c, c])).toThrow(ReviewError);
  });
});

// ─── C2CR1 adversarial remediation ─────────────────────────────────────────

describe("C2CR1 adversarial remediation", () => {
  it("blocks new-card quota bypass: lifecycle new cannot pass newCardLimit:0", () => {
    const sneaky = candidate({
      cardId: "card:sneaky-new",
      conceptId: "lex:sneaky",
      templateId: "tmpl:sneaky",
      modality: "recall",
      lessonId: "lesson:01",
      // state new via createNewReviewCard — no newCard flag to lie with
    });
    expect(sneaky.card.state).toBe("new");
    const mission = generateDailyMission({
      candidates: [sneaky, overdueRecall(1, "2026-08-01T10:00:00.000Z")],
      now: NOW,
      dailyCardLimit: 5,
      newCardLimit: 0,
    });
    expect(mission.selected.every((s) => s.candidate.card.state !== "new")).toBe(true);
    expect(mission.newCardsSelected).toBe(0);
    expect(mission.selected.map((s) => s.candidate.cardId)).toEqual(["card:recall:1"]);
  });

  it("balanced pool (6 listening + 6 production + 6 form, target 6) includes all modalities", () => {
    const pool: ReviewCandidate[] = [];
    for (const modality of ["listening", "production", "form"] as const) {
      for (let i = 0; i < 6; i++) {
        const cardId = `card:bal:${modality}:${i}`;
        const conceptId = `lex:bal:${modality}:${i}`;
        const templateId = `tmpl:bal:${modality}:${i}`;
        pool.push(
          candidate({
            cardId,
            conceptId,
            templateId,
            modality,
            lessonId: "lesson:01",
            sourcePriority: 5,
            card: reviewedCard({
              cardId,
              conceptId,
              templateId,
              measuredDimension: modality,
              // Same due so ties fall to concept/card id — listening would sort first
              due: "2026-08-01T10:00:00.000Z",
              lastReview: "2026-07-01T10:00:00.000Z",
            }),
          }),
        );
      }
    }
    const mission = generateDailyMission({
      candidates: pool,
      now: NOW,
      dailyCardLimit: 6,
      newCardLimit: 0,
      targetCount: 6,
    });
    expect(mission.selected.length).toBe(6);
    const modalities = new Set(mission.selected.map((s) => s.candidate.modality));
    expect(modalities.has("listening")).toBe(true);
    expect(modalities.has("production")).toBe(true);
    expect(modalities.has("form")).toBe(true);
    // Must not be six listening
    expect(mission.selected.filter((s) => s.candidate.modality === "listening").length).toBeLessThan(
      6,
    );
  });

  it("sparse categories backfill deterministically without inventing cards", () => {
    const pool = [
      ...[0, 1, 2, 3, 4].map((i) =>
        candidate({
          cardId: `card:sparse:l:${i}`,
          conceptId: `lex:sparse:l:${i}`,
          templateId: `tmpl:sparse:l:${i}`,
          modality: "listening",
          lessonId: "lesson:01",
          card: reviewedCard({
            cardId: `card:sparse:l:${i}`,
            conceptId: `lex:sparse:l:${i}`,
            templateId: `tmpl:sparse:l:${i}`,
            measuredDimension: "listening",
            due: `2026-08-0${i + 1}T10:00:00.000Z`,
            lastReview: "2026-07-01T10:00:00.000Z",
          }),
        }),
      ),
      candidate({
        cardId: "card:sparse:p:0",
        conceptId: "lex:sparse:p:0",
        templateId: "tmpl:sparse:p:0",
        modality: "production",
        lessonId: "lesson:01",
        card: reviewedCard({
          cardId: "card:sparse:p:0",
          conceptId: "lex:sparse:p:0",
          templateId: "tmpl:sparse:p:0",
          measuredDimension: "production",
          due: "2026-08-07T10:00:00.000Z",
          lastReview: "2026-07-01T10:00:00.000Z",
        }),
      }),
    ];
    const a = generateDailyMission({
      candidates: pool,
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 0,
      targetCount: 8,
    });
    const b = generateDailyMission({
      candidates: [...pool].reverse(),
      now: NOW,
      dailyCardLimit: 10,
      newCardLimit: 0,
      targetCount: 8,
    });
    expect(a.selected.length).toBe(6);
    expect(a.selected.map((s) => s.candidate.cardId)).toEqual(
      b.selected.map((s) => s.candidate.cardId),
    );
    expect(a.selected.some((s) => s.candidate.modality === "production")).toBe(true);
    expect(a.categoryCounts.form).toBe(0);
  });

  it("Difficult/Confusing tags select across listening and form without scheduler contamination", () => {
    const taggedListen = candidate({
      cardId: "card:tag:listen",
      conceptId: "lex:tag:listen",
      templateId: "tmpl:tag:listen",
      modality: "listening",
      lessonId: "lesson:01",
      tags: ["Difficult"],
      recentFailureOrDifficult: false,
      card: reviewedCard({
        cardId: "card:tag:listen",
        conceptId: "lex:tag:listen",
        templateId: "tmpl:tag:listen",
        measuredDimension: "listening",
        due: "2026-08-10T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    });
    const taggedForm = candidate({
      cardId: "card:tag:form",
      conceptId: "lex:tag:form",
      templateId: "tmpl:tag:form",
      modality: "form",
      lessonId: "lesson:01",
      tags: ["Confusing"],
      recentFailureOrDifficult: false,
      card: reviewedCard({
        cardId: "card:tag:form",
        conceptId: "lex:tag:form",
        templateId: "tmpl:tag:form",
        measuredDimension: "form",
        due: "2026-08-11T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    });
    const plain = candidate({
      cardId: "card:tag:plain",
      conceptId: "lex:tag:plain",
      templateId: "tmpl:tag:plain",
      modality: "recall",
      lessonId: "lesson:01",
      card: reviewedCard({
        cardId: "card:tag:plain",
        conceptId: "lex:tag:plain",
        templateId: "tmpl:tag:plain",
        due: "2026-08-12T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    });
    expect(isDifficultCandidate(taggedListen)).toBe(true);
    expect(isDifficultCandidate(taggedForm)).toBe(true);
    expect(isDifficultCandidate(plain)).toBe(false);

    const mission = generateDailyMission({
      candidates: [plain, taggedListen, taggedForm],
      now: NOW,
      dailyCardLimit: 5,
      newCardLimit: 0,
      filters: { onlyDifficult: true },
    });
    expect(mission.selected.map((s) => s.candidate.cardId).sort()).toEqual([
      "card:tag:form",
      "card:tag:listen",
    ]);
    expect(mission.reason.difficult).toBe(2);

    const scheduler = createAlphaReviewScheduler();
    const before = JSON.stringify(taggedListen.card);
    scheduler.review(taggedListen.card, "good", NOW);
    expect(JSON.stringify(taggedListen.card)).toBe(before);
  });

  it("categoryCounts.difficult is exclusive; reason.difficult may overlap modalities", () => {
    const difficultListening = candidate({
      cardId: "card:acct:dl",
      conceptId: "lex:acct:dl",
      templateId: "tmpl:acct:dl",
      modality: "listening",
      lessonId: "lesson:01",
      recentFailureOrDifficult: true,
      card: reviewedCard({
        cardId: "card:acct:dl",
        conceptId: "lex:acct:dl",
        templateId: "tmpl:acct:dl",
        measuredDimension: "listening",
        due: "2026-08-09T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    });
    expect(exclusiveSelectionCategory(difficultListening, NOW.getTime())).toBe("difficult");
    const mission = generateDailyMission({
      candidates: [difficultListening],
      now: NOW,
      dailyCardLimit: 3,
      newCardLimit: 0,
    });
    expect(mission.selected[0]!.category).toBe("difficult");
    expect(mission.categoryCounts.difficult).toBe(1);
    expect(mission.categoryCounts.listening).toBe(0);
    expect(mission.reason.difficult).toBe(1);
    expect(mission.reason.listening).toBe(1);
  });

  it("rejects due-before-lastReview and dirty new state", () => {
    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:duebad", conceptId: "lex:duebad", templateId: "tmpl:duebad" }),
        due: "2026-08-01T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...newCard({ cardId: "card:dirty", conceptId: "lex:dirty", templateId: "tmpl:dirty" }),
        difficulty: 3,
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...newCard({ cardId: "card:dirty2", conceptId: "lex:dirty2", templateId: "tmpl:dirty2" }),
        stability: 1,
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCardState({
        ...reviewedCard({ cardId: "card:learnbad", conceptId: "lex:learnbad", templateId: "tmpl:learnbad" }),
        state: "learning",
        lapses: 1,
        reps: 2,
        due: "2026-08-08T12:10:00.000Z",
        lastReview: "2026-08-08T12:00:00.000Z",
      }),
    ).toThrow(ReviewError);
  });

  it("rejects modality mismatch and exposure measuredDimension", () => {
    expect(() =>
      parseReviewCandidate({
        cardId: "card:mm",
        conceptId: "lex:mm",
        templateId: "tmpl:mm",
        publicationStatus: "published",
        unlocked: true,
        conceptLabel: "mm",
        measuredDimension: "listening",
        modality: "recall",
        sourcePriority: 1,
        lessonId: "lesson:01",
        tags: [],
        recentFailureOrDifficult: false,
        stageBlocking: false,
        olderMaintenance: false,
        teacherAssignment: false,
        card: reviewedCard({
          cardId: "card:mm",
          conceptId: "lex:mm",
          templateId: "tmpl:mm",
          measuredDimension: "listening",
        }),
      }),
    ).toThrow(ReviewError);

    expect(() =>
      parseReviewCandidate({
        cardId: "card:exp",
        conceptId: "lex:exp",
        templateId: "tmpl:exp",
        publicationStatus: "published",
        unlocked: true,
        conceptLabel: "exp",
        measuredDimension: "exposure",
        modality: "recognition",
        sourcePriority: 1,
        lessonId: "lesson:01",
        tags: [],
        recentFailureOrDifficult: false,
        stageBlocking: false,
        olderMaintenance: false,
        teacherAssignment: false,
        card: parseReviewCardState({
          ...reviewedCard({
            cardId: "card:exp",
            conceptId: "lex:exp",
            templateId: "tmpl:exp",
          }),
          measuredDimension: "exposure",
        }),
      }),
    ).toThrow(ReviewError);
  });

  it("throws ReviewError for null/undefined/malformed generateDailyMission inputs", () => {
    expect(() => generateDailyMission(null as never)).toThrow(ReviewError);
    expect(() => generateDailyMission(undefined as never)).toThrow(ReviewError);
    expect(() =>
      generateDailyMission({
        candidates: null as never,
        now: NOW,
        dailyCardLimit: 1,
        newCardLimit: 0,
      }),
    ).toThrow(ReviewError);
    expect(() =>
      generateDailyMission({
        candidates: "nope" as never,
        now: NOW,
        dailyCardLimit: 1,
        newCardLimit: 0,
      }),
    ).toThrow(ReviewError);
    try {
      generateDailyMission(null as never);
    } catch (e) {
      expect(e).toBeInstanceOf(ReviewError);
      expect((e as ReviewError).name).toBe("ReviewError");
    }
  });
});

// ─── Mastery snapshot integration (weak / lapsed dimensions) ───────────────

describe("mission selection uses approved mastery snapshots for weak/lapsed dims", () => {
  function base(partial: Record<string, unknown>): Record<string, unknown> {
    return {
      schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
      sessionId: SESSION,
      conceptId: "lex:ingenieur",
      sourceActivityMode: "recall",
      ...partial,
    };
  }

  function recall(
    n: number,
    ts: string,
    outcome: "correct" | "incorrect",
  ): unknown {
    return base({
      kind: "objectiveAttempt",
      eventId: eid(n),
      timestamp: ts,
      taskFamily: "typedRecall",
      graderOutcome: outcome,
      latencyMs: 900,
      hintsUsed: 0,
      measuredDimensions: ["recall"],
    });
  }

  function listening(
    n: number,
    ts: string,
    outcome: "correct" | "incorrect",
  ): unknown {
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

  function production(
    n: number,
    ts: string,
    outcome: "correct" | "incorrect",
  ): unknown {
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

  it("flags recentFailureOrDifficult via deriveMasteryDimensionReviewState (not failures>0)", () => {
    const snap: ConceptMasterySnapshot = reduceConceptMastery("lex:ingenieur", [
      recall(1, "2026-08-01T10:00:00.000Z", "correct"),
      recall(2, "2026-08-02T10:00:00.000Z", "incorrect"),
      listening(3, "2026-08-03T10:00:00.000Z", "incorrect"),
      production(4, "2026-08-04T10:00:00.000Z", "correct"),
    ]);

    const recallState = deriveMasteryDimensionReviewState(snap, "recall");
    const listeningState = deriveMasteryDimensionReviewState(snap, "listening");
    const productionState = deriveMasteryDimensionReviewState(snap, "production");

    expect(recallState.weak).toBe(true);
    expect(recallState.hasUnrecoveredLapse).toBe(true);
    expect(recallState.recentFailureOrDifficult).toBe(true);
    expect(listeningState.recentFailureOrDifficult).toBe(true);
    expect(productionState.weak).toBe(false);
    expect(productionState.recentFailureOrDifficult).toBe(false);

    const candidates = [
      candidate({
        cardId: "card:m:recall",
        conceptId: snap.conceptId,
        templateId: "tmpl:m:recall",
        modality: "recall",
        lessonId: "lesson:02",
        recentFailureOrDifficult: recallState.recentFailureOrDifficult,
        card: reviewedCard({
          cardId: "card:m:recall",
          conceptId: snap.conceptId,
          templateId: "tmpl:m:recall",
          measuredDimension: "recall",
          due: "2026-08-07T12:00:00.000Z",
          lastReview: "2026-08-01T12:00:00.000Z",
        }),
      }),
      candidate({
        cardId: "card:m:listen",
        conceptId: snap.conceptId,
        templateId: "tmpl:m:listen",
        modality: "listening",
        lessonId: "lesson:02",
        recentFailureOrDifficult: listeningState.recentFailureOrDifficult,
        card: reviewedCard({
          cardId: "card:m:listen",
          conceptId: snap.conceptId,
          templateId: "tmpl:m:listen",
          measuredDimension: "listening",
          due: "2026-08-08T13:00:00.000Z",
          lastReview: "2026-08-01T12:00:00.000Z",
        }),
      }),
      candidate({
        cardId: "card:m:strongish",
        conceptId: "lex:other",
        templateId: "tmpl:m:other",
        modality: "production",
        lessonId: "lesson:02",
        recentFailureOrDifficult: productionState.recentFailureOrDifficult,
        card: reviewedCard({
          cardId: "card:m:strongish",
          conceptId: "lex:other",
          templateId: "tmpl:m:other",
          measuredDimension: "production",
          due: "2026-08-10T12:00:00.000Z",
          lastReview: "2026-08-01T12:00:00.000Z",
        }),
      }),
    ];

    const mission = generateDailyMission({
      candidates,
      now: NOW,
      dailyCardLimit: 5,
      newCardLimit: 0,
      filters: { onlyDifficult: true },
    });

    expect(mission.selected.length).toBe(2);
    expect(mission.selected.map((s) => s.candidate.cardId).sort()).toEqual([
      "card:m:listen",
      "card:m:recall",
    ]);
    expect(mission.reason.difficult).toBe(2);
    expect(candidates[0]!.card.lapses).toBe(0);
  });

  it("recovered historical failures alone are not permanently difficult", () => {
    // Build enough strong evidence to recover after a lapse (default minStrong=2).
    const events: unknown[] = [];
    let n = 1;
    for (let i = 0; i < 4; i++) {
      events.push(recall(n++, `2026-07-0${i + 1}T10:00:00.000Z`, "correct"));
    }
    events.push(recall(n++, "2026-07-10T10:00:00.000Z", "incorrect"));
    // Post-lapse strong successes (latency/hints valid)
    events.push(recall(n++, "2026-07-11T10:00:00.000Z", "correct"));
    events.push(recall(n++, "2026-07-12T10:00:00.000Z", "correct"));

    const snap = reduceConceptMastery("lex:ingenieur", events);
    expect(snap.dimensions.recall.failures).toBeGreaterThan(0);
    expect(snap.dimensionRecovery.recall.recovered).toBe(true);

    const state = deriveMasteryDimensionReviewState(snap, "recall");
    expect(state.weak).toBe(false);
    expect(state.hasUnrecoveredLapse).toBe(false);
    expect(state.recovered).toBe(true);
    // Latest evidence is correct → not recentFailureOrDifficult
    expect(state.latestOutcome).toBe("correct");
    expect(state.recentFailureOrDifficult).toBe(false);

    const c = candidate({
      cardId: "card:recovered",
      conceptId: snap.conceptId,
      templateId: "tmpl:recovered",
      modality: "recall",
      lessonId: "lesson:01",
      recentFailureOrDifficult: state.recentFailureOrDifficult,
      card: reviewedCard({
        cardId: "card:recovered",
        conceptId: snap.conceptId,
        templateId: "tmpl:recovered",
        due: "2026-08-10T12:00:00.000Z",
        lastReview: "2026-08-05T12:00:00.000Z",
      }),
    });
    const mission = generateDailyMission({
      candidates: [c],
      now: NOW,
      dailyCardLimit: 3,
      newCardLimit: 0,
      filters: { onlyDifficult: true },
    });
    expect(mission.selected.length).toBe(0);
  });

  it("scheduler math ignores tags and mastery percentages (no single %)", () => {
    const tagged = reviewedCard({
      cardId: "card:tag",
      conceptId: "lex:tag",
      templateId: "tmpl:tag",
    });
    const scheduler = createAlphaReviewScheduler();
    const a = scheduler.review(tagged, "good", NOW);
    const b = scheduler.review(tagged, "good", NOW);
    expect(a.card.scheduledDays).toBe(b.card.scheduledDays);
    expect(JSON.stringify(a.card)).not.toMatch(/xp|streak|badge|percent/i);
  });
});
