"use client";

import { useSearchParams } from "next/navigation";
import {
  parseNavigationContextParam,
  resolveBackHref,
} from "@/lib/content/navigation-context";
import { BackLink } from "@/components/nav/BackLink";
import { ConversationLadder } from "./ConversationLadder";
import {
  CONVERSATION_ENTITY_ID,
  conversationCanonicalPath,
} from "@/lib/conversation";
import Link from "next/link";
import {
  appendNavigationContext,
  type NavigationContext,
} from "@/lib/content/navigation-context";

export function ConversationWithNav() {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  const backHref = resolveBackHref(navigation, "hub");

  return (
    <div className="stack">
      <BackLink href={backHref} />
      <ConversationLadder navigation={navigation} />
    </div>
  );
}

export function ConversationSelector({
  navigation = null,
}: {
  navigation?: NavigationContext | null;
}) {
  const href = navigation
    ? appendNavigationContext(conversationCanonicalPath(), navigation)
    : conversationCanonicalPath();

  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Conversation</p>
        <h1>Conversation practice</h1>
        <p className="lede">
          Five-level ladder for the published informal profession Q&amp;A.
        </p>
      </header>
      <ul className="game-selector__list">
        <li>
          <Link
            href={href}
            className="game-selector__card"
            data-conversation-entity={CONVERSATION_ENTITY_ID}
          >
            <span className="game-selector__title">
              Was bist du von Beruf?
            </span>
            <span className="game-selector__desc">
              Model → recognition → substitution → construction → spoken
              role-play
            </span>
            <span className="meta-chip">5 levels</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

export function ConversationSelectorWithNav() {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  const backHref = resolveBackHref(navigation, "hub");
  return (
    <div className="stack">
      <BackLink href={backHref} />
      <ConversationSelector navigation={navigation} />
    </div>
  );
}
