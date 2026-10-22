/** Owner-invoked release. Importing this module performs no commands or network requests. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createReleaseConfig, DATABASE_NAME, parseJsonOutput, PRODUCTION_ORIGIN, selectDatabase, SOURCE_CONFIG, UUID, WORKER_NAME } from './release-config.mjs';
import { parseSeedAccounts } from './smoke-accounts.mjs';

const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const execute = promisify(execFile);
export const ROLLBACK_MESSAGE = 'Go live rollback to ';
const SECRET_KEYS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'SEED_ACCOUNTS_JSON', 'AUTH_PEPPER'];

export function createReleaseRunner(environment = process.env, log = console.log) {
  return async (command, { label, scope = 'none' } = {}) => {
    assert(command[0] === 'wrangler' || command[0] === 'node', 'Unsupported release command');
    const env = { ...environment, CI: 'true', WRANGLER_SEND_METRICS: 'false' };
    for (const key of SECRET_KEYS) delete env[key];
    if (scope === 'cloudflare' || scope === 'seed') {
      env.CLOUDFLARE_API_TOKEN = environment.CLOUDFLARE_API_TOKEN;
      env.CLOUDFLARE_ACCOUNT_ID = environment.CLOUDFLARE_ACCOUNT_ID;
    }
    if (scope === 'seed' || scope === 'accounts') env.SEED_ACCOUNTS_JSON = environment.SEED_ACCOUNTS_JSON;
    const args = command[0] === 'wrangler'
      ? [join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js'), ...command.slice(1)]
      : command.slice(1);
    log(`[go-live] ${label}`);
    try {
      const result = await execute(process.execPath, args, {
        cwd: platformRoot, env, windowsHide: true, maxBuffer: 32 * 1024 * 1024,
      });
      // Captured output may contain SQL hashes or account data. Print only the
      // fixed step label, never the provider's raw stdout/stderr on failure.
      return result.stdout;
    } catch {
      throw new Error(`Release command failed during ${label}`);
    }
  };
}

export async function findOrCreateDatabase(run, { create = false, sourcePath = SOURCE_CONFIG } = {}) {
  const list = async () => selectDatabase(parseJsonOutput(await run(
    ['wrangler', 'd1', 'list', '--json', '--config', sourcePath],
    { label: 'Find EU database', scope: 'cloudflare' },
  ), 'D1 list'));
  let database = await list();
  if (!database && !create) return null;
  if (!database) {
    let creationFailed = false;
    try {
      // create has no --json in the pinned CLI. Discard its text, explicitly
      // disable config updates, then obtain the UUID from a fresh JSON list.
      await run(['wrangler', 'd1', 'create', DATABASE_NAME, '--jurisdiction', 'eu', '--update-config=false', '--config', sourcePath],
        { label: 'Create EU database', scope: 'cloudflare' });
    } catch { creationFailed = true; }
    database = await list();
    assert(database, creationFailed ? 'Database creation failed; no EU database is available' : 'Created database was not returned by D1');
  }
  return database;
}

function stableVersion(deployment) {
  if (!Array.isArray(deployment?.versions) || deployment.versions.length !== 1) return null;
  const entry = deployment.versions[0];
  return entry.percentage === 100 && UUID.test(entry.version_id) ? entry.version_id : null;
}

export function rollbackTarget(metadata) {
  assert(Array.isArray(metadata) && metadata.length > 0, 'Worker has no deployment history');
  const deployments = [...metadata];
  for (const entry of deployments) assert(Number.isFinite(Date.parse(entry.created_on)), 'Deployment timestamp is invalid');
  deployments.sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on));
  const current = stableVersion(deployments[0]);
  assert(current, 'Rollback requires a current single-version deployment');
  const message = deployments[0].annotations?.['workers/message'];
  if (message === `${ROLLBACK_MESSAGE}${current}`) return { version: current, alreadyApplied: true };
  for (const entry of deployments.slice(1)) {
    const version = stableVersion(entry);
    if (version && version !== current) return { version, alreadyApplied: false };
  }
  throw new Error('No previous stable Worker version is available for rollback');
}

export async function release({ run, mode = 'go-live', version, sourcePath = SOURCE_CONFIG, record = () => {} }) {
  assert(['go-live', 'redeploy', 'rollback'].includes(mode), 'Unknown release mode');
  if (mode === 'rollback') {
    const list = () => run(['wrangler', 'deployments', 'list', '--name', WORKER_NAME, '--json', '--config', sourcePath],
      { label: 'Read Worker deployment history', scope: 'cloudflare' });
    const target = rollbackTarget(parseJsonOutput(await list(), 'Deployment history'));
    if (!target.alreadyApplied) {
      await run(['wrangler', 'versions', 'deploy', `${target.version}@100`, '--name', WORKER_NAME, '--yes', '--message', `${ROLLBACK_MESSAGE}${target.version}`, '--config', sourcePath],
        { label: 'Restore previous Worker version', scope: 'cloudflare' });
      const current = rollbackTarget(parseJsonOutput(await list(), 'Deployment history'));
      assert(current.alreadyApplied && current.version === target.version, 'Rollback deployment could not be verified');
    }
    record('Worker rollback', target.alreadyApplied ? 'already applied' : 'passed');
    await run(['node', 'apps/edge/scripts/smoke-live.mjs', '--origin', PRODUCTION_ORIGIN], { label: 'Smoke rolled-back pages', scope: 'none' });
    record('Rolled-back pages and health', 'passed');
    return { mode, workerVersion: target.version, alreadyApplied: target.alreadyApplied, databaseChanged: false };
  }

  assert(typeof version === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(version), 'Release version must be a Git commit SHA');
  const database = await findOrCreateDatabase(run, { create: mode === 'go-live', sourcePath });
  if (!database) return { mode, skipped: true, reason: 'database-missing' };
  record('EU database', 'verified');
  const temporary = createReleaseConfig(database, version, sourcePath);
  try {
    await run(['wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote', '--config', temporary.path],
      { label: 'Apply database migrations', scope: 'cloudflare' });
    record('Migrations', 'passed');
    await run(['wrangler', 'deploy', '--dry-run', '--config', temporary.path], { label: 'Dry-run bound Worker', scope: 'none' });
    record('Bound Worker dry run', 'passed');
    await run(['wrangler', 'deploy', '--config', temporary.path], { label: 'Deploy Worker and custom domain', scope: 'cloudflare' });
    record('Worker deployment', 'passed');
    if (mode === 'go-live') {
      await run(['node', '--import', 'tsx', 'apps/edge/scripts/seed.ts', '--config', temporary.path, '--remote', '--database', DATABASE_NAME],
        { label: 'Seed five accounts and demo class', scope: 'seed' });
      record('Five seed accounts and demo class', 'passed');
    }
    await run(['node', 'apps/edge/scripts/smoke-live.mjs', '--origin', PRODUCTION_ORIGIN, '--version', version],
      { label: 'Smoke live pages and deployed commit', scope: 'none' });
    record('Live pages and tested commit', 'passed');
    if (mode === 'go-live') {
      await run(['node', 'apps/edge/scripts/smoke-accounts.mjs', '--origin', PRODUCTION_ORIGIN],
        { label: 'Smoke student and teacher sign-in', scope: 'accounts' });
      record('Student and teacher sign-in/sign-out', 'passed');
    }
    return { mode, database: database.uuid, jurisdiction: database.jurisdiction, version, url: PRODUCTION_ORIGIN };
  } finally { temporary.cleanup(); }
}

export function ownerConfiguration(environment, mode) {
  if (environment.GITHUB_REF !== 'refs/heads/codex/live-alpha') return 'Run on codex/live-alpha';
  if (!environment.CLOUDFLARE_API_TOKEN || !environment.CLOUDFLARE_ACCOUNT_ID) return 'Add the two Cloudflare repository secrets';
  if (mode === 'go-live' && !environment.SEED_ACCOUNTS_JSON) return 'Add SEED_ACCOUNTS_JSON';
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--rollback') ? 'rollback' : args.includes('--redeploy') ? 'redeploy' : 'go-live';
  const missing = ownerConfiguration(process.env, mode);
  if (missing) {
    console.log(`::notice::Cloudflare release skipped: ${missing}. See docs/platform/GO-LIVE.md.`);
    return;
  }
  const steps = [];
  let result;
  let failed = false;
  try {
    // Validate the five secret values before creating resources or changing the
    // live Worker. Syntax errors must not echo a fragment containing a password.
    if (mode === 'go-live') parseSeedAccounts(process.env.SEED_ACCOUNTS_JSON);
    result = await release({ run: createReleaseRunner(), mode, version: process.env.GITHUB_SHA, record: (step, status) => steps.push([step, status]) });
    if (result.skipped) console.log('::notice::Cloudflare deployment skipped: german-db does not exist yet. Run Go live (Cloudflare).');
    else console.log(JSON.stringify(result));
  } catch (error) {
    failed = true;
    // All command failures are converted to fixed labels; do not expose raw
    // provider errors or a seed response in a workflow log.
    console.error(error instanceof Error ? error.message : 'Cloudflare release failed');
    process.exitCode = 1;
  } finally {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## Cloudflare ${mode}\n\nURL: ${PRODUCTION_ORIGIN}\n\nResult: ${failed ? 'failed; inspect the last named step' : result?.skipped ? 'skipped: database not created yet' : 'passed'}\n\n` +
      steps.map(([step, status]) => `- ${step}: ${status}\n`).join('') +
      (mode === 'rollback' ? '\nOnly the Worker version was changed. D1 data and schema were not rolled back.\n' : ''));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
