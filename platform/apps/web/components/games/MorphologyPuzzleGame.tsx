"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildMorphologyPuzzlePrompt,
  createPracticeTimestamp,
  createPracticeUuid,
  emitObjectiveGameAttempt,
  measuredDimensionForEnabledGame,
  practiceActivityId,
  taskFamilyForEnabledGame,
} from "@/lib/games";
import type { GameFeedbackKind } from "@/lib/games/game-types";
import { GameActionBar, GameFeedback, type GameEventSink } from "./GameFeedback";

export function MorphologyPuzzleGame({
  sessionId,
  onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildMorphologyPuzzlePrompt(), []);
  const startedAt = useRef(Date.now());
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedbackKind, setFeedbackKind] = useState<GameFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    const result = emitObjectiveGameAttempt({
      gameId: "morphology-puzzle",
      rawAnswer: typed,
      expectedNormalized: prompt.expectedLemma,
      revealed,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      conceptId: prompt.conceptId,
      sessionId,
      eventId: createPracticeUuid(),
      timestamp: createPracticeTimestamp(),
      taskFamily: taskFamilyForEnabledGame("morphology-puzzle"),
      measuredDimension: measuredDimensionForEnabledGame("morphology-puzzle"),
      activityId: practiceActivityId("morphology-puzzle"),
    });
    if (result.emitted) onEvent?.(result.event);
    setFeedbackKind(result.grade?.feedbackKind ?? null);
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  function retry() {
    setTyped("");
    setRevealed(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <section
      className="panel game-panel"
      aria-labelledby="morphology-puzzle-heading"
    >
      <h2 id="morphology-puzzle-heading">Morphology puzzle</h2>
      <p className="muted">{prompt.operationLabel}</p>
      <div
        className="person-form-infographic"
        role="img"
        aria-label={`Shared stem ${prompt.sharedStem} plus feminine suffix -${prompt.feminineSuffix}`}
      >
        <span className="morph-token morph-token--stem" lang="de">
          {prompt.sharedStem}
        </span>
        <span className="morph-token morph-token--op" aria-hidden="true">
          +
        </span>
        <span className="morph-token morph-token--suffix" lang="de">
          -{prompt.feminineSuffix}
        </span>
      </div>
      <label className="hub-field" htmlFor="morphology-puzzle-input">
        <span className="hub-field__label">Resulting lemma</span>
        <input
          id="morphology-puzzle-input"
          className="hub-input"
          type="text"
          lang="de"
          autoComplete="off"
          maxLength={120}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          aria-label="Type the feminine form"
        />
      </label>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setTyped(prompt.expectedLemma);
          setFeedbackKind("revealed");
          setMessage(`Correct form: ${prompt.expectedLemma}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
