import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Keep the browser cache off the system drive.
 *
 * This machine's C: drive had 0 bytes free, which surfaced as ENOSPC in vitest
 * rather than as a disk error, so the browsers live beside the workspace (git-
 * ignored). Only a default: an existing PLAYWRIGHT_BROWSERS_PATH still wins, and
 * on a machine with room the folder simply will not exist and Playwright falls
 * back to its normal location.
 */
const platformRoot = dirname(fileURLToPath(import.meta.url));
const localBrowsers = join(platformRoot, ".playwright-browsers");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}

/**
 * End-to-end suite for the German Learning OS.
 *
 * Scope boundary: this config is deliberately NOT wired into `npm run check`.
 * The vitest suite (`tests/content`, `tests/learning`, `tests/web`) stays the
 * fast unit/component gate; this suite drives a real browser against the real
 * static export and is run on its own with `npm run test:e2e`.
 *
 * It builds nothing. `webServer` starts a read-only static file server over the
 * EXISTING `apps/web/out/` export under the `/german-learning-exam` base path —
 * the same path shape GitHub Pages serves. Building here would collide with the
 * repo's build discipline (`build:pages` globally renames `proxy.ts`), so the
 * server refuses to start when `out/` is missing instead of producing it.
 */

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 4331;
const PAGES_BASE = "/german-learning-exam";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Zero retries on purpose. A retry budget hides flake, and a flaky suite is
  // the exact failure this layer exists to prevent. If a spec is unstable the
  // spec is wrong, not the run.
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",

  use: {
    // Trailing slash matters: relative gotos ("lessons/") must resolve inside
    // the base path, not at the origin root.
    baseURL: `http://127.0.0.1:${PORT}${PAGES_BASE}/`,
    // The export now ships a service worker. Left enabled, it could serve a
    // cached response and let a spec pass against bytes that are no longer in
    // out/ — the precise false green this layer exists to prevent. Every spec
    // here therefore talks to the server. Offline/cache behaviour is the
    // offline policy's own gate to prove, not something to leak into these.
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["microphone"],
        launchOptions: {
          args: [
            // Real getUserMedia against a synthetic device: the recorder code
            // path runs for real, no application stubbing required.
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            // Media playback must be assertable without a synthetic user
            // gesture dance that would test Chromium, not the app.
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "node tests/e2e/support/serve.mjs",
    url: `http://127.0.0.1:${PORT}${PAGES_BASE}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { E2E_PORT: String(PORT) },
  },
});
