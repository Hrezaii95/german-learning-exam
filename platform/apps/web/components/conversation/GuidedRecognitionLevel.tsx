"use client";
import { LButton, LFieldset, LH2, LInput, LLabel, LLegend, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


import { useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
import {
  CONVERSATION_ANSWER_REALIZATIONS,
  CONVERSATION_QUESTION,
  createConversationTimestamp,
  createConversationUuid,
  emitGuidedRecognitionAttempt,
  type ConversationFeedbackKind,
} from "@/lib/conversation";
import {
  ConversationActionBar,
  ConversationFeedback,
  type ConversationEventSink,
} from "./ConversationFeedback";

export function GuidedRecognitionLevel({
  sessionId,
  onEvent,
  onComplete,
}: {
  sessionId: string;
  onEvent?: ConversationEventSink;
  onComplete: () => void;
}) {
  const startedAt = useRef(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<ConversationFeedbackKind>();

  function submit() {
    if (!selected) {
      setFeedbackKind("empty");
      setMessage("Select an answer first.");
      return;
    }
    const result = emitGuidedRecognitionAttempt({
      selectedRealization: selected,
      revealed,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      sessionId,
      eventId: createConversationUuid(),
      timestamp: createConversationTimestamp(),
    });
    if (result.emitted) onEvent?.(result.event);
    setFeedbackKind(result.grade?.feedbackKind ?? null);
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  function continueAfterSuccess() {
    if (feedbackKind === "correct" || feedbackKind === "partial") {
      onComplete();
    }
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
      className="panel conversation-panel"
      aria-labelledby="conversation-recognition-heading"
      data-level="guided-recognition"
    >
      <LH2 id="conversation-recognition-heading">Guided recognition</LH2>
      <LP className="muted">
        Question:{" "}
        <LSpan className="german" lang="de">
          {CONVERSATION_QUESTION}
        </LSpan>
      </LP>
      <LFieldset className="qa-guided">
        <LLegend className="hub-field__label">Answer choices</LLegend>
        {CONVERSATION_ANSWER_REALIZATIONS.map((realization) => (
          <LLabel key={realization} className="qa-guided__option">
            <LInput
              type="radio"
              name="conversation-guided-answer"
              value={realization}
              checked={selected === realization}
              onChange={() => {
                setSelected(realization);
                setMessage(null);
              }}
            />
            <LSpan className="german" lang="de">
              {realization}
            </LSpan>
          </LLabel>
        ))}
      </LFieldset>
      <ConversationActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage(
            `Accepted answers: ${CONVERSATION_ANSWER_REALIZATIONS.join(" · ")}`,
          );
        }}
        revealDisabled={revealed}
      />
      {feedbackKind === "correct" || feedbackKind === "partial" ? (
        <LButton
          type="button"
          className="btn btn-primary"
          onClick={continueAfterSuccess}
          data-continue-level="true"
        >
          Continue
        </LButton>
      ) : null}
      <ConversationFeedback kind={feedbackKind} message={message} seq={seq} />
    </LSection>
  );
}
