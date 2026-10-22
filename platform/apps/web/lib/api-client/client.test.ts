import test from "node:test";
import assert from "node:assert/strict";
import { api, ApiError, accountsAvailable } from "./client";
test("GitHub Pages accounts stay unavailable instead of forwarding credentials", () => {
  assert.equal(accountsAvailable({ hostname: "hrezaii95.github.io" }), false);
});
test("API transport refuses external URLs before fetch", async () => {
  await assert.rejects(api("https://example.invalid/api/auth/me"), /Invalid API path/);
  await assert.rejects(api("//example.invalid/api/auth/me"), /Invalid API path/);
});
test("HTML fallback is unavailable, never treated as a signed-in response", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html>Static page</html>", { headers: { "Content-Type": "text/html" } });
  try { await assert.rejects(api("/api/auth/me"), e => e instanceof ApiError && e.code === "unavailable"); }
  finally { globalThis.fetch = original; }
});
test("JSON errors preserve server status without exposing raw response details", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "password_change_required" }), { status: 403, headers: { "Content-Type": "application/json" } });
  try { await assert.rejects(api("/api/me/dashboard"), e => e instanceof ApiError && e.status === 403 && /temporary password/.test(e.message)); }
  finally { globalThis.fetch = original; }
});
