"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  NAVIGATION_CONTEXT_PARAM,
  parseNavigationContextParam,
} from "@/lib/content/navigation-context";
import type { LearnerActivity, LearnerLesson } from "@/lib/content/types";
import { ActivityScreen, LessonOverview } from "./ActivityAndBrowser";
import { useOptionalLearnerState } from "@/components/learner-state/LearnerStateProvider";

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
}: {
  lesson: LearnerLesson;
  activities: readonly LearnerActivity[];
}) {
  const navigation = useParsedNavigation();
  return (
    <LessonOverview
      lesson={lesson}
      activities={activities}
      navigation={navigation}
    />
  );
}

/**
 * Client boundary for activity screen: same static-shell pattern as lessons.
 */
export function ActivityScreenWithNav({
  lesson,
  activity,
}: {
  lesson: LearnerLesson;
  activity: LearnerActivity;
}) {
  const navigation = useParsedNavigation();
  const learnerState = useOptionalLearnerState();
  useEffect(() => {
    const controller = learnerState?.controller;
    if (!controller || learnerState.snapshot.status !== "ready") return;
    void controller.setResume({
      lessonId: lesson.id,
      stageId: activity.stageId,
      activityId: activity.id,
      position: 0,
    }).catch(() => undefined);
  }, [activity.id, activity.stageId, learnerState?.controller, learnerState?.snapshot.status, lesson.id]);
  return (
    <ActivityScreen
      lesson={lesson}
      activity={activity}
      navigation={navigation}
    />
  );
}
