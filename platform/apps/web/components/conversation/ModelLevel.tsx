"use client";

import { useRef, useState } from "react";
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
  const [feedbackKind, setFeedbackKind] =
    useState<ConversationFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    <section
      className="panel conversation-panel"
      aria-labelledby="conversation-model-heading"
      data-level="model"
    >
      <h2 id="conversation-model-heading">Model</h2>
      <p className="muted">
        Study the published informal exchange. Pronunciation playback is
        unavailable until listening approval.
      </p>
      <div className="qa-bubble qa-bubble--question">
        <p className="dense">Question</p>
        <p className="german" lang="de">
          {CONVERSATION_QUESTION}
        </p>
      </div>
      <ul className="qa-answer-list">
        {CONVERSATION_ANSWER_REALIZATIONS.map((realization) => (
          <li key={realization} className="qa-bubble qa-bubble--answer">
            <p className="dense">Answer pattern</p>
            <p className="german" lang="de">
              {realization}
            </p>
          </li>
        ))}
      </ul>
      <ConversationActionBar
        submitLabel="Mark studied / continue"
        onSubmit={markStudied}
        showReveal={false}
      />
      <ConversationFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
