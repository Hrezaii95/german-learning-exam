import type { Metadata } from "next";
import { HubRoutePage } from "@/components/hubs/HubRoutePage";
import { getHubById } from "@/lib/content/access";
import { hubPageMetadata } from "@/lib/content/page-metadata";

/** Title and description come from the hub itself, so they cannot drift. */
export const metadata: Metadata = hubPageMetadata(getHubById("vocabulary"));

export default function VocabularyPage() {
  return <HubRoutePage hubId="vocabulary" />;
}
