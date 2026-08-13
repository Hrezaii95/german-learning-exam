"use client";

import type { LearnerEvent } from "@german-learning/learning";
import type { ConversationFeedbackKind } from "@/lib/conversation";

export type ConversationEventSink = (event: LearnerEvent) => void;

export function ConversationFeedback({
  kind,
  message,
}: {
  kind: ConversationFeedbackKind | null;
  message: string | null;
}) {
  if (!kind || !message) return null;
  return (
    <p
      className={`conversation-feedback conversation-feedback--${kind}`}
      data-feedback={kind}
      role="status"
      aria-live="polite"
    >
      {message}
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
