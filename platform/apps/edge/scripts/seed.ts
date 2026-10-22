/** L3-3. Passwords enter through the environment only; all child output is private. */
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export const SEED_USERS = [
  { id: "3eb08751-34c6-4f81-9f50-bc9d7b904001", username: "admin", role: "admin", displayName: "Admin" },
  { id: "3eb08751-34c6-4f81-9f50-bc9d7b904002", username: "teacher1", role: "teacher", displayName: "Frau Weber (Demo)" },
  { id: "3eb08751-34c6-4f81-9f50-bc9d7b904003", username: "student1", role: "student", displayName: "Anna (Demo)" },
  { id: "3eb08751-34c6-4f81-9f50-bc9d7b904004", username: "student2", role: "student", displayName: "Ben (Demo)" },
  { id: "3eb08751-34c6-4f81-9f50-bc9d7b904005", username: "student3", role: "student", displayName: "Cem (Demo)" },
] as const;
export const DEMO_CLASS_ID = "3eb08751-34c6-4f81-9f50-bc9d7b905001";
export type SeedUsername = (typeof SEED_USERS)[number]["username"];
export type SeedPasswords = Record<SeedUsername, string>;

type PasswordHash = (password: string) => Promise<string>;
export class SeedError extends Error {
  constructor(message: string) { super(message); this.name = "SeedError"; }
}

function validPasswords(value: unknown): value is SeedPasswords {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return Object.keys(input).length === SEED_USERS.length && SEED_USERS.every(({ username }) => {
    const password = input[username];
    return typeof password === "string" && password.length >= 12 && password.length <= 128 && password.trim().length > 0;
  });
}

export function parseSeedPasswords(input: string | undefined): SeedPasswords {
  let value: unknown;
  try { value = JSON.parse(input ?? ""); } catch { throw new SeedError("SEED_ACCOUNTS_JSON must contain the five required account passwords."); }
  if (!validPasswords(value)) throw new SeedError("SEED_ACCOUNTS_JSON requires exactly five account keys and passwords of 12–128 characters.");
  return value;
}

export interface SeedOptions {
  config: string;
  database: string;
  remote: boolean;
  resetPasswords: boolean;
  persistTo?: string;
  /** Test/rehearsal parent directory; never a repository SQL path. */
  temporaryDirectory?: string;
}

export function parseSeedOptions(args: readonly string[]): SeedOptions {
  const options: SeedOptions = {
    config: resolve(fileURLToPath(new URL("../wrangler.jsonc", import.meta.url))),
    database: "german-db", remote: false, resetPasswords: false,
  };
  const seen = new Set<string>();
  let target: "local" | "remote" | undefined;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (seen.has(argument)) throw new SeedError("Duplicate seed option.");
    seen.add(argument);
    if (argument === "--local" || argument === "--remote") {
      if (target !== undefined) throw new SeedError("Choose only one seed target.");
      target = argument === "--remote" ? "remote" : "local";
      options.remote = target === "remote";
    } else if (argument === "--reset-passwords") {
      options.resetPasswords = true;
    } else if (argument === "--config" || argument === "--database" || argument === "--persist-to") {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new SeedError("Missing seed option value.");
      if (argument === "--config") options.config = resolve(value);
      if (argument === "--database") options.database = value;
      if (argument === "--persist-to") options.persistTo = resolve(value);
    } else throw new SeedError("Unknown seed option.");
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(options.database)) throw new SeedError("Invalid seed database name.");
  if (options.remote && options.persistTo !== undefined) throw new SeedError("Local persistence cannot be used for a remote seed.");
  return options;
}

const sqlText = (value: string): string => `'${value.replaceAll("'", "''")}'`;
const defaultHash: PasswordHash = async (password) => (await import("../src/auth/password.js")).hashPassword(password);

/**
 * Build a private SQL batch. A normal rerun never resets an owner-edited account,
 * password, class position or voluntary class leave. Resetting requires the named
 * CLI switch and revokes sessions. Fixed-id/name collisions fail closed.
 */
export async function createSeedSql(passwords: SeedPasswords, options: {
  hashPassword?: PasswordHash; now?: string; resetPasswords?: boolean;
} = {}): Promise<string> {
  if (!validPasswords(passwords)) throw new SeedError("Invalid seed account input.");
  const now = options.now ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(now))) throw new SeedError("Invalid seed timestamp.");
  const hashPassword = options.hashPassword ?? defaultHash;
  const statements: string[] = [];
  for (const user of SEED_USERS) {
    const phc = await hashPassword(passwords[user.username]);
    if (!/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/.test(phc)) throw new SeedError("Seed hash does not match the approved password policy.");
    statements.push(`INSERT INTO users(id,username,display_name,role,status,must_change_password,is_demo,created_at)
VALUES (${sqlText(user.id)},${sqlText(user.username)},${sqlText(user.displayName)},${sqlText(user.role)},'active',${user.role === "admin" ? 1 : 0},1,${sqlText(now)})
ON CONFLICT(id) DO UPDATE SET username=CASE WHEN users.is_demo=1 AND users.username=excluded.username THEN users.username ELSE NULL END;`);
    const identityId = user.id.replace("b904", "b914");
    const passwordUpdate = options.resetPasswords ? ",password_hash=excluded.password_hash" : "";
    statements.push(`INSERT INTO identities(id,user_id,provider,provider_subject,password_hash,created_at)
VALUES (${sqlText(identityId)},${sqlText(user.id)},'password',${sqlText(user.username)},${sqlText(phc)},${sqlText(now)})
ON CONFLICT(id) DO UPDATE SET provider_subject=CASE WHEN identities.user_id=excluded.user_id AND identities.provider='password' AND identities.provider_subject=excluded.provider_subject THEN identities.provider_subject ELSE NULL END${passwordUpdate};`);
    if (options.resetPasswords) {
      statements.push(`DELETE FROM sessions WHERE user_id=${sqlText(user.id)};`);
      statements.push(`UPDATE users SET must_change_password=1 WHERE id=${sqlText(user.id)};`);
    }
  }
  const teacher = SEED_USERS.find((user) => user.role === "teacher")!;
  const joinCode = randomBytes(8).toString("hex").toUpperCase();
  statements.push(`INSERT INTO classes(id,name,teacher_id,book_id,position_lesson,position_page,join_code,leaderboard_enabled,created_at)
VALUES (${sqlText(DEMO_CLASS_ID)},'A1 Demo-Klasse',${sqlText(teacher.id)},'momente-a1',5,NULL,${sqlText(joinCode)},0,${sqlText(now)})
ON CONFLICT(id) DO UPDATE SET teacher_id=CASE WHEN classes.teacher_id=excluded.teacher_id THEN classes.teacher_id ELSE NULL END;`);
  for (const user of SEED_USERS.filter((entry) => entry.role === "student")) {
    statements.push(`INSERT INTO class_members(class_id,user_id,member_role,joined_at)
VALUES (${sqlText(DEMO_CLASS_ID)},${sqlText(user.id)},'student',${sqlText(now)}) ON CONFLICT(class_id,user_id) DO NOTHING;`);
  }
  const meta = JSON.stringify({ accounts: SEED_USERS.length, resetPasswords: options.resetPasswords === true, policy: "preserve-existing-unless-explicit-reset" });
  statements.push(`INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at)
VALUES (${sqlText(randomUUID())},${sqlText(SEED_USERS[0].id)},'seed.accounts','system','demo-accounts',${sqlText(meta)},${sqlText(now)});`);
  return `${statements.join("\n")}\n`;
}

const execFileAsync = promisify(execFile);
async function executePrivate(command: string, args: readonly string[]): Promise<void> {
  // Both streams are captured, never inherited: Wrangler can echo failed SQL.
  const childEnvironment = { ...process.env };
  delete childEnvironment.SEED_ACCOUNTS_JSON;
  const sqlFile = args[args.indexOf("--file") + 1];
  if (!sqlFile) throw new SeedError("Missing private seed batch.");
  childEnvironment.WRANGLER_LOG_PATH = join(dirname(sqlFile), "wrangler.log");
  childEnvironment.WRANGLER_SEND_METRICS = "false";
  await execFileAsync(command, [...args], { env: childEnvironment, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
}

export async function runSeed(options: SeedOptions, environmentValue: string | undefined, dependencies: {
  hashPassword?: PasswordHash;
  execute?: (command: string, args: readonly string[]) => Promise<void>;
} = {}): Promise<{ ok: true; accounts: number; target: "local" | "remote"; resetPasswords: boolean }> {
  const passwords = parseSeedPasswords(environmentValue);
  let directory: string | undefined;
  try {
    const sql = await createSeedSql(passwords, { ...(dependencies.hashPassword ? { hashPassword: dependencies.hashPassword } : {}), resetPasswords: options.resetPasswords });
    directory = await mkdtemp(join(options.temporaryDirectory ?? tmpdir(), "german-learning-seed-"));
    const sqlPath = join(directory, "seed.sql");
    await writeFile(sqlPath, sql, { mode: 0o600, flag: "wx" });
    const args = [fileURLToPath(new URL("../../../node_modules/wrangler/bin/wrangler.js", import.meta.url)), "d1", "execute", options.database, "--config", options.config, "--env", "", options.remote ? "--remote" : "--local", "--file", sqlPath];
    if (options.persistTo !== undefined) args.push("--persist-to", options.persistTo);
    await (dependencies.execute ?? executePrivate)(process.execPath, args);
    return { ok: true, accounts: SEED_USERS.length, target: options.remote ? "remote" : "local", resetPasswords: options.resetPasswords };
  } catch {
    // Never attach the child-process error/cause, SQL, hash or environment input.
    throw new SeedError("Seed failed. Verify the database, migrations and account configuration; private child output was suppressed.");
  } finally {
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runSeed(parseSeedOptions(process.argv.slice(2)), process.env.SEED_ACCOUNTS_JSON);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof SeedError ? error.message : "Seed failed.");
    process.exitCode = 1;
  }
}
