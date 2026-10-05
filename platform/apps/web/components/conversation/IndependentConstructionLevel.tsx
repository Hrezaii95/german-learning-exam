"use client";
import { LButton, LH2, LInput, LLabel, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


import { useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
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
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<ConversationFeedbackKind>();

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
    <LSection
      className="panel conversation-panel"
      aria-labelledby="conversation-construction-heading"
      data-level="independent-construction"
    >
      <LH2 id="conversation-construction-heading">Independent construction</LH2>
      <LP className="muted">
        Type one of the three accepted answers for{" "}
        <LSpan className="german" lang="de">
          {CONVERSATION_QUESTION}
        </LSpan>
        . Ellipsis-safe; do not invent filled profession sentences.
      </LP>
      <LLabel className="hub-field" htmlFor="conversation-construction-input">
        <LSpan className="hub-field__label">Your answer pattern</LSpan>
        <LInput
          id="conversation-construction-input"
          className="hub-input"
          type="text"
          lang="de"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Type your answer"
        />
      </LLabel>
      <ConversationActionBar
        onSubmit={submit}
        onRetry={retry}
        showHint
        onHint={() => {
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage("Hint: start with “Ich …” and use one of the exact patterns you learned.");
        }}
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
