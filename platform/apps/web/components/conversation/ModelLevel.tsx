"use client";
import { LDiv, LH2, LLi, LP, LSection, LUl } from "@/components/i18n/LocalizedElements";


import { useRef } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
import {
  CONVERSATION_ANSWER_REALIZATIONS,
  CONVERSATION_QUESTION,
  createConversationTimestamp,
  createConversationUuid,
  emitModelStudied,
  type ConversationFeedbackKind,
} from "@/lib/conversation";
import {
  ConversationActionBar,
  ConversationFeedback,
  type ConversationEventSink,
} from "./ConversationFeedback";

export function ModelLevel({
  sessionId,
  onEvent,
  onComplete,
}: {
  sessionId: string;
  onEvent?: ConversationEventSink;
  onComplete: () => void;
}) {
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<ConversationFeedbackKind>();
  const emitted = useRef(false);

  function markStudied() {
    if (!emitted.current) {
      const result = emitModelStudied({
        sessionId,
        eventId: createConversationUuid(),
        timestamp: createConversationTimestamp(),
      });
      if (result.emitted) {
        onEvent?.(result.event);
        emitted.current = true;
      }
      setFeedbackKind(result.grade?.feedbackKind ?? "studied");
      setMessage(result.grade?.feedbackMessage ?? null);
    }
    onComplete();
  }

  return (
    <LSection
      className="panel conversation-panel"
      aria-labelledby="conversation-model-heading"
      data-level="model"
    >
      <LH2 id="conversation-model-heading">Model</LH2>
      <LP className="muted">
        Study the model informal exchange before you practise it.
      </LP>
      <LDiv className="qa-bubble qa-bubble--question">
        <LP className="dense">Question</LP>
        <LP className="german" lang="de">
          {CONVERSATION_QUESTION}
        </LP>
      </LDiv>
      <LUl className="qa-answer-list">
        {CONVERSATION_ANSWER_REALIZATIONS.map((realization) => (
          <LLi key={realization} className="qa-bubble qa-bubble--answer">
            <LP className="dense">Answer pattern</LP>
            <LP className="german" lang="de">
              {realization}
            </LP>
          </LLi>
        ))}
      </LUl>
      <ConversationActionBar
        submitLabel="Mark studied / continue"
        onSubmit={markStudied}
        showReveal={false}
      />
      <ConversationFeedback kind={feedbackKind} message={message} seq={seq} />
    </LSection>
  );
}
