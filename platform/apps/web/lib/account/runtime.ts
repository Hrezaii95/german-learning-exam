"use client";
import { accountsAvailable } from "../api-client/client";
import { getSessionSnapshot, observeSession, registerBeforeSignOut, subscribeSession } from "./session";
import { startAccountSync, isolateAccountStorage, stopAccountSync } from "../sync/browser";

import { createAccountRuntime } from "./runtime-core";
export { createAccountRuntime } from "./runtime-core";

type Runtime = ReturnType<typeof createAccountRuntime>;
const runtimeKey = Symbol.for("german-learning.account-runtime.v1");
export function initializeAccountRuntime(): void {
  if (typeof window === "undefined" || !accountsAvailable(window.location)) return;
  const host = globalThis as typeof globalThis & { [runtimeKey]?: Runtime };
  if (!host[runtimeKey]) host[runtimeKey] = createAccountRuntime({
    available: () => accountsAvailable(window.location), snapshot: getSessionSnapshot,
    subscribe: subscribeSession, observe: observeSession, beforeSignOut: registerBeforeSignOut,
    start: startAccountSync, isolate: isolateAccountStorage, stop: stopAccountSync,
    onStorageOwnerChange: listener => { window.addEventListener("german-learning:account-storage-changed", listener); return () => window.removeEventListener("german-learning:account-storage-changed", listener); },
    reload: () => window.location.reload(),
  });
  host[runtimeKey].initialize();
}
// Next's owned webpack entry adds this module to every client route. The guard
// makes repeated entry execution and HMR safe without rendering another React root.
initializeAccountRuntime();
