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
import { createPagesBuildController } from "./build-pages-lib.js";

const controller = createPagesBuildController();

controller.build().catch((err: unknown) => {
  console.error("[build:pages] FAILED", err);
  process.exit(1);
});
