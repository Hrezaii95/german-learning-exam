import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import { createDailyRun, type RunTask } from "../../packages/learning/src/wortwerk/index.js";
import type { Mechanic } from "../../packages/wortwerk/src/capabilities.js";
import type { GeneratedTask } from "../../packages/wortwerk/src/tasks.js";
import { materializeTask, playableCapabilities, templateFor } from "../../apps/web/lib/wortwerk/runtime";
import type { PlayScope } from "../../apps/web/lib/study/scope";
import { gotoApp, readStorageJson } from "./support/app";

// The real scheduler selects each game through the public scope contract. The
// browser receives neither a template override nor prepopulated progress.
const json = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const pack: ContentPack = {
  ...json("../fixtures/packs/de-b2-sample/pack.json") as Omit<ContentPack, "items">,
  items: json("../fixtures/packs/de-b2-sample/items/all.json") as ContentPack["items"],
};
const language = json("../../content/languages/de.json") as LanguageProfile;
const difficulty = json("../fixtures/packs/de-b2-sample/difficulty.json") as DifficultyProfile;
const STORAGE_KEY = "wortwerk.v2";
type Interaction = "tap" | "keyboard";
type Event = { id: string; type: string; payload: Record<string, unknown> };
type Snapshot = { events: Event[]; docs: Array<{ key: string; value: unknown }> };
type Example = { mechanic: Mechanic; items: string[]; skill: string };
type ScheduledExample = { now: Date; scope: PlayScope; runTask: RunTask };
const lexemes = pack.items.filter(item => item.type === "lexeme").map(item => item.id);
const examples: Example[] = [
  { mechanic: "corners", items: lexemes, skill: "gender" },
  { mechanic: "sort", items: ["d-sort"], skill: "form" },
  { mechanic: "build", items: ["d-build"], skill: "form" },
  { mechanic: "order", items: ["d-order"], skill: "order" },
  { mechanic: "gap", items: ["d-gap"], skill: "form" },
  { mechanic: "listen", items: lexemes, skill: "listening" },
  { mechanic: "match", items: lexemes, skill: "meaning" },
  { mechanic: "hotspot", items: ["text1"], skill: "reading" },
  { mechanic: "record", items: ["speak1"], skill: "speaking" },
  { mechanic: "write", items: ["write1"], skill: "writing" },
];
function scheduledExample(example: Example): ScheduledExample {
  for (let day = 0; day < 90; day += 1) {
    const now = new Date(Date.UTC(2026, 9, 22 + day, 12));
    for (const itemId of example.items) {
      const scope: PlayScope = { v: 1, items: [itemId], skills: [example.skill], count: 1 };
      const capabilities = playableCapabilities(pack, language, difficulty, scope);
      const runTask = createDailyRun({ capabilities, answers: [], now, count: 1, mode: "free" }).tasks[0];
      if (runTask && templateFor(runTask.templateId)?.mechanic === example.mechanic) return { now, scope, runTask };
    }
  }
  throw new Error(`No public one-item fixture scope schedules ${example.mechanic}`);
}
const scheduled = new Map(examples.map(example => [example.mechanic, scheduledExample(example)]));
const encode = (scope: PlayScope) => Buffer.from(JSON.stringify(scope)).toString("base64url");
async function snapshot(page: Page): Promise<Snapshot> {
  const saved = await readStorageJson<Snapshot>(page, STORAGE_KEY);
  expect(saved, "Practice evidence must be persisted by the actual UI").not.toBeNull();
  return saved!;
}
async function activate(page: Page, locator: Locator, interaction: Interaction): Promise<void> {
  await expect(locator).toBeEnabled();
  if (interaction === "keyboard") { await locator.focus(); await page.keyboard.press("Enter"); }
  else await locator.click();
}
async function enableFixture(page: Page): Promise<void> {
  await gotoApp(page, "/play/packs");
  await page.getByRole("checkbox", { name: `Enable ${pack.title}`, exact: true }).check();
}
async function beginExample(page: Page, example: ScheduledExample): Promise<GeneratedTask> {
  await page.clock.setFixedTime(example.now);
  await enableFixture(page);
  await gotoApp(page, `/play/run?pack=${pack.id}&mode=free&scope=${encode(example.scope)}`);
  await page.getByRole("button", { name: "Start Free practice", exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).events.filter(event => event.type === "session").length).toBeGreaterThan(0);
  const sessionId = (await snapshot(page)).events.find(event => event.type === "session")?.payload.sessionId;
  expect(typeof sessionId).toBe("string");
  const task = materializeTask(example.runTask, pack, language, difficulty, `${String(sessionId)}:0`);
  expect(task).not.toBeNull();
  await expect(page.getByRole("heading", { level: 2, name: task!.question.instruction, exact: true })).toBeVisible();
  return task!;
}
async function selfCheck(page: Page, interaction: Interaction): Promise<void> {
  const checklist = page.getByRole("region", { name: "Self-check", exact: true });
  await expect(checklist).toBeVisible();
  for (const checkbox of await checklist.getByRole("checkbox").all()) {
    if (interaction === "keyboard") { await checkbox.focus(); await page.keyboard.press("Space"); }
    else await checkbox.check();
  }
  await activate(page, checklist.getByRole("button", { name: "I covered these points", exact: true }), interaction);
}
async function answerTask(page: Page, task: GeneratedTask, interaction: Interaction): Promise<void> {
  if (task.mechanic === "hotspot") {
    const word = task.question.passage!.split(/\s+/u).filter(Boolean)[1]!;
    const token = page.locator(".ww-hotspot").getByRole("button", { name: word, exact: true });
    await activate(page, token, interaction);
    await expect(token).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await snapshot(page)).events.filter(event => event.type === "deck.add" && event.payload.word === word).length).toBe(1);
    await activate(page, page.getByRole("button", { name: "Finished reading", exact: true }), interaction);
  } else if (task.mechanic === "match") {
    const left = page.getByRole("group", { name: "Left cards", exact: true }).getByRole("button");
    const right = page.getByRole("group", { name: "Right cards", exact: true }).getByRole("button");
    for (const [index, partner] of task.solution.order!.entries()) {
      await activate(page, left.nth(index), interaction);
      await activate(page, right.nth(task.question.options.findIndex(option => option.id === partner)), interaction);
    }
    await activate(page, page.getByRole("button", { name: "Check pairs", exact: true }), interaction);
  } else if (task.mechanic === "record") {
    // Capture actual microphone audio. Typing a temporary alternative also gives
    // the browser enough source samples to finalize a playable recording.
    await activate(page, page.getByRole("button", { name: "Start recording", exact: true }), interaction);
    await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeEnabled();
    const alternative = page.getByRole("textbox", { name: "Written response alternative", exact: true });
    await alternative.pressSequentially("A detail", { delay: 75 });
    await alternative.fill("");
    await activate(page, page.getByRole("button", { name: "Stop recording", exact: true }), interaction);
    const compare = page.getByRole("button", { name: "Compare and self-check", exact: true });
    await expect(compare).toBeDisabled();
    await activate(page, page.getByRole("button", { name: "Play my recording", exact: true }), interaction);
    await expect(compare).toBeEnabled();
    await activate(page, compare, interaction);
    await selfCheck(page, interaction);
  } else if (task.mechanic === "write") {
    await page.getByRole("textbox", { name: "Your response", exact: true }).fill("A detail");
    await activate(page, page.getByRole("button", { name: "Compare with the model", exact: true }), interaction);
    await selfCheck(page, interaction);
  } else {
    if (task.mechanic === "listen") {
      await activate(page, page.getByRole("button", { name: "Play audio", exact: true }), interaction);
      await expect.poll(() => page.locator(".ww-task audio").first().evaluate(audio => (audio as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    }
    if (task.question.input === "sequence") {
      const bank = page.getByRole("group", { name: "Available tiles", exact: true }).getByRole("button");
      for (const id of task.solution.order!) await activate(page, bank.nth(task.question.tokens!.findIndex(token => token.id === id)), interaction);
      await activate(page, page.getByRole("button", { name: "Check answer", exact: true }), interaction);
    } else if (task.question.input === "text") {
      await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(task.solution.accepted![0]!);
      await activate(page, page.getByRole("button", { name: "Check answer", exact: true }), interaction);
    } else {
      const groupName = task.mechanic === "corners" ? "Answer choices" : "Answer options";
      const option = task.question.options.findIndex(value => value.id === task.solution.optionIds![0]);
      expect(option).toBeGreaterThanOrEqual(0);
      await activate(page, page.getByRole("group", { name: groupName, exact: true }).getByRole("button").nth(option), interaction);
    }
  }
  const feedback = page.getByRole("region", { name: "Answer feedback", exact: true });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByRole("heading", { name: task.solution.selfCheck ? "Self-check recorded" : "Correct", exact: true })).toBeVisible();
  const answers = (await snapshot(page)).events.filter(event => event.type === "answer");
  expect(answers).toHaveLength(1);
  expect(answers[0]!.payload).toMatchObject({ packId: pack.id, itemId: task.itemId, templateId: task.templateId, format: task.format });
  if (task.solution.selfCheck) expect(answers[0]!.payload).toMatchObject({ selfAssessed: true, hinted: true });
  else expect(answers[0]!.payload).toMatchObject({ correct: true, hinted: false });
  await activate(page, page.getByRole("button", { name: "See results", exact: true }), interaction);
  await expect(page.getByRole("heading", { name: "Practice complete", exact: true })).toBeVisible();
}

test.use({ timezoneId: "UTC" });
for (const width of [390, 1280]) {
  const interaction: Interaction = width === 390 ? "tap" : "keyboard";
  for (const { mechanic } of examples) {
    test(`Wortwerk ${mechanic} completes by ${interaction} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      const task = await beginExample(page, scheduled.get(mechanic)!);
      expect(task.mechanic).toBe(mechanic);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await answerTask(page, task, interaction);
      await page.reload();
      expect((await snapshot(page)).events.filter(event => event.type === "answer")).toHaveLength(1);
    });
  }

  test(`Wortwerk switches enabled pack content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.clock.setFixedTime(scheduled.get("corners")!.now);
    await enableFixture(page);
    // A real second installed pack is required. Missing pack data must fail the
    // release gate rather than trigger a synthetic registration inside a test.
    const other = page.locator(".ww-pack-list li").filter({ hasNot: page.getByText(pack.title, { exact: true }) }).first();
    await expect(other).toBeVisible();
    await other.getByRole("checkbox").check();
    await gotoApp(page, "/play");
    const picker = page.getByRole("combobox", { name: "Content pack", exact: true });
    const otherId = (await picker.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).find(id => id !== pack.id);
    expect(otherId, "The final export must contain a second playable pack").toBeTruthy();
    for (const id of [pack.id, otherId!]) {
      await picker.selectOption(id);
      await expect(picker).toHaveValue(id);
      await gotoApp(page, `/play/run?mode=free&scope=${encode({ v: 1, skills: ["gender"], count: 1 })}`);
      await page.getByRole("button", { name: "Start Free practice", exact: true }).click();
      await activate(page, page.locator(".ww-corners__option").first(), interaction);
      await expect(page.getByRole("region", { name: "Answer feedback", exact: true })).toBeVisible();
      expect((await snapshot(page)).events.filter(event => event.type === "answer").at(-1)!.payload.packId).toBe(id);
      await gotoApp(page, "/play");
      await expect(picker).toHaveValue(id);
    }
    await page.reload();
    await expect(picker).toHaveValue(otherId!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test(`Wortwerk backup restores answers and private deck data at ${width}px`, async ({ page, browser }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const task = await beginExample(page, scheduled.get("corners")!);
    await answerTask(page, task, interaction);
    const source = pack.items.find(item => item.type === "lexeme")!;
    if (source.type !== "lexeme") throw new Error("Fixture needs a source word for backup coverage");
    await gotoApp(page, "/play");
    await page.getByRole("combobox", { name: "Current lesson", exact: true }).selectOption(String(source.bookRef.lesson));
    await page.getByRole("checkbox", { name: "I have finished this lesson", exact: true }).check();
    await page.getByRole("button", { name: "Confirm book position", exact: true }).click();
    await gotoApp(page, "/play/progress");
    await page.getByRole("combobox", { name: "Add a source item", exact: true }).selectOption(source.id);
    await page.getByRole("button", { name: "Save to personal deck", exact: true }).click();
    const note = `Private backup note at ${width}px`;
    await page.getByRole("checkbox", { name: `Mark Difficult: ${source.lemma}`, exact: true }).check();
    await page.getByRole("textbox", { name: `Private note for ${source.lemma}`, exact: true }).fill(note);
    await page.getByRole("textbox", { name: `Own examples for ${source.lemma} · one per line`, exact: true }).fill("My first example.\nMy second example.");
    await page.getByRole("button", { name: `Save notes for ${source.lemma}`, exact: true }).click();
    await expect(page.getByText("Notes and examples saved.", { exact: true })).toBeVisible();
    const backup = page.getByRole("region", { name: "Practice backup", exact: true });
    const downloaded = page.waitForEvent("download");
    await backup.getByRole("button", { name: "Download practice JSON", exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toMatch(/^wortwerk-practice-\d{4}-\d{2}-\d{2}\.json$/u);
    const path = info.outputPath("practice-backup.json");
    await download.saveAs(path);
    const exported = JSON.parse(await readFile(path, "utf8")) as Snapshot & { schemaVersion: number };
    expect(exported.schemaVersion).toBe(2);
    expect(exported.events.filter(event => event.type === "answer")).toHaveLength(1);
    expect(exported.docs.some(doc => doc.key.startsWith("deck.annotation:"))).toBe(true);
    const restored = await browser.newContext({
      baseURL: String(info.project.use.baseURL), viewport: { width, height: width === 390 ? 844 : 900 },
      timezoneId: "UTC", serviceWorkers: "block",
    });
    try {
      const fresh = await restored.newPage();
      await fresh.clock.setFixedTime(scheduled.get("corners")!.now);
      // Restore is available on a clean device before any pack is enabled.
      await gotoApp(fresh, "/play/progress");
      const restorePanel = fresh.getByRole("region", { name: "Practice backup", exact: true });
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await restorePanel.getByLabel("Choose practice backup", { exact: true }).setInputFiles(path);
        await expect(restorePanel.getByRole("heading", { name: "Ready to merge", exact: true })).toBeVisible();
        await restorePanel.getByRole("button", { name: "Merge practice backup", exact: true }).click();
        await expect(restorePanel.getByRole("status")).toContainText("Practice backup merged.");
        const state = await snapshot(fresh);
        expect(state.events.map(event => event.id).sort()).toEqual(exported.events.map(event => event.id).sort());
        expect(new Set(state.events.map(event => event.id)).size).toBe(state.events.length);
      }
      await fresh.reload();
      await expect(fresh.getByRole("textbox", { name: `Private note for ${source.lemma}`, exact: true })).toHaveValue(note);
      await expect(fresh.getByRole("textbox", { name: `Own examples for ${source.lemma} · one per line`, exact: true })).toHaveValue("My first example.\nMy second example.");
      await expect(fresh.getByRole("checkbox", { name: `Mark Difficult: ${source.lemma}`, exact: true })).toBeChecked();
      await gotoApp(fresh, "/play");
      await expect(fresh.getByRole("combobox", { name: "Content pack", exact: true })).toHaveValue(pack.id);
      expect((await snapshot(fresh)).events.filter(event => event.type === "answer")).toHaveLength(1);
    } finally { await restored.close(); }
  });
}
