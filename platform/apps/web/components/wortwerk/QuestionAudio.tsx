"use client";

import { useEffect, useRef, useState } from "react";
import type { PackAudio } from "../../../../packages/content/src/types/packs.js";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { stopStudyAudio } from "@/components/study/StudyAudio";

/** A source-clip player. The spoken text is deliberately absent from question metadata. */
export function QuestionAudio({ audio, playbackRate = 1, disabled = false }: { audio: PackAudio; playbackRate?: number; disabled?: boolean }) {
  const rate = Number.isFinite(playbackRate) && playbackRate >= 0.5 && playbackRate <= 2 ? playbackRate : 1;
  const element = useRef<HTMLAudioElement>(null);
  const attempt = useRef(0);
  const [state, setState] = useState<"idle" | "playing" | "unavailable">("idle");

  useEffect(() => {
    const player = element.current;
    return () => { attempt.current += 1; player?.pause(); };
  }, []);

  useEffect(() => {
    const player = element.current;
    if (player) { player.playbackRate = rate; player.preservesPitch = true; }
  }, [rate]);

  useEffect(() => {
    if (disabled) { attempt.current += 1; element.current?.pause(); }
  }, [disabled]);

  function play() {
    const player = element.current;
    if (!player || disabled || state === "unavailable") return;
    const sequence = ++attempt.current;
    if (state === "playing") {
      player.pause();
      setState("idle");
      return;
    }
    try {
      stopStudyAudio(player);
      player.currentTime = 0;
      player.playbackRate = rate;
      player.preservesPitch = true;
      setState("playing");
      void player.play().then(() => {
        if (attempt.current !== sequence) player.pause();
      }).catch(() => {
        if (attempt.current === sequence) setState("unavailable");
      });
    } catch {
      if (attempt.current === sequence) setState("unavailable");
    }
  }

  return (
    <div className="ww-audio">
      {/* A transcript is revealed in task feedback. Captions here would answer a listening task. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={element}
        src={withPagesBaseAssetPath(audio.src)}
        preload="none"
        aria-hidden="true"
        onEnded={() => { attempt.current += 1; setState("idle"); }}
        onPause={() => { attempt.current += 1; setState("idle"); }}
        onError={() => { attempt.current += 1; setState("unavailable"); }}
      />
      <button type="button" className="ww-button" onClick={play} disabled={disabled || state === "unavailable"}>
        {state === "unavailable" ? "Audio unavailable" : state === "playing" ? "Pause audio" : "Play audio"}
      </button>
      {audio.review === "preview" ? <span className="ww-muted">Preview voice</span> : null}
      {state === "unavailable" ? <p className="ww-muted" role="status">The source clip could not play. You can continue without audio.</p> : null}
    </div>
  );
}
