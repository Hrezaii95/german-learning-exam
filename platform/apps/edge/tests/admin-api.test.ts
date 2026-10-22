import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDb } from "./classes-db.js";
import { createSession } from "../src/auth/session.js";
import { errorResponse } from "../src/http.js";
import { handleAdmin } from "../src/routes/admin.js";
import { verifyPassword } from "../src/auth/password.js";
import type { PlatformEnv } from "../src/types.js";

async function fixture() {
  const db = createTestDb(), now = new Date().toISOString(), cookies: Record<string, string> = {};
  for (const [id, role] of [["admin", "admin"], ["teacher", "teacher"], ["student", "student"]]) {
    await db.prepare("INSERT INTO users(id,username,display_name,role,status,must_change_password,is_demo,created_at) VALUES(?,?,?,?,'active',0,0,?)").bind(id, id, id, role, now).run();
    cookies[id!] = (await createSession(db, id!)).cookie.split(";")[0]!;
  }
  const env: PlatformEnv = { DB: db, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  async function call(user: string | null, path: string, method = "GET", body?: unknown) {
    const request = new Request(`https://german.learnilabs.com${path}`, { method, headers: { ...(user ? { Cookie: cookies[user]! } : {}), ...(body === undefined ? {} : { Origin: "https://german.learnilabs.com", "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    try { return await handleAdmin(request, env) ?? new Response("unknown", { status: 404 }); } catch (error) { return errorResponse(error); }
  }
  return { db, env, cookies, call };
}

test("all admin endpoints reject anonymous, students and teachers", async () => {
  const f = await fixture();
  for (const path of ["users", "classes", "packs", "flags", "audit", "system", "data-requests"]) {
    assert.equal((await f.call(null, `/api/admin/${path}`)).status, 401, path);
    for (const actor of ["teacher", "student"]) assert.equal((await f.call(actor, `/api/admin/${path}`)).status, 403, `${actor}:${path}`);
    assert.equal((await f.call("admin", `/api/admin/${path}`)).status, 200, path);
  }
  f.db.close();
});

test("user creation, role/status changes and password reset are audited and revoke sessions", async () => {
  const f = await fixture(), password = crypto.randomUUID() + crypto.randomUUID();
  const created = await f.call("admin", "/api/admin/users", "POST", { username: "new-student", displayName: "New student", role: "student", password });
  assert.equal(created.status, 201);
  const body = await created.json() as { user: { id: string; mustChangePassword: boolean } };
  assert.equal(body.user.mustChangePassword, true);
  assert.ok(!JSON.stringify(body).includes(password));
  const identity = await f.db.prepare("SELECT password_hash FROM identities WHERE user_id=?").bind(body.user.id).first<{ password_hash: string }>();
  assert.ok(await verifyPassword(password, identity!.password_hash));
  const changed = await f.call("admin", "/api/admin/users", "PATCH", { id: "student", role: "teacher" });
  assert.equal(changed.status, 200);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id='student'").first<{ count: number }>())?.count, 0);
  assert.equal((await f.call("student", "/api/admin/users")).status, 401);
  const reset = await f.call("admin", "/api/admin/users", "PATCH", { id: body.user.id, password: crypto.randomUUID() });
  assert.equal(reset.status, 200);
  const entries = await (await f.call("admin", "/api/admin/audit")).text();
  assert.ok(entries.includes("admin.user.create")); assert.ok(entries.includes("admin.user.reset"));
  assert.ok(!entries.includes(password)); assert.ok(!entries.includes("$argon2id$"));
  f.db.close();
});

test("last active administrator cannot be deleted, disabled or demoted", async () => {
  const f = await fixture();
  for (const body of [{ id: "admin", role: "student" }, { id: "admin", status: "disabled" }]) assert.equal((await f.call("admin", "/api/admin/users", "PATCH", body)).status, 409);
  assert.equal((await f.call("admin", "/api/admin/users", "DELETE", { id: "admin", confirm: true })).status, 409);
  assert.equal((await f.call("admin", "/api/admin/users", "DELETE", { id: "student", confirm: false })).status, 400);
  f.db.close();
});

test("admin users filters are parameterized, bounded and exclude private notes and hashes", async () => {
  const f = await fixture();
  await f.db.prepare("INSERT INTO sync_docs(user_id,store,doc_key,value_json,updated_at,device_id) VALUES('student','learner.docs','notes',?,?,'d')").bind(JSON.stringify({ note: "private-note-marker" }), new Date().toISOString()).run();
  const query = await (await f.call("admin", "/api/admin/users?query=%27%20OR%201=1%20--")).json() as { users: unknown[] };
  assert.deepEqual(query.users, []);
  const listing = await f.call("admin", "/api/admin/users?role=student&limit=1");
  assert.equal(listing.status, 200);
  const text = await listing.text();
  assert.ok(!text.includes("private-note-marker")); assert.ok(!text.includes("password_hash")); assert.ok(!text.includes("id_hash"));
  assert.equal((await f.call("admin", "/api/admin/users?limit=1000")).status, 400);
  assert.equal((await f.call("admin", "/api/admin/users?query=")).status, 200);
  f.db.close();
});

test("German review needs an owner-configured qualification and enables only reviewed packs", async () => {
  const f = await fixture();
  assert.equal((await f.call("admin", "/api/admin/packs", "PATCH", { packId: "pack-a", reviewStatus: "reviewed", enabled: true })).status, 403);
  assert.equal((await f.call("admin", "/api/admin/packs", "PATCH", { packId: "pack-a", reviewStatus: "pending-german-review", enabled: true })).status, 409);
  f.env.GERMAN_REVIEWER_IDS = "admin";
  assert.equal((await f.call("admin", "/api/admin/packs", "PATCH", { packId: "pack-a", reviewStatus: "reviewed", enabled: true })).status, 200);
  f.env.GERMAN_REVIEWER_IDS = "";
  assert.equal((await f.call("admin", "/api/admin/packs", "PATCH", { packId: "pack-a", reviewStatus: "reviewed", enabled: false })).status, 200);
  assert.equal((await f.call("admin", "/api/admin/flags", "PATCH", { key: "GERMAN_REVIEWER_IDS", value: true })).status, 400);
  f.db.close();
});

test("unimplemented provider/live flags cannot be switched on", async () => {
  const f = await fixture();
  for (const key of ["email_login", "google_login", "live_game"]) assert.equal((await f.call("admin", "/api/admin/flags", "PATCH", { key, value: true })).status, 501);
  assert.equal((await f.call("admin", "/api/admin/flags", "PATCH", { key: "bonus_rounds", value: true })).status, 200);
  const flags = await (await f.call("admin", "/api/admin/flags")).json() as { flags: Record<string, boolean> };
  assert.equal(flags.flags.bonus_rounds, true); assert.equal(flags.flags.google_login, false);
  f.db.close();
});

test("deleting a user cascades personal data and anonymizes security history", async () => {
  const f = await fixture();
  await f.db.prepare("INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) VALUES('event','student','account.export','user','student','{}',?)").bind(new Date().toISOString()).run();
  assert.equal((await f.call("admin", "/api/admin/users", "DELETE", { id: "student", confirm: true })).status, 200);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS count FROM users WHERE id='student'").first<{ count: number }>())?.count, 0);
  const historical = await f.db.prepare("SELECT actor_id,target_id FROM audit_log WHERE id='event'").first<{ actor_id: string | null; target_id: string | null }>();
  assert.equal(historical?.actor_id, null); assert.equal(historical?.target_id, null);
  f.db.close();
});

test("failed session revocation rolls back role promotion, password state and audit", async () => {
  const f = await fixture();
  f.db.sqlite.exec("CREATE TRIGGER inject_revoke_failure BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT,'injected revoke failure'); END");
  const response = await f.call("admin", "/api/admin/users", "PATCH", { id: "student", role: "admin" });
  assert.equal(response.status, 503);
  const target = await f.db.prepare("SELECT role,must_change_password FROM users WHERE id='student'").first<{ role: string; must_change_password: number }>();
  assert.equal(target?.role, "student"); assert.equal(target?.must_change_password, 0);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM audit_log WHERE action='admin.user.update'").first<{ total: number }>())?.total, 0);
  assert.equal((await f.call("student", "/api/admin/users")).status, 403);
  f.db.close();
});

test("identity reset failure rolls back the entire admin reset and preserves the existing session", async () => {
  const f = await fixture();
  await f.db.prepare("INSERT INTO identities(id,user_id,provider,provider_subject,password_hash,created_at) VALUES('identity','student','password','legacy-student','old-hash',?)").bind(new Date().toISOString()).run();
  f.db.sqlite.exec("CREATE TRIGGER inject_reset_failure BEFORE UPDATE OF password_hash ON identities BEGIN SELECT RAISE(ABORT,'injected reset failure'); END");
  const response = await f.call("admin", "/api/admin/users", "PATCH", { id: "student", role: "admin", password: crypto.randomUUID() });
  assert.equal(response.status, 503);
  assert.equal((await f.db.prepare("SELECT role FROM users WHERE id='student'").first<{ role: string }>())?.role, "student");
  assert.equal((await f.db.prepare("SELECT password_hash FROM identities WHERE id='identity'").first<{ password_hash: string }>())?.password_hash, "old-hash");
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM sessions WHERE user_id='student'").first<{ total: number }>())?.total, 1);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM audit_log WHERE action='admin.user.reset'").first<{ total: number }>())?.total, 0);
  f.db.close();
});

test("audit failure prevents all admin state changes", async () => {
  const f = await fixture();
  f.db.sqlite.exec("CREATE TRIGGER inject_audit_failure BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'injected audit failure'); END");
  assert.equal((await f.call("admin", "/api/admin/flags", "PATCH", { key: "bonus_rounds", value: true })).status, 503);
  assert.equal((await f.db.prepare("SELECT value_json FROM feature_flags WHERE key='bonus_rounds'").first<{ value_json: string }>())?.value_json, "false");
  assert.equal((await f.call("admin", "/api/admin/users", "DELETE", { id: "student", confirm: true })).status, 503);
  assert.ok(await f.db.prepare("SELECT id FROM users WHERE id='student'").first());
  f.db.close();
});

test("concurrent CAS mutations commit one role change and keep a valid administrator", async () => {
  const f = await fixture();
  const responses = await Promise.all([
    f.call("admin", "/api/admin/users", "PATCH", { id: "student", role: "teacher" }),
    f.call("admin", "/api/admin/users", "PATCH", { id: "student", role: "admin" }),
  ]);
  assert.deepEqual(responses.map(row => row.status).sort(), [200, 409]);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM audit_log WHERE action='admin.user.update'").first<{ total: number }>())?.total, 1);
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM sessions WHERE user_id='student'").first<{ total: number }>())?.total, 0);
  assert.ok((await f.db.prepare("SELECT COUNT(*) AS total FROM users WHERE role='admin' AND status='active'").first<{ total: number }>())!.total >= 1);
  f.db.close();
});
