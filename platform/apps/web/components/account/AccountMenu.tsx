"use client";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "../../lib/account/session";
import { withPagesBasePath } from "../../lib/content/pages-base-path";
import { messageFor } from "../../lib/api-client/client";
import styles from "./Platform.module.css";

/** Lane 1 can render this component through its AccountSlot once integrated. */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (session.status === "loading") return <span role="status">Checking account…</span>;
  if (session.status !== "signed-in" || !session.user) return <nav aria-label="Account" className={styles.nav}><Link href="/login/">Sign in</Link>{!compact && <Link href="/account/import/">Import progress</Link>}{session.status === "unavailable" && <span className={styles.muted}>Learning on this device</span>}</nav>;
  if (compact) return <nav aria-label="Account" className={styles.nav}><Link href="/account/">{session.user.displayName} · Account</Link></nav>;
  return <div><nav aria-label="Account" className={styles.nav}><Link href="/dashboard/">Dashboard</Link>{session.user.role === "teacher" && <Link href="/teacher/">Teaching</Link>}{session.user.role === "admin" && <Link href="/admin/">Admin</Link>}<Link href="/account/">{session.user.displayName} · Account</Link><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => { setBusy(true); setError(""); void signOut().then(() => window.location.assign(withPagesBasePath("/"))).catch(e => setError(messageFor(e))).finally(() => setBusy(false)); }}>Sign out</button></nav>{error && <p role="alert">{error}</p>}</div>;
}
