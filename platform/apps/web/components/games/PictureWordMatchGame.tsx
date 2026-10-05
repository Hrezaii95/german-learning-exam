"use client";
import { LDiv, LFieldset, LH2, LInput, LLabel, LLegend, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


import { useMemo, useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
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
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<GameFeedbackKind>();

  function submit() {
    if (!selected) {
      setFeedbackKind("empty");
      setMessage("Select a person form first.");
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
    <LSection
      className="panel game-panel"
      aria-labelledby="picture-word-match-heading"
    >
      <LH2 id="picture-word-match-heading">Picture–word match</LH2>
      <LP className="muted">{prompt.semanticNote}</LP>
      <LDiv
        className="game-semantic-visual"
        role="img"
        aria-label={`${prompt.promptLabel}: ${prompt.targetGender}`}
      >
        <GenderBadge gender={prompt.targetGender} />
        <LSpan className="dense">{prompt.promptLabel}</LSpan>
      </LDiv>
      <LFieldset className="game-choice">
        <LLegend className="hub-field__label">Person forms</LLegend>
        {prompt.choices.map((choice) => (
          <LLabel key={choice.id} className="game-choice__option">
            <LInput
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
            <LSpan className="german" lang="de">
              {choice.displayText}
            </LSpan>
          </LLabel>
        ))}
      </LFieldset>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage(`Correct match: ${prompt.targetDisplayText}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} seq={seq} />
    </LSection>
  );
}
