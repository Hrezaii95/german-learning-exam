/**
 * CLI entry for Playwright's `webServer`.
 *
 * Serves the EXISTING `apps/web/out/` export — it never builds. Building inside
 * the test run would collide with the repo's build discipline (`build:pages`
 * globally renames proxy.ts, so two concurrent builds corrupt each other), so
 * this refuses to start when the export is missing and tells you which command
 * produces it.
 *
 * Port: E2E_PORT, else 4331 (the smoke script owns 4330; they must not collide).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR, PAGES_BASE, startStaticServer } from "./static-server.mjs";

const port = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 4331;

if (!existsSync(join(OUT_DIR, "index.html"))) {
  console.error(
    `[e2e:serve] Missing static export at ${OUT_DIR}\n` +
      `[e2e:serve] Run \`npm run build:pages\` first — the E2E suite never builds.`,
  );
  process.exit(1);
}

const { origin } = await startStaticServer({ port });
console.log(`[e2e:serve] serving ${OUT_DIR}`);
console.log(`[e2e:serve] ready on ${origin}${PAGES_BASE}/`);
