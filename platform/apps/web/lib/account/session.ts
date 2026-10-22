"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api, ApiError } from "../api-client/client";

export type SessionUser = { id: string; displayName: string; role: "student" | "teacher" | "admin"; username?: string; mustChangePassword?: boolean; isDemo?: boolean };
export type SessionSnapshot = { status: "loading" | "signed-out" | "signed-in" | "unavailable"; user?: SessionUser; flags: Record<string, boolean> };
const initial: SessionSnapshot = { status: "loading", flags: {} };
let snapshot = initial;
let request: Promise<void> | null = null;
let generation = 0;
const listeners = new Set<() => void>();
const beforeSignOut = new Set<() => Promise<void>>();
let observers = 0;
let stopObserving: (() => void) | null = null;
export function registerBeforeSignOut(hook: () => Promise<void>): () => void { beforeSignOut.add(hook); return () => beforeSignOut.delete(hook); }
function publish(next: SessionSnapshot) {
  snapshot = next;
  listeners.forEach(listener => listener());
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("gl-session-change", { detail: next }));
}
export function getSessionSnapshot(): SessionSnapshot { return snapshot; }
export function subscribeSession(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function refreshSession(force = false): Promise<void> {
  if (request && !force) return request;
  const started = force ? ++generation : generation;
  const pending = (async () => {
    try {
      const result = await api<{ user: SessionUser; flags: Record<string, boolean> }>("/api/auth/me");
      if (started === generation) publish({ status: "signed-in", user: result.user, flags: result.flags ?? {} });
    } catch (error) {
      if (started === generation) {
        // Keep the validated account's local store active during an outage so
        // offline learning queues for that account. A real 401 always signs out.
        if (snapshot.status === "signed-in" && error instanceof ApiError && (error.status === 0 || error.status >= 500)) return;
        publish({ status: error instanceof ApiError && error.status === 401 ? "signed-out" : "unavailable", flags: {} });
      }
    }
  })().finally(() => { if (request === pending) request = null; });
  request = pending;
  return pending;
}
export async function signIn(username: string, password: string): Promise<SessionUser> {
  const started = ++generation;
  const result = await api<{ user: SessionUser; flags: Record<string, boolean> }>("/api/auth/login", { method: "POST", body: { username, password } });
  if (started === generation) publish({ status: "signed-in", user: result.user, flags: result.flags ?? {} });
  return result.user;
}
export async function prepareSignOut(): Promise<void> { await Promise.all([...beforeSignOut].map(hook => hook())); }
export async function signOut(): Promise<void> {
  const started = ++generation;
  await prepareSignOut();
  await api("/api/auth/logout", { method: "POST", body: {} });
  if (started === generation) publish({ status: "signed-out", flags: {} });
}
export function clearSession(): void { generation++; publish({ status: "signed-out", flags: {} }); }
export function observeSession(): () => void {
  void refreshSession();
  observers++;
  if (observers === 1) {
    const refresh = () => { void refreshSession(true); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    stopObserving = () => { window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }
  return () => { observers--; if (observers === 0) { stopObserving?.(); stopObserving = null; } };
}
export function useSession(): SessionSnapshot {
  const state = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => initial);
  useEffect(() => observeSession(), []);
  return state;
}
