import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "platform/package.json"));
const { chromium } = require("@playwright/test");
const base = process.env.CARD_QA_BASE ?? "http://127.0.0.1:8781/german-learning-exam";
const catalog = JSON.parse(readFileSync(resolve(root, "platform/apps/web/generated/word-cards.json"), "utf8"));
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(edge) ? { executablePath: edge } : {}) });
const failures = [], checks = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const page = await browser.newPage();
page.on("pageerror", error => failures.push(error.message));
page.on("response", response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
const paths = ["/vocabulary/w126", "/vocabulary/w128", "/vocabulary/w059", "/vocabulary/w171", "/vocabulary/w052", "/vocabulary/w008", "/vocabulary/w186", "/vocabulary/w386", "/vocabulary/w011", "/vocabulary/number-21", "/vocabulary/letter-30", "/collections/professions/01"];
try {
  for (const [width, height] of [[1440, 1000], [820, 1080], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height });
    for (const path of paths) {
      await page.goto(`${base}${path}/`, { waitUntil: "networkidle" });
      const card = page.locator("[data-word-card]");
      await card.waitFor();
      check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `${width}: page overflow at ${path}`);
      check((await card.locator("table").evaluate(table => table.scrollWidth <= table.clientWidth + 1)), `${width}: table overflow at ${path}`);
      await page.getByRole("button", { name: "Try recall" }).click();
      check(await page.getByLabel("German answer").isVisible(), `${width}: recall missing at ${path}`);
      check(await page.getByText("Lesson notes & sources").count() === 0, `${width}: answer-bearing sources remain in recall at ${path}`);
      await page.getByRole("button", { name: "Show answer" }).click();
      check((await card.locator('[role="status"]').innerText()).length > 0, `${width}: reveal missing at ${path}`);
      checks.push({ width, path, recall: true });
    }
    console.log(`Responsive cards checked at ${width}px`, { failures: failures.length });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/vocabulary/?q=ingenieur`);
  await page.locator('[data-word-card="W126"]').waitFor();
  await page.getByRole("searchbox").fill("Krankenpfleger");
  await page.locator('[data-word-card="W152"]').waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Lesson", { exact: true }).selectOption("3");
  check((await page.locator('[role="status"]').allTextContents()).some(t => t.includes("58 families")), "Lesson 3 filter did not return 58 families");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Topic", { exact: true }).selectOption("Number");
  check((await page.locator('[role="status"]').allTextContents()).some(t => t.includes("101 families")), "Numbers filter is incomplete");
  await page.goto(`${base}/collections/professions/`);
  check((await page.locator('[role="status"]').allTextContents()).some(t => t.includes("48 families")), "Teacher job filter is incomplete");
  await page.goto(`${base}/search/?q=Chocolati%C3%A8res`);
  const rare = page.getByRole("link", { name: "der Chocolatier / die Chocolatière", exact: true });
  await rare.waitFor(); await rare.click();
  await page.locator('[data-word-card="W386"]').waitFor();
  for (const id of ["W126", "W386", "W171"]) {
    const card = catalog.cards.find(c => c.id === id);
    await page.goto(`${base}${card.path}/`);
    const clips = [...card.rows.flatMap(r => [r.singular, ...r.plurals]).map(f => ({ label: `Listen: ${f.text}`, text: f.text })), { label: `Listen to example: ${card.examples[0].de}`, text: card.examples[0].de }];
    for (const clip of clips) {
      const button = page.getByRole("button", { name: clip.label, exact: true });
      await button.click();
      await page.waitForFunction(label => document.querySelector(`button[aria-label=${JSON.stringify(label)}]`)?.getAttribute("aria-pressed") === "false", clip.label, { timeout: 20000 });
      check(!(await page.locator('[role="status"]').allTextContents()).some(t => t.includes("could not play")), `Audio failed: ${clip.text}`);
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.goto(`${base}/vocabulary/w126/`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-word-card]').screenshot({ path: resolve(root, `research/word-cards/final-engineer-${width}.png`), animations: "disabled" });
  }
} catch (error) { failures.push(String(error)); }
finally { await browser.close(); }
const report = { checkedAt: new Date().toISOString(), base, passed: failures.length === 0, responsiveChecks: checks, filters: ["German search", "Lesson 3", "101 numbers", "48 teacher jobs"], audioSampleCardIds: ["W126", "W386", "W171"], failures };
writeFileSync(resolve(root, "research/word-cards/browser-qa.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ passed: report.passed, responsiveChecks: checks.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
