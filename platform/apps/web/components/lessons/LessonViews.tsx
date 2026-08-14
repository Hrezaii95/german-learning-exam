import type { LearnerHubProjection } from "@/lib/content/hub-types";
import type { LearnerWebProjection } from "@/lib/content/types";
import { loadLearnerHubProjection } from "@/lib/content/access";
import { HubToolDrawerGrid } from "@/components/hubs/HubViews";
import { LearnerDashboard } from "@/components/learner-state/LearnerDashboard";

/**
 * Daily Learning Studio home. The first row (Continue + Today's mission), the
 * evidence strip and the Lesson 1–2 course cards live in `LearnerDashboard`
 * because they read this device's saved progress; the hub tool drawers are
 * static projection data and stay server-rendered.
 */
export function DashboardView({
  projection,
  hubs,
}: {
  projection: LearnerWebProjection;
  /** Injectable for tests; defaults to the build-time hub artifact. */
  hubs?: LearnerHubProjection;
}) {
  const { activityCount, lessonCount } = projection;
  const hubProjection = hubs ?? loadLearnerHubProjection();

  return (
    <div className="stack browse-shell">
      <header className="page-header dashboard-header">
        <p className="dense">Welcome back</p>
        <h1>Your learning studio</h1>
        <p className="lede">
          Continue the lesson you were on, then practise today’s review set.
        </p>
        <p className="dense">
          {lessonCount} lessons · {activityCount} activities available.
        </p>
      </header>

      <LearnerDashboard projection={projection} />

      <section aria-labelledby="hubs-heading">
        <h2 id="hubs-heading">Browse by tool</h2>
        <HubToolDrawerGrid hubs={hubProjection.hubs} />
      </section>
    </div>
  );
}
