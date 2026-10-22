"use client";

import { useEffect, useRef, useState } from "react";
import { createWortwerkStore, wortwerkStore, type WortwerkBackup, type WortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";

const MAX_BACKUP_BYTES = 20_000_000;
function memoryStore() {
  const values = new Map<string, string>();
  return createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } });
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
/** Validate in isolation, including future record versions, before offering an import. */
export function parsePracticeBackupText(text: string): WortwerkBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error("This backup exceeds 20 MB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("The file is not valid JSON."); }
  if (!record(value) || value.schemaVersion !== 2 || !Array.isArray(value.events) || !Array.isArray(value.docs)) throw new Error("This is not a supported Wortwerk practice backup. A newer backup needs a newer app.");
  if ([...value.events, ...value.docs].some(entry => record(entry) && typeof entry.schemaVersion === "number" && entry.schemaVersion > 1)) throw new Error("This backup contains newer practice records. Update the app before importing it.");
  const staging = memoryStore();
  staging.restoreBackup(value);
  return staging.exportBackup();
}
/** Check against the latest local log too: conflicting ids never partially apply. */
export function mergePracticeBackup(store: WortwerkStore, incoming: WortwerkBackup): void {
  if (store.getSnapshot().storageStatus === "future-version") throw new Error("Saved practice data needs a newer app. Update before importing a backup.");
  const validated = parsePracticeBackupText(JSON.stringify(incoming));
  const current = store.exportBackup();
  if (current.docs.some(doc => doc.schemaVersion > 1 && validated.docs.some(incomingDoc => incomingDoc.key === doc.key))) throw new Error("A saved practice document needs a newer app. Update before merging a backup for that document.");
  const staging = memoryStore();
  staging.restoreBackup(current);
  staging.restoreBackup(validated);
  store.restoreBackup(staging.exportBackup());
}
function readFile(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The file could not be read as text."));
    reader.onerror = () => reject(new Error("The backup file could not be read."));
    reader.readAsText(file);
  });
}

export function BackupPanel({ store = wortwerkStore }: { store?: WortwerkStore }) {
  const state = useWortwerkState({ store });
  const fileInput = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const [incoming, setIncoming] = useState<WortwerkBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => () => { sequence.current += 1; }, []);

  function download() {
    try {
      const text = JSON.stringify(store.exportBackup(), null, 2);
      const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `wortwerk-practice-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage("Practice backup downloaded, including the current in-memory evidence.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The practice backup could not be created."); }
  }
  async function inspect(file: File | undefined) {
    if (!file) return;
    const current = ++sequence.current;
    setIncoming(null); setBusy(true); setMessage("");
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("This backup exceeds 20 MB.");
      const parsed = parsePracticeBackupText(await readFile(file));
      if (current === sequence.current) setIncoming(parsed);
    } catch (error) {
      if (current === sequence.current) setMessage(`Import rejected. ${error instanceof Error ? error.message : "Choose a supported practice backup."}`);
    } finally {
      if (current === sequence.current) { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
    }
  }
  function restore() {
    if (!incoming) return;
    try {
      mergePracticeBackup(store, incoming);
      setIncoming(null);
      setMessage(store.getSnapshot().storageStatus === "persistent" ? "Practice backup merged. Repeated events were kept only once; newer document values win." : "Practice backup merged in memory. You can export it again from this tab.");
    } catch (error) { setMessage(`Import rejected. ${error instanceof Error ? error.message : "The practice backup could not be merged."}`); }
  }
  return <section className="ww-panel" aria-labelledby="ww-practice-backup-heading"><h2 id="ww-practice-backup-heading">Practice backup</h2><p>Save your Wortwerk answers, sessions, pack choices, study scope, settings, personal deck, notes and examples as JSON.</p><p className="ww-muted">This practice backup is separate from the course-learning backup. Pack files, downloaded media and microphone recordings are not included.</p><p>{state.snapshot.events.length} practice events · {state.snapshot.docs.length} saved documents.</p><div className="ww-actions"><button type="button" className="ww-button" disabled={busy} onClick={download}>Download practice JSON</button><button type="button" className="ww-button" disabled={busy || state.snapshot.storageStatus === "future-version"} onClick={() => fileInput.current?.click()}>Import practice JSON</button><input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Choose practice backup" onChange={event => void inspect(event.target.files?.[0])} /></div>{busy ? <p role="status">Checking practice backup…</p> : null}{incoming ? <div className="ww-preview"><h3>Ready to merge</h3><p>{incoming.events.length} incoming events · {incoming.docs.length} incoming documents.</p><p>Merging adds missing events and uses the newest saved document value. It keeps newer practice on this device.</p><div className="ww-actions"><button type="button" className="ww-button ww-button--primary" onClick={restore}>Merge practice backup</button><button type="button" className="ww-button" onClick={() => setIncoming(null)}>Cancel import</button></div></div> : null}{state.snapshot.storageStatus === "future-version" ? <p>Saved practice data needs a newer app. Export remains available; update before importing.</p> : null}{message ? <p role="status">{message}</p> : null}</section>;
}
