/**
 * Pages source-isolation helpers (transactional park/patch/restore).
 *
 * Recovery (document for operators):
 * - Unambiguous auto-recover on startup:
 *   1) proxy.ts missing + proxy.ts.pages-disabled present → restore proxy
 *   2) page source + matching `*.pages-bak` pair → restore source from bak, delete bak
 * - Fail closed (throw, no mutation) when ambiguous:
 *   - both proxy.ts and parked file present
 *   - bak without source, or bak whose content lacks `dynamicParams = true`
 *   - source already patched (`dynamicParams = false` pages-export marker) without bak
 *   - mix of recovered/unrecoverable route states after scan
 * - Manual fallback if auto-recover refuses: restore each `*.pages-bak` over its
 *   page, delete baks; if proxy parked and live missing, rename parked → proxy.ts;
 *   if both proxy forms exist, keep live proxy.ts and delete parked only after
 *   confirming live content is intact.
 *
 * SIGINT/SIGTERM invoke the same restore path as `finally` (SIGKILL cannot).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  finalizeOfflineExport,
  summarizeOfflineExport,
} from "./offline-export.js";
import { normalizeExportSegments } from "./normalize-export-segments.js";

const require = createRequire(import.meta.url);

export const PAGES_BASE_PATH = "/german-learning-exam";
export const PROXY_PARKED_NAME = "proxy.ts.pages-disabled";
export const BAK_SUFFIX = ".pages-bak";

/** Routes that keep `dynamicParams = true` for the webpack server build. */
export const DYNAMIC_PARAM_PAGES = [
  "app/lessons/[lessonSegment]/activity/[activityId]/page.tsx",
  "app/vocabulary/[entityId]/page.tsx",
  "app/verbs/[entityId]/page.tsx",
  "app/grammar/[entityId]/page.tsx",
  "app/phrases/[entityId]/page.tsx",
  "app/practice/[gameId]/page.tsx",
  "app/conversation/[entityId]/page.tsx",
] as const;

export const DYNAMIC_TRUE = "export const dynamicParams = true;";
export const DYNAMIC_FALSE =
  "export const dynamicParams = false; /* pages-export temporary */";

export function defaultWebRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export type PagesBuildControllerOptions = {
  webRoot?: string;
  log?: (msg: string) => void;
};

export type PagesBuildController = {
  webRoot: string;
  proxyPath: string;
  proxyParked: string;
  outDir: string;
  mutatedParamRels: Set<string>;
  bakPath: (rel: string) => string;
  filePath: (rel: string) => string;
  recoverStaleState: () => {
    proxyRestored: boolean;
    paramsRestored: string[];
  };
  isolateProxy: () => void;
  restoreProxy: () => boolean;
  patchDynamicParams: () => void;
  restoreDynamicParams: () => string[];
  restoreAll: () => void;
  finalizeOut: () => void;
  run: (
    command: string,
    args: string[],
    env?: Record<string, string | undefined>,
  ) => Promise<void>;
  runProject: () => Promise<void>;
  runNextPagesBuild: () => Promise<void>;
  installSignalHandlers: (opts?: { exitProcess?: boolean }) => () => void;
  build: () => Promise<void>;
  isProxyIsolated: () => boolean;
};

export function createPagesBuildController(
  options: PagesBuildControllerOptions = {},
): PagesBuildController {
  const webRoot = options.webRoot ?? defaultWebRoot();
  const log = options.log ?? ((msg: string) => console.log(msg));
  const proxyPath = join(webRoot, "proxy.ts");
  const proxyParked = join(webRoot, PROXY_PARKED_NAME);
  const outDir = join(webRoot, "out");

  const mutatedParamRels = new Set<string>();
  let proxyIsolated = false;
  let cleaning = false;

  function bakPath(rel: string): string {
    return `${join(webRoot, rel)}${BAK_SUFFIX}`;
  }

  function filePath(rel: string): string {
    return join(webRoot, rel);
  }

  function restoreDynamicParams(): string[] {
    const restored: string[] = [];
    for (const rel of DYNAMIC_PARAM_PAGES) {
      const bak = bakPath(rel);
      if (!existsSync(bak)) continue;
      writeFileSync(filePath(rel), readFileSync(bak, "utf8"));
      unlinkSync(bak);
      restored.push(rel);
      mutatedParamRels.delete(rel);
    }
    if (restored.length > 0) {
      log(`[build:pages] Restored dynamicParams literals (${restored.length})`);
    }
    return restored;
  }

  function restoreProxy(): boolean {
    if (!existsSync(proxyParked)) {
      proxyIsolated = false;
      return false;
    }
    if (existsSync(proxyPath)) {
      unlinkSync(proxyPath);
    }
    renameSync(proxyParked, proxyPath);
    proxyIsolated = false;
    log("[build:pages] Restored proxy.ts");
    return true;
  }

  function restoreAll(): void {
    if (cleaning) return;
    cleaning = true;
    try {
      restoreDynamicParams();
      if (proxyIsolated || existsSync(proxyParked)) {
        restoreProxy();
      }
    } finally {
      cleaning = false;
    }
  }

  function recoverStaleState(): {
    proxyRestored: boolean;
    paramsRestored: string[];
  } {
    const bothProxy = existsSync(proxyPath) && existsSync(proxyParked);
    if (bothProxy) {
      throw new Error(
        `Ambiguous proxy state: both proxy.ts and ${PROXY_PARKED_NAME} exist; restore manually`,
      );
    }

    let proxyRestored = false;
    if (!existsSync(proxyPath) && existsSync(proxyParked)) {
      renameSync(proxyParked, proxyPath);
      proxyRestored = true;
      log(
        `[build:pages] Auto-recovered proxy.ts from ${PROXY_PARKED_NAME}`,
      );
    }

    const paramsRestored: string[] = [];
    const ambiguous: string[] = [];

    for (const rel of DYNAMIC_PARAM_PAGES) {
      const src = filePath(rel);
      const bak = bakPath(rel);
      const hasSrc = existsSync(src);
      const hasBak = existsSync(bak);

      if (!hasBak && hasSrc) {
        const text = readFileSync(src, "utf8");
        if (text.includes(DYNAMIC_FALSE) && !text.includes(DYNAMIC_TRUE)) {
          ambiguous.push(
            `${rel}: patched dynamicParams without ${BAK_SUFFIX} backup`,
          );
        }
        continue;
      }

      if (hasBak && !hasSrc) {
        ambiguous.push(`${rel}: ${BAK_SUFFIX} present but source missing`);
        continue;
      }

      if (hasBak && hasSrc) {
        const bakText = readFileSync(bak, "utf8");
        if (!bakText.includes(DYNAMIC_TRUE)) {
          ambiguous.push(
            `${rel}: ${BAK_SUFFIX} is not a valid pre-patch backup (missing dynamicParams=true)`,
          );
          continue;
        }
        writeFileSync(src, bakText);
        unlinkSync(bak);
        paramsRestored.push(rel);
      }
    }

    if (ambiguous.length > 0) {
      throw new Error(
        `Ambiguous Pages isolation state (fail closed):\n- ${ambiguous.join("\n- ")}`,
      );
    }

    if (paramsRestored.length > 0) {
      log(
        `[build:pages] Auto-recovered ${paramsRestored.length} route(s) from ${BAK_SUFFIX}`,
      );
    }

    return { proxyRestored, paramsRestored };
  }

  function isolateProxy(): void {
    if (!existsSync(proxyPath)) {
      throw new Error(`proxy.ts missing at ${proxyPath}`);
    }
    if (existsSync(proxyParked)) {
      throw new Error(
        `Refusing to overwrite existing ${proxyParked}; restore manually first`,
      );
    }
    renameSync(proxyPath, proxyParked);
    proxyIsolated = true;
    log("[build:pages] Isolated proxy.ts → proxy.ts.pages-disabled");
  }

  function patchDynamicParams(): void {
    for (const rel of DYNAMIC_PARAM_PAGES) {
      const src = filePath(rel);
      const bak = bakPath(rel);
      if (existsSync(bak)) {
        throw new Error(`Refusing to overwrite existing ${bak}; restore manually`);
      }
      const text = readFileSync(src, "utf8");
      if (!text.includes(DYNAMIC_TRUE)) {
        throw new Error(`Expected \`${DYNAMIC_TRUE}\` in ${rel}`);
      }
      // Track mutation immediately after backup write so finally always restores.
      writeFileSync(bak, text);
      mutatedParamRels.add(rel);
      writeFileSync(src, text.replace(DYNAMIC_TRUE, DYNAMIC_FALSE));
    }
    log(
      `[build:pages] Patched dynamicParams=false on ${DYNAMIC_PARAM_PAGES.length} routes`,
    );
  }

  function finalizeOut(): void {
    if (!existsSync(outDir)) {
      throw new Error(`Pages export missing out/ at ${outDir}`);
    }
    const segments = normalizeExportSegments(outDir);
    if (segments) log(`[build:pages] Normalized ${segments} Windows RSC segment filenames`);
    writeFileSync(join(outDir, ".nojekyll"), "");
    const notFoundSrc = join(outDir, "404.html");
    if (!existsSync(notFoundSrc)) {
      writeFileSync(
        notFoundSrc,
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Page not found</title></head><body><h1>Page not found</h1><p>This route is not part of the Lessons 1–2 Alpha shell.</p><p><a href="${PAGES_BASE_PATH}/">Back to dashboard</a></p></body></html>\n`,
      );
      log("[build:pages] Wrote honest fallback 404.html");
    } else {
      log("[build:pages] Found Next-generated 404.html");
    }
    if (!existsSync(join(outDir, ".nojekyll"))) {
      throw new Error(".nojekyll missing after write");
    }

    // Offline support is finished here rather than in `public/`, because the
    // precache list can only name the exported build's content-hashed assets,
    // and every cached URL has to carry the Pages base path. See
    // `scripts/offline-export.ts`.
    log(summarizeOfflineExport(finalizeOfflineExport(outDir, PAGES_BASE_PATH)));
  }

  function run(
    command: string,
    args: string[],
    env: Record<string, string | undefined> = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: webRoot,
        env: { ...process.env, ...env },
        stdio: "inherit",
        shell: false,
        windowsHide: true,
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
      });
    });
  }

  async function runProject(): Promise<void> {
    const tsxCli = require.resolve("tsx/cli");
    await run(process.execPath, [tsxCli, "scripts/project-content.ts"], {});
  }

  async function runNextPagesBuild(): Promise<void> {
    const nextBin = require.resolve("next/dist/bin/next");
    await run(process.execPath, [nextBin, "build", "--webpack"], {
      GL_PAGES_EXPORT: "1",
      NEXT_PUBLIC_GL_PAGES_BASE_PATH: PAGES_BASE_PATH,
    });
  }

  function installSignalHandlers(opts: { exitProcess?: boolean } = {}): () => void {
    const exitProcess = opts.exitProcess !== false;
    const onSignal = (signal: NodeJS.Signals): void => {
      log(`[build:pages] Caught ${signal}; restoring source isolation`);
      try {
        restoreAll();
      } catch (err) {
        console.error("[build:pages] restore after signal failed", err);
      }
      if (exitProcess) {
        process.exit(signal === "SIGINT" ? 130 : 143);
      }
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    return () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };
  }

  async function build(): Promise<void> {
    const disposeSignals = installSignalHandlers({ exitProcess: true });
    try {
      recoverStaleState();
      isolateProxy();
      try {
        patchDynamicParams();
      } catch (err) {
        throw err;
      }

      await runProject();
      await runNextPagesBuild();
      finalizeOut();
      log("[build:pages] OK → out/ with .nojekyll + 404.html");
    } finally {
      restoreAll();
      disposeSignals();
    }
  }

  return {
    webRoot,
    proxyPath,
    proxyParked,
    outDir,
    mutatedParamRels,
    bakPath,
    filePath,
    recoverStaleState,
    isolateProxy,
    restoreProxy,
    patchDynamicParams,
    restoreDynamicParams,
    restoreAll,
    finalizeOut,
    run,
    runProject,
    runNextPagesBuild,
    installSignalHandlers,
    build,
    isProxyIsolated: () => proxyIsolated,
  };
}

export function createIsolationFixture(
  root: string,
  opts: {
    pages?: readonly string[];
    proxyBody?: string;
    pageBody?: (rel: string) => string;
  } = {},
): { root: string; pages: readonly string[] } {
  const pages = opts.pages ?? DYNAMIC_PARAM_PAGES;
  const proxyBody =
    opts.proxyBody ?? "export function proxy() { return undefined; }\n";
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "proxy.ts"), proxyBody);
  for (const rel of pages) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    const body =
      opts.pageBody?.(rel) ??
      `/* ${rel} */\n${DYNAMIC_TRUE}\nexport default function Page() { return null; }\n`;
    writeFileSync(full, body);
  }
  return { root, pages };
}

export function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

export function removeTree(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
