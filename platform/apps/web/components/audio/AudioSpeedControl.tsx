"use client";

import { useState } from "react";
import { useOptionalLearnerState } from "@/components/learner-state/LearnerStateProvider";

export function usePreferredAudioSpeed() {
  return useOptionalLearnerState()?.snapshot.hydration?.state.settings.preferredAudioSpeed ?? 1;
}

export function audioSpeedOptions(current: number) {
  return [...new Set([0.75, 0.8, 1, 1.25, 1.5, current])].sort((a, b) => a - b);
}

/** One playback preference for recordings, word cards and generated speech. */
export function useAudioSpeed() {
  const learner = useOptionalLearnerState();
  const settings = learner?.snapshot.hydration?.state.settings;
  const [fallback, setFallback] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const speed = settings?.preferredAudioSpeed ?? fallback;
  async function change(value: number) {
    setError("");
    if (!learner) { setFallback(value); return; }
    if (!settings || !learner.controller) return;
    setSaving(true);
    try { await learner.controller.updateSettings({ ...settings, preferredAudioSpeed: value }); }
    catch { setError("Speed could not be saved. Try again when browser storage is available."); }
    finally { setSaving(false); }
  }
  return { speed, change, error, disabled: saving || (learner !== null && !settings) };
}

export function AudioSpeedControl({ control }: { control: ReturnType<typeof useAudioSpeed> }) {
  const { speed, change, error, disabled } = control;
  const speeds = audioSpeedOptions(speed);
  return <div className="study-audio-speed">
    <label className="study-inline-field">Audio speed<select aria-label="Audio speed" value={speed} disabled={disabled} onChange={event => void change(Number(event.target.value))}>{speeds.map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
    <small>Applies across the app</small>
    {error && <p role="status">{error}</p>}
  </div>;
}
