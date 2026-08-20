import { expect, test } from "@playwright/test";
import {
  REVIEW_CONFIG_KEY,
  gotoApp,
  readLearnerState,
  readSessionStorageJson,
  waitForLearnerState,
} from "./support/app";
import { detailPath } from "./support/content";
import { addReviewCardsHere, playPracticeGame } from "./support/journeys";

/**
 * Journey 4 — build review cards through real practice, then run a review
 * session to completion.
 *
 * The component suite replaces the game renderer with a stub button, so the
 * mission has never been driven by the games it actually schedules. Here every
 * card is answered through its real game.
 */

/** Which game each scheduled card renders — the mission is deterministic. */
const CARD_GAMES: Record<string, string> = {
  "card:architekt-flashcard-recall": "flashcards",
  "card:architekt-picture-recognition": "picture-word-match",
  "card:architekt-article-recognition": "article-choice",
  "card:architekt-person-form": "morphology-puzzle",
  "card:sein-present-form": "verb-builder",
};

/** Identify the game on screen from the heading each game panel renders. */
const GAME_HEADINGS: Array<[string, string]> = [
  ["Flashcards", "flashcards"],
  ["Picture–word match", "picture-word-match"],
  ["Article choice", "article-choice"],
  ["Word order", "word-order"],
  ["Verb builder", "verb-builder"],
  ["Morphology puzzle", "morphology-puzzle"],
  ["Independent construction", "qa-production"],
];

test.describe("journey 4 · review cards created by practice, session run to the end", () => {
  test("adds cards from detail pages and completes the whole mission", async ({
    page,
  }) => {
    // --- build the deck through the only UI that creates cards ---
    await gotoApp(page, detailPath("lex:architekt"));
    await waitForLearnerState(page);
    const vocabCards = await addReviewCardsHere(page);

    await gotoApp(page, detailPath("verb:sein"));
    await waitForLearnerState(page);
    const verbCards = await addReviewCardsHere(page);

    const expectedCards = vocabCards + verbCards;
    const seeded = await readLearnerState(page);
    expect(seeded?.reviewCards).toHaveLength(expectedCards);

    // --- start the mission from the review setup screen ---
    await gotoApp(page, "/review");
    await waitForLearnerState(page);
    await expect(page.getByRole("heading", { name: "Build mission" })).toBeVisible();
    await expect(page.locator("main")).toContainText(`${expectedCards} eligible`);

    // The scheduler caps how many brand-new cards one mission may introduce, so
    // the mission is a subset of the deck. Read the size the app committed to
    // rather than assuming it — then hold it to exactly that.
    const selectedChip = page.getByText(/^\d+ selected$/);
    await expect(selectedChip).toBeVisible();
    const missionSize = Number(
      /(\d+)/.exec((await selectedChip.innerText()).trim())?.[1] ?? "0",
    );
    expect(missionSize).toBeGreaterThan(0);
    expect(missionSize).toBeLessThanOrEqual(expectedCards);

    await page.getByRole("link", { name: "Start mission" }).click();

    // The setup hands the session its configuration through session storage —
    // per-tab and per-visit, so a mission's filters never outlive the visit that
    // chose them. Read the same area the app writes.
    expect(await readSessionStorageJson(page, REVIEW_CONFIG_KEY)).toMatchObject({
      lesson: "all",
      onlyDifficult: false,
      teacherAssignment: false,
    });

    await expect(page).toHaveURL(/\/review\/session\/today\/$/);
    await waitForLearnerState(page);

    // --- answer every card through its real game ---
    const played: string[] = [];
    for (let card = 1; card <= missionSize; card += 1) {
      await expect(page.locator("p.dense").first()).toContainText(
        `${card}/${missionSize}`,
      );

      const gameId = await detectGame(page);
      played.push(gameId);
      await playPracticeGame(page, gameId);

      // Advancing is the observable outcome: the next card, or the end screen.
      if (card < missionSize) {
        await expect(
          page.locator("p.dense").first(),
          `card ${card} (${gameId}) should advance the mission`,
        ).toContainText(`${card + 1}/${missionSize}`);
      } else {
        await expect(
          page.getByRole("heading", { name: "Mission finished" }),
          `the last card (${gameId}) should finish the mission`,
        ).toBeVisible();
      }
    }

    // --- completion ---
    await expect(page.getByRole("heading", { name: "Mission finished" })).toBeVisible();
    await expect(page.locator("main")).toContainText(
      "Your progress and next review dates are saved on this device.",
    );

    // Every scheduled card was answered through a distinct real game.
    expect(new Set(played).size).toBe(missionSize);
    for (const gameId of played) {
      expect(Object.values(CARD_GAMES)).toContain(gameId);
    }

    // --- the session must have moved persisted scheduling state ---
    const after = await readLearnerState(page);
    expect(after?.events.length).toBe(missionSize);
    const reviewed = (after?.reviewCards ?? []).filter(
      (card) => Number(card["reps"] ?? 0) > 0,
    );
    expect(
      reviewed,
      "every answered card must record a repetition, not just an event",
    ).toHaveLength(missionSize);

    // And it survives a reload — scheduling is not in-memory only.
    await gotoApp(page, "/review");
    await waitForLearnerState(page);
    const reloaded = await readLearnerState(page);
    expect(reloaded?.reviewCards).toHaveLength(expectedCards);
    expect(reloaded?.events.length).toBe(missionSize);
  });
});

async function detectGame(page: import("@playwright/test").Page): Promise<string> {
  for (const [heading, gameId] of GAME_HEADINGS) {
    if (
      await page
        .getByRole("heading", { name: heading, exact: true })
        .isVisible()
        .catch(() => false)
    ) {
      return gameId;
    }
  }
  throw new Error(
    `no known game panel on the review card; page shows: ${await page
      .locator("main")
      .innerText()}`,
  );
}
