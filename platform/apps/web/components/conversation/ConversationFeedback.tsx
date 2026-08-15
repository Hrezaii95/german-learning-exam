"use client";

import type { LearnerEvent } from "@german-learning/learning";
import type { ConversationFeedbackKind } from "@/lib/conversation";

export type ConversationEventSink = (event: LearnerEvent) => void;

/**
 * Same contract as the practice-game feedback region: present from the first
 * paint, and keyed on the announcement counter so a repeated identical outcome
 * is still announced. See `components/a11y/StatusMessage.tsx`.
 */
export function ConversationFeedback({
  kind,
  message,
  seq = 0,
}: {
  kind: ConversationFeedbackKind | null;
  message: string | null;
  seq?: number;
}) {
  const speaking = Boolean(kind && message);
  return (
    <p
      className={
        speaking
          ? `live-region conversation-feedback conversation-feedback--${kind}`
          : "live-region live-region--idle"
      }
      role="status"
      aria-live="polite"
      data-announcement-seq={seq}
      {...(speaking ? { "data-feedback": kind as string } : {})}
    >
      {speaking ? <span key={seq}>{message}</span> : null}
    </p>
  );
}

export function ConversationActionBar({
  onSubmit,
  onRetry,
  onReveal,
  onHint,
  submitLabel = "Submit",
  revealDisabled = false,
  hintDisabled = false,
  showReveal = true,
  showHint = false,
}: {
  onSubmit: () => void;
  onRetry?: () => void;
  onReveal?: () => void;
  onHint?: () => void;
  submitLabel?: string;
  revealDisabled?: boolean;
  hintDisabled?: boolean;
  showReveal?: boolean;
  showHint?: boolean;
}) {
  return (
    <div className="conversation-actions game-actions">
      <button type="button" className="btn btn-primary" onClick={onSubmit}>
        {submitLabel}
      </button>
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
      {showHint && onHint ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onHint}
          disabled={hintDisabled}
        >
          Hint
        </button>
      ) : null}
      {showReveal && onReveal ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReveal}
          disabled={revealDisabled}
        >
          Reveal
        </button>
      ) : null}
    </div>
  );
}
