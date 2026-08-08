/**
 * Single learner-publication policy for the web projection.
 *
 * The publication bundle validates 24 activity records. One teacher-deck
 * activity remains review-only until deliberate publication approval.
 * Learner-visible counts and routes derive from that exclusion — change
 * this file (and the matching tests) to promote it, not scattered literals.
 */

/** Count gate: unique LearningActivity records in the validated publication. */
export const VALIDATED_PUBLICATION_ACTIVITY_COUNT = 24;

/**
 * Review-only activity IDs that stay in the publication bundle but must not
 * enter the learner projection, ownership map, or routes until approved.
 */
export const LEARNER_REVIEW_ONLY_ACTIVITY_IDS = [
  "activity:lesson-02-teacher-professions-deck",
] as const;

export type LearnerReviewOnlyActivityId =
  (typeof LEARNER_REVIEW_ONLY_ACTIVITY_IDS)[number];

/** Currently learner-published activities = validated total − review-only policy. */
export const EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT =
  VALIDATED_PUBLICATION_ACTIVITY_COUNT -
  LEARNER_REVIEW_ONLY_ACTIVITY_IDS.length;

export function isLearnerReviewOnlyActivityId(activityId: string): boolean {
  return (LEARNER_REVIEW_ONLY_ACTIVITY_IDS as readonly string[]).includes(
    activityId,
  );
}
