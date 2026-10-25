import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readLearnerState, readStorageJson, waitForLearnerState } from "./support/app";
import { activityById, detailPath, PRACTICE_GAME_IDS } from "./support/content";
import { addReviewCardsHere, completeGradedActivity, startActivity } from "./support/journeys";

/** Retained course practice and exact legacy URL compatibility, at root or Pages. */
async function openApp(page: Page, path: string) {
  // Playwright resolves these against the actual configured baseURL, including
  // its Pages prefix. Do not rewrite the URL or use the Pages-only gotoApp helper.
  return page.goto(path.replace(/^\//, ""));
}

function configuredBase(info: TestInfo) {
  const baseURL = info.project.use.baseURL;
  expect(typeof baseURL).toBe("string");
  const base = new URL(baseURL!);
  return { base, isPages: base.pathname.replace(/\/$/, "") !== "" };
}

function canonicalRequestPath(path: string, info: TestInfo) {
  const { isPages } = configuredBase(info);
  return path.replace(/^\/+|\/+$/g, "") + (isPages ? "/" : "");
}

function matchesHandoff(url: URL, info: TestInfo) {
  const { base, isPages } = configuredBase(info);
  const target = new URL("play/", base);
  const original = new URLSearchParams(rawQuery);
  const keys = [...new Set(original.keys())].sort();
  const actualKeys = [...new Set(url.searchParams.keys())].sort();
  const semanticQueryMatches = JSON.stringify(actualKeys) === JSON.stringify(keys)
    && keys.every(key => JSON.stringify(url.searchParams.getAll(key)) === JSON.stringify(original.getAll(key)));
  const queryMatches = isPages ? url.search === rawQuery : semanticQueryMatches;
  // The static stub emits /play/ in both builds. Production Next canonicalizes
  // that to /play and may normalize query encoding; preserve ordered duplicate
  // and empty values there. Pages retains the original query bytes exactly.
  return url.pathname.replace(/\/$/, "") === target.pathname.replace(/\/$/, "")
    && queryMatches && url.hash === rawHash;
}

type WortwerkHistory = { schemaVersion: number; events: Array<{ type: string; payload: unknown }> };
type HistorySnapshot = {
  course: Awaited<ReturnType<typeof readLearnerState>>;
  play: WortwerkHistory | null;
};

async function readHistorySnapshot(page: Page): Promise<HistorySnapshot> {
  return page.evaluate(() => {
    function readJson<T>(key: string): T | null {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      try { return JSON.parse(raw); }
      catch { return null; }
    }
    return {
      course: readJson<Awaited<ReturnType<typeof readLearnerState>>>("german-learning:learner-state:v1"),
      play: readJson<WortwerkHistory>("wortwerk.v2"),
    };
  });
}

// Each native alias case creates its own real history in its standard fresh page.
async function createHistoryBaseline(page: Page): Promise<HistorySnapshot> {
  // Generate valid course evidence and cards through the existing public UI.
  const activity = activityById("activity:lesson-02-core-professions");
  await openApp(page, activity.canonicalPath);
  await waitForLearnerState(page);
  await startActivity(page);
  await completeGradedActivity(page);
  await expect.poll(async () => (await readLearnerState(page))?.events.some(event =>
    event.kind === "objectiveAttempt" && event.activityId === activity.id && event.conceptId === "lex:architekt",
  ) ?? false).toBe(true);
  await openApp(page, detailPath("lex:architekt"));
  await waitForLearnerState(page);
  await addReviewCardsHere(page);

  // Explicitly enable the existing test fixture, then record one real answer.
  // This is history retention evidence, not a streak/session-completion claim.
  await openApp(page, "/play/packs/");
  const fixture = page.getByRole("checkbox", { name: /Enable Fixture only/ });
  await expect(fixture).not.toBeChecked();
  await fixture.check();
  const scope = Buffer.from(JSON.stringify({ v: 1, skills: ["gender"], count: 5 })).toString("base64url");
  await openApp(page, `/play/run/?mode=quick&scope=${scope}`);
  await page.getByRole("button", { name: "Start Quick review", exact: true }).click();
  await page.locator(".ww-corners__option").first().click();
  await expect(page.getByRole("region", { name: "Answer feedback" })).toBeVisible();
  await expect.poll(async () => (await readStorageJson<WortwerkHistory>(page, "wortwerk.v2"))?.events.some(event => event.type === "answer") ?? false).toBe(true);
  await openApp(page, "/play/");
  const { course: courseBefore, play: playBefore } = await readHistorySnapshot(page);
  expect(courseBefore?.events.length).toBeGreaterThan(0);
  expect(courseBefore?.reviewCards.length).toBeGreaterThan(0);
  expect(playBefore?.schemaVersion).toBe(2);
  expect(playBefore?.events.length).toBeGreaterThan(0);

  return { course: courseBefore, play: playBefore };
}

async function expectHistoryRetained(
  page: Page,
  before: HistorySnapshot,
  gameId: (typeof PRACTICE_GAME_IDS)[number],
): Promise<void> {
  const { course: courseBefore, play: playBefore } = before;
  const { course: courseAfter, play: playAfter } = await readHistorySnapshot(page);
  expect(courseAfter?.events, gameId).toEqual(courseBefore?.events);
  expect(courseAfter?.reviewCards, gameId).toEqual(courseBefore?.reviewCards);
  expect(playAfter?.events, gameId).toEqual(playBefore?.events);
}

// Use the same generated typed-ID detail convention as journey06.
const CONVERSATION_PATH = detailPath("qa:profession-casual-main").replace(
  "/phrases/",
  "/conversation/",
);

const detailReturn = {
  entryContext: "hub",
  returnPath: detailPath("qa:profession-casual-main"),
  hubId: "phrases",
  resultId: "qa:profession-casual-main",
};
const rawQuery = `?lesson=02&legacy=one&legacy=two&empty=&q=A%2BB+space&nav=${encodeURIComponent(JSON.stringify(detailReturn))}`;
const rawHash = "#legacy-card-%C3%84";

test.describe("journey 5 · retained practice and legacy game handoffs", () => {
  test("the practice hub retains course recall, checked articles, conversation and bounded Back", async ({ page }, info) => {
    await openApp(page, `/practice/?nav=${encodeURIComponent(JSON.stringify(detailReturn))}`);
    await waitForLearnerState(page);
    await expect(page.locator("main h1")).toHaveText("Practice");
    await expect(page.locator("[data-practice-hub]")).toHaveCount(1);
    await expect(page.locator("main [data-game-id]")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Focused games");

    const recall = page.locator(".course-practice");
    await expect(recall.getByRole("heading", { name: "Recall your selected words", exact: true })).toBeVisible();
    await recall.getByRole("button", { name: "Reveal German", exact: true }).click();
    await expect(recall.getByRole("status")).toContainText("Answer revealed");
    await recall.getByRole("combobox", { name: "Practice mode", exact: true }).selectOption("article");
    await recall.getByRole("button", { name: "der", exact: true }).click();
    await expect(recall.getByRole("status")).toContainText(/Correct!|The article is/);
    await expect(recall.getByRole("button", { name: "der", exact: true })).toBeDisabled();

    const back = page.locator("main .back-link");
    expect(new URL((await back.getAttribute("href"))!, page.url()).pathname.replace(/\/$/, "").endsWith(detailReturn.returnPath)).toBe(true);
    const conversation = page.locator('[data-conversation-entry="true"]');
    await expect(conversation).toContainText("Conversation ladder");
    const conversationUrl = new URL((await conversation.getAttribute("href"))!, page.url());
    const { base } = configuredBase(info);
    const expectedConversation = new URL(CONVERSATION_PATH.replace(/^\//, ""), base);
    expect(conversationUrl.pathname.replace(/\/$/, "")).toBe(expectedConversation.pathname);
    expect(JSON.parse(conversationUrl.searchParams.get("nav")!)).toEqual(detailReturn);
    await conversation.click();
    await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, "") === expectedConversation.pathname);
    expect(JSON.parse(new URL(page.url()).searchParams.get("nav")!)).toEqual(detailReturn);
    await expect(page.locator("main h1")).toHaveText("Five-level ladder");
    const ladder = page.locator('main [data-conversation="true"]');
    await expect(ladder).toBeVisible();
    const levels = ladder.locator("button[data-level-id]");
    await expect(levels).toHaveCount(5);
    expect(await levels.evaluateAll(buttons => buttons.map(button => button.getAttribute("data-level-id")))).toEqual([
      "model", "guided-recognition", "substitution", "independent-construction", "spoken-role-play",
    ]);
    await expect(ladder).toContainText("Current level: Model (1/5)");
    await expect(ladder.locator('[data-level="model"] .qa-bubble--question .german')).toHaveText("Was bist du von Beruf?");

    await openApp(page, "/practice/");
    const play = page.getByRole("link", { name: "Open Play", exact: true });
    const playUrl = new URL((await play.getAttribute("href"))!, page.url());
    expect(playUrl.pathname.replace(/\/$/, "").endsWith("/play")).toBe(true);
    expect(playUrl.search).toBe("");
    await play.click();
    await expect(page.locator("main h1")).toHaveText("Wortwerk");
  });

  for (const gameId of PRACTICE_GAME_IDS) {
    test(`${gameId} is a static handoff preserving Pages raw and root semantic query state`, async ({ page }, info) => {
      const { base } = configuredBase(info);
      const target = new URL("play/", base);
      const path = `${canonicalRequestPath(`practice/${gameId}`, info)}${rawQuery}${rawHash}`;
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain(`<link rel="canonical" href="${target.pathname}"`);
      expect(html).toMatch(/<script>[^<]*window\.location\.replace\([^<]*<\/script>/);
      expect(html).toContain("window.location.search");
      expect(html).toContain("window.location.hash");
      expect(html).toMatch(/<noscript><meta http-equiv="refresh" content="0;url=[^"]*\/play\/"/);
      expect(html.replace(/<!--[\s\S]*?-->/g, "")).toContain(`href="${target.pathname}">Open Play`);
      expect(html).not.toMatch(/data-game-id=|data-emitted-count=/);

      const destination = await page.request.get(canonicalRequestPath("play", info), { maxRedirects: 0 });
      expect(destination.status()).toBe(200);
      const historyBefore = await createHistoryBaseline(page);
      await openApp(page, path);
      await expect(page).toHaveURL(url => matchesHandoff(url, info));
      await expect(page.locator("main h1")).toHaveText("Wortwerk");
      await expect(page.locator("main [data-game-id]")).toHaveCount(0);
      await page.reload();
      await expect(page).toHaveURL(url => matchesHandoff(url, info));
      await expect(page.locator("main h1")).toHaveText("Wortwerk");
      await expectHistoryRetained(page, historyBefore, gameId);
    });
  }

  test("unknown, extra and encoded malformed game paths stay honest 404s", async ({ page }, info) => {
    for (const path of [
      "practice/not-a-game/",
      "practice/flashcards/extra/",
      "practice/flashcards%2Fextra/",
      "practice/%252F/",
    ]) {
      const response = await page.request.get(canonicalRequestPath(path, info), { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).not.toContain("This study area has moved.");
    }
    const response = await openApp(page, canonicalRequestPath("practice/not-a-game", info));
    expect(response?.status()).toBe(404);
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toContain("/practice/not-a-game");
    await expect(page.locator("main [data-game-id]")).toHaveCount(0);
  });

});
