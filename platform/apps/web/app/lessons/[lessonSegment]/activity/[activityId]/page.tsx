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
 * closed in the page (`resolveLearnerRoute` → notFound). Encoded static param
 * values are required on Windows (raw `:` is not a legal path character); at
 * request time Next decodes `%3A` → `:`, so `dynamicParams` must allow that
 * decoded form to reach the page instead of NoFallbackError.
 *
 * Navigation context is client-only (`useSearchParams` under Suspense) so this
 * route remains statically generated.
 *
 * Pages static export flips this to `false` temporarily via `build-pages.mjs`
 * (static export cannot use dynamicParams); the wrapper restores on exit.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  const projection = loadLearnerProjection();
  return projection.activities.map((activity) => ({
    lessonSegment: activity.lessonRouteSegment,
    // Encoded form is filesystem-safe on Windows and matches the canonical URL
    // segment. tryDecode accepts decoded runtime params when Next normalizes.
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

  return (
    <ShellLayout current="lessons">
      <Suspense
        fallback={<ActivityScreen lesson={lesson} activity={activity} />}
      >
        <ActivityScreenWithNav lesson={lesson} activity={activity} />
      </Suspense>
    </ShellLayout>
  );
}
