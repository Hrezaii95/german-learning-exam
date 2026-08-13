"use client";

import { useMemo, useRef, useState } from "react";
import { GenderBadge } from "@/components/details/GenderBadge";
import {
  buildPictureWordMatchPrompt,
  createPracticeTimestamp,
  createPracticeUuid,
  emitObjectiveGameAttempt,
  measuredDimensionForEnabledGame,
  practiceActivityId,
  taskFamilyForEnabledGame,
} from "@/lib/games";
import type { GameFeedbackKind } from "@/lib/games/game-types";
import { GameActionBar, GameFeedback, type GameEventSink } from "./GameFeedback";

export function PictureWordMatchGame({
  sessionId,
  onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildPictureWordMatchPrompt("masculine"), []);
  const startedAt = useRef(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedbackKind, setFeedbackKind] = useState<GameFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    if (!selected) {
      setFeedbackKind("empty");
      setMessage("Select a published person form first.");
      return;
    }
    const result = emitObjectiveGameAttempt({
      gameId: "picture-word-match",
      rawAnswer: selected,
      expectedNormalized: prompt.targetDisplayText,
      revealed,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      conceptId: prompt.conceptId,
      sessionId,
      eventId: createPracticeUuid(),
      timestamp: createPracticeTimestamp(),
      taskFamily: taskFamilyForEnabledGame("picture-word-match"),
      measuredDimension: measuredDimensionForEnabledGame("picture-word-match"),
      activityId: practiceActivityId("picture-word-match"),
    });
    if (result.emitted) onEvent?.(result.event);
    setFeedbackKind(result.grade?.feedbackKind ?? null);
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  function retry() {
    setSelected(null);
    setRevealed(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <section
      className="panel game-panel"
      aria-labelledby="picture-word-match-heading"
    >
      <h2 id="picture-word-match-heading">Picture–word match</h2>
      <p className="muted">{prompt.semanticNote}</p>
      <div
        className="game-semantic-visual"
        role="img"
        aria-label={`${prompt.promptLabel}: ${prompt.targetGender}`}
      >
        <GenderBadge gender={prompt.targetGender} />
        <span className="dense">{prompt.promptLabel}</span>
      </div>
      <fieldset className="game-choice">
        <legend className="hub-field__label">Published person forms</legend>
        {prompt.choices.map((choice) => (
          <label key={choice.id} className="game-choice__option">
            <input
              type="radio"
              name="picture-word-match"
              value={choice.displayText}
              checked={selected === choice.displayText}
              onChange={() => {
                setSelected(choice.displayText);
                setMessage(null);
              }}
            />
            <GenderBadge gender={choice.gender} />
            <span className="german" lang="de">
              {choice.displayText}
            </span>
          </label>
        ))}
      </fieldset>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage(`Published match: ${prompt.targetDisplayText}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
