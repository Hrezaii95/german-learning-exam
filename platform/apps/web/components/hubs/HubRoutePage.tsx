import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubListView } from "@/components/hubs/HubViews";
import { HubListViewWithParams } from "@/components/hubs/HubNavViews";
import { loadLearnerHubProjection } from "@/lib/content/access";
import type { LearnerHubId } from "@/lib/content/hub-types";
import { navKeyForHub } from "@/lib/content/nav";
import { withWordCardHub } from "@/lib/content/word-cards";

/**
 * Static hub shell: filters come from the client `useSearchParams` boundary
 * under Suspense (fallback = unfiltered published list).
 */
export function HubRoutePage({ hubId }: { hubId: LearnerHubId }) {
  const hubs = loadLearnerHubProjection();
  const hub = hubId === "vocabulary" ? withWordCardHub(hubs.hubsById[hubId]) : hubs.hubsById[hubId];
  return (
    <ShellLayout current={navKeyForHub(hubId)}>
      <Suspense fallback={<HubListView hub={hub} searchParams={{}} />}>
        <HubListViewWithParams hub={hub} />
      </Suspense>
    </ShellLayout>
  );
}
