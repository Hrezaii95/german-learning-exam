"use client";
import { LH2, LInput, LLabel, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


import { useMemo, useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
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
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<GameFeedbackKind>();

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
    <LSection className="panel game-panel" aria-labelledby="verb-builder-heading">
      <LH2 id="verb-builder-heading">Verb builder</LH2>
      <LP className="muted">
        Build the present form of{" "}
        <LSpan className="german" lang="de">
          {prompt.infinitive}
        </LSpan>{" "}
        for <LSpan lang="de">{prompt.personLabel}</LSpan>.
      </LP>
      <LLabel className="hub-field" htmlFor="verb-builder-input">
        <LSpan className="hub-field__label">Present form</LSpan>
        <LInput
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
      </LLabel>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setTyped(prompt.expectedForm);
          setFeedbackKind("revealed");
          setMessage(`Correct form: ${prompt.expectedForm}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} seq={seq} />
    </LSection>
  );
}
