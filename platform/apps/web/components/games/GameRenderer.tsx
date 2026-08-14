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
import { useOptionalLearnerState } from "@/components/learner-state/LearnerStateProvider";
import { normalizePracticeEventForPersistence } from "@/lib/learner-state";

export function PracticeGameBody({
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
  onEvent: externalEvent,
}: {
  gameId: PracticeGameId;
  navigation?: NavigationContext | null;
  onEvent?: (event: LearnerEvent) => void;
}) {
  const sessionId = useMemo(() => createPracticeUuid(), []);
  const [emitted, setEmitted] = useState<LearnerEvent[]>([]);
  const learnerState = useOptionalLearnerState();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const backHref = resolveBackHref(navigation, "hub");

  function onEvent(event: LearnerEvent) {
    setEmitted((prev) => [...prev, event]);
    externalEvent?.(event);
    if (!externalEvent && learnerState?.controller) {
      try {
        const persistent = normalizePracticeEventForPersistence({ event, gameId });
        void learnerState.controller.appendEvent(persistent).then(
          () => setSaveMessage("Practice progress saved on this device."),
          () => setSaveMessage("Practice feedback worked, but local saving failed."),
        );
      } catch {
        setSaveMessage("Practice feedback worked, but this event could not be saved.");
      }
    }
  }

  return (
    <div className="stack game-page" data-game-id={gameId}>
      <BackLink href={backHref} />
      <header className="page-header">
        <p className="dense">Practice</p>
        <h1>{gameTitle(gameId)}</h1>
        <p className="lede">
          Answer at your own pace — feedback is instant and your progress stays
          on this device.
        </p>
      </header>
      <PracticeGameBody
        gameId={gameId}
        sessionId={sessionId}
        onEvent={onEvent}
      />
      <p className="dense" data-emitted-count={emitted.length}>
        Attempts this session: {emitted.length}
      </p>
      {saveMessage ? <p className="detail-feedback" role="status">{saveMessage}</p> : null}
    </div>
  );
}
