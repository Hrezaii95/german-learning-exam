"use client";

import { useMemo, useState } from "react";
import type { LearnerEvent } from "@german-learning/learning";
import { BackLink } from "@/components/nav/BackLink";
import {
  resolveBackHref,
  type NavigationContext,
} from "@/lib/content/navigation-context";
import {
  createPracticeUuid,
  type PracticeGameId,
} from "@/lib/games";
import { gameTitle } from "./GameSelector";
import { FlashcardsGame } from "./FlashcardsGame";
import { PictureWordMatchGame } from "./PictureWordMatchGame";
import { ArticleChoiceGame } from "./ArticleChoiceGame";
import { AudioMatchGame } from "./AudioMatchGame";
import { WordOrderGame } from "./WordOrderGame";
import { VerbBuilderGame } from "./VerbBuilderGame";
import { MorphologyPuzzleGame } from "./MorphologyPuzzleGame";
import type { GameEventSink } from "./GameFeedback";

function PracticeGameBody({
  gameId,
  sessionId,
  onEvent,
}: {
  gameId: PracticeGameId;
  sessionId: string;
  onEvent: GameEventSink;
}) {
  switch (gameId) {
    case "flashcards":
      return <FlashcardsGame sessionId={sessionId} onEvent={onEvent} />;
    case "picture-word-match":
      return <PictureWordMatchGame sessionId={sessionId} onEvent={onEvent} />;
    case "article-choice":
      return <ArticleChoiceGame sessionId={sessionId} onEvent={onEvent} />;
    case "audio-match":
      return <AudioMatchGame sessionId={sessionId} onEvent={onEvent} />;
    case "word-order":
      return <WordOrderGame sessionId={sessionId} onEvent={onEvent} />;
    case "verb-builder":
      return <VerbBuilderGame sessionId={sessionId} onEvent={onEvent} />;
    case "morphology-puzzle":
      return <MorphologyPuzzleGame sessionId={sessionId} onEvent={onEvent} />;
    default: {
      const _exhaustive: never = gameId;
      throw new Error(`Unhandled practice game: ${String(_exhaustive)}`);
    }
  }
}

export function GameRenderer({
  gameId,
  navigation = null,
}: {
  gameId: PracticeGameId;
  navigation?: NavigationContext | null;
}) {
  const sessionId = useMemo(() => createPracticeUuid(), []);
  const [emitted, setEmitted] = useState<LearnerEvent[]>([]);
  const backHref = resolveBackHref(navigation, "hub");

  function onEvent(event: LearnerEvent) {
    setEmitted((prev) => [...prev, event]);
  }

  return (
    <div className="stack game-page" data-game-id={gameId}>
      <BackLink href={backHref} />
      <header className="page-header">
        <p className="dense">Practice</p>
        <h1>{gameTitle(gameId)}</h1>
        <p className="lede">
          Typed evidence events only — local feedback is not mastery.
        </p>
      </header>
      <PracticeGameBody
        gameId={gameId}
        sessionId={sessionId}
        onEvent={onEvent}
      />
      <p className="dense" data-emitted-count={emitted.length}>
        Events emitted this session: {emitted.length} (not persisted yet)
      </p>
    </div>
  );
}
