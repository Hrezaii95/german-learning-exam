import type { NextConfig } from "next";
import path from "node:path";
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
 * `activity%3A…` routes still match.
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
const pagesBase = isPagesExport
  ? (process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH as string).trim()
  : PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@german-learning/learning"],
  ...(isPagesExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
        basePath: pagesBase,
        assetPrefix: pagesBase,
      }
    : {}),
  webpack: (config) => {
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
