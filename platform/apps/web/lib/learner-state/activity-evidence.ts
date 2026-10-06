import { getEnrichedActivity } from "../content/enrichment-client";
import { learnerPublishedContentResolver } from "./registry";

// The checkpoint also revisits wellbeing, an explicit Lesson 1 outcome. These
// are existing published Q&A concepts; this does not invent a spelling or
// speaking-proficiency concept for activities that have no graded target.
const CHECKPOINT_TARGETS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "activity:lesson-01-checkpoint-summary": Object.freeze([
    "qa:wellbeing-casual",
    "qa:wellbeing-formal",
  ]),
});

/**
 * Resolve evidence for the concept this question actually assesses. Activity
 * completion is deliberately not evidence, and unrelated published concepts
 * cannot be attached merely because they exist in the same content bundle.
 */
export function persistentConceptForActivityTarget(
  activityId: string,
  targetId: string | null,
): string | null {
  if (
    targetId === null ||
    learnerPublishedContentResolver.entityKind(activityId) !== "LearningActivity" ||
    learnerPublishedContentResolver.entityKind(targetId) !== "Concept"
  ) return null;

  const activity = getEnrichedActivity(activityId);
  const hasPublishedTarget = activity?.contentTargets.some((target) => target.id === targetId);
  return hasPublishedTarget || CHECKPOINT_TARGETS[activityId]?.includes(targetId)
    ? targetId
    : null;
}

/** Safe route/title data comes from the generated public activity projection. */
export function activityReviewMetadata(activityId: string): Readonly<{
  activityId: string;
  lessonId: string;
  lessonNumber: number;
  activityTitle: string;
  href: string;
}> | null {
  if (learnerPublishedContentResolver.entityKind(activityId) !== "LearningActivity") return null;
  const activity = getEnrichedActivity(activityId);
  if (!activity) return null;
  return Object.freeze({
    activityId,
    lessonId: activity.lessonId,
    lessonNumber: activity.lessonNumber,
    activityTitle: activity.displayText,
    href: activity.canonicalPath,
  });
}
