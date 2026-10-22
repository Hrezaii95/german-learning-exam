import type { SessionSnapshot } from "./session";

export type AccountRuntimeDependencies = {
  available: () => boolean;
  snapshot: () => SessionSnapshot;
  subscribe: (listener: () => void) => () => void;
  observe: () => () => void;
  beforeSignOut: (hook: () => Promise<void>) => () => void;
  start: (userId: string) => Promise<void>;
  isolate: (userId: string) => Promise<void>;
  stop: (options?: { restoreStaleOwner?: boolean }) => Promise<void>;
  onStorageOwnerChange: (listener: () => void) => () => void;
  reload: () => void;
};
/** The runtime owns sync; visible panels never stop it on route changes. */
export function createAccountRuntime(deps: AccountRuntimeDependencies) {
  let started = false;
  let desired: string | undefined;
  let active: string | undefined;
  let desiredPaused = false;
  let activePaused = false;
  let transition = Promise.resolve();
  let removeSession: (() => void) | undefined;
  let removeObserver: (() => void) | undefined;
  let removeSignOut: (() => void) | undefined;
  let removeStorage: (() => void) | undefined;
  let lastConfirmedSignOut = false;
  let failed = false;
  function changed() {
    const session = deps.snapshot();
    const next = session.status === "signed-in" ? session.user?.id : undefined;
    const paused = session.status === "signed-in" && session.user?.mustChangePassword === true;
    const confirmedSignOut = session.status === "signed-out";
    if (desired === next && desiredPaused === paused && !failed && !(confirmedSignOut && !lastConfirmedSignOut)) return;
    failed = false;
    desired = next;
    desiredPaused = paused;
    lastConfirmedSignOut = confirmedSignOut;
    transition = transition.catch(() => {}).then(async () => {
      if (desired !== next || desiredPaused !== paused) return;
      if (next && paused) {
        // Forced-password users are real identities too. Isolate their local
        // keys immediately, without making any protected sync request.
        if (active !== next || !activePaused) await deps.isolate(next);
        active = next; activePaused = true;
        return;
      }
      if (active !== next || activePaused !== paused || confirmedSignOut) {
        await deps.stop(confirmedSignOut && !next ? { restoreStaleOwner: true } : undefined);
        active = undefined; activePaused = false;
      }
      if (next && desired === next && active !== next) { await deps.start(next); active = next; activePaused = false; }
    });
    // The sync snapshot surfaces storage/network errors; do not leak an unhandled
    // promise. The rejected transition remains available to logout/settled callers.
    void transition.catch(() => { failed = true; });
  }
  return {
    initialize() {
      if (started || !deps.available()) return;
      started = true;
      removeSession = deps.subscribe(changed);
      removeSignOut = deps.beforeSignOut(async () => {
        desired = undefined;
        await transition.catch(() => {});
        await deps.stop({ restoreStaleOwner: true });
        active = undefined;
      });
      removeStorage = deps.onStorageOwnerChange(deps.reload);
      removeObserver = deps.observe();
      changed();
    },
    settled: () => transition,
    /** Test/HMR cleanup only. Route components must never call this. */
    async dispose() {
      removeSession?.(); removeObserver?.(); removeSignOut?.(); removeStorage?.();
      started = false; desired = undefined;
      await transition.catch(() => {}); await deps.stop(); active = undefined;
    },
  };
}

