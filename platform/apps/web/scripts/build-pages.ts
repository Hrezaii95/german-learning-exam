/**
 * Safe Pages static-export build wrapper.
 *
 * - Recovers unambiguous stale isolation, else fail closed
 * - Isolates `proxy.ts` only for this build (restore on success/failure/signal)
 * - Temporarily sets `dynamicParams = false` on static-export-incompatible
 *   routes (Next requires a literal; track each bak immediately; restore always)
 * - Sets GL_PAGES_EXPORT + base-path env for next.config
 * - Runs content projection + `next build --webpack` without `shell: true`
 * - Ensures `.nojekyll` and an honest `404.html` in `out/`
 *
 * Does not commit, push, deploy, or consume local secrets.
 *
 * See `build-pages-lib.ts` header for operator recovery documentation.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPagesBuildController } from "./build-pages-lib.js";

/**
 * While this build runs, tracked sources are briefly rewritten (isolated
 * `proxy.ts`, literal `dynamicParams`). Any external process that commits the
 * worktree during that window captures a broken intermediate state. This marker
 * lets such tools pause; it is advisory and never blocks the build itself.
 */
const repoGitDir = path.resolve(fileURLToPath(import.meta.url), "../../../../../.git");
const pauseMarker = path.join(repoGitDir, "claude-hygiene-pause");

function setPause(): void {
  if (!existsSync(repoGitDir)) return;
  try {
    mkdirSync(path.dirname(pauseMarker), { recursive: true });
    writeFileSync(pauseMarker, `build:pages pid=${process.pid}\n`, "utf8");
  } catch {
    // Advisory only: never fail a build because the marker could not be written.
  }
}

function clearPause(): void {
  try {
    rmSync(pauseMarker, { force: true });
  } catch {
    // Advisory only.
  }
}

const controller = createPagesBuildController();

setPause();
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.once(signal, () => {
    clearPause();
    process.exit(1);
  });
}
process.once("exit", clearPause);

controller.build()
  .then(clearPause)
  .catch((err: unknown) => {
    clearPause();
    console.error("[build:pages] FAILED", err);
    process.exit(1);
  });
