"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api, messageFor, saveJson } from "../../lib/api-client/client";
import { clearSession, prepareSignOut, refreshSession, useSession } from "../../lib/account/session";
import { withPagesBasePath } from "../../lib/content/pages-base-path";
import { AccountMenu } from "./AccountMenu";
import styles from "./Platform.module.css";
type Device = { id: string; label?: string; last_sync_at?: string; lastSyncAt?: string };
type History = { id?: string; action: string; created_at?: string; createdAt?: string };
export function AccountView() {
  const session = useSession();
  return <AccountContents key={session.user?.id ?? session.status} />;
}
function AccountContents() {
  const session = useSession();
  const [current, setCurrent] = useState(""); const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState(""); const [deletePassword, setDeletePassword] = useState("");
  const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [deviceOffset, setDeviceOffset] = useState(0); const [historyOffset, setHistoryOffset] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]); const [history, setHistory] = useState<History[]>([]);
  useEffect(() => {
    if (session.status !== "signed-in") return;
    const controller = new AbortController();
    void Promise.all([api<{ devices: Device[] }>(`/api/me/devices?limit=25&offset=${deviceOffset}`, { signal: controller.signal }), api<{ history: History[] }>(`/api/me/history?limit=25&offset=${historyOffset}`, { signal: controller.signal })]).then(([d, h]) => { if (!controller.signal.aborted) { setDevices(d.devices); setHistory(h.history); } }).catch(e => { if (!controller.signal.aborted) setError(messageFor(e)); });
    return () => controller.abort();
  }, [session.status, session.user?.id, deviceOffset, historyOffset]);
  async function changePassword(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try { await api("/api/auth/password/change", { method: "POST", body: { currentPassword: current, newPassword: password } }); await refreshSession(true); setNotice("Password changed. Other sessions have been signed out."); }
    catch (e) { setError(messageFor(e)); } finally { setCurrent(""); setPassword(""); setBusy(false); }
  }
  async function exportData() { setBusy(true); setError(""); try { saveJson(await api("/api/me/export"), "german-learning-account.json"); setNotice("Your account export is ready."); } catch (e) { setError(messageFor(e)); } finally { setBusy(false); } }
  async function deleteAccount(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/me/delete", { method: "POST", body: { password: deletePassword, confirm: confirmation } }); await prepareSignOut(); clearSession(); window.location.assign(withPagesBasePath("/")); }
    catch (e) { setError(messageFor(e)); } finally { setDeletePassword(""); setBusy(false); }
  }
  return <section className={styles.page}><AccountMenu /><h1>Your account</h1>{notice && <p role="status" className={styles.notice}>{notice}</p>}{error && <p role="alert" className={`${styles.notice} ${styles.error}`}>{error}</p>}{session.status === "loading" ? <p role="status">Loading your account…</p> : session.status !== "signed-in" || !session.user ? <div className={styles.card}><p>{session.status === "unavailable" ? "Account details are unavailable here or while offline. Your local learning still works." : "Sign in to manage your account."}</p><Link href="/login/">Sign in</Link> · <Link href="/settings/">Local data & backups</Link></div> : <><p>{session.user.displayName} · {session.user.role} · Password sign-in</p>{session.user.mustChangePassword && <p role="alert" className={styles.notice}>Please replace your temporary password before opening your dashboard.</p>}<div className={styles.grid}><section className={styles.card}><h2>Change password</h2><form className={styles.form} onSubmit={changePassword}><label className={styles.field}>Current password<input type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} maxLength={1024} /></label><label className={styles.field}>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={password} onChange={e => setPassword(e.target.value)} /></label><p className={styles.muted}>Use at least 12 characters. Passwords are never saved in this browser.</p><button className={styles.button} disabled={busy}>Change password</button></form></section><section className={styles.card}><h2>Your data</h2><p>Download your account progress, classes and account history. Keep your backup somewhere private.</p><button className={styles.button} disabled={busy} onClick={() => { void exportData(); }}>Export my data</button><p><Link href="/account/import/">Import a progress backup</Link> · <Link href="/settings/">This device’s backup</Link></p></section><section className={styles.card}><h2>Devices</h2>{devices.length ? <ul className={styles.list}>{devices.map(d => <li key={d.id}>{d.label || "Learning device"}<br /><span className={styles.muted}>Last sync: {d.lastSyncAt ?? d.last_sync_at ?? "Not synced yet"}</span></li>)}</ul> : <p>No synced devices on this page.</p>}<AccountPagination offset={deviceOffset} count={devices.length} onChange={setDeviceOffset} /></section><section className={styles.card}><h2>Account history</h2><p className={styles.muted}>Security actions, including administrator actions affecting your account.</p>{history.length ? <ul className={styles.list}>{history.map((h, index) => <li key={h.id ?? `${h.createdAt ?? h.created_at}:${h.action}:${index}`}>{h.action}<br /><time>{h.createdAt ?? h.created_at}</time></li>)}</ul> : <p>No account actions on this page.</p>}<AccountPagination offset={historyOffset} count={history.length} onChange={setHistoryOffset} /></section><section className={styles.card}><h2>Delete account</h2><p>This permanently removes your server account and synced progress. Export your data first. This action cannot be undone.</p><form className={styles.form} onSubmit={deleteAccount}><label className={styles.field}>Confirm your password<input type="password" autoComplete="current-password" required value={deletePassword} onChange={e => setDeletePassword(e.target.value)} /></label><label className={styles.field}>Type DELETE to confirm<input value={confirmation} onChange={e => setConfirmation(e.target.value)} pattern="DELETE" required autoComplete="off" /></label><button className={`${styles.button} ${styles.secondary}`} disabled={busy || confirmation !== "DELETE"}>Delete my account</button></form></section></div></>}</section>;
}

function AccountPagination({ offset, count, onChange }: { offset: number; count: number; onChange: (offset: number) => void }) {
  return <nav className={styles.actions} aria-label="Account result pages"><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - 25))}>Previous</button><span>Page {offset / 25 + 1}</span><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={count < 25} onClick={() => onChange(offset + 25)}>Next</button></nav>;
}
