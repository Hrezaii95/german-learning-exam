import test from "node:test";
import assert from "node:assert/strict";
import { createAccountRuntime } from "./runtime-core";
import type { SessionSnapshot } from "./session";
function fixture(available = true) {
  let snapshot: SessionSnapshot = { status: "loading", flags: {} };
  const listeners = new Set<() => void>(); const calls: string[] = [];
  let hook: (() => Promise<void>) | undefined; let failStop = false;
  const runtime = createAccountRuntime({ available: () => available, snapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }, observe: () => { calls.push("observe"); return () => calls.push("unobserve"); },
    beforeSignOut: next => { hook = next; return () => { hook = undefined; }; },
    start: async user => { calls.push(`start:${user}`); }, isolate: async user => { calls.push(`isolate:${user}`); }, stop: async options => { calls.push(options?.restoreStaleOwner ? "stop:confirmed" : "stop:normal"); if (failStop) throw new Error("Storage failure"); },
    onStorageOwnerChange: () => () => {}, reload: () => { calls.push("reload"); },
  });
  return { runtime, calls, set(next: SessionSnapshot) { snapshot = next; listeners.forEach(listener => listener()); }, hook: () => hook?.(), failStop(value: boolean) { failStop = value; } };
}
const signedIn = (id: string): SessionSnapshot => ({ status: "signed-in", user: { id, displayName: id, role: "student" }, flags: {} });
test("global runtime is idempotent and learning-route panel unmount does not own its lifetime", async () => {
  const f = fixture(); f.runtime.initialize(); f.set(signedIn("A")); await f.runtime.settled();
  assert.deepEqual(f.calls, ["observe", "stop:normal", "start:A"]);
  // Re-entering another route initializes the same global runtime; no stop/start.
  f.runtime.initialize(); f.set(signedIn("A")); await f.runtime.settled();
  assert.deepEqual(f.calls, ["observe", "stop:normal", "start:A"]);
});
test("loading/unavailable preserve keys; only an API-confirmed signed-out state restores a stale owner", async () => {
  const f = fixture(); f.runtime.initialize(); f.set({ status: "unavailable", flags: {} }); await f.runtime.settled();
  assert.deepEqual(f.calls, ["observe"]);
  f.set({ status: "signed-out", flags: {} }); await f.runtime.settled();
  assert.deepEqual(f.calls, ["observe", "stop:confirmed"]);
});
test("account transition waits for storage isolation; a failed stop never starts the next account", async () => {
  const f = fixture(); f.runtime.initialize(); f.set(signedIn("A")); await f.runtime.settled();
  f.failStop(true); f.set(signedIn("B")); await assert.rejects(f.runtime.settled(), /Storage/);
  assert.ok(!f.calls.includes("start:B"));
  f.failStop(false); f.set(signedIn("B")); await f.runtime.settled(); assert.equal(f.calls.at(-1), "start:B");
});
test("logout waits for runtime storage restoration and Pages never bootstraps accounts", async () => {
  const f = fixture(); f.runtime.initialize(); f.set(signedIn("A")); await f.runtime.settled(); await f.hook();
  assert.equal(f.calls.at(-1), "stop:confirmed");
  const pages = fixture(false); pages.runtime.initialize(); pages.set(signedIn("A")); await pages.runtime.settled(); assert.deepEqual(pages.calls, []);
});

test("cold-start forced-password identity isolates its keys without starting protected sync", async () => {
  const f = fixture(); f.runtime.initialize();
  f.set({ ...signedIn("B"), user: { id: "B", displayName: "B", role: "admin", mustChangePassword: true } });
  await f.runtime.settled();
  assert.deepEqual(f.calls, ["observe", "isolate:B"]);
  f.set(signedIn("B")); await f.runtime.settled();
  assert.deepEqual(f.calls, ["observe", "isolate:B", "stop:normal", "start:B"]);
});
