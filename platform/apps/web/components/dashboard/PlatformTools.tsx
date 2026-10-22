"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { serializeCsv } from "../../lib/api-client/csv";
import { api, messageFor, saveBlob } from "../../lib/api-client/client";
import { useSession } from "../../lib/account/session";
import { AccountMenu } from "../account/AccountMenu";
import { AccountSyncPanel } from "../account/AccountSyncPanel";
import styles from "../account/Platform.module.css";
export { styles };
export type Role = "student" | "teacher" | "admin";
export function RolePage({ title, roles, children }: { title: string; roles?: readonly Role[]; children: ReactNode }) {
  const session = useSession();
  return <section className={styles.page}><AccountMenu /><h1>{title}</h1>{session.status === "loading" ? <p role="status">Checking your account…</p> : session.status !== "signed-in" || !session.user ? <div className={styles.notice}><p>{session.status === "unavailable" ? "Account pages are unavailable here or while offline. You can keep learning on this device." : "Sign in to continue."}</p><Link href="/login/">Sign in</Link> · <Link href="/">Local learning</Link></div> : session.user.mustChangePassword ? <p role="alert" className={styles.notice}>Please <Link href="/account/">change your temporary password</Link> before continuing.</p> : roles && !roles.includes(session.user.role) ? <p role="alert" className={styles.notice}>Access denied. This page is for {roles.join(" or ")} accounts.</p> : <><AccountSyncPanel />{children}</>}</section>;
}
export function useApiData<T>(path: string | null) {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ path: string | null; userId?: string; data?: T; error?: string; loading: boolean }>({ path: null, loading: true });
  useEffect(() => {
    if (!path || session.status !== "signed-in" || session.user?.mustChangePassword) return;
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ path, userId: session.user!.id, data, loading: false }); }).catch(e => { if (!controller.signal.aborted) setState({ path, userId: session.user!.id, error: messageFor(e), loading: false }); });
    return () => controller.abort();
  }, [path, version, session.status, session.user?.id, session.user?.mustChangePassword]);
  return { data: state.path === path && state.userId === session.user?.id ? state.data : undefined, error: state.path === path && state.userId === session.user?.id ? state.error : undefined, loading: state.path !== path || state.userId !== session.user?.id || state.loading, reload: () => setVersion(v => v + 1) };
}
export function DataState({ loading, error }: { loading: boolean; error?: string | undefined }) {
  return error ? <p role="alert" className={`${styles.notice} ${styles.error}`}>{error}</p> : loading ? <p role="status">Loading…</p> : null;
}
export function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className={styles.card}><h2>{title}</h2>{children}</section>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className={styles.field}>{label}{children}</label>; }
export function MutationForm({ children, onSubmit, submitLabel = "Save", onSaved }: { children: ReactNode; onSubmit: (data: FormData) => Promise<unknown>; submitLabel?: string; onSaved?: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError(""); setNotice(""); try { await onSubmit(data); setNotice("Saved."); onSaved?.(); } catch (e) { setError(messageFor(e)); } finally { for (const field of form.querySelectorAll<HTMLInputElement>('input[type="password"]')) field.value = ""; setBusy(false); } }
  return <form className={styles.form} onSubmit={submit}>{children}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button className={styles.button} disabled={busy}>{busy ? "Saving…" : submitLabel}</button></form>;
}
export function Action({ children, run, onSaved, confirm }: { children: ReactNode; run: () => Promise<unknown>; onSaved?: () => void; confirm?: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <span><button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => { if (confirm && !window.confirm(confirm)) return; setBusy(true); setError(""); void run().then(() => onSaved?.()).catch(e => setError(messageFor(e))).finally(() => setBusy(false)); }}>{busy ? "Working…" : children}</button>{error && <span role="alert"> {error}</span>}</span>;
}
export function JsonDetails({ value, label = "Details" }: { value: unknown; label?: string }) { return <details><summary>{label}</summary><pre className={styles.pre}>{JSON.stringify(value, null, 2)}</pre></details>; }
export function displayDate(value: string | null | undefined): string { return value ? new Date(value).toLocaleDateString() : "No due date"; }
export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  saveBlob(new Blob([serializeCsv(rows)], { type: "text/csv;charset=utf-8" }), filename);
}

export function Pagination({ offset, count, onChange, limit = 50 }: { offset: number; count: number; onChange: (offset: number) => void; limit?: number }) {
  return <nav className={styles.actions} aria-label="Result pages"><button className={`${styles.button} ${styles.secondary}`} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>Previous</button><span>Page {Math.floor(offset / limit) + 1}</span><button className={`${styles.button} ${styles.secondary}`} disabled={count < limit} onClick={() => onChange(offset + limit)}>Next</button></nav>;
}
