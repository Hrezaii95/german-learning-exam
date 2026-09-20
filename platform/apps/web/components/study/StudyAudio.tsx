"use client";

import { useEffect, useRef, useState } from "react";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { usePreferredAudioSpeed } from "@/components/audio/AudioSpeedControl";

const STOP_EVENT = "study-stop-audio";
export function stopStudyAudio(except?: HTMLAudioElement) {
  window.dispatchEvent(new Event(STOP_EVENT));
  document.querySelectorAll("audio").forEach((audio) => { if (audio !== except) audio.pause(); });
  window.speechSynthesis?.cancel();
}

export function LineAudio({
  text,
  src,
  compact = false,
  rate: overrideRate,
  label,
}: {
  text: string;
  src?: string | null | undefined;
  compact?: boolean;
  rate?: number;
  /** A neutral label keeps listening-recall answers out of the accessible name. */
  label?: string;
}) {
  const preferredRate = usePreferredAudioSpeed();
  const rate = overrideRate ?? preferredRate;
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const clip = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const active = useRef(false);
  useEffect(() => { if (clip.current) clip.current.playbackRate = rate; }, [rate]);
  useEffect(() => {
    const stop = () => {
      active.current = false;
      clip.current?.pause();
      clip.current = null;
      utterance.current = null;
      setPlaying(false);
    };
    window.addEventListener(STOP_EVENT, stop);
    return () => {
      const wasActive = active.current;
      stop();
      if (wasActive) window.speechSynthesis?.cancel();
      window.removeEventListener(STOP_EVENT, stop);
    };
  }, [text, src]);
  async function speak() {
    if (playing) {
      stopStudyAudio();
      return;
    }
    stopStudyAudio();
    setError("");
    active.current = true;
    setPlaying(true);
    const speech = () => {
      if (!active.current) return;
      if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        active.current = false;
        setPlaying(false);
        setError(
          "Speech is unavailable in this browser. Try Chrome, Edge, or Safari.",
        );
        return;
      }
      const item = new SpeechSynthesisUtterance(text);
      item.lang = "de-DE";
      item.rate = rate;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.toLowerCase().startsWith("de"));
      if (voice) item.voice = voice;
      utterance.current = item;
      item.onend = () => {
        if (utterance.current === item) {
          active.current = false;
          setPlaying(false);
        }
      };
      item.onerror = (event) => {
        if (
          utterance.current === item &&
          event.error !== "canceled" &&
          event.error !== "interrupted"
        ) {
          setError(
            "German speech could not play. Install a German voice in your device settings, then retry.",
          );
          active.current = false;
          setPlaying(false);
        }
      };
      window.speechSynthesis.speak(item);
    };
    if (!src) {
      speech();
      return;
    }
    const audio = new Audio(withPagesBaseAssetPath(src));
    clip.current = audio;
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    audio.onended = () => {
      if (clip.current === audio) {
        active.current = false;
        setPlaying(false);
      }
    };
    audio.onpause = () => {
      if (clip.current === audio) {
        active.current = false;
        setPlaying(false);
      }
    };
    const fallback = () => {
      if (clip.current === audio) {
        clip.current = null;
        active.current = true;
        setError("Audio file unavailable; using device speech.");
        speech();
      }
    };
    audio.onerror = fallback;
    try { await audio.play(); } catch { fallback(); }
  }
  return (
    <span className="study-audio">
      <button
        type="button"
        className="study-audio-button"
        aria-label={`${playing ? "Stop" : "Listen"}: ${label ?? text}`}
        aria-pressed={playing}
        title={src ? "Generated German pronunciation" : "Device-generated German speech"}
        onClick={() => void speak()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <path
            d={
              playing
                ? "M8 5v14M16 5v14"
                : "M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {!compact && (playing ? "Stop" : "Listen")}
      </button>
      {error && (
        <span className="study-audio-error" role="status">
          {error}
        </span>
      )}
    </span>
  );
}
