"use client";

import { useMemo, useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
import {
  CONVERSATION_ANSWER_REALIZATIONS,
  createConversationTimestamp,
  createConversationUuid,
  emitSubstitutionAttempt,
  joinConversationTokens,
  publishedSubstitutionFragments,
  type ConversationFeedbackKind,
} from "@/lib/conversation";
import {
  ConversationActionBar,
  ConversationFeedback,
  type ConversationEventSink,
} from "./ConversationFeedback";

export function SubstitutionLevel({
  sessionId,
  onEvent,
  onComplete,
}: {
  sessionId: string;
  onEvent?: ConversationEventSink;
  onComplete: () => void;
}) {
  const fragments = useMemo(() => publishedSubstitutionFragments(), []);
  const startedAt = useRef(Date.now());
  const [built, setBuilt] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<ConversationFeedbackKind>();

  function submit() {
    const assembled = joinConversationTokens(built);
    const result = emitSubstitutionAttempt({
      assembled,
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
    setBuilt([]);
    setRevealed(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <section
      className="panel conversation-panel"
      aria-labelledby="conversation-substitution-heading"
      data-level="substitution"
    >
      <h2 id="conversation-substitution-heading">Substitution</h2>
      <p className="muted">
        Choose fragments to rebuild one exact answer.
      </p>
      <div className="game-tokens" aria-label="Selected fragments">
        <div className="game-tokens__row" data-role="built">
          {built.length === 0 ? (
            <span className="dense">No fragments selected yet.</span>
          ) : (
            built.map((token, index) => (
              <button
                key={`${token}-${index}`}
                type="button"
                className="game-token"
                onClick={() =>
                  setBuilt((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={`Remove ${token}`}
              >
                <span className="german" lang="de">
                  {token}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      <fieldset className="game-tokens">
        <legend className="hub-field__label">Fragments</legend>
        <div className="game-tokens__row" data-role="pool">
          {fragments.map((token) => (
            <button
              key={token}
              type="button"
              className="game-token"
              onClick={() => setBuilt((prev) => [...prev, token])}
            >
              <span className="german" lang="de">
                {token}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <ConversationActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage(
            `One correct answer: ${CONVERSATION_ANSWER_REALIZATIONS[0]}`,
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
