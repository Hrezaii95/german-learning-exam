"use client";
import { LButton, LDiv, LP, LSpan } from "@/components/i18n/LocalizedElements";


import type { LearnerEvent } from "@german-learning/learning";
import type { GameFeedbackKind } from "@/lib/games/game-types";

/**
 * The one feedback channel for every practice game.
 *
 * Grading returns fixed strings, so a second wrong answer used to set React
 * state to the value it already held — a no-op that mutated no DOM and was
 * therefore never announced. The region below is present from the first paint
 * and its message node is keyed on the announcement counter, so every
 * submission is a distinct announcement. See
 * `components/a11y/StatusMessage.tsx` for the shared mechanism.
 */
export function GameFeedback({
  kind,
  message,
  seq = 0,
}: {
  kind: GameFeedbackKind | null;
  message: string | null;
  /** Announcement counter; see `useGameFeedbackChannel`. */
  seq?: number;
}) {
  const speaking = Boolean(kind && message);
  return (
    <LP
      className={
        speaking
          ? `live-region game-feedback game-feedback--${kind}`
          : "live-region live-region--idle"
      }
      role="status"
      aria-live="polite"
      data-announcement-seq={seq}
      tabIndex={-1}
      {...(speaking ? { "data-feedback": kind as string } : {})}
    >
      {speaking ? <LSpan key={seq}>{message}</LSpan> : null}
    </LP>
  );
}

export function GameActionBar({
  onSubmit,
  onRetry,
  onReveal,
  submitLabel = "Submit",
  revealDisabled = false,
  submitDisabled = false,
}: {
  onSubmit?: () => void;
  onRetry?: () => void;
  onReveal?: () => void;
  submitLabel?: string;
  revealDisabled?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <LDiv className="detail-actions game-actions">
      {onSubmit ? (
        <LButton
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-disabled={submitDisabled ? "true" : undefined}
        >
          {submitLabel}
        </LButton>
      ) : null}
      {onReveal ? (
        <LButton
          type="button"
          className="btn btn-secondary"
          onClick={onReveal}
          disabled={revealDisabled}
        >
          Reveal
        </LButton>
      ) : null}
      {onRetry ? (
        <LButton type="button" className="btn btn-secondary" onClick={onRetry}>
          Retry
        </LButton>
      ) : null}
    </LDiv>
  );
}

export type GameEventSink = (event: LearnerEvent) => void;
