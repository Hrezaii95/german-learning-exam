"use client";
import { LButton, LDiv, LP, LSpan } from "@/components/i18n/LocalizedElements";


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
    <LP
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
      {speaking ? <LSpan key={seq}>{message}</LSpan> : null}
    </LP>
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
    <LDiv className="conversation-actions game-actions">
      <LButton type="button" className="btn btn-primary" onClick={onSubmit}>
        {submitLabel}
      </LButton>
      {onRetry ? (
        <LButton type="button" className="btn btn-secondary" onClick={onRetry}>
          Retry
        </LButton>
      ) : null}
      {showHint && onHint ? (
        <LButton
          type="button"
          className="btn btn-secondary"
          onClick={onHint}
          disabled={hintDisabled}
        >
          Hint
        </LButton>
      ) : null}
      {showReveal && onReveal ? (
        <LButton
          type="button"
          className="btn btn-secondary"
          onClick={onReveal}
          disabled={revealDisabled}
        >
          Reveal
        </LButton>
      ) : null}
    </LDiv>
  );
}
