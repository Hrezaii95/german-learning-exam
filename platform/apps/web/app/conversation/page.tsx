import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ConversationSelectorWithNav } from "@/components/conversation/ConversationNavViews";
import { ConversationSelector } from "@/components/conversation/ConversationNavViews";

export default function ConversationIndexPage() {
  return (
    <ShellLayout current="practice">
      <Suspense fallback={<ConversationSelector />}>
        <ConversationSelectorWithNav />
      </Suspense>
    </ShellLayout>
  );
}
