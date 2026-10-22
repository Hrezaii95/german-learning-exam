import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  DEMO_CLASS_ID, SEED_USERS, SeedError, createSeedSql, parseSeedOptions,
  parseSeedPasswords, runSeed,
} from "../scripts/seed.js";
import type { SeedPasswords } from "../scripts/seed.js";

const passwordValues = Object.fromEntries(SEED_USERS.map((user, i) => [user.username, `fixture-${i}-${"x".repeat(20)}`])) as SeedPasswords;
const hash = async (_password: string) => `$argon2id$v=19$m=19456,t=2,p=1$${"A".repeat(22)}$${"A".repeat(43)}`;
const now = "2026-10-22T00:00:00.000Z";

async function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const dir = new URL("../migrations/", import.meta.url);
  for (const filename of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(await readFile(new URL(filename, dir), "utf8"));
  }
  return db;
}

test("seed accepts only the exact five environment passwords and fails without revealing input", () => {
  assert.deepEqual(parseSeedPasswords(JSON.stringify(passwordValues)), passwordValues);
  for (const input of [undefined, "broken", "null", "[]", JSON.stringify({ ...passwordValues, other: "secret-value" }), JSON.stringify({ ...passwordValues, admin: "secret" })]) {
    assert.throws(() => parseSeedPasswords(input), (error: unknown) => error instanceof SeedError && !error.message.includes("secret-value"));
  }
});

test("seed options default local, require explicit remote and reject ambiguous/unknown arguments", () => {
  assert.equal(parseSeedOptions([]).remote, false);
  assert.equal(parseSeedOptions(["--remote", "--config", "/tmp/release.json"]).remote, true);
  assert.equal(parseSeedOptions(["--local", "--persist-to", "/tmp/state"]).persistTo, "/tmp/state");
  assert.equal(parseSeedOptions(["--reset-passwords"]).resetPasswords, true);
  for (const args of [["--remote", "--local"], ["--unknown"], ["--config"], ["--remote", "--persist-to", "/tmp/state"]]) assert.throws(() => parseSeedOptions(args), SeedError);
});

test("seed twice preserves credentials, account changes, class position, voluntary leave, and unique memberships", async () => {
  const db = await database();
  try {
    db.exec(await createSeedSql(passwordValues, { hashPassword: hash, now }));
    assert.equal((db.prepare("SELECT COUNT(*) n FROM users").get() as { n: number }).n, 5);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM identities").get() as { n: number }).n, 5);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM class_members").get() as { n: number }).n, 3);
    const classroom = db.prepare("SELECT position_lesson,leaderboard_enabled FROM classes WHERE id=?").get(DEMO_CLASS_ID) as {position_lesson:number;leaderboard_enabled:number};
    assert.equal(classroom.position_lesson, 5); assert.equal(classroom.leaderboard_enabled, 0);
    db.prepare("UPDATE identities SET password_hash=? WHERE provider_subject='student1'").run("owner-updated-hash");
    db.exec("UPDATE users SET status='disabled',display_name='Owner edited' WHERE username='student1'; UPDATE classes SET position_lesson=8; UPDATE class_members SET left_at='2026-10-23' WHERE user_id=(SELECT id FROM users WHERE username='student2');");
    db.exec(await createSeedSql(passwordValues, { hashPassword: hash, now }));
    assert.equal((db.prepare("SELECT password_hash h FROM identities WHERE provider_subject='student1'").get() as { h: string }).h, "owner-updated-hash");
    assert.equal((db.prepare("SELECT status FROM users WHERE username='student1'").get() as { status: string }).status, "disabled");
    assert.equal((db.prepare("SELECT position_lesson n FROM classes").get() as { n: number }).n, 8);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM class_members").get() as { n: number }).n, 3);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM class_members WHERE left_at IS NOT NULL").get() as { n: number }).n, 1);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='seed.accounts'").get() as { n: number }).n, 2);
  } finally { db.close(); }
});

test("explicit password reset revokes sessions and requires every seeded user to change password", async () => {
  const db = await database();
  try {
    db.exec(await createSeedSql(passwordValues, { hashPassword: hash, now }));
    db.prepare("INSERT INTO sessions(id_hash,user_id,created_at,expires_at,last_seen_at) VALUES (?,?,?,?,?)").run("a".repeat(64), SEED_USERS[0]!.id, now, "2027-01-01", now);
    db.exec(await createSeedSql(passwordValues, { hashPassword: hash, now, resetPasswords: true }));
    assert.equal((db.prepare("SELECT COUNT(*) n FROM sessions").get() as { n: number }).n, 0);
    assert.equal((db.prepare("SELECT COUNT(*) n FROM users WHERE must_change_password=1").get() as { n: number }).n, 5);
  } finally { db.close(); }
});

test("seed fails closed if a username belongs to a different existing account", async () => {
  const db = await database();
  try {
    db.prepare("INSERT INTO users(id,username,display_name,role,created_at) VALUES (?,?,?,?,?)").run("existing-owner", "admin", "Real owner", "admin", now);
    const sql=await createSeedSql(passwordValues,{hashPassword:hash,now});
    assert.throws(() => db.exec(sql), /UNIQUE/);
  } finally { db.close(); }
});

test("CLI executor receives private temporary SQL, hides child failure output and always removes file", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "gl-seed-test-"));
  let sqlPath = "";
  try {
    await assert.rejects(runSeed({ ...parseSeedOptions(["--config", join(scratch, "wrangler.json")]), temporaryDirectory: scratch }, JSON.stringify(passwordValues), {
      hashPassword: hash,
      execute: async (_command, args) => {
        sqlPath = args[args.indexOf("--file") + 1]!;
        assert.equal((await stat(sqlPath)).mode & 0o777, 0o600);
        assert.match(await readFile(sqlPath, "utf8"), /argon2id/);
        throw new Error("sensitive child output");
      },
    }), (error: unknown) => error instanceof SeedError && !error.message.includes("sensitive"));
    assert.notEqual(sqlPath, "");
    await assert.rejects(stat(sqlPath), { code: "ENOENT" });
  } finally { await rm(scratch, { force: true, recursive: true }); }
});
