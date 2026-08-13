/**
 * Legacy entry retained so older docs/commands that invoke
 * `node scripts/build-pages.mjs` still reach the TypeScript wrapper.
 * Prefer `npm run build:pages` (tsx scripts/build-pages.ts).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const entry = join(here, "build-pages.ts");

const result = spawnSync(process.execPath, [tsxCli, entry], {
  cwd: join(here, ".."),
  stdio: "inherit",
  shell: false,
  windowsHide: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
