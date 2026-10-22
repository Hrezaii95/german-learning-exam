"use client";
import Link from "next/link";
import { useState } from "react";
import { applyBackup, BACKUP_KEYS, createCompleteBackup, mergeBackup, parseBackup, type ImportedBackup } from "../../lib/study/backup";
import { notifyImportedBackup, startAccountSync } from "../../lib/sync/browser";
import { useSession } from "../../lib/account/session";
import { messageFor } from "../../lib/api-client/client";
import { AccountMenu } from "./AccountMenu";
import { AccountSyncPanel } from "./AccountSyncPanel";
import styles from "./Platform.module.css";
function ImportProgressViewContents() {
  const session = useSession();
  const [incoming, setIncoming] = useState<ImportedBackup | null>(null);
  const [consent, setConsent] = useState(false); const [sync, setSync] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  async function load(file: File | undefined) {
    setIncoming(null); setConsent(false); setNotice(""); setError("");
    if (!file) return;
    try { if (file.size > 20_000_000) throw new Error("This backup exceeds 20 MB."); setIncoming(parseBackup(await file.text())); }
    catch (e) { setError(messageFor(e)); }
  }
  async function restore() {
    if (!incoming || !consent) return;
    setBusy(true); setError("");
    try {
      if (session.status === "signed-in") {
        if (!sync || !session.user || session.user.mustChangePassword) throw new Error("Confirm account import after changing any temporary password, or sign out to import only on this device.");
        await startAccountSync(session.user.id);
      }
      const merged = mergeBackup(createCompleteBackup(localStorage), incoming);
      applyBackup(localStorage, merged);
      for (const key of BACKUP_KEYS) window.dispatchEvent(new StorageEvent("storage", { key, newValue: localStorage.getItem(key), storageArea: localStorage }));
      window.dispatchEvent(new CustomEvent("gl-progress-imported"));
      if (sync && session.status === "signed-in") await notifyImportedBackup();
      setNotice(sync ? "Progress imported and offered to your account sync. Keep this file until sync shows Synced." : "Progress imported on this device. Keep the backup until you have checked your learning.");
      setIncoming(null); setConsent(false);
    } catch (e) { setError(messageFor(e)); } finally { setBusy(false); }
  }
  return <section className={styles.page}><AccountMenu /><h1>Bring your progress with you</h1><p>On the old site, open Settings & data and export a complete backup. Select that file here. Existing events and saved items are preserved when the backup is merged.</p><AccountSyncPanel /><div className={styles.card}><label className={styles.field}>Progress backup<input type="file" accept="application/json,.json" onChange={e => { void load(e.target.files?.[0]); }} /></label>{incoming && <><p>Ready to import {incoming.learner?.events.length ?? 0} learning events{incoming.study ? " and saved study items" : ""}.</p><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Merge this backup with learning data on this device.</label>{session.status === "signed-in" && <p><label><input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} /> Add this imported progress to my signed-in account. Sign out first to import only on this device.</label></p>}<p><button className={styles.button} disabled={!consent || busy || session.status === "loading" || (session.status === "signed-in" && (!sync || session.user?.mustChangePassword === true))} onClick={() => { void restore(); }}>{busy ? "Importing…" : "Import progress"}</button></p></>}{error && <p role="alert" className={`${styles.notice} ${styles.error}`}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}</div><p><Link href="/settings/">Open local data & backups</Link> · <Link href="/dashboard/">Open dashboard</Link></p></section>;
}

export function ImportProgressView() { const session = useSession(); return <ImportProgressViewContents key={session.user?.id ?? session.status} />; }
