"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "../../lib/account/session";
import { initializeAccountRuntime } from "../../lib/account/runtime";
import { getSyncSnapshot, getServerSyncSnapshot, subscribeSync, resolveDeviceProgressConsent } from "../../lib/sync/browser";
import { messageFor } from "../../lib/api-client/client";
import styles from "./Platform.module.css";

/** Presentation only: the global client bootstrap owns account/sync lifetime. */
export function AccountSyncPanel({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const snapshot = useSyncExternalStore(subscribeSync, getSyncSnapshot, getServerSyncSnapshot);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { initializeAccountRuntime(); }, []);
  function consent(add: boolean) {
    setBusy(true); setError("");
    void resolveDeviceProgressConsent(add).catch(e => setError(messageFor(e))).finally(() => setBusy(false));
  }
  if (session.status !== "signed-in" || !session.user) return null;
  const labels = { synced: "Synced", syncing: "Syncing", offline: "Offline", error: "Sync needs attention", paused: "Change your password to enable sync.", "signed-out": "Starting sync" };
  if (compact) return <span role="status" className={styles.muted}>{labels[snapshot.status]}{snapshot.needsConsent && !session.user.mustChangePassword && <> · <Link href="/account/">Choose how to add this device’s progress</Link></>}</span>;
  return <section className={styles.card} aria-label="Progress sync"><h2>Your progress, together</h2><p role="status">{labels[snapshot.status]}</p>{snapshot.needsConsent && !session.user.mustChangePassword && <><p>This device has progress from before you signed in. Add it to your account?</p><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={() => consent(true)}>Add it</button><button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => consent(false)}>Keep separate</button></div><p className={styles.muted}>Keeping it separate preserves the unsigned progress for learning without this account.</p></>}{(error || snapshot.error) && <p role="alert">{error || snapshot.error}</p>}</section>;
}
