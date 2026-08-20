import { expect, test } from "@playwright/test";
import { gotoApp } from "./support/app";

/**
 * Router prefetch payloads must resolve at the URL the router asks for.
 *
 * Do not relax this assertion. A 404 here means client navigation falls back to
 * a full document load, which is a real regression for a learner.
 *
 * PLATFORM DIFFERENCE (diagnosed 2026-08-15 — do not re-diagnose):
 * Next 16.3.0 names each route's React payload by joining the route segments
 * with dots, and the router requests that flat name on every platform. A Linux
 * export — what `.github/workflows/deploy-pages.yml` deploys — writes exactly
 * that filename, so the live site serves it:
 *     /lessons/__next.lessons.__PAGE__.txt   → 200
 *     /lessons/__next.lessons/__PAGE__.txt   → 404
 * A Windows `npm run build:pages` writes the same payload as a directory tree
 * (`out/lessons/__next.lessons/__PAGE__.txt`) instead. `scripts/build-pages.ts`
 * never touches `.txt`, so that is Next's own export behaviour, not ours: the
 * deployed artifact is the correct one, and the URL the router requests is the
 * correct URL. The discrepancy is in how the bytes are laid out locally.
 *
 * `tests/e2e/support/static-server.mjs` therefore resolves the production URL
 * onto whichever layout the local export produced, so this spec asserts the
 * same thing on Windows and on CI. That fallback only runs when the flat file
 * is absent, so a Linux run still proves the deployed shape directly.
 *
 * What is still true, and worth remembering: a local `out/` is not byte-
 * identical to what ships in its client-navigation layer. This spec now covers
 * the URL contract on both; the byte-level difference remains a known gap in
 * the other local gates (`smoke:pages`, `audit:offline`).
 */
test.describe("router prefetch payloads", () => {
  test("prefetched route payloads resolve at the URL the router requests", async ({
    page,
  }) => {
    const missing: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 400 && /__next\..*\.txt/.test(res.url())) {
        missing.push(res.url().replace(/\?.*$/, ""));
      }
    });

    // The hub page links to every top-level route, so its prefetch pass covers
    // the whole navigation surface in one load.
    await gotoApp(page, "/hubs");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(
      missing,
      "router prefetch must not 404 — see the note at the top of this file",
    ).toEqual([]);
  });
});
