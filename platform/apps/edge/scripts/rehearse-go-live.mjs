/** Rehearse release control flow. --local uses real isolated D1/workerd, never Cloudflare. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { release } from './go-live.mjs';
import { SOURCE_CONFIG } from './release-config.mjs';
import { smokeAccounts } from './smoke-accounts.mjs';

const database = { name: 'german-db', uuid: '10000000-0000-4000-8000-000000000001', jurisdiction: 'eu' };

async function simulatedRehearsal() {
const folder = mkdtempSync(join(tmpdir(), 'german-go-live-rehearsal-'));
const sourcePath = join(folder, 'wrangler.jsonc');
writeFileSync(sourcePath, JSON.stringify({ name: 'german-web', main: 'src/index.ts', assets: { directory: '../web/out' } }));
let exists = false;
let creates = 0;
const calls = [];
const run = async (command) => {
  calls.push(command);
  if (command[0] === 'wrangler' && command[1] === 'd1' && command[2] === 'list') return JSON.stringify(exists ? [database] : []);
  if (command[0] === 'wrangler' && command[1] === 'd1' && command[2] === 'create') { exists = true; creates++; }
  return '';
};
try {
  for (let i = 0; i < 2; i++) {
    const result = await release({ run, sourcePath, version: 'a'.repeat(40) });
    assert.equal(result.database, database.uuid);
  }
  assert.equal(creates, 1, 'Repeated go-live must reuse the database');
  assert(calls.some((command) => command.includes('--dry-run')));
  assert(calls.some((command) => command.includes('apps/edge/scripts/seed.ts')));
  assert(calls.some((command) => command.includes('apps/edge/scripts/smoke-accounts.mjs')));
  assert.deepEqual(readdirSync(folder), ['wrangler.jsonc'], 'Temporary configs must be cleaned');
  console.log(JSON.stringify({ rehearsal: 'simulated-command-runner', passed: true, externalCloudflareCalls: 0,
    goLiveRuns: 2, databasesCreatedInFixture: creates, note: 'Local D1, workerd authentication and actual deploy dry-run are separate release checks.' }));
} finally { rmSync(folder, { recursive: true, force: true }); }
}

async function unusedPort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const address = server.address();
  assert(address && typeof address === 'object');
  await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
  return address.port;
}

async function localPages(origin, version) {
  for (const path of ['/', '/lessons/', '/cheat-sheets/plurals/', '/manifest.webmanifest', '/sw.js',
    '/api/health', '/api/auth/me', '/api/no-such-route', '/no-such-alpha-route/']) {
    const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    assert.equal(response.status, path.includes('no-such') ? 404 : path === '/api/auth/me' ? 401 : 200, `${path}: unexpected local status`);
    for (const header of ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy']) {
      assert(response.headers.has(header), `${path}: missing ${header}`);
    }
    const body = await response.text();
    if (path === '/api/health') assert.deepEqual(JSON.parse(body), { ok: true, service: 'german-web', version });
    if (path === '/') {
      const asset = body.match(/(?:src|href)="(\/_next\/static\/[^"<>]+\.(?:js|css))"/);
      assert(asset, 'Local root hydration asset is missing');
      const hydration = await fetch(new URL(asset[1], origin), { signal: AbortSignal.timeout(15_000) });
      await hydration.body?.cancel();
      assert.equal(hydration.status, 200, 'Local hydration asset failed');
    }
  }
}

async function localRehearsal() {
  const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const cli = join(dirname(createRequire(import.meta.url).resolve('wrangler/package.json')), 'bin/wrangler.js');
  const folder = mkdtempSync(join(tmpdir(), 'german-go-live-local-'));
  const state = join(folder, 'state');
  const original = readFileSync(SOURCE_CONFIG);
  // Keep the fixture beside the real config, preserving every relative path.
  // D1 registry discovery is simulated; migrations/data/hash/login are real.
  const sourcePath = join(dirname(SOURCE_CONFIG), `.rehearsal-${randomUUID()}.json`);
  writeFileSync(sourcePath, original, { mode: 0o600, flag: 'wx' });
  const accounts = Object.fromEntries(['admin', 'teacher1', 'student1', 'student2', 'student3']
    .map((name) => [name, randomBytes(24).toString('base64url')]));
  const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: join(folder, 'wrangler.log'),
    XDG_CONFIG_HOME: join(folder, 'config'), XDG_CACHE_HOME: join(folder, 'cache'),
    // Fail closed on loopback if a future CLI change attempts an API request.
    CLOUDFLARE_API_BASE_URL: 'http://127.0.0.1:9/client/v4' };
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL',
    'CF_API_TOKEN', 'CF_ACCOUNT_ID', 'CF_API_KEY', 'CF_EMAIL', 'SEED_ACCOUNTS_JSON', 'AUTH_PEPPER']) delete env[key];
  let interrupted = false;
  let activeCommand;
  const closedChildren = new WeakSet();
  async function terminate(child) {
    if (!child?.pid) return;
    const pid = child.pid;
    const kill = (signal) => { try { if (process.platform === 'win32') child.kill(signal); else process.kill(-pid, signal); } catch { /* Already stopped. */ } };
    const alive = () => { if (process.platform === 'win32') return !closedChildren.has(child); try { process.kill(-pid, 0); return true; } catch { return false; } };
    kill('SIGTERM');
    for (let i = 0; i < 30 && alive(); i++) await delay(100);
    if (alive()) { kill('SIGKILL'); for (let i = 0; i < 20 && alive(); i++) await delay(100); }
  }
  async function command(args, label, seed = false) {
    assert(!interrupted, 'Local rehearsal interrupted');
    const task = spawn(process.execPath, args, { cwd: platformRoot,
      env: seed ? { ...env, SEED_ACCOUNTS_JSON: JSON.stringify(accounts) } : env,
      detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    activeCommand = task;
    task.once('close', () => closedChildren.add(task));
    const timer = setTimeout(() => { void terminate(task); }, 180_000);
    try {
      return await new Promise((done, reject) => {
        let output = '';
        task.stdout.on('data', (chunk) => {
          output += chunk.toString();
          if (output.length > 32 * 1024 * 1024) { void terminate(task); reject(new Error('Child output limit')); }
        });
        task.once('error', reject);
        task.once('close', (code) => code === 0 && !interrupted ? done(output) : reject(new Error('Child failed')));
      });
    } catch { throw new Error(`Local rehearsal failed during ${label}; private child output was withheld`); }
    finally { clearTimeout(timer); await terminate(task); if (activeCommand === task) activeCommand = undefined; }
  }
  let child;
  let closed = true;
  let stopPromise;
  async function stop() {
    if (stopPromise) return stopPromise;
    stopPromise = terminate(child);
    return stopPromise;
  }
  const onSignal = () => {
    interrupted = true;
    process.exitCode = 130;
    void terminate(activeCommand);
    void stop();
    // Let the pending operation reject and release() clean its bound config.
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  let exists = false;
  let creates = 0;
  let dryRuns = 0;
  let migrations = 0;
  let seeds = 0;
  let signInChecks = 0;
  const snapshots = [];
  const version = 'a'.repeat(40);
  let config;
  let origin;
  const run = async (args, { label }) => {
    assert(!interrupted, 'Local rehearsal interrupted');
    if (args[0] === 'wrangler' && args[1] === 'd1' && args[2] === 'list') return JSON.stringify(exists ? [database] : []);
    if (args[0] === 'wrangler' && args[1] === 'd1' && args[2] === 'create') { exists = true; creates++; return ''; }
    if (args[0] === 'wrangler' && args[1] === 'd1' && args[2] === 'migrations') {
      assert.equal(args[3], 'apply'); assert(args.includes('--remote'));
      migrations++;
      return command([cli, ...args.slice(1).map((arg) => arg === '--remote' ? '--local' : arg), '--persist-to', state], label);
    }
    if (args[0] === 'wrangler' && args[1] === 'deploy') {
      config = args[args.indexOf('--config') + 1];
      const safe = [...args.slice(1)];
      if (!safe.includes('--dry-run')) safe.push('--dry-run');
      dryRuns++;
      return command([cli, ...safe, '--outdir', join(folder, `bundle-${dryRuns}`)], label);
    }
    if (args[0] === 'node' && args.includes('apps/edge/scripts/seed.ts')) {
      assert(args.includes('--remote')); assert(!args.includes('--reset-passwords'));
      seeds++;
      return command([...args.slice(1).map((arg) => arg === '--remote' ? '--local' : arg), '--persist-to', state], label, true);
    }
    if (args[0] === 'node' && args.includes('apps/edge/scripts/smoke-live.mjs')) {
      assert(config);
      const port = await unusedPort();
      origin = `http://127.0.0.1:${port}`;
      closed = false;
      stopPromise = undefined;
      child = spawn(process.execPath, [cli, 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0',
        '--persist-to', state, '--config', config], { cwd: platformRoot, env,
        detached: process.platform !== 'win32', stdio: ['ignore', 'ignore', 'ignore'] });
      const started = child;
      started.once('close', () => { closedChildren.add(started); if (child === started) closed = true; });
      started.once('error', () => { if (child === started) closed = true; });
      let ready = false;
      for (let attempt = 0; attempt < 120 && !closed; attempt++) {
        try { const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) }); ready = response.status === 200; await response.body?.cancel(); } catch { /* Starting. */ }
        if (ready) break;
        await delay(250);
      }
      assert(ready, 'Local workerd did not start; no remote fallback was attempted');
      await localPages(origin, version);
      return '';
    }
    if (args[0] === 'node' && args.includes('apps/edge/scripts/smoke-accounts.mjs')) {
      assert(origin && config);
      await smokeAccounts({ origin, accounts, allowLocal: true });
      signInChecks += 2;
      await stop();
      const query = 'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM identities) AS identities, '
        + '(SELECT COUNT(*) FROM classes) AS classes, (SELECT COUNT(*) FROM class_members) AS members, '
        + '(SELECT COUNT(*) FROM sessions) AS sessions, (SELECT COUNT(*) FROM audit_log WHERE action=\'seed.accounts\') AS seeds';
      const result = JSON.parse(await command([cli, 'd1', 'execute', 'DB', '--local', '--persist-to', state, '--config', config,
        '--command', query, '--json'], 'Verify isolated D1 counts'));
      snapshots.push(result[0].results[0]);
      return '';
    }
    throw new Error('Unsupported local rehearsal command; no command was executed');
  };
  try {
    for (let i = 0; i < 2; i++) {
      console.log(`[rehearse:local] Release ${i + 1}/2: real migrations, dry-run, seed, local pages and sign-in`);
      try { await release({ run, sourcePath, version }); } finally { await stop(); }
      assert.deepEqual(snapshots[i], { users: 5, identities: 5, classes: 1, members: 3, sessions: 0, seeds: i + 1 });
    }
    assert.equal(creates, 1);
    assert.equal(dryRuns, 4);
    assert.equal(migrations, 2);
    assert.equal(seeds, 2);
    assert.deepEqual(readFileSync(SOURCE_CONFIG), original, 'Source configuration changed');
    console.log(JSON.stringify({ rehearsal: 'real-local-d1-and-workerd', passed: true, externalCloudflareCalls: 0,
      goLiveRuns: 2, registryCreatesInFixture: creates, realMigrationRuns: migrations, realDeployDryRuns: dryRuns,
      realLocalSeedRuns: seeds, studentTeacherSignInsAndRevocations: signInChecks, databaseSnapshots: snapshots,
      note: 'D1 registry/EU metadata are simulated. D1 migrations/data, Argon2id, workerd HTTP and deploy dry-runs are real. Cloud EU placement, HTTPS, DNS and actual deployment require the owner workflow.' }));
  } finally {
    await stop();
    process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
    rmSync(sourcePath, { force: true });
    rmSync(folder, { recursive: true, force: true });
  }
}

try {
  assert(process.argv.slice(2).every((arg) => arg === '--local') && process.argv.length <= 3, 'Only --local is supported');
  if (process.argv.includes('--local')) await localRehearsal();
  else await simulatedRehearsal();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Go-live rehearsal failed');
  process.exitCode ||= 1;
}
