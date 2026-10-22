"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { withPagesBasePath } from "../../lib/content/pages-base-path";
import { signIn, useSession } from "../../lib/account/session";
import { messageFor } from "../../lib/api-client/client";
import styles from "./Platform.module.css";
export function LoginView() {
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { const user = await signIn(username, password); window.location.assign(withPagesBasePath(user.mustChangePassword ? "/account/" : "/dashboard/")); }
    catch (e) { setError(messageFor(e)); }
    finally { setPassword(""); setBusy(false); }
  }
  return <section className={styles.page}><h1>Pick up where you left off</h1><p>Sign in to keep your learning progress across devices. Learning without an account still works.</p><div className={styles.card}>{session.status === "signed-in" ? <p>You are signed in. <Link href="/dashboard/">Open your dashboard</Link>.</p> : <form className={styles.form} onSubmit={submit}><label className={styles.field}>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required maxLength={64} autoCapitalize="none" spellCheck={false} /></label><label className={styles.field}>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={1024} /></label>{error && <p role="alert" className={`${styles.notice} ${styles.error}`}>{error}</p>}<button className={styles.button} type="submit" disabled={busy || session.status === "unavailable"}>{busy ? "Signing in…" : "Sign in"}</button>{session.status === "unavailable" && <p role="status" className={styles.notice}>Accounts are unavailable here or while offline. <a href="https://german.learnilabs.com/login/">Sign in on german.learnilabs.com</a>, or keep learning on this device.</p>}</form>}</div><p><Link href="/">Continue learning on this device</Link> · <Link href="/account/import/">Bring a progress backup</Link></p></section>;
}
