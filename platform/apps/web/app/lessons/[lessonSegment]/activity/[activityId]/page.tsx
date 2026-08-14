import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ActivityScreen } from "@/components/lessons/ActivityAndBrowser";
import { ActivityScreenWithNav } from "@/components/lessons/LessonNavViews";
import {
  encodeActivityRouteSegment,
  tryDecodeActivityRouteSegment,
} from "@/lib/content/path-utils";
import { loadLearnerProjection } from "@/lib/content/access";
import { resolveLearnerRoute } from "@/lib/content/routes";

type PageProps = {
  params: Promise<{ lessonSegment: string; activityId: string }>;
};

/**
 * Prerender known activities via generateStaticParams. Unknown IDs still fail
 * closed in the page (`resolveLearnerRoute` → notFound). Canonical static
 * params use the Pages-safe typed-ID slug, which is also legal on Windows.
 *
 * Navigation context is client-only (`useSearchParams` under Suspense) so this
 * route remains statically generated.
 *
 * Pages static export flips this to `false` temporarily via `build-pages.mjs`
 * (static export cannot use dynamicParams); the wrapper restores on exit.
 */
export const dynamicParams = false; /* pages-export temporary */

export function generateStaticParams() {
  const projection = loadLearnerProjection();
  return projection.activities.map((activity) => ({
    lessonSegment: activity.lessonRouteSegment,
    // The canonical slug is filesystem-safe and decodes back to the typed ID.
    activityId: encodeActivityRouteSegment(activity.id),
  }));
}

export default async function ActivityPage({ params }: PageProps) {
  const { lessonSegment, activityId: activitySegment } = await params;
  const projection = loadLearnerProjection();
  const activityId = tryDecodeActivityRouteSegment(activitySegment);
  if (activityId == null) {
    notFound();
  }
  const pathname = `/lessons/${lessonSegment}/activity/${encodeActivityRouteSegment(activityId)}`;
  const resolved = resolveLearnerRoute(pathname, projection);
  if (resolved.kind !== "activity") {
    notFound();
  }

  const lesson = projection.lessons.find((item) => item.id === resolved.lessonId);
  const activity = projection.activities.find((item) => item.id === resolved.activityId);
  if (!lesson || !activity) {
    notFound();
  }
  const lessonActivities = projection.activities.filter((item) => item.lessonId === lesson.id);
  const prerequisiteLesson = lesson.routeSegment === "02" ? projection.lessons.find((item) => item.routeSegment === "01") : undefined;
  const prerequisiteActivities = prerequisiteLesson
    ? projection.activities.filter((item) => item.lessonId === prerequisiteLesson.id)
    : [];

  return (
    <ShellLayout current="lessons">
      <Suspense
        fallback={<ActivityScreen lesson={lesson} activity={activity} activities={lessonActivities} />}
      >
        <ActivityScreenWithNav
          lesson={lesson}
          activity={activity}
          activities={lessonActivities}
          {...(prerequisiteLesson ? { prerequisiteLesson } : {})}
          prerequisiteActivities={prerequisiteActivities}
        />
      </Suspense>
    </ShellLayout>
  );
}
