"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildVerbBuilderPrompt,
  createPracticeTimestamp,
  createPracticeUuid,
  emitObjectiveGameAttempt,
  measuredDimensionForEnabledGame,
  practiceActivityId,
  taskFamilyForEnabledGame,
} from "@/lib/games";
import type { GameFeedbackKind } from "@/lib/games/game-types";
import { GameActionBar, GameFeedback, type GameEventSink } from "./GameFeedback";

export function VerbBuilderGame({
  sessionId,
  onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildVerbBuilderPrompt(0), []);
  const startedAt = useRef(Date.now());
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedbackKind, setFeedbackKind] = useState<GameFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    const result = emitObjectiveGameAttempt({
      gameId: "verb-builder",
      rawAnswer: typed,
      expectedNormalized: prompt.expectedForm,
      revealed,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      conceptId: prompt.conceptId,
      sessionId,
      eventId: createPracticeUuid(),
      timestamp: createPracticeTimestamp(),
      taskFamily: taskFamilyForEnabledGame("verb-builder"),
      measuredDimension: measuredDimensionForEnabledGame("verb-builder"),
      activityId: practiceActivityId("verb-builder"),
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
    <section className="panel game-panel" aria-labelledby="verb-builder-heading">
      <h2 id="verb-builder-heading">Verb builder</h2>
      <p className="muted">
        Build the published present form of{" "}
        <span className="german" lang="de">
          {prompt.infinitive}
        </span>{" "}
        for <span lang="de">{prompt.personLabel}</span>.
      </p>
      <label className="hub-field" htmlFor="verb-builder-input">
        <span className="hub-field__label">Present form</span>
        <input
          id="verb-builder-input"
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
          aria-label={`Type the present form for ${prompt.personLabel}`}
        />
      </label>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setTyped(prompt.expectedForm);
          setFeedbackKind("revealed");
          setMessage(`Published form: ${prompt.expectedForm}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
