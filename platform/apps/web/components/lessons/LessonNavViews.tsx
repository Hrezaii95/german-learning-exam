"use client";

import { useSearchParams } from "next/navigation";
import {
  NAVIGATION_CONTEXT_PARAM,
  parseNavigationContextParam,
} from "@/lib/content/navigation-context";
import type { LearnerActivity, LearnerLesson } from "@/lib/content/types";
import { ActivityScreen, LessonOverview } from "./ActivityAndBrowser";

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
  return (
    <ActivityScreen
      lesson={lesson}
      activity={activity}
      navigation={navigation}
    />
  );
}
