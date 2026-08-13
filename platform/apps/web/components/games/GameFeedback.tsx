"use client";

import type { LearnerEvent } from "@german-learning/learning";
import type { GameFeedbackKind } from "@/lib/games/game-types";

export function GameFeedback({
  kind,
  message,
}: {
  kind: GameFeedbackKind | null;
  message: string | null;
}) {
  if (!kind || !message) return null;
  return (
    <p
      className={`game-feedback game-feedback--${kind}`}
      role="status"
      aria-live="polite"
      data-feedback={kind}
      tabIndex={-1}
    >
      {message}
    </p>
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
    <div className="detail-actions game-actions">
      {onSubmit ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-disabled={submitDisabled ? "true" : undefined}
        >
          {submitLabel}
        </button>
      ) : null}
      {onReveal ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReveal}
          disabled={revealDisabled}
        >
          Reveal
        </button>
      ) : null}
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export type GameEventSink = (event: LearnerEvent) => void;
