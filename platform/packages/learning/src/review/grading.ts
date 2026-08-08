/**
 * Rating / grading boundary for the scheduler.
 *
 * Objective incorrect → Again always.
 * Flashcard reveal uses explicit Again/Hard/Good/Easy.
 * Recording self-rating is NOT pronunciation accuracy and must not silently
 * schedule as objective correctness — callers pass an explicit ReviewRating.
 */

import { reviewError } from "./errors.js";
import { REVIEW_RATINGS, type ObjectiveGrade, type ReviewRating } from "./types.js";

export function isReviewRating(value: unknown): value is ReviewRating {
  return typeof value === "string" && (REVIEW_RATINGS as readonly string[]).includes(value);
}

export function parseReviewRating(value: unknown): ReviewRating {
  if (!isReviewRating(value)) {
    throw reviewError("UNKNOWN_RATING", "rating must be again|hard|good|easy", "rating");
  }
  return value;
}

/**
 * Map an objective grader outcome to a scheduler rating.
 * Partial is treated as Hard (effortful incomplete); incorrect is always Again.
 * Self-confidence must never override this mapping.
 */
export function mapObjectiveGradeToRating(grade: ObjectiveGrade): ReviewRating {
  switch (grade) {
    case "incorrect":
      return "again";
    case "partial":
      return "hard";
    case "correct":
      return "good";
    default: {
      const _exhaustive: never = grade;
      throw reviewError("UNKNOWN_RATING", `Unknown objective grade: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Flashcard / recording self-rating → scheduler rating.
 * Explicit only — never inferred from "looks correct" without the learner rating.
 */
export function mapSelfRatingToReviewRating(rating: ReviewRating): ReviewRating {
  return parseReviewRating(rating);
}

/**
 * Refuse to treat a recording self-check as objective correctness.
 * Returns the explicit rating only; pronunciationAccuracy remains out of scope.
 */
export function ratingFromRecordingSelfCheck(explicitRating: unknown): ReviewRating {
  return parseReviewRating(explicitRating);
}
