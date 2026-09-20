import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("saved study, course progress and settings survive a complete backup round trip", async ({ page, browser, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  if (!baseURL) throw new Error("A base URL is required for the fresh-profile restore check.");
  await page.goto("lessons/12/");
  await page.getByRole("button", { name: /^Save to review:/ }).first().click();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "bin", exact: true }).click();
  await page.getByRole("button", { name: "Next question →", exact: true }).click();
  await page.reload();
  await expect(page.locator(".study-tabs [aria-current=page]")).toHaveText("Practice");
  await expect(page.locator(".study-recall")).toContainText("Question 2 / 10");

  await page.goto("collections/professions/");
  await page.locator("#profession-practice summary").click();
  await page.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await page.reload();
  await page.locator("#profession-practice summary").click();
  await expect(page.getByText("1 marked reviewed", { exact: true })).toBeVisible();
  await page.goto("collections/professions/01/");
  await page.getByRole("button", { name: /^Save to review:/ }).first().click();
  await page.goto("saved/");
  const electrician = page.locator(".study-saved-card").filter({ hasText: "Elektriker" });
  await electrician.getByRole("textbox", { name: "My note" }).fill("Remember all four profession forms.");
  await electrician.getByRole("textbox", { name: "My note" }).press("Tab");
  await page.getByRole("button", { name: "Review 2 items →", exact: true }).click();
  await page.getByRole("button", { name: "Reveal meaning", exact: true }).click();
  await page.getByRole("button", { name: "Again · 10 min", exact: true }).click();
  await page.getByRole("button", { name: "Reveal meaning", exact: true }).click();
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await page.getByRole("button", { name: "Back to my collection", exact: true }).click();
  await page.reload();
  await page.getByRole("checkbox", { name: "Due only", exact: true }).check();
  await expect(page.locator(".study-saved-card")).toHaveCount(0);

  await page.goto("book/?page=coursebook-74");
  await page.getByRole("button", { name: "☆ Bookmark", exact: true }).click();
  await page.getByRole("button", { name: "Mark page studied", exact: true }).click();
  await page.goto("settings/");
  await page.getByRole("combobox", { name: /Audio speed/ }).selectOption("0.75");
  await page.getByRole("textbox", { name: "IANA timezone" }).fill("Asia/Tehran");
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByText("Settings saved.", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON export" }).click();
  const file = testInfo.outputPath("complete-backup.json");
  await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(Object.keys(backup.study.saved)).toHaveLength(2);
  expect(backup.study.lessonSessions["12"].position).toBe(1);
  expect(backup.study.reviewedProfessions).toHaveLength(1);
  expect(backup.study.completedPages).toContain("coursebook-74");
  expect(Object.values(backup.study.saved as Record<string, { interval: number }>).map(item => item.interval).sort()).toEqual([0, 3]);

  const fresh = await browser.newContext({ baseURL, serviceWorkers: "block" });
  try {
    const restored = await fresh.newPage();
    await restored.goto("settings/");
    await restored.getByLabel("Choose learning backup").setInputFiles(file);
    for (const width of [320, 390]) {
      await restored.setViewportSize({ width, height: 844 });
      await expect.poll(() => restored.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await restored.screenshot({ path: testInfo.outputPath("backup-preview-phone.png"), fullPage: true });
    await restored.setViewportSize({ width: 1440, height: 1000 });
    await restored.screenshot({ path: testInfo.outputPath("backup-preview-desktop.png"), fullPage: true });
    await restored.getByRole("combobox", { name: "Import method" }).selectOption("replace");
    await restored.getByRole("button", { name: "Replace included data" }).click();
    await expect(restored.getByRole("combobox", { name: /Audio speed/ })).toHaveValue("0.75");
    await expect(restored.getByRole("textbox", { name: "IANA timezone" })).toHaveValue("Asia/Tehran");
    await restored.goto("saved/");
    await expect(restored.locator(".study-saved-card")).toHaveCount(2);
    await restored.getByRole("checkbox", { name: "Due only", exact: true }).check();
    await expect(restored.locator(".study-saved-card")).toHaveCount(0);
    await restored.getByRole("checkbox", { name: "Due only", exact: true }).uncheck();
    await expect(restored.locator(".study-saved-card").filter({ hasText: "Elektriker" }).getByRole("textbox", { name: "My note" })).toHaveValue("Remember all four profession forms.");
    await restored.goto("book/?page=coursebook-74");
    await expect(restored.getByRole("button", { name: "★ Bookmarked", exact: true })).toBeVisible();
    await expect(restored.getByRole("button", { name: "✓ Page studied", exact: true })).toBeVisible();
    await restored.goto("lessons/12/");
    await expect(restored.locator(".study-recall")).toContainText("Question 2 / 10");
    await restored.getByRole("button", { name: "Restart quiz", exact: true }).click();
    await restored.reload();
    await expect(restored.locator(".study-recall")).toContainText("Question 1 / 10");
    await restored.goto("collections/professions/");
    await restored.locator("#profession-practice summary").click();
    await expect(restored.getByText("1 marked reviewed", { exact: true })).toBeVisible();

    await restored.goto("settings/");
    await restored.getByLabel("Choose learning backup").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from('{"version":99}') });
    await expect(restored.getByRole("status").filter({ hasText: "Import rejected" })).toBeVisible();
    await restored.goto("saved/");
    await expect(restored.locator(".study-saved-card")).toHaveCount(2);
    await restored.locator(".study-saved-card").filter({ hasText: "Elektriker" }).getByRole("button", { name: /^Remove from review:/ }).click();
    await restored.reload();
    await expect(restored.locator(".study-saved-card")).toHaveCount(1);
    await restored.getByRole("textbox", { name: "My note" }).fill("Keep this newer note.");
    await restored.getByRole("textbox", { name: "My note" }).press("Tab");
    await restored.getByLabel("Choose learning backup").setInputFiles(file);
    await restored.getByRole("button", { name: "Merge backup", exact: true }).click();
    await expect(restored.locator(".study-saved-card")).toHaveCount(2);
    await expect(restored.locator(".study-saved-card").filter({ hasText: "Ich bin nach Hamburg gefahren." }).getByRole("textbox", { name: "My note" })).toHaveValue("Keep this newer note.");
    await restored.getByLabel("Choose learning backup").setInputFiles(file);
    await restored.getByRole("combobox", { name: "Import method" }).selectOption("replace");
    await restored.getByRole("button", { name: "Replace included data" }).click();
    await expect(restored.locator(".study-saved-card").filter({ hasText: "Ich bin nach Hamburg gefahren." }).getByRole("textbox", { name: "My note" })).toHaveValue("");
    await restored.getByText("Reset learning data", { exact: true }).click();
    restored.once("dialog", dialog => void dialog.accept());
    await restored.getByRole("button", { name: "Reset learning progress", exact: true }).click();
    await expect(restored.locator(".study-saved-card")).toHaveCount(0);
    await restored.goto("settings/");
    await expect(restored.getByRole("combobox", { name: /Audio speed/ })).toHaveValue("1");
  } finally { await fresh.close(); }
});

test("Lesson 4 also resumes its quiz and supports an explicit restart", async ({ page }) => {
  await page.goto("lessons/04/");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.locator(".lesson-quiz-options button").first().click();
  await page.getByRole("button", { name: "Next question →", exact: true }).click();
  await page.reload();
  await expect(page.locator("#l4-practice")).toContainText("Question 2");
  await page.getByRole("button", { name: "Restart quiz", exact: true }).click();
  await expect(page.locator("#l4-practice")).toContainText("Question 1");
});
