"use client";
import { LDiv, LH1, LHeader, LLi, LP, LSpan, LUl } from "@/components/i18n/LocalizedElements";


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
import Link from "@/components/i18n/LocalizedLink";
import {
  appendNavigationContext,
  type NavigationContext,
} from "@/lib/content/navigation-context";

export function ConversationWithNav() {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  const backHref = resolveBackHref(navigation, "hub");

  return (
    <LDiv className="stack">
      <BackLink href={backHref} />
      <ConversationLadder navigation={navigation} />
    </LDiv>
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
    <LDiv className="stack">
      <LHeader className="page-header">
        <LP className="dense">Conversation</LP>
        <LH1>Conversation practice</LH1>
        <LP className="lede">
          A five-level ladder for the informal profession question and answer.
        </LP>
      </LHeader>
      <LUl className="game-selector__list">
        <LLi>
          <Link
            href={href}
            className="game-selector__card"
            data-conversation-entity={CONVERSATION_ENTITY_ID}
          >
            <LSpan className="game-selector__title">
              Was bist du von Beruf?
            </LSpan>
            <LSpan className="game-selector__desc">
              Model → recognition → substitution → construction → spoken
              role-play
            </LSpan>
            <LSpan className="meta-chip">5 levels</LSpan>
          </Link>
        </LLi>
      </LUl>
    </LDiv>
  );
}

export function ConversationSelectorWithNav() {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  const backHref = resolveBackHref(navigation, "hub");
  return (
    <LDiv className="stack">
      <BackLink href={backHref} />
      <ConversationSelector navigation={navigation} />
    </LDiv>
  );
}
