"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  NAVIGATION_CONTEXT_PARAM,
  parseNavigationContextParam,
} from "@/lib/content/navigation-context";
import type { LearnerActivity, LearnerLesson } from "@/lib/content/types";
import { ActivityScreen, LessonOverview } from "./ActivityAndBrowser";
import { useOptionalLearnerState } from "@/components/learner-state/LearnerStateProvider";
import { activityDisplayStatus, isLessonComplete, orderedLessonActivities } from "@/lib/learner-state/activity-progress";

function useParsedNavigation() {
  const params = useSearchParams();
  return parseNavigationContextParam(params.get(NAVIGATION_CONTEXT_PARAM));
}

/**
 * Client boundary for lesson overview: reads `nav` via useSearchParams so the
 * server page stays static-compatible (no async searchParams).
 */
export function LessonOverviewWithNav({
  lesson,
  activities,
  prerequisiteLesson,
  prerequisiteActivities = [],
}: {
  lesson: LearnerLesson;
  activities: readonly LearnerActivity[];
  prerequisiteLesson?: LearnerLesson;
  prerequisiteActivities?: readonly LearnerActivity[];
}) {
  const navigation = useParsedNavigation();
  const learnerState = useOptionalLearnerState();
  const progress = learnerState?.snapshot.hydration?.state.activityProgress ?? [];
  const recommendLessonOne = learnerState?.snapshot.status === "ready" && lesson.routeSegment === "02" && prerequisiteLesson !== undefined
    && !isLessonComplete(prerequisiteLesson, prerequisiteActivities, progress);
  return (
    <LessonOverview
      lesson={lesson}
      activities={activities}
      navigation={navigation}
      progress={progress}
      progressState={learnerState?.snapshot.status ?? "loading"}
      recommendLessonOne={recommendLessonOne}
    />
  );
}

/**
 * Client boundary for activity screen: same static-shell pattern as lessons.
 */
export function ActivityScreenWithNav({
  lesson,
  activity,
  activities,
  prerequisiteLesson,
  prerequisiteActivities = [],
}: {
  lesson: LearnerLesson;
  activity: LearnerActivity;
  activities: readonly LearnerActivity[];
  prerequisiteLesson?: LearnerLesson;
  prerequisiteActivities?: readonly LearnerActivity[];
}) {
  const navigation = useParsedNavigation();
  const learnerState = useOptionalLearnerState();
  const [busy, setBusy] = useState(false);
  const progress = learnerState?.snapshot.hydration?.state.activityProgress ?? [];
  const ordered = orderedLessonActivities(lesson, activities);
  const index = ordered.findIndex((item) => item.id === activity.id);
  const next = index >= 0 ? ordered[index + 1] ?? null : null;
  const status = activityDisplayStatus(activity.id, progress);
  const recommendLessonOne = learnerState?.snapshot.status === "ready" && lesson.routeSegment === "02" && prerequisiteLesson !== undefined
    && !isLessonComplete(prerequisiteLesson, prerequisiteActivities, progress);
  useEffect(() => {
    const controller = learnerState?.controller;
    if (!controller || learnerState.snapshot.status !== "ready") return;
    void controller.setResume({
      lessonId: lesson.id,
      stageId: activity.stageId,
      activityId: activity.id,
      position: Math.max(index, 0),
    }).catch(() => undefined);
  }, [activity.id, activity.stageId, index, learnerState?.controller, learnerState?.snapshot.status, lesson.id]);
  const run = (operation: (() => Promise<unknown>) | undefined) => {
    if (!operation) return;
    setBusy(true);
    void operation().finally(() => setBusy(false));
  };
  return (
    <ActivityScreen
      lesson={lesson}
      activity={activity}
      navigation={navigation}
      activities={activities}
      status={status}
      progressState={learnerState?.snapshot.status ?? "loading"}
      busy={busy}
      recommendLessonOne={recommendLessonOne}
      onStart={() => run(() => learnerState!.controller!.startActivity({ lessonId: lesson.id, stageId: activity.stageId, activityId: activity.id }))}
      onComplete={() => run(() => learnerState!.controller!.completeActivity(
        { lessonId: lesson.id, stageId: activity.stageId, activityId: activity.id },
        next ? { lessonId: lesson.id, stageId: next.stageId, activityId: next.id, position: index + 1 } : null,
      ))}
    />
  );
}
