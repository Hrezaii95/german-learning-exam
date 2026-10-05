"use client";
import { LButton, LFieldset, LH2, LLegend, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


import { useMemo, useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
import type { SelfRating } from "@german-learning/learning";
import {
  buildFlashcardPrompt,
  createPracticeTimestamp,
  createPracticeUuid,
  emitSelfRatedFlashcard,
  practiceActivityId,
} from "@/lib/games";
import { GameActionBar, GameFeedback, type GameEventSink } from "./GameFeedback";

const RATINGS: readonly SelfRating[] = ["again", "hard", "good", "easy"];

export function FlashcardsGame({
  sessionId,
  onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildFlashcardPrompt(), []);
  const startedAt = useRef(Date.now());
  const [flipped, setFlipped] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<"empty" | "self-rated" | "retry">();

  function rate(rating: SelfRating) {
    const result = emitSelfRatedFlashcard({
      rating,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      conceptId: prompt.conceptId,
      sessionId,
      eventId: createPracticeUuid(),
      timestamp: createPracticeTimestamp(),
      activityId: practiceActivityId("flashcards"),
    });
    if (result.emitted) onEvent?.(result.event);
    setFeedbackKind("self-rated");
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  function retry() {
    setFlipped(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <LSection className="panel game-panel" aria-labelledby="flashcards-heading">
      <LH2 id="flashcards-heading">Flashcards</LH2>
      <LP className="muted">
        Self-rate only. This mode never claims objective correctness or mastery.
      </LP>
      <LButton
        type="button"
        className="game-flashcard"
        aria-pressed={flipped}
        onClick={() => {
          setFlipped((v) => !v);
          if (!flipped) setHintsUsed((n) => n + 1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setFlipped((v) => !v);
            if (!flipped) setHintsUsed((n) => n + 1);
          }
        }}
      >
        <LSpan className="dense">{flipped ? "English gloss" : "German form"}</LSpan>
        <LSpan className="german game-flashcard__text" lang={flipped ? "en" : "de"}>
          {flipped ? prompt.backEn : prompt.frontDe}
        </LSpan>
      </LButton>
      <LFieldset className="game-rating">
        <LLegend className="hub-field__label">Self rating</LLegend>
        {RATINGS.map((rating) => (
          <LButton
            key={rating}
            type="button"
            className="btn btn-secondary game-rating__btn"
            onClick={() => rate(rating)}
          >
            {rating}
          </LButton>
        ))}
      </LFieldset>
      <GameActionBar onRetry={retry} />
      <GameFeedback kind={feedbackKind} message={message} seq={seq} />
    </LSection>
  );
}
