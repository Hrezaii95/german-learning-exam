import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { createSession } from "../src/auth/session.js";
import type { PlatformEnv } from "../src/types.js";
import { createTestDb } from "./classes-db.js";

const ORIGIN = "https://german.learnilabs.com";
async function fixture() {
  const db = createTestDb();
  const password = crypto.randomUUID() + crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO users(id,username,display_name,role,created_at) VALUES(?,?,?,?,?)").bind("middleware-user", "middleware-user", "Fixture", "student", now).run();
  await db.prepare("INSERT INTO identities(id,user_id,provider,provider_subject,password_hash,created_at) VALUES(?,?,'password',?,?,?)").bind("middleware-identity", "middleware-user", "middleware-user", await hashPassword(password), now).run();
  const env: PlatformEnv = { DB: db, ASSETS: { fetch: async () => new Response("not found", { status: 404 }) } };
  return { db, env, password };
}

test("ordinary authenticated API requests extend both server expiry and the browser cookie", async () => {
  const { db, env } = await fixture();
  try {
    const session = await createSession(db, "middleware-user");
    const oldExpiry = new Date(Date.now() + 3_600_000).toISOString();
    await db.prepare("UPDATE sessions SET expires_at=?,last_seen_at=?").bind(oldExpiry, new Date(Date.now() - 10 * 60_000).toISOString()).run();
    const response = await app.fetch(new Request(`${ORIGIN}/api/me/history`, { headers: { Cookie: session.cookie } }), env);
    assert.equal(response.status, 200);
    const updated = await db.prepare("SELECT expires_at,last_seen_at FROM sessions").first<{ expires_at: string; last_seen_at: string }>();
    assert.ok(updated && updated.expires_at > oldExpiry);
    assert.ok(Date.parse(updated.last_seen_at) > Date.now() - 60_000);
    const cookie = response.headers.get("Set-Cookie") ?? "";
    assert.ok(cookie.startsWith(`__Host-gl_session=${session.token};`));
    assert.match(cookie, /Max-Age=2592000/);
    assert.match(cookie, /; HttpOnly; Secure; SameSite=Lax/);
    assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
  } finally { db.close(); }
});

test("middleware preserves login rotation and logout expiry rather than renewing the supplied cookie", async () => {
  const { db, env, password } = await fixture();
  try {
    const prior = await createSession(db, "middleware-user");
    const login = await app.fetch(new Request(`${ORIGIN}/api/auth/login`, {
      method: "POST", headers: { Cookie: prior.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ username: "middleware-user", password }),
    }), env);
    assert.equal(login.status, 200);
    const replacement = login.headers.get("Set-Cookie") ?? "";
    assert.ok(replacement.startsWith("__Host-gl_session="));
    assert.notEqual(replacement.split(";")[0], prior.cookie.split(";")[0]);
    assert.equal((await app.fetch(new Request(`${ORIGIN}/api/auth/me`, { headers: { Cookie: prior.cookie } }), env)).status, 401);
    const logout = await app.fetch(new Request(`${ORIGIN}/api/auth/logout`, {
      method: "POST", headers: { Cookie: replacement, Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}",
    }), env);
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("Set-Cookie") ?? "", /^__Host-gl_session=;.*Max-Age=0$/);
    assert.equal((await app.fetch(new Request(`${ORIGIN}/api/auth/me`, { headers: { Cookie: replacement } }), env)).status, 401);
  } finally { db.close(); }
});
