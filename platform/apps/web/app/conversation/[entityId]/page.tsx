import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ConversationWithNav } from "@/components/conversation/ConversationNavViews";
import { ConversationLadder } from "@/components/conversation/ConversationLadder";
import {
  CONVERSATION_ENTITY_ID,
  conversationCanonicalPath,
  tryDecodeConversationEntitySegment,
} from "@/lib/conversation";
import {
  loadLearnerDetailProjection,
  loadLearnerProjection,
} from "@/lib/content/access";
import { resolveLearnerRoute } from "@/lib/content/routes";

type PageProps = {
  params: Promise<{ entityId: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ entityId: encodeURIComponent(CONVERSATION_ENTITY_ID) }];
}

export default async function ConversationEntityPage({ params }: PageProps) {
  const { entityId: segment } = await params;
  const entityId = tryDecodeConversationEntitySegment(segment);
  if (entityId == null) {
    notFound();
  }

  const projection = loadLearnerProjection();
  const details = loadLearnerDetailProjection();
  const pathname = conversationCanonicalPath(entityId);
  const resolved = resolveLearnerRoute(pathname, projection, details);
  if (resolved.kind !== "conversation" || resolved.entityId !== entityId) {
    notFound();
  }

  return (
    <ShellLayout current="practice">
      <Suspense fallback={<ConversationLadder />}>
        <ConversationWithNav />
      </Suspense>
    </ShellLayout>
  );
}
