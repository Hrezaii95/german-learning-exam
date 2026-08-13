"use client";

import { useEffect, useRef, useState } from "react";
import type { LearnerMediaAvailability } from "@/lib/content/detail-types";
import {
  PRONUNCIATION_MISSING_EXPLANATION,
  PRONUNCIATION_PENDING_EXPLANATION,
} from "@/lib/content/media-copy";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

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
  const [rate, setRate] = useState<0.8 | 1>(1);
  const [playbackState, setPlaybackState] = useState<AudioControlState>(
    control.state,
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.preservesPitch = true;
  }, [rate]);

  if (media.state !== "preview") {
    return (
      <div className="audio-control" data-audio-state={control.state}>
        <button
          type="button"
          className="btn btn-secondary audio-control__btn"
          disabled
          aria-disabled="true"
          tabIndex={-1}
          aria-label={`${label} unavailable`}
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

  function playFromCurrent() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.ended) audio.currentTime = 0;
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    setPlaybackState("loading");
    void audio.play().catch(() => setPlaybackState("error"));
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    playFromCurrent();
  }

  function repeat() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    playFromCurrent();
  }

  function chooseRate(nextRate: 0.8 | 1) {
    setRate(nextRate);
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = nextRate;
    audio.preservesPitch = true;
  }

  const isPlaying = playbackState === "playing" || playbackState === "loading";
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
        onLoadStart={() => setPlaybackState("loading")}
        onCanPlay={() => setPlaybackState((state) => (state === "playing" ? state : "idle"))}
        onPlay={(event) => {
          for (const other of document.querySelectorAll<HTMLAudioElement>("audio")) {
            if (other !== event.currentTarget) other.pause();
          }
          setPlaybackState("playing");
        }}
        onPause={() => setPlaybackState((state) => (state === "error" ? state : "paused"))}
        onEnded={() => setPlaybackState("idle")}
        onError={() => setPlaybackState("error")}
      />
      <div className="workbook-audio__actions" role="group" aria-label={`Pronunciation controls for ${label}`}>
        <button
          type="button"
          className="btn btn-primary audio-control__btn"
          onClick={togglePlayback}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${label} pronunciation`}
        >
          {isPlaying ? "Pause" : "Play pronunciation"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={rate === 0.8}
          onClick={() => chooseRate(0.8)}
        >
          Study 0.8×
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={rate === 1}
          onClick={() => chooseRate(1)}
        >
          Normal 1×
        </button>
        <button type="button" className="btn btn-secondary" onClick={repeat}>
          Repeat
        </button>
      </div>
      <p className="dense audio-control__note">
        <strong>Synthesized German preview voice</strong> · independent German listening review pending · {media.voice} · generated at {media.generationRate}; playback {rate}×
      </p>
      <p className="dense german" lang="de">
        {media.spokenText}
      </p>
      {playbackState === "error" ? (
        <p className="dense audio-control__note" role="alert">
          Audio could not be played. Retry or check the connection.
        </p>
      ) : null}
    </div>
  );
}
