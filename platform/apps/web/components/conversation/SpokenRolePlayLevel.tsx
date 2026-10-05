"use client";
import { LButton, LDiv, LFieldset, LH2, LLegend, LP, LSection } from "@/components/i18n/LocalizedElements";


import { useRef, useState } from "react";
import { useFeedbackChannel } from "@/components/a11y/StatusMessage";
import type { SelfRating } from "@german-learning/learning";
import {
  CONVERSATION_QUESTION,
  createConversationTimestamp,
  createConversationUuid,
  emitRecordingCycle,
  type ConversationFeedbackKind,
} from "@/lib/conversation";
import { useMediaRecorder } from "@/lib/recorder";
import {
  ConversationFeedback,
  type ConversationEventSink,
} from "./ConversationFeedback";

const SELF_RATINGS: readonly SelfRating[] = [
  "again",
  "hard",
  "good",
  "easy",
];

export function SpokenRolePlayLevel({
  sessionId,
  onEvent,
  onComplete,
}: {
  sessionId: string;
  onEvent?: ConversationEventSink;
  onComplete: () => void;
}) {
  const startedAt = useRef(Date.now());
  const emittedRef = useRef(false);
  const { snapshot, controller } = useMediaRecorder();
  const [promptReviewed, setPromptReviewed] = useState(false);
  const [selfCheckCompleted, setSelfCheckCompleted] = useState(false);
  const [selfRating, setSelfRating] = useState<SelfRating | null>(null);
  const { kind: feedbackKind, message, seq, setFeedbackKind, setMessage } =
    useFeedbackChannel<ConversationFeedbackKind>();

  function finishCycle() {
    if (emittedRef.current) return;
    const result = emitRecordingCycle({
      listenCompleted: promptReviewed,
      recordCompleted: snapshot.recordCompleted,
      playbackCompleted: snapshot.playbackCompleted,
      selfCheckCompleted,
      ...(selfRating ? { selfRating } : {}),
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      hintsUsed: 0,
      sessionId,
      eventId: createConversationUuid(),
      timestamp: createConversationTimestamp(),
    });
    if (result.emitted) {
      onEvent?.(result.event);
      emittedRef.current = true;
      onComplete();
    }
    setFeedbackKind(result.grade?.feedbackKind ?? null);
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  const phase = snapshot.phase;
  const recorderReady = controller != null;

  return (
    <LSection
      className="panel conversation-panel"
      aria-labelledby="conversation-spoken-heading"
      data-level="spoken-role-play"
      data-recorder-phase={recorderReady ? phase : "initializing"}
      data-recorder-ready={recorderReady ? "true" : "false"}
    >
      <LH2 id="conversation-spoken-heading">Spoken role-play</LH2>
      <LP className="muted">
        Respond to the prompt. Recording is optional for earlier
        levels and stays local — never uploaded. Self-rating is reflection
        only, not pronunciation accuracy.
      </LP>

      <LDiv className="qa-bubble qa-bubble--question">
        <LP className="dense">Prompt</LP>
        <LP className="german" lang="de">
          {CONVERSATION_QUESTION}
        </LP>
      </LDiv>

      <LDiv className="conversation-actions">
        <LButton
          type="button"
          className="btn btn-secondary"
          onClick={() => setPromptReviewed(true)}
          aria-pressed={promptReviewed}
          data-prompt-reviewed={promptReviewed ? "true" : "false"}
        >
          {promptReviewed ? "Prompt reviewed" : "Review the prompt"}
        </LButton>
      </LDiv>

      <LFieldset className="conversation-recorder">
        <LLegend className="hub-field__label">Local recorder</LLegend>
        <LDiv className="conversation-actions">
          {phase === "idle" ||
          phase === "denied" ||
          phase === "no-device" ||
          phase === "error" ||
          !recorderReady ? (
            <LButton
              type="button"
              className="btn btn-primary"
              onClick={() => void controller?.requestPermission()}
              disabled={!recorderReady}
              data-mic-enable="true"
            >
              Enable microphone
            </LButton>
          ) : null}
          {recorderReady && (phase === "ready" || phase === "finalized") ? (
            <LButton
              type="button"
              className="btn btn-primary"
              onClick={() => void controller?.startRecording()}
            >
              Start recording
            </LButton>
          ) : null}
          {recorderReady && phase === "recording" ? (
            <LButton
              type="button"
              className="btn btn-primary"
              onClick={() => void controller?.stopRecording()}
            >
              Stop recording
            </LButton>
          ) : null}
          {recorderReady && (phase === "finalized" || phase === "playback") ? (
            <LButton
              type="button"
              className="btn btn-secondary"
              onClick={() => void controller?.playRecording()}
              disabled={phase === "playback"}
            >
              Play recording
            </LButton>
          ) : null}
          <LButton
            type="button"
            className="btn btn-secondary"
            disabled={!recorderReady}
            onClick={() => {
              controller?.retry();
              setSelfCheckCompleted(false);
              setSelfRating(null);
              emittedRef.current = false;
              setFeedbackKind("retry");
              setMessage("Recording discarded. You can record again.");
            }}
          >
            Retry / discard
          </LButton>
        </LDiv>
        {!recorderReady ? (
          <LP
            className="dense"
            role="status"
            data-recorder-initializing="true"
          >
            Initializing microphone controls…
          </LP>
        ) : snapshot.guidance ? (
          <LP className="dense" role="status" data-recorder-guidance="true">
            {snapshot.guidance}
          </LP>
        ) : null}
      </LFieldset>

      <LFieldset className="conversation-selfcheck">
        <LLegend className="hub-field__label">
          Self-compare (reflection only)
        </LLegend>
        <LP className="dense">
          Compare your recording to the model answers. This is not a
          pronunciation score.
        </LP>
        <LDiv className="game-rating" role="group" aria-label="Self-rating">
          {SELF_RATINGS.map((rating) => (
            <LButton
              key={rating}
              type="button"
              className="game-rating__btn"
              aria-pressed={selfRating === rating}
              onClick={() => {
                setSelfRating(rating);
                setSelfCheckCompleted(true);
              }}
            >
              {rating}
            </LButton>
          ))}
        </LDiv>
        <LButton
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelfCheckCompleted(true)}
          data-self-check="true"
        >
          Mark self-check complete
        </LButton>
      </LFieldset>

      <LDiv className="conversation-actions">
        <LButton
          type="button"
          className="btn btn-primary"
          onClick={finishCycle}
          data-finish-cycle="true"
        >
          Complete speaking level
        </LButton>
      </LDiv>

      <ConversationFeedback kind={feedbackKind} message={message} seq={seq} />
    </LSection>
  );
}
