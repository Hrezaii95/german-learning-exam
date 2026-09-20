"use client";

import { useEffect, useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import { BackupPanel } from "./BackupPanel";
import { useLearnerState } from "./LearnerStateProvider";

export function SettingsView() {
  const { snapshot, controller } = useLearnerState();
  const state = snapshot.hydration?.state;
  const [timezone, setTimezone] = useState(state?.settings.timezone ?? "UTC");
  const [speed, setSpeed] = useState(state?.settings.preferredAudioSpeed ?? 1);
  const [message, setMessage] = useAnnouncement();

  useEffect(() => {
    if (!state) return;
    setTimezone(state.settings.timezone);
    setSpeed(state.settings.preferredAudioSpeed);
  }, [state?.settings.preferredAudioSpeed, state?.settings.timezone]);

  if (snapshot.status === "loading") return <p role="status">Loading local settings…</p>;
  if (!state || !controller) return <p className="placeholder-banner" role="alert">{snapshot.statusMessage}</p>;

  return (
    <div className="stack">
      <header className="page-header"><p className="dense">Local-first</p><h1>Settings &amp; data</h1><p className="lede">Your learning data stays in this browser unless you export it.</p></header>
      <section className="panel" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">Preferences</h2>
        <div className="hub-filter-grid">
          <label className="hub-field">IANA timezone<input className="hub-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} /></label>
          <label className="hub-field">Audio speed<select className="hub-input" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => void controller.updateSettings({ timezone, preferredAudioSpeed: speed }).then(() => setMessage("Settings saved."), () => setMessage("Settings were rejected; check the timezone."))}>Save preferences</button>
      </section>
      <BackupPanel/>
      <StatusMessage announcement={message} className="detail-feedback" />
    </div>
  );
}
