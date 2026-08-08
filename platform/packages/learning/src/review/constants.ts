/**
 * Documented Alpha Deterministic Scheduler constants and formulas.
 *
 * This is NOT personalized FSRS. State/interface shape is FSRS-compatible so a
 * pinned ts-fsrs adapter can replace `createAlphaReviewScheduler` later.
 * Desired retention is a global Alpha default (0.90); no per-learner optimization.
 */

import type { ReviewRating } from "./types.js";

export const ALPHA_DESIRED_RETENTION = 0.9 as const;

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;
export const DEFAULT_DIFFICULTY = 5;

export const MIN_STABILITY_DAYS = 0.1;
export const MAX_STABILITY_DAYS = 36500;

/** Short intervals while in learning / relearning (milliseconds). */
export const LEARNING_AGAIN_MS = 1 * 60 * 1000;
export const LEARNING_HARD_MS = 5 * 60 * 1000;
export const LEARNING_GOOD_MS = 10 * 60 * 1000;
export const RELEARNING_AGAIN_MS = 10 * 60 * 1000;

/** Graduating from learning/relearning into review (days). */
export const GRADUATE_GOOD_DAYS = 1;
export const GRADUATE_EASY_DAYS = 4;

/** Initial stability after graduating (days). */
export const INITIAL_STABILITY_GOOD = 1;
export const INITIAL_STABILITY_EASY = 4;

/**
 * Review-state interval factors applied to current stability (days), then
 * clamped so Again ≤ Hard ≤ Good ≤ Easy always holds (by intervalMs).
 *
 * again → relearning short interval (not day-scaled)
 * hard  → max(1, round(S * HARD_FACTOR))
 * good  → max(hard, round(S * GOOD_FACTOR))
 * easy  → max(good, round(S * EASY_FACTOR))
 */
export const REVIEW_HARD_FACTOR = 0.8;
export const REVIEW_GOOD_FACTOR = 1.0;
export const REVIEW_EASY_FACTOR = 1.3;

/** Stability multipliers after a rating (clamped to [MIN, MAX]). */
export const STABILITY_MULT: Readonly<Record<ReviewRating, number>> = Object.freeze({
  again: 0.2,
  hard: 0.95,
  good: 1.2,
  easy: 1.5,
});

export const STABILITY_ADD: Readonly<Record<ReviewRating, number>> = Object.freeze({
  again: 0,
  hard: 0,
  good: 0.1,
  easy: 0.25,
});

/** Difficulty deltas (clamped to [MIN_DIFFICULTY, MAX_DIFFICULTY]). */
export const DIFFICULTY_DELTA: Readonly<Record<ReviewRating, number>> = Object.freeze({
  again: 1,
  hard: 0.5,
  good: 0,
  easy: -1,
});

export const MS_PER_DAY = 86_400_000;

export function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DIFFICULTY;
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));
}

export function clampStability(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return MIN_STABILITY_DAYS;
  return Math.min(MAX_STABILITY_DAYS, Math.max(MIN_STABILITY_DAYS, value));
}

export function daysToMs(days: number): number {
  return days * MS_PER_DAY;
}

export function msToScheduledDays(ms: number): number {
  if (ms <= 0) return 0;
  if (ms < MS_PER_DAY) return 0;
  return Math.round(ms / MS_PER_DAY);
}
