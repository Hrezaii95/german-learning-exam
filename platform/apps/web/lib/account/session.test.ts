import test from "node:test";
import assert from "node:assert/strict";
import { clearSession, getSessionSnapshot, refreshSession, registerBeforeSignOut, signIn, signOut } from "./session";
function reply(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }
test("an old session check cannot overwrite a later sign-in", async () => {
  clearSession();
  const original = globalThis.fetch;
  let resolveMe!: (response: Response) => void;
  globalThis.fetch = async input => String(input).endsWith("/me") ? new Promise<Response>(resolve => { resolveMe = resolve; }) : reply({ user: { id: "account-b", displayName: "B", role: "student" }, flags: {} });
  try {
    const oldCheck = refreshSession();
    await signIn("student-b", "temporary test value");
    resolveMe(reply({ error: "unauthorized" }, 401));
    await oldCheck;
    assert.equal(getSessionSnapshot().status, "signed-in");
    assert.equal(getSessionSnapshot().user?.id, "account-b");
  } finally { globalThis.fetch = original; clearSession(); }
});
test("logout settles account-local hooks before revoking the cookie", async () => {
  const original = globalThis.fetch; const order: string[] = [];
  const unregister = registerBeforeSignOut(async () => { await Promise.resolve(); order.push("sync-stopped"); });
  globalThis.fetch = async () => { order.push("logout-request"); return reply({ ok: true }); };
  try { await signOut(); assert.deepEqual(order, ["sync-stopped", "logout-request"]); assert.equal(getSessionSnapshot().status, "signed-out"); }
  finally { unregister(); globalThis.fetch = original; clearSession(); }
});
test("a forced refresh after a credential change rejects the old must-change response", async () => {
  clearSession();
  const original = globalThis.fetch;
  let resolveOld!: (response: Response) => void; let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? new Promise<Response>(resolve => { resolveOld = resolve; }) : reply({ user: { id: "account-c", displayName: "C", role: "admin", mustChangePassword: false }, flags: {} });
  try {
    const old = refreshSession();
    await refreshSession(true);
    resolveOld(reply({ user: { id: "account-c", displayName: "C", role: "admin", mustChangePassword: true }, flags: {} }));
    await old;
    assert.equal(getSessionSnapshot().user?.mustChangePassword, false);
    assert.equal(getSessionSnapshot().status, "signed-in");
  } finally { globalThis.fetch = original; clearSession(); }
});
test("a temporary outage preserves the validated account for offline learning", async () => {
  clearSession(); const original = globalThis.fetch;
  globalThis.fetch = async () => reply({ user: { id: "offline-account", displayName: "Offline learner", role: "student" }, flags: {} });
  try {
    await signIn("learner", "temporary test value");
    globalThis.fetch = async () => { throw new TypeError("Offline"); };
    await refreshSession(true);
    assert.equal(getSessionSnapshot().status, "signed-in");
    assert.equal(getSessionSnapshot().user?.id, "offline-account");
    globalThis.fetch = async () => reply({ error: "unauthorized" }, 401);
    await refreshSession(true);
    assert.equal(getSessionSnapshot().status, "signed-out");
  } finally { globalThis.fetch = original; clearSession(); }
});
