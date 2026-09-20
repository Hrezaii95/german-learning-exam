import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test("saved pronunciation speed follows word cards, original recordings and the reader", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    (window as unknown as { observedAudio: HTMLAudioElement[] }).observedAudio = [];
    window.Audio = class extends NativeAudio {
      constructor(src?: string) {
        super(src);
        (window as unknown as { observedAudio: HTMLAudioElement[] }).observedAudio.push(this);
      }
    };
  });
  await page.goto("settings/");
  await page.getByRole("combobox", { name: "Audio speed" }).selectOption("0.75");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Settings saved.", { exact: true })).toBeVisible();
  await page.goto("collections/professions/01/");
  await page.getByRole("button", { name: "Listen: der Elektriker", exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const audio = (window as unknown as { observedAudio: HTMLAudioElement[] }).observedAudio.at(-1);
    return audio ? { rate: audio.playbackRate, advanced: audio.currentTime > 0 } : null;
  })).toEqual({ rate: 0.75, advanced: true });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`word-card-${width}.png`), fullPage: true });
  }

  await page.goto("listening/");
  await expect(page.getByRole("combobox", { name: "Audio speed" })).toHaveValue("0.75");
  const firstTrack = page.locator("audio").first();
  await firstTrack.evaluate((audio: HTMLAudioElement) => audio.play());
  await expect.poll(() => firstTrack.evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  expect(await firstTrack.evaluate((audio: HTMLAudioElement) => audio.playbackRate)).toBe(0.75);
  await page.getByRole("combobox", { name: "Audio speed" }).selectOption("1.25");
  await expect.poll(() => firstTrack.evaluate((audio: HTMLAudioElement) => audio.playbackRate)).toBe(1.25);
  await page.goto("book/?page=coursebook-30");
  await expect(page.getByRole("combobox", { name: "Audio speed" })).toHaveValue("1.25");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Audio speed" })).toHaveValue("1.25");
});

test("saving a profession in its collection is reflected on its word card and can be removed there", async ({ page }) => {
  await page.goto("collections/professions/");
  await page.getByRole("searchbox", { name: "Search English or German" }).fill("Elektriker");
  const save = page.getByRole("button", { name: /^Save to review:/ });
  await expect(save).toHaveCount(1);
  await save.click();
  await page.goto("collections/professions/01/");
  await page.getByRole("button", { name: /^Remove from review:/ }).click();
  await page.goto("saved/");
  await expect(page.locator(".study-saved-card")).toHaveCount(0);
});

test("profession filters control both the displayed cards and the review pool", async ({ page }, testInfo) => {
  await page.goto("collections/professions/");
  await page.locator("#profession-practice summary").click();
  const scope = page.locator(".study-scope");
  await scope.locator("summary").click();
  await scope.getByRole("button", { name: "One lesson", exact: true }).click();
  await scope.getByRole("combobox", { name: "Selected lesson" }).selectOption("12");
  await expect(page.getByRole("heading", { name: "No matching profession" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark reviewed", exact: true })).toHaveCount(0);
  await scope.getByRole("combobox", { name: "Selected lesson" }).selectOption("2");
  await expect(page.getByText("48 of 48 professions match · showing 6", { exact: true })).toBeVisible();
  await expect(page.locator("#profession-practice summary")).toContainText("48 matching professions");
  await scope.getByRole("checkbox", { name: "Numbers, prices & time", exact: true }).check();
  await expect(page.getByRole("heading", { name: "No matching profession" })).toBeVisible();
  await scope.getByRole("checkbox", { name: "Numbers, prices & time", exact: true }).uncheck();
  await scope.getByRole("combobox", { name: "Material source" }).selectOption("teacher-extra");
  await scope.locator("summary").click();
  await page.getByRole("searchbox", { name: "Search English or German" }).fill("Elektriker");
  await expect(page.getByText("1 of 48 professions match · showing 1", { exact: true })).toBeVisible();
  await expect(page.locator("#profession-practice summary")).toContainText("1 matching profession");
  await expect(page.getByRole("button", { name: "Listen — der Elektriker pronunciation", exact: true })).toHaveCount(1);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`profession-actions-${width}.png`), fullPage: true });
  }
});

test("German text offers one keyboard stop per phrase and complete-phrase lookup", async ({ page }) => {
  await page.goto("lessons/12/");
  const german = page.locator('.study-german[role="toolbar"]').first();
  const phrase = await german.getAttribute("aria-label");
  expect(phrase).toBeTruthy();
  await expect(german.locator('[tabindex="0"]')).toHaveCount(1);
  await german.locator('[tabindex="0"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(german.locator("button").nth(1)).toBeFocused();
  await page.keyboard.press("Alt+Enter");
  const dictionary = page.getByRole("dialog", { name: "Quick dictionary" });
  await expect(dictionary).toBeVisible();
  await expect(dictionary.locator("input")).toHaveValue(phrase!);
  await page.keyboard.press("Escape");
  await expect(german.locator("button").nth(1)).toBeFocused();
});

test("transcript lines share pronunciation, meaning and saved-review actions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("listening/");
  const track = page.locator(".book-track").first();
  await expect(track.locator(".listening-transcript-lines > p")).toHaveCount(0);
  await track.locator("summary").click();
  const line = track.locator(".listening-transcript-lines > p").first();
  await expect(line).toBeVisible();
  const text = await line.locator(".study-german").getAttribute("aria-label");
  await expect(line.getByRole("button", { name: /^Listen:/ })).toHaveAttribute("title", /generated/i);
  await line.getByRole("button", { name: /^Meaning:/ }).click();
  const dictionary = page.getByRole("dialog", { name: "Quick dictionary" });
  await expect(dictionary.locator("input")).toHaveValue(text!);
  await page.keyboard.press("Escape");
  await line.getByRole("button", { name: /^Save to review:/ }).click();
  await expect(line.getByRole("button", { name: /^Remove from review:/ })).toBeVisible();
  await line.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("transcript-actions-phone.png") });
  await page.goto("saved/");
  await expect(page.locator(".study-saved-card")).toHaveCount(1);
  await expect(page.locator(".study-saved-card")).toContainText(text!);
});

test("a failed preview recording shows a useful error and can be retried", async ({ page }) => {
  await page.goto("vocabulary/?q=Elektriker");
  // Wait for query hydration before capturing the clip URL from the selected family.
  await expect(page.locator("[data-word-family]")).toHaveCount(1);
  await expect(page.locator("[data-word-family]")).toContainText("der Elektriker");
  const player = page.locator(".meaning-plate__audio").first();
  const audio = player.locator("audio");
  const src = await audio.getAttribute("src");
  expect(src).toBeTruthy();
  const pattern = `**/${src!.split("/").at(-1)}`;
  await page.route(pattern, route => route.abort());
  await player.getByRole("button").click();
  await expect(player.getByRole("status")).toHaveText("Audio could not play. Press Listen to retry.");
  await page.unroute(pattern);
  await player.getByRole("button").click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await expect(player.getByRole("status")).toHaveCount(0);
});
