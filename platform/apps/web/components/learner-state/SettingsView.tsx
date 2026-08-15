"use client";

import { useEffect, useRef, useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import { useLearnerState } from "./LearnerStateProvider";

export function SettingsView() {
  const { snapshot, controller } = useLearnerState();
  const state = snapshot.hydration?.state;
  const [timezone, setTimezone] = useState(state?.settings.timezone ?? "UTC");
  const [speed, setSpeed] = useState(state?.settings.preferredAudioSpeed ?? 1);
  const [message, setMessage] = useAnnouncement();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    setTimezone(state.settings.timezone);
    setSpeed(state.settings.preferredAudioSpeed);
  }, [state?.settings.preferredAudioSpeed, state?.settings.timezone]);

  if (snapshot.status === "loading") return <p role="status">Loading local settings…</p>;
  if (!state || !controller) return <p className="placeholder-banner" role="alert">{snapshot.statusMessage}</p>;

  async function importFile(file: File) {
    if (!window.confirm("Replace everything saved on this device with the contents of this file?")) return;
    try {
      await controller!.importJson(await file.text(), true);
      setMessage("Learner state imported and replayed.");
    } catch {
      setMessage("Import rejected. Existing local state was preserved.");
    }
  }

  function downloadExport() {
    try {
      const blob = new Blob([controller!.exportJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "german-learning-state.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded. Raw recording audio is not included.");
    } catch {
      setMessage("Export could not be created.");
    }
  }

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
      <section className="panel" aria-labelledby="data-heading">
        <h2 id="data-heading">Export, import, reset</h2>
        <p>Exports contain your practice history, cards, tags, notes, settings, resume state, and recording metadata. Raw microphone audio is excluded.</p>
        <div className="detail-actions">
          <button className="btn btn-secondary" type="button" onClick={downloadExport}>Download JSON export</button>
          <button className="btn btn-secondary" type="button" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => { const file=e.target.files?.[0]; if(file) void importFile(file); e.target.value=""; }} />
          <button className="btn btn-secondary" type="button" onClick={() => { if(window.confirm("Reset all local learner state on this device?")) void controller.reset(true).then(() => setMessage("Local learner state reset."), () => setMessage("Reset failed; prior state remains.")); }}>Reset local data</button>
        </div>
      </section>
      <StatusMessage announcement={message} className="detail-feedback" />
    </div>
  );
}
