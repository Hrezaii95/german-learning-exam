"use client";

import { useMemo, useRef, useState } from "react";
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
  const [message, setMessage] = useState<string | null>(null);
  const [feedbackKind, setFeedbackKind] = useState<
    "empty" | "self-rated" | "retry" | null
  >(null);

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
    <section className="panel game-panel" aria-labelledby="flashcards-heading">
      <h2 id="flashcards-heading">Flashcards</h2>
      <p className="muted">
        Self-rate only. This mode never claims objective correctness or mastery.
      </p>
      <button
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
        <span className="dense">{flipped ? "English gloss" : "German form"}</span>
        <span className="german game-flashcard__text" lang={flipped ? "en" : "de"}>
          {flipped ? prompt.backEn : prompt.frontDe}
        </span>
      </button>
      <fieldset className="game-rating">
        <legend className="hub-field__label">Self rating</legend>
        {RATINGS.map((rating) => (
          <button
            key={rating}
            type="button"
            className="btn btn-secondary game-rating__btn"
            onClick={() => rate(rating)}
          >
            {rating}
          </button>
        ))}
      </fieldset>
      <GameActionBar onRetry={retry} />
      <GameFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
