import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { createSeedSql, SEED_USERS } from "../scripts/seed.js";
import type { SeedPasswords } from "../scripts/seed.js";
import { handleAuth } from "../src/routes/auth.js";
import type { D1Database, PlatformEnv } from "../src/types.js";

/** Real D1 binding plus the API's real Argon2 hash module, not a query mock. */
test("local D1 seeds twice and all five accounts sign in using the same API password module", { timeout: 60_000 }, async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({ cf: false, workers: [{ name: "seed-fixture", modules: true, script: "export default { fetch() { return new Response('fixture'); } }", compatibilityDate: "2026-10-22", d1Databases: ["DB"] }] }));
  try {
    const binding = await mf.getD1Database("DB", "seed-fixture");
    const db = binding as unknown as D1Database;
    const env: PlatformEnv = { DB: db, ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
    const migrationDir = new URL("../migrations/", import.meta.url);
    const execute = async (sql: string) => {
      // These controlled fixture migrations/seed statements contain no SQL
      // semicolons inside strings; every statement is executed by real D1.
      const statements = sql.replace(/--[^\n]*/g, "").split(";").map(s => s.trim()).filter(Boolean);
      await binding.batch(statements.map(statement => binding.prepare(statement)));
    };
    await execute(await readFile(new URL("0001_platform.sql", migrationDir), "utf8"));
    const passwords = Object.fromEntries(SEED_USERS.map(user => [user.username, crypto.randomUUID() + crypto.randomUUID()])) as SeedPasswords;
    // Random fixture credentials only live in memory, and assertions never emit them.
    await execute(await createSeedSql(passwords));
    await execute(await createSeedSql(passwords));
    const counts = await binding.prepare("SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM identities) identities, (SELECT COUNT(*) FROM class_members) members, (SELECT COUNT(*) FROM audit_log WHERE action='seed.accounts') runs").first<{users:number;identities:number;members:number;runs:number}>();
    assert.deepEqual(counts, { users: 5, identities: 5, members: 3, runs: 2 });
    for (const user of SEED_USERS) {
      const login = await handleAuth(new Request("https://german.learnilabs.com/api/auth/login", {
        method: "POST", headers: { Origin: "https://german.learnilabs.com", "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
        body: JSON.stringify({ username: user.username, password: passwords[user.username] }),
      }), env);
      assert.equal(login?.status, 200, user.username);
      assert.match(login?.headers.get("Set-Cookie") ?? "", /^__Host-gl_session=/);
      const result = await login!.json() as { user: { role: string; mustChangePassword: boolean } };
      assert.equal(result.user.role, user.role);
      assert.equal(result.user.mustChangePassword, user.username === "admin");
      const me = await handleAuth(new Request("https://german.learnilabs.com/api/auth/me", { headers: { Cookie: login!.headers.get("Set-Cookie")!.split(";")[0]! } }), env);
      assert.equal(me?.status, 200, user.username);
    }
  } finally { await mf.dispose(); }
});
