import { expect, test } from "@playwright/test";

const routes = ["lessons/03/", "lessons/04/", "lessons/12/", "grammar/", "verbs/", "phrases/", "cheat-sheets/", "cheat-sheets/home/"];

for (const width of [320, 390, 768, 1440]) {
  test(`learning cards and country rows remain readable at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: `${route} overflows at ${width}px` }).toBeLessThanOrEqual(1);
      const squeezed = await page.locator(".lesson-concept > div").evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width < 150).length);
      expect(squeezed, `${route} has a squeezed content column`).toBe(0);
      const launcher = page.getByRole("button", { name: "Open dictionary", exact: true });
      await expect(launcher).toBeVisible();
      expect(await launcher.evaluate(element => getComputedStyle(element).position)).toBe("static");
    }
  });
}

test("phone diagrams expose readable steps and dictionary preserves keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const phraseSlug = `id-${Buffer.from("qa:age-casual").toString("hex")}`;
  await page.goto(`phrases/${phraseSlug}/`);
  const steps = page.getByRole("list", { name: "Diagram step by step" });
  await expect(steps).toBeVisible();
  await expect(steps.getByText("Wie heißt du?", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open full-size diagram/ })).toHaveAttribute("target", "_blank");
  const launcher = page.getByRole("button", { name: "Open dictionary", exact: true });
  await launcher.click();
  await expect(page.getByRole("dialog", { name: "Quick dictionary" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
});
