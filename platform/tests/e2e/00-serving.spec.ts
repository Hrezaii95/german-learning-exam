import { expect, test } from "@playwright/test";
import { PAGES_BASE, gotoApp } from "./support/app";

/**
 * Guards the harness itself. If these fail, every other spec's verdict is
 * meaningless — so they run first and say so plainly.
 */
test.describe("serving contract", () => {
  test("serves the export under the Pages base path, not the origin root", async ({
    page,
  }) => {
    const response = await page.goto(`${PAGES_BASE}/`);
    expect(response?.status()).toBe(200);

    const offBase = await page.request.get("/", { failOnStatusCode: false });
    expect(
      offBase.status(),
      "requests outside the base path must 404 like GitHub Pages",
    ).toBe(404);
  });

  test("every document, script, style, font and image asset resolves", async ({
    page,
  }) => {
    // Scoped to the resources a page needs to render and hydrate. Router
    // prefetch payloads are checked separately (11-rsc-prefetch.spec.ts)
    // because their layout is not stable across build platforms and lumping
    // them in here would turn one build-tooling defect into a suite-wide red.
    const failures: string[] = [];
    page.on("response", (res) => {
      const type = res.request().resourceType();
      const renderCritical = [
        "document",
        "script",
        "stylesheet",
        "font",
        "image",
      ].includes(type);
      if (renderCritical && res.status() >= 400) {
        failures.push(`${res.status()} ${type} ${res.url()}`);
      }
    });

    await gotoApp(page, "/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(failures, "no render-critical asset may 404 under the base path").toEqual(
      [],
    );
  });

  test("unknown routes serve the honest 404 page", async ({ page }) => {
    const response = await page.goto(`${PAGES_BASE}/no-such-route-abc/`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/not found/i);
  });
});
