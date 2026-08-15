import { Suspense } from "react";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ConversationSelectorWithNav } from "@/components/conversation/ConversationNavViews";
import { ConversationSelector } from "@/components/conversation/ConversationNavViews";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Conversation practice",
  "A five-level ladder for asking and answering what someone does, ending in a spoken role-play.",
);

export default function ConversationIndexPage() {
  return (
    <ShellLayout current="practice">
      <Suspense fallback={<ConversationSelector />}>
        <ConversationSelectorWithNav />
      </Suspense>
    </ShellLayout>
  );
}
