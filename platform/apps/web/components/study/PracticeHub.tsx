"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackLink } from "@/components/nav/BackLink";
import {
  appendNavigationContext,
  parseNavigationContextParam,
  resolveBackHref,
  type NavigationContext,
} from "@/lib/content/navigation-context";
import { CONVERSATION_ENTITY_ID, conversationCanonicalPath } from "@/lib/conversation";
import { CoursePractice } from "./CoursePractice";
import { useStudyScope } from "./StudyScope";

/** Retained course practice and conversation, with a separate entry to Play. */
export function PracticeHub({ navigation = null }: { navigation?: NavigationContext | null }) {
  const { matches } = useStudyScope();
  const conversationHref = navigation
    ? appendNavigationContext(conversationCanonicalPath(), navigation)
    : conversationCanonicalPath();
  const conversationRelated = navigation?.resultId === CONVERSATION_ENTITY_ID;

  return (
    <div className="stack" data-practice-hub="true">
      <BackLink href={resolveBackHref(navigation, "hub")} />
      <header className="page-header">
        <h1>Practice</h1>
        <p className="lede">
          Recall words from your study selection, check answers in a lesson quiz,
          or practise a conversation. Revealing a word is separate from answering correctly.
        </p>
      </header>
      <CoursePractice />
      {matches({ lessons: [2], concepts: ["people", "conversation"], source: "course" }) && (
        <section className="panel" aria-labelledby="conversation-practice-heading">
          <h2 id="conversation-practice-heading">Conversation practice</h2>
          <p className="muted">
            A five-level ladder for the informal profession question and answer,
            including an optional voice recorder that stays on your device.
          </p>
          <Link
            href={conversationHref}
            className={`game-selector__card${conversationRelated ? " game-selector__card--related" : ""}`}
            data-conversation-entry="true"
          >
            <span className="game-selector__title">Conversation ladder</span>
            <span className="game-selector__desc">
              Model → recognition → substitution → construction → spoken role-play
            </span>
            <span className="meta-chip">5 levels</span>
          </Link>
        </section>
      )}
      <section className="panel" aria-labelledby="play-entry-heading">
        <h2 id="play-entry-heading">Play</h2>
        <p>Choose a content pack in Play for a Daily Run or Quick review.</p>
        <Link className="btn btn-primary" href="/play" prefetch={false}>Open Play</Link>
      </section>
    </div>
  );
}

/** Keep URL-dependent navigation below the page's existing Suspense boundary. */
export function PracticeHubWithNav() {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  return <PracticeHub navigation={navigation} />;
}
