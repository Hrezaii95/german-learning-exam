/**
 * GitHub Pages project base path. Applied only at the render/deploy boundary
 * (raw HTML form actions + Next `basePath`/`assetPrefix` during `build:pages`).
 * Route logic and semantic canonical paths stay app-relative (`/search`, …).
 */
export const PAGES_BASE_PATH = "/german-learning-exam";

/** Inlined at build time via NEXT_PUBLIC_ — empty for normal `build`/`dev`. */
export function pagesBasePath(): string {
  return process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH ?? "";
}

/**
 * Prefix an app-relative path for raw HTML attributes (e.g. form `action`).
 * Do not use for `next/link` — Next applies `basePath` automatically.
 */
export function withPagesBasePath(appPath: string): string {
  const base = pagesBasePath();
  if (!base) return appPath;
  if (appPath === "/") return `${base}/`;
  const trimmed = appPath.endsWith("/") ? appPath.slice(0, -1) : appPath;
  return `${base}${trimmed}/`;
}
