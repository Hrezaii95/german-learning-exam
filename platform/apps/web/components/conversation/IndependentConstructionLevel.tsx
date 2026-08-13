"use client";

import { useRef, useState } from "react";
import {
  CONVERSATION_ANSWER_REALIZATIONS,
  CONVERSATION_QUESTION,
  createConversationTimestamp,
  createConversationUuid,
  emitIndependentConstructionAttempt,
  type ConversationFeedbackKind,
} from "@/lib/conversation";
import {
  ConversationActionBar,
  ConversationFeedback,
  type ConversationEventSink,
} from "./ConversationFeedback";

export function IndependentConstructionLevel({
  sessionId,
  onEvent,
  onComplete,
}: {
  sessionId: string;
  onEvent?: ConversationEventSink;
  onComplete: () => void;
}) {
  const startedAt = useRef(Date.now());
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedbackKind, setFeedbackKind] =
    useState<ConversationFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    const result = emitIndependentConstructionAttempt({
      rawAnswer: value,
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
    setValue("");
    setRevealed(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <section
      className="panel conversation-panel"
      aria-labelledby="conversation-construction-heading"
      data-level="independent-construction"
    >
      <h2 id="conversation-construction-heading">Independent construction</h2>
      <p className="muted">
        Type one of the three published answer realizations for{" "}
        <span className="german" lang="de">
          {CONVERSATION_QUESTION}
        </span>
        . Ellipsis-safe; do not invent filled profession sentences.
      </p>
      <label className="hub-field" htmlFor="conversation-construction-input">
        <span className="hub-field__label">Your answer pattern</span>
        <input
          id="conversation-construction-input"
          className="hub-input"
          type="text"
          lang="de"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Type a published answer pattern"
        />
      </label>
      <ConversationActionBar
        onSubmit={submit}
        onRetry={retry}
        showHint
        onHint={() => {
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage("Hint: start with “Ich …” — exact published patterns only.");
        }}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage(
            `Published patterns: ${CONVERSATION_ANSWER_REALIZATIONS.join(" · ")}`,
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
      <ConversationFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
