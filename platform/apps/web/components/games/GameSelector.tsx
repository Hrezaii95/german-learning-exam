import Link from "next/link";
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
  const catalog = buildPracticeGameCatalog();
  const conversationHref = navigation
    ? appendNavigationContext(conversationCanonicalPath(), navigation)
    : conversationCanonicalPath();
  const conversationRelated =
    highlightConceptId != null && highlightConceptId === CONVERSATION_ENTITY_ID;

  return (
    <div className="stack game-selector">
      <header className="page-header">
        <p className="dense">Practice</p>
        <h1>Seven game modes</h1>
        <p className="lede">
          Short practice rounds built from your lessons, with instant feedback
          on every answer.
        </p>
      </header>

      <section className="panel" aria-labelledby="conversation-practice-heading">
        <h2 id="conversation-practice-heading">Conversation practice</h2>
        <p className="muted">
          A five-level ladder for the informal profession question and answer,
          including an optional voice recorder that stays on your device.
        </p>
        <Link
          href={conversationHref}
          className={`game-selector__card${
            conversationRelated ? " game-selector__card--related" : ""
          }`}
          data-conversation-entry="true"
          aria-label="Conversation practice"
        >
          <span className="game-selector__title">Conversation ladder</span>
          <span className="game-selector__desc">
            Model → recognition → substitution → construction → spoken role-play
          </span>
          <span className="meta-chip">5 levels</span>
        </Link>
      </section>

      <ul className="game-selector__list">
        {catalog.map((game) => {
          const href = navigation
            ? appendNavigationContext(practiceCanonicalPath(game.id), navigation)
            : practiceCanonicalPath(game.id);
          const related =
            highlightConceptId != null && game.conceptId === highlightConceptId;
          return (
            <li key={game.id}>
              <Link
                href={href}
                className={`game-selector__card${
                  game.availability === "unavailable"
                    ? " game-selector__card--unavailable"
                    : ""
                }${related ? " game-selector__card--related" : ""}`}
                data-game-id={game.id}
                data-availability={game.availability}
                aria-label={`${game.title}${
                  game.availability === "unavailable" ? " (unavailable)" : ""
                }`}
              >
                <span className="game-selector__title">{game.title}</span>
                <span className="game-selector__desc">{game.description}</span>
                {game.availability === "unavailable" ? (
                  <span className="meta-chip" data-status="unavailable">
                    Unavailable
                  </span>
                ) : (
                  <span className="meta-chip">Enabled</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function gameTitle(gameId: PracticeGameId): string {
  return buildPracticeGameCatalog().find((g) => g.id === gameId)?.title ?? gameId;
}
