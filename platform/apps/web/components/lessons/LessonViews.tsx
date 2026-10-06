
import { LDiv, LH1, LHeader, LP } from "@/components/i18n/LocalizedElements";
import type { LearnerHubProjection } from "@/lib/content/hub-types";
import type { LearnerWebProjection } from "@/lib/content/types";
import { LearnerDashboard } from "@/components/learner-state/LearnerDashboard";
import {CourseDashboard} from "@/components/study/CourseDashboard";

/**
 * Daily Learning Studio home. The first row (Continue + Today's mission), the
 * evidence strip and the Lesson 1–2 course cards live in `LearnerDashboard`
 * because they read this device's saved progress. Reference tools are reached
 * through the shared Resources navigation, rather than repeated here.
 */
export function DashboardView({
  projection,
}: {
  projection: LearnerWebProjection;
  /** Injectable for tests; defaults to the build-time hub artifact. */
  hubs?: LearnerHubProjection;
}) {
  return (
    <LDiv className="stack browse-shell">
      <LHeader className="page-header dashboard-header">
        <LP className="dense">A1 · your study plan</LP>
        <LH1>Your A1 learning space</LH1>
        <LP className="lede">
          Continue the lesson you were on, then practise today’s review set.
        </LP>
      </LHeader>

      <LearnerDashboard projection={projection} />
      <CourseDashboard/>
    </LDiv>
  );
}
