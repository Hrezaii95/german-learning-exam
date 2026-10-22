"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { usePreferredAudioSpeed } from "@/components/audio/AudioSpeedControl";

const STOP_EVENT = "study-stop-audio";
export function stopStudyAudio(except?: HTMLAudioElement) {
  window.dispatchEvent(new CustomEvent(STOP_EVENT, { detail: except }));
  document.querySelectorAll("audio").forEach((audio) => { if (audio !== except) audio.pause(); });
  window.speechSynthesis?.cancel();
}

export type LineAudioState = "idle" | "loading" | "playing" | "paused" | "error";
export type LineAudioControl = { repeat: () => void };

export function LineAudio({
  text,
  src,
  compact = false,
  rate: overrideRate,
  label,
  audioRef,
  controlRef,
  onStateChange,
  buttonClassName,
  fallbackToSpeech = true,
  fileErrorMessage = "Audio file unavailable; using device speech.",
  errorRole = "status",
}: {
  text: string;
  src?: string | null | undefined;
  compact?: boolean;
  rate?: number;
  /** A neutral label keeps listening-recall answers out of the accessible name. */
  label?: string;
  /** Reuse an existing semantic audio element without changing the default player. */
  audioRef?: RefObject<HTMLAudioElement | null>;
  controlRef?: Ref<LineAudioControl>;
  onStateChange?: (state: LineAudioState) => void;
  buttonClassName?: string;
  /** Exact published previews can require their supplied recording. */
  fallbackToSpeech?: boolean;
  fileErrorMessage?: string;
  errorRole?: "status" | "alert";
}) {
  const preferredRate = usePreferredAudioSpeed();
  const rate = overrideRate ?? preferredRate;
  const [state, setState] = useState<LineAudioState>("idle");
  const [error, setError] = useState("");
  const playing = state === "playing" || state === "loading";
  const clip = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const active = useRef(false);
  const request = useRef(0);
  const stateListener = useRef(onStateChange);
  useEffect(() => { stateListener.current = onStateChange; }, [onStateChange]);

  const changeState = useCallback((next: LineAudioState) => {
    setState(next);
    stateListener.current?.(next);
  }, []);

  useEffect(() => {
    const audio = clip.current ?? audioRef?.current;
    if (audio) { audio.playbackRate = rate; audio.preservesPitch = true; }
  }, [rate, audioRef]);
  useEffect(() => {
    const stop = (event?: Event) => {
      const except = (event as CustomEvent<HTMLAudioElement | undefined> | undefined)?.detail;
      if (except && clip.current === except) return;
      request.current += 1;
      active.current = false;
      clip.current?.pause();
      clip.current = null;
      utterance.current = null;
      changeState("idle");
    };
    window.addEventListener(STOP_EVENT, stop);
    return () => {
      const wasActive = active.current;
      stop();
      if (wasActive) window.speechSynthesis?.cancel();
      window.removeEventListener(STOP_EVENT, stop);
    };
  }, [text, src, changeState]);
  useImperativeHandle(controlRef, () => ({ repeat: () => { void speak(true); } }));

  async function speak(restart = false) {
    if (playing && !restart) {
      stopStudyAudio();
      return;
    }
    stopStudyAudio();
    const currentRequest = ++request.current;
    setError("");
    active.current = true;
    changeState("loading");
    const speech = () => {
      if (!active.current || request.current !== currentRequest) return;
      if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        active.current = false;
        changeState("error");
        setError("Speech is unavailable in this browser. Try Chrome, Edge, or Safari.");
        return;
      }
      const item = new SpeechSynthesisUtterance(text);
      item.lang = "de-DE";
      item.rate = rate;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("de"));
      if (voice) item.voice = voice;
      utterance.current = item;
      item.onend = () => {
        if (utterance.current === item) { active.current = false; changeState("idle"); }
      };
      item.onerror = (event) => {
        if (utterance.current === item && event.error !== "canceled" && event.error !== "interrupted") {
          setError("German speech could not play. Install a German voice in your device settings, then retry.");
          active.current = false;
          changeState("error");
        }
      };
      changeState("playing");
      window.speechSynthesis.speak(item);
    };
    if (!src) {
      if (fallbackToSpeech) speech();
      else { active.current = false; changeState("error"); setError(fileErrorMessage); }
      return;
    }
    const audio = audioRef?.current ?? new Audio(withPagesBaseAssetPath(src));
    clip.current = audio;
    if (error && audioRef?.current) audio.load();
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    if (restart || audio.ended) audio.currentTime = 0;
    const isCurrent = () => clip.current === audio && request.current === currentRequest;
    audio.onended = () => {
      if (isCurrent()) { active.current = false; changeState("idle"); }
    };
    audio.onpause = () => {
      // A queued pause from stopping an earlier play must not stop a restart.
      if (isCurrent() && audio.paused) { active.current = false; changeState("paused"); }
    };
    const fallback = () => {
      if (!isCurrent()) return;
      clip.current = null;
      setError(fileErrorMessage);
      if (fallbackToSpeech) { active.current = true; speech(); }
      else { active.current = false; changeState("error"); }
    };
    audio.onerror = fallback;
    try {
      await audio.play();
      if (isCurrent()) changeState("playing");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError" && !fallbackToSpeech) {
        if (isCurrent()) { active.current = false; changeState("idle"); }
      } else fallback();
    }
  }
  return (
    <span className="study-audio">
      <button
        type="button"
        className={`study-audio-button${buttonClassName ? ` ${buttonClassName}` : ""}`}
        data-audio-state={state}
        aria-label={`${playing ? "Stop" : "Listen"}: ${label ?? text}`}
        aria-pressed={playing}
        title={src ? "Generated German pronunciation" : "Device-generated German speech"}
        onClick={() => void speak()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <path
            d={playing ? "M8 5v14M16 5v14" : "M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"}
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          />
        </svg>
        {!compact && <span className="study-audio-text">{playing ? "Stop" : "Listen"}</span>}
      </button>
      {error && <span className="study-audio-error" role={errorRole}>{error}</span>}
    </span>
  );
}
