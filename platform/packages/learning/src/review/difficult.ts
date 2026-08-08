/**
 * Canonical difficult predicate for mission selection (C2CR1).
 * Tags affect mission selection only — never scheduler math.
 */

import type { ReviewCandidate } from "./types.js";

/** Learner tags that mark a card as difficult/confusing for mission mix. */
export const DIFFICULT_LEARNER_TAGS = Object.freeze(["Difficult", "Confusing"] as const);

export function hasDifficultLearnerTag(tags: readonly string[]): boolean {
  for (const t of tags) {
    if (t === "Difficult" || t === "Confusing") return true;
  }
  return false;
}

/**
 * One canonical predicate used by filters, priority pools, exclusive category
 * assignment, quotas, reason counts, and reason text.
 *
 * `recentFailureOrDifficult` flag OR Difficult/Confusing tags.
 */
export function isDifficultCandidate(c: ReviewCandidate): boolean {
  return c.recentFailureOrDifficult === true || hasDifficultLearnerTag(c.tags);
}

/** Scheduler lifecycle is the authority for newness (C2CR1). */
export function isNewReviewCard(c: ReviewCandidate): boolean {
  return c.card.state === "new";
}
