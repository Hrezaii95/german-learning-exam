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

test("saving a profession in People is reflected on its aliased full card and can be removed there", async ({ page }) => {
  await page.goto("collections/professions/?q=Elektriker&view=illustrated");
  await expect(page).toHaveURL(/\/cheat-sheets\/subjects\/people\/?\?/);
  await expect(page.getByRole("searchbox", { name: "Find a word or form", exact: true })).toHaveValue("Elektriker");
  await page.locator("[data-subject-entry]").filter({ hasText: "der Elektriker" }).first().click();
  const dropdown = page.locator(".subject-word-dropdown");
  const fullCard = await dropdown.getByRole("link", { name: "Full vocabulary card →", exact: true }).getAttribute("href");
  expect(fullCard).toBeTruthy();
  const save = dropdown.getByRole("button", { name: /^Save to review:/ });
  await expect(save).toHaveCount(1);
  await save.click();
  await page.goto("collections/professions/01/");
  await expect(page).toHaveURL(/\/vocabulary\/[^/?]+\/?\?nav=/);
  expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(new URL(fullCard!, page.url()).pathname.replace(/\/$/, ""));
  await expect(page.locator("[data-word-card]")).toContainText("die Elektrikerinnen");
  await page.getByRole("button", { name: /^Remove from review:/ }).click();
  await page.goto("saved/");
  await expect(page.locator(".study-saved-card")).toHaveCount(0);
});

test("profession filters control shared People entries and preserve full-card context", async ({ page }, testInfo) => {
  await page.goto("collections/professions/?view=illustrated");
  await expect(page).toHaveURL(/\/cheat-sheets\/subjects\/people\/?\?/);
  const entries = page.locator("[data-subject-entry]");
  const filters = page.locator(".subject-sheet-filters");
  const source = filters.getByRole("combobox", { name: "Filter vocabulary by source", exact: true });
  await expect(source).toHaveValue("teacher-extra");
  const lessons = filters.locator("details").filter({ has: page.getByRole("group", { name: "Choose lessons", exact: true }) });
  await lessons.locator("summary").click();
  await lessons.getByRole("checkbox", { name: "Lesson 12", exact: true }).check();
  await expect(entries).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No matching vocabulary", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark reviewed", exact: true })).toHaveCount(0);
  await lessons.getByRole("checkbox", { name: "Lesson 2", exact: true }).check();
  await lessons.getByRole("checkbox", { name: "Lesson 12", exact: true }).uncheck();
  await lessons.locator("summary").click();
  await expect(entries.first()).toBeVisible();
  expect((await entries.allTextContents()).every(text => text.includes("Teacher extra"))).toBe(true);
  const tags = filters.locator("details").filter({ has: page.getByRole("group", { name: "Choose subject tags", exact: true }) });
  await tags.locator("summary").click();
  await tags.getByRole("checkbox", { name: "Numbers, prices & time", exact: true }).check();
  await tags.getByRole("checkbox", { name: "People, family & jobs", exact: true }).uncheck();
  await expect(entries).toHaveCount(0);
  await tags.getByRole("checkbox", { name: "People, family & jobs", exact: true }).check();
  await tags.getByRole("checkbox", { name: "Numbers, prices & time", exact: true }).uncheck();
  await tags.locator("summary").click();
  await source.selectOption("all");
  expect(new URL(page.url()).searchParams.has("source")).toBe(false);
  await source.selectOption("teacher-extra");
  await page.getByRole("searchbox", { name: "Find a word or form", exact: true }).fill("Elektriker");
  const electrician = entries.filter({ hasText: "der Elektriker" });
  await expect(electrician).toHaveCount(1);
  await electrician.click();
  const dropdown = page.locator(".subject-word-dropdown");
  await expect(dropdown.locator(".study-tag-list")).toContainText("Lesson 2");
  await expect(dropdown.getByRole("button", { name: "Listen: der Elektriker", exact: true })).toBeVisible();
  await dropdown.getByRole("link", { name: "Full vocabulary card →", exact: true }).click();
  await page.getByRole("link", { name: /^← Back/ }).first().click();
  const restored = new URL(page.url()).searchParams;
  expect(restored.get("lesson")).toBe("2");
  expect(restored.get("source")).toBe("teacher-extra");
  expect(restored.get("tags")).toBe("people");
  expect(restored.get("q")).toBe("Elektriker");
  await expect(page.locator(".subject-word-dropdown")).toContainText("die Elektriker");
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
  // Vocabulary browsing now lives in subject sheets; lesson word previews still
  // expose the exact-file player whose failure/retry contract this checks.
  await page.goto("lessons/03/#words");
  const preview = page.locator("[data-word-family]").filter({ has: page.locator(".meaning-plate__audio audio") }).first();
  await expect(preview).toBeVisible();
  const player = preview.locator(".meaning-plate__audio").first();
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
