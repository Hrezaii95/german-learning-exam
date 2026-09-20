"use client";

import { useRef, useState } from "react";
import { applyBackup, BACKUP_KEYS, createCompleteBackup, emptyCompleteBackup, mergeBackup, parseBackup, type ImportedBackup } from "@/lib/study/backup";

function refreshLearningData() {
  for (const key of BACKUP_KEYS) window.dispatchEvent(new StorageEvent("storage", { key, newValue: localStorage.getItem(key), storageArea: localStorage }));
}

export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<ImportedBackup | null>(null);
  const [mode, setMode] = useState("merge");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function download() {
    try {
      const backup = createCompleteBackup(localStorage);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `german-learning-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Complete backup downloaded. Raw microphone recordings are not included.");
    } catch { setMessage("Backup could not be created. Existing data is unchanged; check browser storage and try again."); }
  }

  async function inspect(file: File | undefined) {
    if (!file) return;
    setIncoming(null); setBusy(true); setMessage("");
    try {
      if (file.size > 20_000_000) throw new Error("This backup exceeds 20 MB.");
      setIncoming(parseBackup(await file.text())); setMode("merge");
    } catch (error) { setMessage(`Import rejected. Existing data is unchanged. ${error instanceof Error ? error.message : "Choose a supported JSON backup."}`); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function restore() {
    if (!incoming) return;
    try {
      applyBackup(localStorage, mode === "merge" ? mergeBackup(createCompleteBackup(localStorage), incoming) : incoming);
      refreshLearningData(); setIncoming(null);
      setMessage(mode === "merge" ? "Backup merged. Current settings and conflicting items were kept." : "Backup restored. Only the sections included in the file were replaced.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed. Keep your backup file and try again."); }
  }

  function reset() {
    if (!window.confirm("Reset saved items, notes, bookmarks, lesson progress, review history and preferences on this device? Download a backup first if you want to keep them. Downloaded media and raw microphone files are not removed.")) return;
    try { applyBackup(localStorage, emptyCompleteBackup()); refreshLearningData(); setIncoming(null); setMessage("Learning progress and preferences reset. Downloaded media was kept."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Reset failed."); }
  }

  return <section className="panel study-backup" aria-label="Backup and restore">
    <h2>Backup &amp; restore</h2>
    <p>One backup includes your saved words, phrases, concepts, book lines, notes, bookmarks, reading progress, lesson and quiz progress, review history, study selection and preferences.</p>
    <p className="muted">Your data stays in this browser. Download a backup to move it to another device. Raw microphone recordings and downloaded course media are not included.</p>
    <div className="detail-actions">
      <button className="study-secondary" type="button" onClick={download} disabled={busy}>Download JSON export</button>
      <button className="study-secondary" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>Import JSON</button>
      <input ref={fileInput} type="file" hidden accept="application/json,.json" aria-label="Choose learning backup" onChange={e => void inspect(e.target.files?.[0])}/>
    </div>
    {busy && <p role="status">Checking backup…</p>}
    {incoming && <div className="study-backup-preview">
      <h3>Ready to import</h3>
      <p>{incoming.study ? `${Object.keys(incoming.study.saved).length} saved items · ${incoming.study.bookmarks.length} bookmarks · ${Object.keys(incoming.study.lessonSessions ?? {}).length} lesson sessions. ` : ""}{incoming.learner ? `${incoming.learner.reviewCards.length} course review cards · ${incoming.learner.events.length} practice events.` : ""}</p>
      <p>{incoming.study && incoming.learner && incoming.scope ? "Complete learning backup." : "Older partial backup. Sections missing from this file will be kept on this device."}</p>
      <label className="study-field">Import method<select value={mode} onChange={e => setMode(e.target.value)}><option value="merge">Merge with this device</option><option value="replace">Replace included data</option></select></label>
      <p>{mode === "merge" ? "Adds missing items. Keeps this device’s settings and current version of conflicting items." : "Replaces only the sections included in this file. Other learning data stays on this device."}</p>
      <div className="detail-actions"><button className="study-primary" type="button" onClick={restore}>{mode === "merge" ? "Merge backup" : "Replace included data"}</button><button className="study-secondary" type="button" onClick={() => setIncoming(null)}>Cancel</button></div>
    </div>}
    {message && <p role="status">{message}</p>}
    <details><summary>Reset learning data</summary><p>This resets learning progress and preferences on this device. Downloaded media and raw microphone files remain.</p><button className="study-secondary" type="button" onClick={reset}>Reset learning progress</button></details>
  </section>;
}
