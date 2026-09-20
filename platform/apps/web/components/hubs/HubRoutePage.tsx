import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubListView } from "@/components/hubs/HubViews";
import { HubListViewWithParams } from "@/components/hubs/HubNavViews";
import { loadLearnerHubProjection } from "@/lib/content/access";
import type { LearnerHubId } from "@/lib/content/hub-types";
import { navKeyForHub } from "@/lib/content/nav";
import { withWordCardHub } from "@/lib/content/word-cards";
import {CourseListening} from "@/components/study/CourseHubAdditions";
import {studyUnits} from "@/lib/study/course-lessons";
import {loadBook,loadStudySpeech} from "@/lib/study/catalog";

/**
 * Static hub shell: filters come from the client `useSearchParams` boundary
 * under Suspense (fallback = unfiltered published list).
 */
export function HubRoutePage({ hubId }: { hubId: LearnerHubId }) {
  const hubs = loadLearnerHubProjection();
  const hub = hubId === "vocabulary" ? withWordCardHub(hubs.hubsById[hubId]) : hubs.hubsById[hubId];
  if(hubId==="listening")return <ShellLayout current="listening"><Suspense fallback={<p>Loading recordings…</p>}><CourseListening book={{audio:loadBook().audio}}/></Suspense></ShellLayout>;
  const units=["grammar","verbs","phrases","concepts"].includes(hubId)?studyUnits:[];
  const speech=units.length?loadStudySpeech():{};
  return (
    <ShellLayout current={navKeyForHub(hubId)}>
      <Suspense fallback={<HubListView hub={hub} units={units} speech={speech} searchParams={{}} />}>
        <HubListViewWithParams hub={hub} units={units} speech={speech} />
      </Suspense>
    </ShellLayout>
  );
}
