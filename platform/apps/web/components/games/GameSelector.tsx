"use client";
import { LDiv, LH1, LH2, LHeader, LLi, LP, LSection, LSpan, LUl } from "@/components/i18n/LocalizedElements";

import {CoursePractice} from "@/components/study/CoursePractice";
import {useStudyScope} from "@/components/study/StudyScope";
import Link from "@/components/i18n/LocalizedLink";
import {
  appendNavigationContext,
  type NavigationContext,
} from "@/lib/content/navigation-context";
import {
  buildPracticeGameCatalog,
  practiceCanonicalPath,
  type PracticeGameId,
} from "@/lib/games";
import {
  CONVERSATION_ENTITY_ID,
  conversationCanonicalPath,
} from "@/lib/conversation";

export function GameSelector({
  navigation = null,
  highlightConceptId = null,
}: {
  navigation?: NavigationContext | null;
  highlightConceptId?: string | null;
}) {
  const {matches}=useStudyScope();
  const catalog = buildPracticeGameCatalog().filter(g=>matches({lessons:g.id==="verb-builder"?[1,2]:[2],concepts:g.id==="verb-builder"?["verbs"]:g.id==="word-order"?["questions","conversation","grammar"]:["people","grammar"],source:"course"}));
  const conversationHref = navigation
    ? appendNavigationContext(conversationCanonicalPath(), navigation)
    : conversationCanonicalPath();
  const conversationRelated =
    highlightConceptId != null && highlightConceptId === CONVERSATION_ENTITY_ID;

  return (
    <LDiv className="stack game-selector">
      <LHeader className="page-header">
        <LP className="dense">Practice</LP>
        <LH1>Practice</LH1>
        <LP className="lede">
          Recall words from your study selection, check answers in a lesson quiz,
          or practise a focused skill. Revealing a word is separate from answering correctly.
        </LP>
      </LHeader>

      <CoursePractice/>
      {matches({lessons:[2],concepts:["people","conversation"],source:"course"})&&<LSection className="panel" aria-labelledby="conversation-practice-heading">
        <LH2 id="conversation-practice-heading">Conversation practice</LH2>
        <LP className="muted">
          A five-level ladder for the informal profession question and answer,
          including an optional voice recorder that stays on your device.
        </LP>
        <Link
          href={conversationHref}
          className={`game-selector__card${
            conversationRelated ? " game-selector__card--related" : ""
          }`}
          data-conversation-entry="true"
          // No aria-label: it named this card "Conversation practice" while the
          // visible title reads "Conversation ladder", so speech control could
          // not match what the learner sees, and the description and level
          // count were dropped from the accessible name (WCAG 2.5.3). The
          // visible spans below now compute the name in full.
        >
          <LSpan className="game-selector__title">Conversation ladder</LSpan>
          <LSpan className="game-selector__desc">
            Model → recognition → substitution → construction → spoken role-play
          </LSpan>
          <LSpan className="meta-chip">5 levels</LSpan>
        </Link>
      </LSection>}

      <LH2>Focused games · Lessons 1–2</LH2>
      <LP className="muted">{catalog.length} of {buildPracticeGameCatalog().length} games match your study selection. Lesson quizzes above cover the later lessons.</LP>
      <LUl className="game-selector__list">
        {catalog.map((game) => {
          const href = navigation
            ? appendNavigationContext(practiceCanonicalPath(game.id), navigation)
            : practiceCanonicalPath(game.id);
          const related =
            highlightConceptId != null && game.conceptId === highlightConceptId;
          return (
            <LLi key={game.id}>
              <Link
                href={href}
                className={`game-selector__card${
                  game.availability === "unavailable"
                    ? " game-selector__card--unavailable"
                    : ""
                }${related ? " game-selector__card--related" : ""}`}
                data-game-id={game.id}
                data-availability={game.availability}
                // No aria-label: it replaced the visible description and the
                // Enabled/Unavailable chip in the accessible name, so a screen
                // reader heard seven bare game names with no idea what any of
                // them did or which were ready. The visible spans below carry
                // all of that, so they are left to compute the name.
              >
                <LSpan className="game-selector__title">{game.title}</LSpan>
                <LSpan className="game-selector__desc">{game.description}</LSpan>
                {game.availability === "unavailable" ? (
                  <LSpan className="meta-chip" data-status="unavailable">
                    Unavailable
                  </LSpan>
                ) : (
                  <LSpan className="meta-chip">Enabled</LSpan>
                )}
              </Link>
            </LLi>
          );
        })}
      </LUl>
    </LDiv>
  );
}

export function gameTitle(gameId: PracticeGameId): string {
  return buildPracticeGameCatalog().find((g) => g.id === gameId)?.title ?? gameId;
}
