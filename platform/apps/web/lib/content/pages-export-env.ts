/**
 * Fail-fast guard for Pages static export env.
 * `GL_PAGES_EXPORT=1` requires a nonempty public base that exactly matches
 * the configured Pages project base (`PAGES_BASE_PATH`).
 */
import { PAGES_BASE_PATH } from "./pages-base-path";

/** Minimal env shape for Pages export validation (tests + process.env). */
export type PagesExportEnvLike = {
  readonly GL_PAGES_EXPORT?: string | undefined;
  readonly NEXT_PUBLIC_GL_PAGES_BASE_PATH?: string | undefined;
};

/**
 * Throws when Pages export is enabled without a valid matching public base path.
 * No-op for normal `build`/`dev` (when `GL_PAGES_EXPORT` is not `"1"`).
 */
export function assertPagesExportEnv(
  env: PagesExportEnvLike,
  configuredBase: string = PAGES_BASE_PATH,
): void {
  if (env.GL_PAGES_EXPORT !== "1") return;

  const raw = env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
  const base = typeof raw === "string" ? raw.trim() : "";

  if (!base) {
    throw new Error(
      `GL_PAGES_EXPORT=1 requires nonempty NEXT_PUBLIC_GL_PAGES_BASE_PATH matching ${configuredBase}`,
    );
  }

  if (base !== configuredBase) {
    throw new Error(
      `GL_PAGES_EXPORT=1 NEXT_PUBLIC_GL_PAGES_BASE_PATH="${base}" must equal configured Pages base "${configuredBase}"`,
    );
  }
}
