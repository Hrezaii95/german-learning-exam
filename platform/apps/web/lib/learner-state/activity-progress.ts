import type { ActivityProgressRecord } from "@german-learning/learning";
import type { LearnerActivity, LearnerLesson } from "../content/types";

export type ActivityDisplayStatus = "Not started" | "In progress" | "Completed";

export function orderedLessonActivities(
  lesson: LearnerLesson,
  activities: readonly LearnerActivity[],
): readonly LearnerActivity[] {
  const byId = new Map(activities.map((activity) => [activity.id, activity] as const));
  return lesson.stages.flatMap((stage) =>
    stage.activityIds.map((id) => byId.get(id)).filter((item): item is LearnerActivity => item !== undefined),
  );
}

export function activityDisplayStatus(
  activityId: string,
  progress: readonly ActivityProgressRecord[],
): ActivityDisplayStatus {
  const state = progress.find((item) => item.activityId === activityId)?.progressState;
  return state === "completed" ? "Completed" : state === "inProgress" ? "In progress" : "Not started";
}

export function completedActivityCount(
  activities: readonly LearnerActivity[],
  progress: readonly ActivityProgressRecord[],
): number {
  const completed = new Set(
    progress.filter((item) => item.progressState === "completed").map((item) => item.activityId),
  );
  return activities.filter((activity) => completed.has(activity.id)).length;
}

export function nextIncompleteActivity(
  activities: readonly LearnerActivity[],
  progress: readonly ActivityProgressRecord[],
): LearnerActivity | null {
  return activities.find((activity) => activityDisplayStatus(activity.id, progress) !== "Completed") ?? null;
}

export function isLessonComplete(
  lesson: LearnerLesson,
  activities: readonly LearnerActivity[],
  progress: readonly ActivityProgressRecord[],
): boolean {
  const ordered = orderedLessonActivities(lesson, activities);
  return ordered.length > 0 && completedActivityCount(ordered, progress) === ordered.length;
}
