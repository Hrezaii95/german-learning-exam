import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
// These release utilities intentionally run in Node, outside the Worker bundle.
// @ts-expect-error Node release scripts are plain ESM without declarations.
import { findOrCreateDatabase, ownerConfiguration, release, rollbackTarget, ROLLBACK_MESSAGE } from '../scripts/go-live.mjs';
// @ts-expect-error Node release scripts are plain ESM without declarations.
import { createReleaseConfig, selectDatabase } from '../scripts/release-config.mjs';
// @ts-expect-error Node release scripts are plain ESM without declarations.
import { parseSeedAccounts, smokeAccounts } from '../scripts/smoke-accounts.mjs';

const database = { name: 'german-db', uuid: '10000000-0000-4000-8000-000000000001', jurisdiction: 'eu' };
const previous = '20000000-0000-4000-8000-000000000002';
const current = '30000000-0000-4000-8000-000000000003';
const sha = 'a'.repeat(40);
type Command = string[];
type Step = { label: string; scope: string };

function fixture(context: { after: (callback: () => void) => void }) {
  const directory = mkdtempSync(join(tmpdir(), 'gl-release-test-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, 'wrangler.jsonc');
  const config = { name: 'german-web', main: 'src/index.ts', assets: { directory: '../web/out' },
    vars: { KEEP: 'kept' }, env: { preview: { name: 'german-web-preview' } } };
  writeFileSync(sourcePath, JSON.stringify(config));
  return { directory, sourcePath, config };
}

test('release config preserves source/relative paths and injects only the EU binding and commit', (context) => {
  const f = fixture(context);
  const before = readFileSync(f.sourcePath, 'utf8');
  const temporary = createReleaseConfig(database, sha, f.sourcePath);
  const config = JSON.parse(readFileSync(temporary.path, 'utf8'));
  assert.equal(config.main, f.config.main);
  assert.deepEqual(config.assets, f.config.assets);
  assert.deepEqual(config.env, f.config.env);
  assert.equal(config.vars.KEEP, 'kept');
  assert.equal(config.vars.BUILD_SHA, sha);
  assert.deepEqual(config.d1_databases, [{ binding: 'DB', database_name: 'german-db', database_id: database.uuid, jurisdiction: 'eu', migrations_dir: 'migrations' }]);
  assert.equal(readFileSync(f.sourcePath, 'utf8'), before);
  temporary.cleanup();
  assert.deepEqual(readdirSync(f.directory), ['wrangler.jsonc']);
});

test('go-live creates once, migrates before deployment, seeds without reset, and verifies both roles', async (context) => {
  const f = fixture(context);
  let exists = false;
  const calls: Array<{ command: Command; options: Step }> = [];
  const run = async (command: Command, options: Step) => {
    calls.push({ command, options });
    if (command[1] === 'd1' && command[2] === 'list') return JSON.stringify(exists ? [database] : []);
    if (command[1] === 'd1' && command[2] === 'create') { exists = true; return 'non-JSON creation text'; }
    if (command[1] === 'deploy') {
      const index = command.indexOf('--config');
      const config = JSON.parse(readFileSync(command[index + 1]!, 'utf8'));
      assert.equal(config.d1_databases[0].database_id, database.uuid);
    }
    return '';
  };
  for (let i = 0; i < 2; i++) assert.equal((await release({ run, version: sha, sourcePath: f.sourcePath })).database, database.uuid);
  assert.equal(calls.filter(({ command }) => command[2] === 'create').length, 1);
  const labels = calls.map(({ options }) => options.label);
  assert(labels.indexOf('Apply database migrations') < labels.indexOf('Deploy Worker and custom domain'));
  assert(labels.indexOf('Deploy Worker and custom domain') < labels.indexOf('Seed five accounts and demo class'));
  assert(labels.includes('Smoke student and teacher sign-in'));
  const seed = calls.find(({ command }) => command.includes('apps/edge/scripts/seed.ts'))!;
  assert.equal(seed.options.scope, 'seed');
  assert(seed.command.includes('--remote') && !seed.command.includes('--reset-passwords'));
  const accounts = calls.find(({ command }) => command.includes('apps/edge/scripts/smoke-accounts.mjs'))!;
  assert.equal(accounts.options.scope, 'accounts');
  assert.deepEqual(readdirSync(f.directory), ['wrangler.jsonc']);
});

test('continuous deployment never creates a missing database or reseeds an existing one', async (context) => {
  const f = fixture(context);
  const missingCalls: Command[] = [];
  const missing = await release({ mode: 'redeploy', version: sha, sourcePath: f.sourcePath,
    run: async (command: Command) => { missingCalls.push(command); return '[]'; } });
  assert.equal(missing.skipped, true);
  assert.equal(missingCalls.length, 1);
  const existingCalls: Command[] = [];
  await release({ mode: 'redeploy', version: sha, sourcePath: f.sourcePath, run: async (command: Command) => {
    existingCalls.push(command);
    return command[2] === 'list' ? JSON.stringify([database]) : '';
  } });
  assert(!existingCalls.some((command) => command.includes('create') || command.includes('apps/edge/scripts/seed.ts') || command.includes('apps/edge/scripts/smoke-accounts.mjs')));
});

test('wrong jurisdiction, invalid IDs and duplicate names fail before migration/deploy', async () => {
  for (const rows of [[{ ...database, jurisdiction: null }], [{ ...database, jurisdiction: 'us' }], [{ ...database, uuid: '$(unsafe)' }], [database, database]]) {
    let calls = 0;
    await assert.rejects(findOrCreateDatabase(async () => { calls++; return JSON.stringify(rows); }, { create: true }));
    assert.equal(calls, 1);
  }
  assert.throws(() => selectDatabase({ result: [database] }));
});

test('a failed deployment cleans the generated config and never seeds', async (context) => {
  const f = fixture(context);
  const calls: Command[] = [];
  await assert.rejects(release({ version: sha, sourcePath: f.sourcePath, run: async (command: Command) => {
    calls.push(command);
    if (command[2] === 'list') return JSON.stringify([database]);
    if (command[1] === 'deploy' && !command.includes('--dry-run')) throw new Error('injected deployment failure');
    return '';
  } }), /injected deployment failure/);
  assert.deepEqual(readdirSync(f.directory), ['wrangler.jsonc']);
  assert(!calls.some((command) => command.includes('apps/edge/scripts/seed.ts')));
});

test('rollback uses deployment timestamps, selects a distinct stable version and is idempotent', async (context) => {
  const f = fixture(context);
  let rolledBack = false;
  const calls: Command[] = [];
  const history = () => [
    { created_on: '2026-10-20T10:00:00Z', versions: [{ version_id: previous, percentage: 100 }] },
    { created_on: '2026-10-21T10:00:00Z', versions: [{ version_id: current, percentage: 100 }] },
    ...(rolledBack ? [{ created_on: '2026-10-22T10:00:00Z', annotations: { 'workers/message': `${ROLLBACK_MESSAGE}${previous}` }, versions: [{ version_id: previous, percentage: 100 }] }] : []),
  ];
  const run = async (command: Command) => {
    calls.push(command);
    if (command[1] === 'deployments') return JSON.stringify(history());
    if (command[1] === 'versions') { assert(command.includes(`${previous}@100`)); rolledBack = true; }
    return '';
  };
  assert.equal((await release({ mode: 'rollback', sourcePath: f.sourcePath, run })).workerVersion, previous);
  assert.equal((await release({ mode: 'rollback', sourcePath: f.sourcePath, run })).alreadyApplied, true);
  assert.equal(calls.filter((command) => command[1] === 'versions').length, 1);
  assert(!calls.some((command) => command.includes('d1') || command.includes('apps/edge/scripts/seed.ts')));
  assert.throws(() => rollbackTarget([history()[0]]), /previous stable/);
  assert.deepEqual(readdirSync(f.directory), ['wrangler.jsonc']);
});

test('owner setup skips missing credentials/ref and seed parsing never echoes malformed password text', () => {
  assert(ownerConfiguration({}, 'go-live'));
  const env = { GITHUB_REF: 'refs/heads/codex/live-alpha', CLOUDFLARE_API_TOKEN: 'example', CLOUDFLARE_ACCOUNT_ID: 'example' };
  assert(ownerConfiguration(env, 'go-live'));
  assert.equal(ownerConfiguration(env, 'redeploy'), null);
  const password = 'secret-value-that-must-not-be-logged';
  try { parseSeedAccounts(`{"student1":"${password}`); assert.fail('Invalid JSON accepted'); }
  catch (error) { assert(!String(error).includes(password)); }
  assert.throws(() => parseSeedAccounts(JSON.stringify({ student1: password })), /five documented/);
});

test('account smoke verifies roles, secure cookie, session owner and revocation without leaking password', async () => {
  const password = 'fixture-password-value';
  let active = false;
  let username = '';
  const calls: string[] = [];
  const fetcher = async (input: URL, options: RequestInit) => {
    const path = input.pathname;
    calls.push(path);
    const headers: Record<string, string> = { 'Cache-Control': 'no-store, private', 'Content-Type': 'application/json' };
    if (path === '/api/auth/login') {
      const body = JSON.parse(String(options.body));
      assert.equal(body.password, password); username = body.username; active = true;
      assert.equal((options.headers as Record<string, string>).Origin, 'https://german.learnilabs.com');
      headers['Set-Cookie'] = '__Host-gl_session=fixture-token; Path=/; HttpOnly; Secure; SameSite=Lax';
    }
    if (path === '/api/auth/logout') active = false;
    return new Response(JSON.stringify({ user: { id: username, role: username === 'teacher1' ? 'teacher' : 'student' } }),
      { status: path === '/api/auth/me' && !active ? 401 : 200, headers });
  };
  const result = await smokeAccounts({ origin: 'https://german.learnilabs.com', accounts: { student1: password, teacher1: password }, fetcher });
  assert.equal(result.signedInAndOut, true);
  assert.equal(calls.filter((path) => path === '/api/auth/logout').length, 2);
});

test('a rejected sign-in response policy still revokes the session it minted', async () => {
  let loggedOut = false;
  const fetcher = async (input: URL, options: RequestInit) => {
    if (input.pathname === '/api/auth/login') return new Response('{}', { headers: {
      'Cache-Control': 'public, max-age=60',
      'Set-Cookie': '__Host-gl_session=must-be-revoked; Path=/; HttpOnly; Secure; SameSite=Lax',
    } });
    assert.equal((options.headers as Record<string, string>).Cookie, '__Host-gl_session=must-be-revoked');
    if (input.pathname === '/api/auth/logout') { loggedOut = true; return new Response('{}'); }
    assert(loggedOut);
    return new Response('{}', { status: 401 });
  };
  await assert.rejects(smokeAccounts({ origin: 'https://german.learnilabs.com', accounts: { student1: 'fixture-password-value' }, fetcher }), /Account smoke failed/);
  assert.equal(loggedOut, true);
});
