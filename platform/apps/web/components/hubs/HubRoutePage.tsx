import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubListView } from "@/components/hubs/HubViews";
import { HubListViewWithParams } from "@/components/hubs/HubNavViews";
import { loadLearnerHubProjection } from "@/lib/content/access";
import type { LearnerHubId } from "@/lib/content/hub-types";
import { navKeyForHub } from "@/lib/content/nav";
import { withWordCardHub } from "@/lib/content/word-cards";
import Link from "next/link";

/**
 * Static hub shell: filters come from the client `useSearchParams` boundary
 * under Suspense (fallback = unfiltered published list).
 */
export function HubRoutePage({ hubId }: { hubId: LearnerHubId }) {
  const hubs = loadLearnerHubProjection();
  const hub = hubId === "vocabulary" ? withWordCardHub(hubs.hubsById[hubId]) : hubs.hubsById[hubId];
  return (
    <ShellLayout current={navKeyForHub(hubId)}>
      {["grammar", "verbs", "phrases", "listening", "concepts"].includes(hubId) && <p className="study-hub-bridge"><span>New in Lesson 4</span><Link href={hubId === "listening" ? "/book?page=coursebook-29" : `/lessons/04#${hubId === "concepts" ? "grammar" : hubId}`}>{hubId === "listening" ? "Furniture-shop conversations & original audio" : `Explore Lesson 4 ${hubId}`} →</Link></p>}
      <Suspense fallback={<HubListView hub={hub} searchParams={{}} />}>
        <HubListViewWithParams hub={hub} />
      </Suspense>
    </ShellLayout>
  );
}
