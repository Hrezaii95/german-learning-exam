"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildWordOrderPrompt,
  createPracticeTimestamp,
  createPracticeUuid,
  emitObjectiveGameAttempt,
  joinTokens,
  measuredDimensionForEnabledGame,
  practiceActivityId,
  shuffleTokensDeterministic,
  taskFamilyForEnabledGame,
} from "@/lib/games";
import type { GameFeedbackKind } from "@/lib/games/game-types";
import { GameActionBar, GameFeedback, type GameEventSink } from "./GameFeedback";

export function WordOrderGame({
  sessionId,
  onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildWordOrderPrompt(), []);
  const startedAt = useRef(Date.now());
  const [pool, setPool] = useState(() =>
    shuffleTokensDeterministic(prompt.canonicalTokens, 42),
  );
  const [ordered, setOrdered] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedbackKind, setFeedbackKind] = useState<GameFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function pick(token: string, index: number) {
    setPool((prev) => prev.filter((_, i) => i !== index));
    setOrdered((prev) => [...prev, token]);
    setMessage(null);
  }

  function unpick(token: string, index: number) {
    setOrdered((prev) => prev.filter((_, i) => i !== index));
    setPool((prev) => [...prev, token]);
    setMessage(null);
  }

  function submit() {
    const result = emitObjectiveGameAttempt({
      gameId: "word-order",
      rawAnswer: joinTokens(ordered),
      expectedNormalized: joinTokens(prompt.canonicalTokens),
      revealed,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      conceptId: prompt.conceptId,
      sessionId,
      eventId: createPracticeUuid(),
      timestamp: createPracticeTimestamp(),
      taskFamily: taskFamilyForEnabledGame("word-order"),
      measuredDimension: measuredDimensionForEnabledGame("word-order"),
      activityId: practiceActivityId("word-order"),
    });
    if (result.emitted) onEvent?.(result.event);
    setFeedbackKind(result.grade?.feedbackKind ?? null);
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  function retry() {
    setPool(shuffleTokensDeterministic(prompt.canonicalTokens, Date.now() % 10000));
    setOrdered([]);
    setRevealed(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <section className="panel game-panel" aria-labelledby="word-order-heading">
      <h2 id="word-order-heading">Word order</h2>
      <p className="muted">
        Rebuild the informal question using the word tiles below.
      </p>
      <fieldset className="game-tokens">
        <legend className="hub-field__label">Your order</legend>
        <div className="game-tokens__row" data-role="ordered">
          {ordered.length === 0 ? (
            <span className="dense">Tap tokens below to build the sentence.</span>
          ) : (
            ordered.map((token, index) => (
              <button
                key={`o-${token}-${index}`}
                type="button"
                className="game-token"
                onClick={() => unpick(token, index)}
              >
                <span className="german" lang="de">
                  {token}
                </span>
              </button>
            ))
          )}
        </div>
      </fieldset>
      <fieldset className="game-tokens">
        <legend className="hub-field__label">Available tokens</legend>
        <div className="game-tokens__row" data-role="pool">
          {pool.map((token, index) => (
            <button
              key={`p-${token}-${index}`}
              type="button"
              className="game-token"
              onClick={() => pick(token, index)}
            >
              <span className="german" lang="de">
                {token}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setOrdered([...prompt.canonicalTokens]);
          setPool([]);
          setFeedbackKind("revealed");
          setMessage(`Correct order: ${prompt.sourceSentence}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
