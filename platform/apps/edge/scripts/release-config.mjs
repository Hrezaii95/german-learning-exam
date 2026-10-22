/** Release configuration contains resource identifiers, never account secrets. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATABASE_NAME = 'german-db';
export const WORKER_NAME = 'german-web';
export const PRODUCTION_ORIGIN = 'https://german.learnilabs.com';
export const SOURCE_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), '../wrangler.jsonc');
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseJsonOutput(output, label) {
  try { return JSON.parse(output); }
  catch { throw new Error(`${label} returned invalid JSON`); }
}

export function selectDatabase(rows) {
  assert(Array.isArray(rows), 'D1 list must return a JSON array');
  const matches = rows.filter((row) => row?.name === DATABASE_NAME);
  assert(matches.length <= 1, 'D1 returned duplicate german-db names');
  if (!matches.length) return null;
  const database = matches[0];
  assert(typeof database.uuid === 'string' && UUID.test(database.uuid), 'D1 database UUID is invalid');
  assert.equal(database.jurisdiction, 'eu', 'german-db must have the EU jurisdiction; an existing database cannot be moved by this workflow');
  return { name: DATABASE_NAME, uuid: database.uuid, jurisdiction: 'eu' };
}

export function createReleaseConfig(database, version, sourcePath = SOURCE_CONFIG) {
  assert(database?.name === DATABASE_NAME && UUID.test(database.uuid), 'Invalid release database');
  assert.equal(database.jurisdiction, 'eu', 'Release database must be in the EU jurisdiction');
  assert(typeof version === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(version), 'Release version must be a Git commit SHA');
  // The checked-in .jsonc is deliberately strict JSON. Do not use regex to
  // strip comments, interpolate JSON in a shell, or modify the tracked file.
  const config = parseJsonOutput(readFileSync(sourcePath, 'utf8'), 'Wrangler configuration');
  assert.equal(config.name, WORKER_NAME, 'Unexpected production Worker name');
  const existing = (config.d1_databases ?? []).find((entry) => entry.binding === 'DB');
  config.d1_databases = [
    ...(config.d1_databases ?? []).filter((entry) => entry.binding !== 'DB'),
    { ...existing, binding: 'DB', database_name: DATABASE_NAME, database_id: database.uuid,
      jurisdiction: 'eu', migrations_dir: existing?.migrations_dir ?? 'migrations' },
  ];
  config.vars = { ...config.vars, BUILD_SHA: version };
  // Keep this file beside the source so main/assets/migrations/rules retain
  // their exact relative-path semantics. It is always removed by the caller.
  const path = join(dirname(sourcePath), `.release-${randomUUID()}.json`);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return { path, config, cleanup: () => rmSync(path, { force: true }) };
}
