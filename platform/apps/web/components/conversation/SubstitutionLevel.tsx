"use client";
import { LButton, LDiv, LFieldset, LH2, LLegend, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


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
    <LSection
      className="panel conversation-panel"
      aria-labelledby="conversation-substitution-heading"
      data-level="substitution"
    >
      <LH2 id="conversation-substitution-heading">Substitution</LH2>
      <LP className="muted">
        Choose fragments to rebuild one exact answer.
      </LP>
      <LDiv className="game-tokens" aria-label="Selected fragments">
        <LDiv className="game-tokens__row" data-role="built">
          {built.length === 0 ? (
            <LSpan className="dense">No fragments selected yet.</LSpan>
          ) : (
            built.map((token, index) => (
              <LButton
                key={`${token}-${index}`}
                type="button"
                className="game-token"
                onClick={() =>
                  setBuilt((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={`Remove ${token}`}
              >
                <LSpan className="german" lang="de">
                  {token}
                </LSpan>
              </LButton>
            ))
          )}
        </LDiv>
      </LDiv>
      <LFieldset className="game-tokens">
        <LLegend className="hub-field__label">Fragments</LLegend>
        <LDiv className="game-tokens__row" data-role="pool">
          {fragments.map((token) => (
            <LButton
              key={token}
              type="button"
              className="game-token"
              onClick={() => setBuilt((prev) => [...prev, token])}
            >
              <LSpan className="german" lang="de">
                {token}
              </LSpan>
            </LButton>
          ))}
        </LDiv>
      </LFieldset>
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
