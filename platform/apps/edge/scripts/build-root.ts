/** Root-path static export; no deployment, credentials or tracked web edits. */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPagesBuildController, type PagesBuildController } from "../../web/scripts/build-pages-lib.js";
import { normalizeExportSegments } from "../../web/scripts/normalize-export-segments.js";
import { finalizeOfflineExport, summarizeOfflineExport } from "../../web/scripts/offline-export.js";
import { SECURITY_HEADERS } from "../src/security.js";

/**
 * Restore only mutations this build owns. Failed recovery deliberately leaves
 * ambiguous source/backup pairs alone for an operator to inspect.
 */
export async function withRootSourceIsolation(
  controller: PagesBuildController,
  runBuild: () => Promise<void>,
): Promise<void> {
  let ownsIsolation = false;
  let disposeSignals = () => {};
  try {
    controller.recoverStaleState();
    controller.isolateProxy();
    ownsIsolation = true;
    // Recovery can fail closed. Its files must not be changed by either the
    // finally block or a signal handler belonging to this unsuccessful build.
    disposeSignals = controller.installSignalHandlers();
    controller.patchDynamicParams();
    await runBuild();
  } finally {
    try {
      if (ownsIsolation) controller.restoreAll();
    } finally {
      disposeSignals();
    }
  }
}

async function main(): Promise<void> {
  const require = createRequire(import.meta.url);
  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../web");
  const controller = createPagesBuildController({ webRoot });
  const outDir = join(webRoot, "out");
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: webRoot, encoding: "utf8" }).trim();
  const pauseMarker = join(gitDir, "claude-hygiene-pause");
  const clearPause = () => { rmSync(pauseMarker, { force: true }); };
  process.once("exit", clearPause);
  try {
    mkdirSync(dirname(pauseMarker), { recursive: true });
    writeFileSync(pauseMarker, `build:cloudflare pid=${process.pid}\n`);
    await withRootSourceIsolation(controller, async () => {
      // Register tsx directly: its CLI also creates an unnecessary IPC socket,
      // which restricted development hosts may refuse.
      await controller.run(process.execPath, ["--import", "tsx", "scripts/project-content.ts"]);
      await controller.run(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], {
        GL_PAGES_EXPORT: "0",
        GL_SITE_BASE_PATH: "",
        NEXT_PUBLIC_GL_PAGES_BASE_PATH: "",
      });
      if (!existsSync(join(outDir, "404.html"))) throw new Error("Root export is missing its 404 page");
      normalizeExportSegments(outDir);
      writeFileSync(join(outDir, ".nojekyll"), "");
      // Static requests bypass the Worker, so they need the same headers at the
      // asset layer. Avoid route-specific CSP hashes: _headers has finite limits.
      const headers = Object.entries(SECURITY_HEADERS).map(([key, value]) => `  ${key}: ${value}`).join("\n");
      writeFileSync(join(outDir, "_headers"), `/*\n${headers}\n\n/sw.js\n  Cache-Control: no-cache\n  Service-Worker-Allowed: /\n`);
      console.log(summarizeOfflineExport(finalizeOfflineExport(outDir, "")));
      console.log("[build:cloudflare] Root export ready; no resources created");
    });
  } finally {
    clearPause();
    process.off("exit", clearPause);
  }
}

// Importing the isolation helper in fixture tests must not launch a real build.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
