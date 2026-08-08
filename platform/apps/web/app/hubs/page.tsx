import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubDirectoryView } from "@/components/hubs/HubViews";
import { loadLearnerHubProjection } from "@/lib/content/access";

export default function HubsDirectoryPage() {
  const projection = loadLearnerHubProjection();
  return (
    <ShellLayout current="hubs">
      <HubDirectoryView projection={projection} />
    </ShellLayout>
  );
}
