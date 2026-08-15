"use client";

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
    <section
      className="panel conversation-panel"
      aria-labelledby="conversation-recognition-heading"
      data-level="guided-recognition"
    >
      <h2 id="conversation-recognition-heading">Guided recognition</h2>
      <p className="muted">
        Question:{" "}
        <span className="german" lang="de">
          {CONVERSATION_QUESTION}
        </span>
      </p>
      <fieldset className="qa-guided">
        <legend className="hub-field__label">Answer choices</legend>
        {CONVERSATION_ANSWER_REALIZATIONS.map((realization) => (
          <label key={realization} className="qa-guided__option">
            <input
              type="radio"
              name="conversation-guided-answer"
              value={realization}
              checked={selected === realization}
              onChange={() => {
                setSelected(realization);
                setMessage(null);
              }}
            />
            <span className="german" lang="de">
              {realization}
            </span>
          </label>
        ))}
      </fieldset>
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={continueAfterSuccess}
          data-continue-level="true"
        >
          Continue
        </button>
      ) : null}
      <ConversationFeedback kind={feedbackKind} message={message} seq={seq} />
    </section>
  );
}
