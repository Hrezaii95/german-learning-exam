import type { NextConfig } from "next";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PAGES_BASE_PATH } from "./lib/content/pages-base-path";
import { assertPagesExportEnv } from "./lib/content/pages-export-env";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Next 16 App Router config.
 * Sites foundation folders (.openai, optional worker) stay deploy-ready;
 * this slice builds with Next and does not deploy.
 *
 * Canonical alias detection in proxy.ts reads the raw request URL string via
 * extractRawPathname — keep skipProxyUrlNormalize off so prerendered
 * Pages-safe typed-ID slug routes still match.
 *
 * P4A pulls `@german-learning/learning` (TypeScript ESM with `.js` specifiers)
 * into the App Router graph. Turbopack cannot yet alias `.js` → `.ts`, so
 * production builds and default local `dev` use webpack with extensionAlias
 * (see package.json `build` / `dev`).
 *
 * `GL_PAGES_EXPORT=1` enables a separate static GitHub Pages export
 * (`output: "export"`) without changing normal `build`/`dev` behavior.
 * Fail fast unless `NEXT_PUBLIC_GL_PAGES_BASE_PATH` matches `PAGES_BASE_PATH`.
 */
assertPagesExportEnv({
  GL_PAGES_EXPORT: process.env.GL_PAGES_EXPORT,
  NEXT_PUBLIC_GL_PAGES_BASE_PATH: process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH,
});
const isPagesExport = process.env.GL_PAGES_EXPORT === "1";
// Lane 3: an explicit empty value selects the Cloudflare root export. The
// Pages wrapper and its fail-fast base-path guard remain unchanged.
const isRootExport = process.env.GL_SITE_BASE_PATH !== undefined;
if (isRootExport && (process.env.GL_SITE_BASE_PATH !== "" || isPagesExport)) {
  throw new Error("GL_SITE_BASE_PATH must be empty and cannot be combined with GL_PAGES_EXPORT");
}
if (isRootExport && process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH !== "") {
  throw new Error("The root export requires an explicitly empty public base path");
}
const pagesBase = isPagesExport
  ? (process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH as string).trim()
  : PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@german-learning/learning"],
  ...(isPagesExport || isRootExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
        basePath: isRootExport ? "" : pagesBase,
        assetPrefix: isRootExport ? "" : pagesBase,
      }
    : {}),
  webpack: (config, { isServer }) => {
    // Lane 3: persistent account/sync lifecycle on every client route, with a
    // Pages-only readiness banner. Neither requires editing Lane 1's shell.
    const accountRuntime = path.join(here, "lib/account/runtime.ts");
    const moveBanner = path.join(here, "lib/account/move-banner.ts");
    const platformEntries = [
      ...(existsSync(accountRuntime) ? [accountRuntime] : []),
      ...(isPagesExport && existsSync(moveBanner) ? [moveBanner] : []),
    ];
    if (!isServer && platformEntries.length) {
      const entry = config.entry;
      config.entry = async () => {
        const entries = typeof entry === "function" ? await entry() : entry ?? {};
        const main = entries["main-app"];
        if (Array.isArray(main)) entries["main-app"] = [...main, ...platformEntries];
        else throw new Error("Next client entry changed: recheck persistent account and migration bootstrap");
        return entries;
      };
    }
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@german-learning/learning": path.join(
        here,
        "..",
        "..",
        "packages",
        "learning",
        "src",
        "index.ts",
      ),
    };
    return config;
  },
};

export default nextConfig;
