"use client";

import { useRef, useState } from "react";
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
  const [feedbackKind, setFeedbackKind] =
    useState<ConversationFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    <section
      className="panel conversation-panel"
      aria-labelledby="conversation-spoken-heading"
      data-level="spoken-role-play"
      data-recorder-phase={recorderReady ? phase : "initializing"}
      data-recorder-ready={recorderReady ? "true" : "false"}
    >
      <h2 id="conversation-spoken-heading">Spoken role-play</h2>
      <p className="muted">
        Respond to the published prompt. Recording is optional for earlier
        levels and stays local — never uploaded. Self-rating is reflection
        only, not pronunciation accuracy.
      </p>

      <div className="qa-bubble qa-bubble--question">
        <p className="dense">Published prompt</p>
        <p className="german" lang="de">
          {CONVERSATION_QUESTION}
        </p>
      </div>

      <div className="conversation-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setPromptReviewed(true)}
          aria-pressed={promptReviewed}
          data-prompt-reviewed={promptReviewed ? "true" : "false"}
        >
          {promptReviewed ? "Prompt reviewed" : "Review published prompt"}
        </button>
      </div>

      <fieldset className="conversation-recorder">
        <legend className="hub-field__label">Local recorder</legend>
        <div className="conversation-actions">
          {phase === "idle" ||
          phase === "denied" ||
          phase === "no-device" ||
          phase === "error" ||
          !recorderReady ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void controller?.requestPermission()}
              disabled={!recorderReady}
              data-mic-enable="true"
            >
              Enable microphone
            </button>
          ) : null}
          {recorderReady && (phase === "ready" || phase === "finalized") ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void controller?.startRecording()}
            >
              Start recording
            </button>
          ) : null}
          {recorderReady && phase === "recording" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void controller?.stopRecording()}
            >
              Stop recording
            </button>
          ) : null}
          {recorderReady && (phase === "finalized" || phase === "playback") ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void controller?.playRecording()}
              disabled={phase === "playback"}
            >
              Play recording
            </button>
          ) : null}
          <button
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
          </button>
        </div>
        {!recorderReady ? (
          <p
            className="dense"
            role="status"
            data-recorder-initializing="true"
          >
            Initializing microphone controls…
          </p>
        ) : snapshot.guidance ? (
          <p className="dense" role="status" data-recorder-guidance="true">
            {snapshot.guidance}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="conversation-selfcheck">
        <legend className="hub-field__label">
          Self-compare (reflection only)
        </legend>
        <p className="dense">
          Compare your recording to the published answer patterns. This is not
          a pronunciation score.
        </p>
        <div className="game-rating" role="group" aria-label="Self-rating">
          {SELF_RATINGS.map((rating) => (
            <button
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
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelfCheckCompleted(true)}
          data-self-check="true"
        >
          Mark self-check complete
        </button>
      </fieldset>

      <div className="conversation-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={finishCycle}
          data-finish-cycle="true"
        >
          Complete speaking level
        </button>
      </div>

      <ConversationFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
