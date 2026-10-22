"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { LearningCapability } from "../../../../packages/learning/src/wortwerk/types.js";
import { deriveWortwerkState, resolveWortwerkTimeZone, wortwerkSettings } from "./learning-state";
import { wortwerkStore, type WortwerkSnapshot, type WortwerkStore } from "./store";

const EMPTY_CAPABILITIES: readonly LearningCapability[] = Object.freeze([]);
const SERVER_SNAPSHOT: WortwerkSnapshot = Object.freeze({
  schemaVersion: 2, deviceId: "server", events: Object.freeze([]), docs: Object.freeze([]), storageStatus: "memory",
});
const getServerSnapshot = () => SERVER_SNAPSHOT;
let clock = 0;
let clockTimer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();
const getClockSnapshot = () => clock;
const getServerClockSnapshot = () => 0;
function tick() {
  clock = Date.now();
  for (const listener of clockListeners) listener();
}
function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) { tick(); clockTimer = setInterval(tick, 60_000); }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size && clockTimer !== undefined) { clearInterval(clockTimer); clockTimer = undefined; }
  };
}

export type UseWortwerkOptions = {
  capabilities?: readonly LearningCapability[]; timeZone?: string; store?: WortwerkStore;
};

/** Server render and hydration share empty evidence and an epoch clock until subscription. */
export function useWortwerkState({ capabilities = EMPTY_CAPABILITIES, timeZone, store = wortwerkStore }: UseWortwerkOptions = {}) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(() => {
    // New answers must be visible immediately, rather than waiting for the next minute tick.
    tick();
    listener();
  }), [store]);
  const snapshot = useSyncExternalStore(subscribe, store.getSnapshot, getServerSnapshot);
  const instant = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
  return useMemo(() => {
    const now = new Date(instant);
    const settings = wortwerkSettings(snapshot);
    const localZone = instant ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    const zone = resolveWortwerkTimeZone(timeZone ?? settings.timeZone ?? settings.timezone, localZone);
    return { ...deriveWortwerkState(snapshot, { capabilities, now, timeZone: zone }), now, timeZone: zone, hydrated: instant > 0 };
  }, [snapshot, instant, timeZone, capabilities]);
}
