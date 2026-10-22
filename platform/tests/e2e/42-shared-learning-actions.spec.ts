import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

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
  const fullCard = await dropdown.getByRole("link", { name: "Full vocabulary card", exact: true }).getAttribute("href");
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
  const lessons = filters.locator("details").filter({ has: page.getByRole("group", { name: "Choose lessons", exact: true, includeHidden: true }) });
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
  const tags = filters.locator("details").filter({ has: page.getByRole("group", { name: "Choose subject tags", exact: true, includeHidden: true }) });
  await tags.locator("summary").click();
  await tags.getByRole("checkbox", { name: "Numbers, prices & time", exact: true }).check();
  await tags.getByRole("checkbox", { name: "People, family & jobs", exact: true }).uncheck();
  await expect(entries).toHaveCount(0);
  await tags.getByRole("checkbox", { name: "People, family & jobs", exact: true }).check();
  await tags.getByRole("checkbox", { name: "Numbers, prices & time", exact: true }).uncheck();
  await tags.locator("summary").click();
  await source.selectOption("all");
  await expect.poll(() => new URL(page.url()).searchParams.has("source")).toBe(false);
  await source.selectOption("teacher-extra");
  await page.getByRole("searchbox", { name: "Find a word or form", exact: true }).fill("Elektriker");
  const electrician = entries.filter({ hasText: "der Elektriker" });
  await expect(electrician).toHaveCount(1);
  await electrician.click();
  const dropdown = page.locator(".subject-word-dropdown");
  await expect(dropdown.locator(".study-tag-list")).toContainText("Lesson 2");
  await expect(dropdown.getByRole("button", { name: "Listen: der Elektriker", exact: true })).toBeVisible();
  await dropdown.getByRole("link", { name: "Full vocabulary card", exact: true }).click();
  await page.getByRole("link", { name: /^← Back/ }).first().click();
  await expect(page).toHaveURL(/\/cheat-sheets\/subjects\/people\/?\?/);
  const restored = new URL(page.url()).searchParams;
  expect(restored.get("source")).toBe("teacher-extra");
  expect(restored.get("tags")).toBe("people");
  expect(restored.get("q")).toBe("Elektriker");
  await expect(page.locator(".subject-word-dropdown")).toContainText("die Elektriker");
  await lessons.locator("summary").click();
  await expect(lessons.getByRole("checkbox", { name: "Lesson 2", exact: true })).toBeChecked();
  await expect(lessons.getByRole("checkbox", { name: "Lesson 12", exact: true })).not.toBeChecked();
  await lessons.locator("summary").click();
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

const responsiveWordFamilyCards = ["W126", "W017"].map(id => {
  const catalog = JSON.parse(readFileSync(new URL("../../apps/web/generated/word-cards.json", import.meta.url), "utf8")) as {
    cards: { id: string; path: string; rows: { singular: { tone: string } }[]; studyTags?: { concepts: string[] } }[];
  };
  const card = catalog.cards.find(candidate => candidate.id === id);
  if (!card?.rows[0]) throw new Error("Missing word-family line-art fixture: " + id);
  // ADR-020a: all word-card heroes share the source-specific line-art renderer.
  const visualKind = id === "W126" ? "semantic:gears" : "semantic:badge";
  return { id: card.id, path: card.path, tone: card.rows[0].singular.tone, subject: card.studyTags?.concepts[0] ?? "everyday", visualKind };
});

for (const card of responsiveWordFamilyCards) for (const width of [320, 390, 1366]) {
  test(card.id + " keeps its shared line art and review controls usable at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(card.path.slice(1) + "/");
    await page.evaluate(() => document.fonts.ready);
    const liveCard = page.locator('[data-word-card="' + card.id + '"]');
    await expect(liveCard).toHaveCount(1);
    await expect(liveCard).toBeVisible();
    const hero = liveCard.locator(":scope > article > header");
    const visual = hero.locator(".subject-vocabulary-visual");
    const svg = visual.locator("svg");
    await expect(visual).toHaveCount(1);
    await expect(svg).toHaveCount(1);
    await expect(liveCard.locator("img")).toHaveCount(0);
    const pathname = new URL(page.url()).pathname.replace(/\/$/, "");
    expect(pathname.endsWith(card.path)).toBe(true);
    const mode = liveCard.getByRole("group", { name: "Study mode", exact: true });
    const learn = mode.getByRole("button", { name: "Learn", exact: true });
    const recall = mode.getByRole("button", { name: "Recall", exact: true });
    const save = liveCard.getByRole("button", { name: /^(?:Save to|Remove from) review:/ });

    async function expectResponsiveCard() {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await expect(visual).toBeVisible();
      await expect(visual).toHaveAttribute("data-subject-visual", card.visualKind);
      await expect(visual).toHaveAttribute("data-subject", card.subject);
      await expect(hero.locator("[data-tone]")).toHaveAttribute("data-tone", card.tone);
      await expect(svg).toHaveAttribute("stroke", "currentColor");
      await expect(svg).toHaveAttribute("aria-hidden", "true");
      await expect(svg).toHaveAttribute("focusable", "false");
      const drawing = await svg.evaluate(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        return { width: rect.width, height: rect.height, stroke: style.stroke, color: style.color, paths: node.querySelectorAll("path").length };
      });
      expect(drawing.width).toBeGreaterThan(0);
      expect(drawing.height).toBeGreaterThan(0);
      expect(drawing.paths).toBeGreaterThan(0);
      expect(drawing.stroke).toBe(drawing.color);
      for (const target of [
        { name: "Study mode group", locator: mode, button: false },
        { name: "Save control", locator: save, button: true },
        { name: "Learn control", locator: learn, button: true },
        { name: "Recall control", locator: recall, button: true },
      ]) {
        await expect(target.locator).toBeVisible();
        const box = await target.locator.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width, height: rect.height, viewport: innerWidth };
        });
        expect(box.left, target.name + " left edge").toBeGreaterThanOrEqual(-1);
        expect(box.right, target.name + " right edge").toBeLessThanOrEqual(box.viewport + 1);
        expect(box.width, target.name + " width").toBeGreaterThan(0);
        if (target.button) expect(box.height, target.name + " touch height").toBeGreaterThanOrEqual(44);
      }
    }

    await expect(learn).toHaveAttribute("aria-pressed", "true");
    await expect(liveCard.getByRole("table")).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await expectResponsiveCard();
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(save).toContainText("Saved");
    await expectResponsiveCard();

    await recall.click();
    await expect(recall).toHaveAttribute("aria-pressed", "true");
    await expect(liveCard.getByRole("textbox", { name: "German answer", exact: true })).toBeVisible();
    await expect(liveCard.getByRole("table")).toHaveCount(0);
    await expectResponsiveCard();

    await learn.click();
    await expect(learn).toHaveAttribute("aria-pressed", "true");
    await expect(liveCard.getByRole("table")).toBeVisible();
    await expect(liveCard.getByRole("textbox", { name: "German answer", exact: true })).toHaveCount(0);
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expectResponsiveCard();
  });
}
