import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubListView } from "@/components/hubs/HubViews";
import { loadLearnerHubProjection } from "@/lib/content/access";
import type { LearnerHubId } from "@/lib/content/hub-types";
import { navKeyForHub } from "@/lib/content/nav";

type SearchParams = Record<string, string | string[] | undefined>;

export async function HubRoutePage({
  hubId,
  searchParams,
}: {
  hubId: LearnerHubId;
  searchParams: Promise<SearchParams>;
}) {
  const hubs = loadLearnerHubProjection();
  const hub = hubs.hubsById[hubId];
  const params = await searchParams;
  return (
    <ShellLayout current={navKeyForHub(hubId)}>
      <HubListView hub={hub} searchParams={params} />
    </ShellLayout>
  );
}
