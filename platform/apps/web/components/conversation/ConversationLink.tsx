import Link from "next/link";
import {
  appendNavigationContext,
  buildDetailPracticeNavigationContext,
} from "@/lib/content/navigation-context";
import type { LearnerDetailRecord } from "@/lib/content/detail-types";
import {
  CONVERSATION_ENTITY_ID,
  conversationCanonicalPath,
} from "@/lib/conversation";

/** Clear Conversation practice action from the Q&A detail page. */
export function ConversationLink({ detail }: { detail: LearnerDetailRecord }) {
  if (detail.id !== CONVERSATION_ENTITY_ID) return null;

  const nav = buildDetailPracticeNavigationContext({
    hubId: detail.hubSegment,
    detailPath: detail.canonicalPath,
    resultId: detail.id,
  });
  const href = nav
    ? appendNavigationContext(conversationCanonicalPath(), nav)
    : conversationCanonicalPath();

  return (
    <Link
      className="btn btn-primary"
      href={href}
      data-conversation-link="true"
      aria-label={`Conversation practice for ${detail.displayText}`}
    >
      Conversation practice
    </Link>
  );
}
