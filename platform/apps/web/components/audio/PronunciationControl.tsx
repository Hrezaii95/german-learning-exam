"use client";

import { useRef, useState } from "react";
import type { LearnerMediaAvailability } from "@/lib/content/detail-types";
import {
  PRONUNCIATION_MISSING_EXPLANATION,
  PRONUNCIATION_PENDING_EXPLANATION,
} from "@/lib/content/media-copy";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { useAudioSpeed, AudioSpeedControl } from "./AudioSpeedControl";
import { LineAudio, type LineAudioControl } from "@/components/study/StudyAudio";

export type AudioControlState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "unavailable"
  | "error";

export type AudioControlContract = {
  readonly state: AudioControlState;
  readonly canPlay: boolean;
  readonly rate: 1 | 0.8;
  readonly media: LearnerMediaAvailability;
  readonly explanation: string | null;
};

export function resolveAudioControl(
  media: LearnerMediaAvailability,
): AudioControlContract {
  if (media.state === "preview") {
    return Object.freeze({
      state: "idle" as const,
      canPlay: true,
      rate: 1 as const,
      media,
      explanation: null,
    });
  }
  if (media.state === "pending-review") {
    return Object.freeze({
      state: "unavailable" as const,
      canPlay: false,
      rate: 1 as const,
      media,
      explanation: PRONUNCIATION_PENDING_EXPLANATION,
    });
  }
  return Object.freeze({
    state: "unavailable" as const,
    canPlay: false,
    rate: 1 as const,
    media,
    explanation: PRONUNCIATION_MISSING_EXPLANATION,
  });
}

export function PronunciationControl({
  media,
  label = "Pronunciation",
}: {
  media: LearnerMediaAvailability;
  label?: string;
}) {
  const control = resolveAudioControl(media);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lineControl = useRef<LineAudioControl>(null);
  const audioSpeed = useAudioSpeed();
  const rate = audioSpeed.speed;
  const [playbackState, setPlaybackState] = useState<AudioControlState>(
    control.state,
  );

  if (media.state !== "preview") {
    return (
      <div className="audio-control" data-audio-state={control.state}>
        <button
          type="button"
          className="btn btn-secondary audio-control__btn"
          disabled
          aria-disabled="true"
          tabIndex={-1}
          // Visible label first, then which word it would have spoken — the
          // old "der Elektriker unavailable" contained none of the visible
          // wording (WCAG 2.5.3 Label in Name).
          aria-label={`Pronunciation unavailable — ${label}`}
        >
          Pronunciation unavailable
        </button>
        {control.explanation ? (
          <p className="dense audio-control__note" role="status">
            {control.explanation}
          </p>
        ) : null}
      </div>
    );
  }

  function chooseRate(nextRate: 0.8 | 1) {
    void audioSpeed.change(nextRate);
  }

  const source = withPagesBaseAssetPath(media.publicPath);

  return (
    <div className="audio-control" data-audio-state={playbackState}>
      {/* The exact spoken German is visible beside the player; this is a short
          pronunciation model, not a timed listening passage requiring captions. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        data-pronunciation-audio="true"
        preload="metadata"
        src={source}
        aria-label={`${label}, synthesized German pronunciation`}
      />
      <div className="workbook-audio__actions" role="group" aria-label={`Pronunciation controls for ${label}`}>
        <LineAudio
          text={media.spokenText}
          src={media.publicPath}
          label={label}
          rate={rate}
          audioRef={audioRef}
          controlRef={lineControl}
          onStateChange={setPlaybackState}
          buttonClassName="audio-control__btn"
          fallbackToSpeech={false}
          fileErrorMessage="Audio could not be played. Retry or check the connection."
          errorRole="alert"
        />
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={rate === 0.8}
          disabled={audioSpeed.disabled}
          onClick={() => chooseRate(0.8)}
        >
          Study 0.8×
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={rate === 1}
          disabled={audioSpeed.disabled}
          onClick={() => chooseRate(1)}
        >
          Normal 1×
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => lineControl.current?.repeat()}>
          Repeat
        </button>
      </div>
      <AudioSpeedControl control={audioSpeed}/>
      <p className="dense audio-control__note">
        <strong>Synthesized German preview voice</strong> · independent German listening review pending · {media.voice} · generated at {media.generationRate}; playback {rate}×
      </p>
      <p className="dense german" lang="de">
        {media.spokenText}
      </p>
    </div>
  );
}
