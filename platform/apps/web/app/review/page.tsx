import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Review · Moved",
  "Saved recall and guided exercise missions now share My review.",
);

export default function ReviewPage() {
  return <ShellLayout current="saved"><StaticHubRedirect href="/saved" label="Review"/></ShellLayout>;
}
