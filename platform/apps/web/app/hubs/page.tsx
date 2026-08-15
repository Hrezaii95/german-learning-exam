import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { HubDirectoryView } from "@/components/hubs/HubViews";
import { loadLearnerHubProjection } from "@/lib/content/access";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Hubs",
  "Browse everything you are learning by type: words, verbs, grammar, phrases, listening and concepts.",
);

export default function HubsDirectoryPage() {
  const projection = loadLearnerHubProjection();
  return (
    <ShellLayout current="hubs">
      <HubDirectoryView projection={projection} />
    </ShellLayout>
  );
}
