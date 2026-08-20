import { expect, test } from "@playwright/test";
import { PAGES_BASE, gotoApp } from "./support/app";

/**
 * Journey 7 — search → result detail → back returns to the search you ran.
 *
 * Back-context is carried in a `nav` query parameter, so "Back" only works if
 * the parameter survives the link, the static export's trailing-slash routing,
 * and the client boundary that parses it. Only a browser can prove that chain.
 */
test.describe("journey 7 · search, open a result, come back", () => {
  test("returns to the same query the learner ran", async ({ page }) => {
    await gotoApp(page, "/search");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Search");
    await expect(page.getByRole("heading", { name: "Enter a search" })).toBeVisible();

    const box = page.getByRole("searchbox", { name: "Search learning content" });
    await box.fill("Architekt");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search\/\?q=Architekt$/);
    await expect(page.getByRole("heading", { name: /^Results \(\d+\)$/ })).toBeVisible();
    await expect(page.locator("h3.search-group__title").first()).toContainText(
      "Vocabulary",
    );

    const firstResult = page.locator("a.search-result-link").first();
    const resultText = (await firstResult.innerText()).trim();
    await expect(firstResult).toHaveAttribute("href", /nav=/);
    await firstResult.click();

    // On the detail page for the thing that was clicked.
    await expect(page).toHaveURL(new RegExp(`${PAGES_BASE}/vocabulary/id-`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(resultText);

    // The back affordance resolves from the carried context, not from history.
    const back = page.locator("a.back-link");
    await expect(back).toBeVisible();
    await expect(back).toHaveText("← Back");
    await expect(back).toHaveAttribute("href", /\/search\/?\?q=Architekt/);

    await back.click();

    await expect(page).toHaveURL(/\/search\/\?q=Architekt$/);
    await expect(
      page.getByRole("searchbox", { name: "Search learning content" }),
    ).toHaveValue("Architekt");
    await expect(page.getByRole("heading", { name: /^Results \(\d+\)$/ })).toBeVisible();
    await expect(page.locator("a.search-result-link").first()).toHaveText(resultText);
  });

  test("a query with no matches says so instead of showing stale results", async ({
    page,
  }) => {
    await gotoApp(page, "/search");
    await page
      .getByRole("searchbox", { name: "Search learning content" })
      .fill("zzzznotaword");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await expect(page.locator("a.search-result-link")).toHaveCount(0);
  });

  test("a hostile back-context is refused rather than followed", async ({ page }) => {
    // A crafted nav param must never become a navigation target.
    const hostile = encodeURIComponent(
      JSON.stringify({ entryContext: "search", returnPath: "https://evil.example/" }),
    );
    await gotoApp(page, `/vocabulary/id-6c65783a617263686974656b74/?nav=${hostile}`);

    const back = page.locator("a.back-link");
    if ((await back.count()) > 0) {
      await expect(back).not.toHaveAttribute("href", /evil\.example/);
    }
    await expect(page.locator("main")).not.toContainText("evil.example");
  });
});
