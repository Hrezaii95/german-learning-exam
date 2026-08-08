/**
 * Alpha Deterministic ReviewScheduler adapter (C2C / P2-04).
 *
 * Callers must use ReviewScheduler.preview / ReviewScheduler.review only —
 * no UI imports algorithm internals.
 *
 * Formulas and clamps: see ./constants.ts (documented; not personalized FSRS).
 */

import {
  ALPHA_DESIRED_RETENTION,
  clampDifficulty,
  clampStability,
  daysToMs,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_DELTA,
  GRADUATE_EASY_DAYS,
  GRADUATE_GOOD_DAYS,
  INITIAL_STABILITY_EASY,
  INITIAL_STABILITY_GOOD,
  LEARNING_AGAIN_MS,
  LEARNING_GOOD_MS,
  LEARNING_HARD_MS,
  MS_PER_DAY,
  msToScheduledDays,
  RELEARNING_AGAIN_MS,
  REVIEW_EASY_FACTOR,
  REVIEW_GOOD_FACTOR,
  REVIEW_HARD_FACTOR,
  STABILITY_ADD,
  STABILITY_MULT,
} from "./constants.js";
import { reviewError } from "./errors.js";
import { parseReviewRating } from "./grading.js";
import {
  REVIEW_RATINGS,
  REVIEW_SCHEDULER_ID,
  REVIEW_SCHEDULER_VERSION,
  type RatingOptions,
  type ReviewCardLifecycle,
  type ReviewCardState,
  type ReviewRating,
  type ReviewResult,
  type ReviewScheduler,
} from "./types.js";
import {
  assertNowNotBeforeLastReview,
  assertValidNow,
  parseReviewCardState,
} from "./validate.js";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const child of Object.values(value as object)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function toIso(d: Date): string {
  return d.toISOString();
}

function elapsedDaysSince(lastReview: string | null, now: Date): number {
  if (lastReview === null) return 0;
  const last = Date.parse(lastReview);
  const delta = now.getTime() - last;
  if (delta < 0) {
    throw reviewError("CLOCK_REGRESSION", "now before lastReview", "now");
  }
  return delta / MS_PER_DAY;
}

function nextDifficulty(card: ReviewCardState, rating: ReviewRating): number {
  const base = card.difficulty === 0 ? DEFAULT_DIFFICULTY : card.difficulty;
  return clampDifficulty(base + DIFFICULTY_DELTA[rating]);
}

function nextStability(
  card: ReviewCardState,
  rating: ReviewRating,
  nextState: ReviewCardLifecycle,
): number {
  if (nextState === "learning" && (card.state === "new" || card.state === "learning")) {
    if (rating === "easy") return clampStability(INITIAL_STABILITY_EASY);
    if (rating === "good" && card.state === "learning" && card.reps >= 1) {
      return clampStability(INITIAL_STABILITY_GOOD);
    }
    // Still in short learning steps — keep low stability floor.
    return card.stability > 0 ? clampStability(card.stability) : MIN_LEARNING_STABILITY;
  }
  if (nextState === "review" && (card.state === "new" || card.state === "learning")) {
    return rating === "easy"
      ? clampStability(INITIAL_STABILITY_EASY)
      : clampStability(INITIAL_STABILITY_GOOD);
  }
  if (nextState === "review" && card.state === "relearning") {
    return clampStability(INITIAL_STABILITY_GOOD);
  }
  const prior = card.stability > 0 ? card.stability : MIN_LEARNING_STABILITY;
  return clampStability(prior * STABILITY_MULT[rating] + STABILITY_ADD[rating]);
}

const MIN_LEARNING_STABILITY = 0.1;

type Plan = {
  intervalMs: number;
  scheduledDays: number;
  state: ReviewCardLifecycle;
  increaseLapse: boolean;
};

/**
 * Build four rating plans with enforced interval ordering Again ≤ Hard ≤ Good ≤ Easy.
 * Desired retention (0.90) is recorded as a global Alpha default; intervals use
 * stability factors rather than personalized FSRS parameter fitting.
 */
function planIntervals(card: ReviewCardState): Readonly<Record<ReviewRating, Plan>> {
  void ALPHA_DESIRED_RETENTION; // documented global default — not personalized

  const S = card.stability > 0 ? card.stability : INITIAL_STABILITY_GOOD;

  let again: Plan;
  let hard: Plan;
  let good: Plan;
  let easy: Plan;

  if (card.state === "new") {
    again = {
      intervalMs: LEARNING_AGAIN_MS,
      scheduledDays: 0,
      state: "learning",
      increaseLapse: false,
    };
    hard = {
      intervalMs: LEARNING_HARD_MS,
      scheduledDays: 0,
      state: "learning",
      increaseLapse: false,
    };
    good = {
      intervalMs: LEARNING_GOOD_MS,
      scheduledDays: 0,
      state: "learning",
      increaseLapse: false,
    };
    easy = {
      intervalMs: daysToMs(GRADUATE_EASY_DAYS),
      scheduledDays: GRADUATE_EASY_DAYS,
      state: "review",
      increaseLapse: false,
    };
  } else if (card.state === "learning") {
    again = {
      intervalMs: LEARNING_AGAIN_MS,
      scheduledDays: 0,
      state: "learning",
      increaseLapse: false,
    };
    hard = {
      intervalMs: LEARNING_HARD_MS,
      scheduledDays: 0,
      state: "learning",
      increaseLapse: false,
    };
    // Good graduates after at least one prior learning rep; otherwise stay in learning.
    if (card.reps >= 1) {
      good = {
        intervalMs: daysToMs(GRADUATE_GOOD_DAYS),
        scheduledDays: GRADUATE_GOOD_DAYS,
        state: "review",
        increaseLapse: false,
      };
    } else {
      good = {
        intervalMs: LEARNING_GOOD_MS,
        scheduledDays: 0,
        state: "learning",
        increaseLapse: false,
      };
    }
    easy = {
      intervalMs: daysToMs(GRADUATE_EASY_DAYS),
      scheduledDays: GRADUATE_EASY_DAYS,
      state: "review",
      increaseLapse: false,
    };
  } else if (card.state === "relearning") {
    again = {
      intervalMs: RELEARNING_AGAIN_MS,
      scheduledDays: 0,
      state: "relearning",
      increaseLapse: true,
    };
    hard = {
      intervalMs: LEARNING_HARD_MS,
      scheduledDays: 0,
      state: "relearning",
      increaseLapse: false,
    };
    good = {
      intervalMs: daysToMs(GRADUATE_GOOD_DAYS),
      scheduledDays: GRADUATE_GOOD_DAYS,
      state: "review",
      increaseLapse: false,
    };
    easy = {
      intervalMs: daysToMs(GRADUATE_EASY_DAYS),
      scheduledDays: GRADUATE_EASY_DAYS,
      state: "review",
      increaseLapse: false,
    };
  } else {
    // review
    again = {
      intervalMs: RELEARNING_AGAIN_MS,
      scheduledDays: 0,
      state: "relearning",
      increaseLapse: true,
    };
    const hardDays = Math.max(1, Math.round(S * REVIEW_HARD_FACTOR));
    const goodDays = Math.max(hardDays, Math.round(S * REVIEW_GOOD_FACTOR));
    const easyDays = Math.max(goodDays, Math.round(S * REVIEW_EASY_FACTOR));
    hard = {
      intervalMs: daysToMs(hardDays),
      scheduledDays: hardDays,
      state: "review",
      increaseLapse: false,
    };
    good = {
      intervalMs: daysToMs(goodDays),
      scheduledDays: goodDays,
      state: "review",
      increaseLapse: false,
    };
    easy = {
      intervalMs: daysToMs(easyDays),
      scheduledDays: easyDays,
      state: "review",
      increaseLapse: false,
    };
  }

  // Enforce Again ≤ Hard ≤ Good ≤ Easy on intervalMs (and re-derive scheduledDays).
  const ordered = enforceIntervalOrder({ again, hard, good, easy });
  return ordered;
}

function enforceIntervalOrder(
  plans: Record<ReviewRating, Plan>,
): Readonly<Record<ReviewRating, Plan>> {
  const again = { ...plans.again };
  let hard = { ...plans.hard };
  let good = { ...plans.good };
  let easy = { ...plans.easy };

  if (hard.intervalMs < again.intervalMs) {
    hard = {
      ...hard,
      intervalMs: again.intervalMs,
      scheduledDays: msToScheduledDays(again.intervalMs),
    };
  }
  if (good.intervalMs < hard.intervalMs) {
    good = {
      ...good,
      intervalMs: hard.intervalMs,
      scheduledDays: msToScheduledDays(hard.intervalMs),
    };
  }
  if (easy.intervalMs < good.intervalMs) {
    easy = {
      ...easy,
      intervalMs: good.intervalMs,
      scheduledDays: msToScheduledDays(good.intervalMs),
    };
  }

  return Object.freeze({
    again: Object.freeze(again),
    hard: Object.freeze(hard),
    good: Object.freeze(good),
    easy: Object.freeze(easy),
  });
}

function applyPlan(
  card: ReviewCardState,
  rating: ReviewRating,
  now: Date,
  plan: Plan,
): ReviewResult {
  const elapsedDays = elapsedDaysSince(card.lastReview, now);
  const dueDate = new Date(now.getTime() + plan.intervalMs);
  const difficulty = nextDifficulty(card, rating);
  const stability = nextStability(card, rating, plan.state);
  const reps = card.reps + 1;
  const lapses = plan.increaseLapse ? card.lapses + 1 : card.lapses;

  const nextRaw = {
    cardId: card.cardId,
    conceptId: card.conceptId,
    templateId: card.templateId,
    measuredDimension: card.measuredDimension,
    due: toIso(dueDate),
    stability,
    difficulty,
    elapsedDays,
    scheduledDays: plan.scheduledDays,
    reps,
    lapses,
    state: plan.state,
    lastReview: toIso(now),
    schedulerId: REVIEW_SCHEDULER_ID,
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
  };

  const nextCard = parseReviewCardState(nextRaw);
  return deepFreeze({
    card: nextCard,
    rating,
    intervalMs: plan.intervalMs,
    scheduledDays: plan.scheduledDays,
  });
}

function project(
  card: ReviewCardState,
  rating: ReviewRating,
  now: Date,
): ReviewResult {
  const validated = parseReviewCardState(card);
  assertValidNow(now);
  assertNowNotBeforeLastReview(validated, now);
  const plans = planIntervals(validated);
  return applyPlan(validated, rating, now, plans[rating]);
}

/**
 * Create the Alpha deterministic ReviewScheduler.
 * Inject `now` on every call — no wall clock, no randomness.
 */
export function createAlphaReviewScheduler(): ReviewScheduler {
  const scheduler: ReviewScheduler = {
    preview(card: ReviewCardState, now: Date): RatingOptions {
      const validated = parseReviewCardState(card);
      assertValidNow(now);
      assertNowNotBeforeLastReview(validated, now);
      const options = {
        again: project(validated, "again", now),
        hard: project(validated, "hard", now),
        good: project(validated, "good", now),
        easy: project(validated, "easy", now),
      };
      // Immutability: never mutate input card
      return deepFreeze(options);
    },

    review(card: ReviewCardState, rating: ReviewRating, now: Date): ReviewResult {
      const r = parseReviewRating(rating);
      return project(card, r, now);
    },
  };
  return Object.freeze(scheduler);
}

/** Verify preview ≡ four independent review projections (test/helper). */
export function previewEqualsIndependentReviews(
  scheduler: ReviewScheduler,
  card: ReviewCardState,
  now: Date,
): boolean {
  const preview = scheduler.preview(card, now);
  for (const rating of REVIEW_RATINGS) {
    const independent = scheduler.review(card, rating, now);
    const p = preview[rating];
    if (
      p.intervalMs !== independent.intervalMs ||
      p.scheduledDays !== independent.scheduledDays ||
      p.rating !== independent.rating ||
      JSON.stringify(p.card) !== JSON.stringify(independent.card)
    ) {
      return false;
    }
  }
  return true;
}
