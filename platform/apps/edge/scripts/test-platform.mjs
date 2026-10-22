/** Run platform tests that exist in this dependency-ordered slice. */
import { readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const platform = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const directories = ['apps/edge/tests', 'packages/sync/tests', 'apps/web/lib/account',
  'apps/web/lib/api-client', 'apps/web/components/teacher'];
const files = directories.flatMap(directory => existsSync(join(platform, directory))
  ? readdirSync(join(platform, directory)).filter(file => file.endsWith('.test.ts')).map(file => join(directory, file)) : []);
if (!files.length) throw new Error('No platform tests found');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=2', ...files], { cwd: platform, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
