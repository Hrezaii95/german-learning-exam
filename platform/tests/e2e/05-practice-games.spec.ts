import { expect, test } from "@playwright/test";
import { gotoApp, readLearnerState, waitForLearnerState } from "./support/app";
import { PRACTICE_GAME_IDS } from "./support/content";
import { playPracticeGame } from "./support/journeys";

/**
 * Journey 5 — play each of the seven practice games to a scored outcome.
 *
 * What "scored outcome" means here, stated plainly because the product differs
 * from what the audit assumed: no game has rounds or an end-of-session score
 * screen. A game's scored outcome is a graded attempt — the feedback region
 * reports a grade and the attempt counter and persisted event log both advance.
 * Asserting a score screen would be asserting a feature that does not exist.
 *
 * `audio-match` ships deliberately unavailable, so its honest outcome is the
 * unavailable contract: nothing to submit, nothing scored, nothing recorded.
 */

test.describe("journey 5 · every practice game reaches a scored outcome", () => {
  test("the selector lists all seven games with their availability", async ({ page }) => {
    await gotoApp(page, "/practice");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seven game modes");

    for (const gameId of PRACTICE_GAME_IDS) {
      await expect(page.locator(`[data-game-id="${gameId}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-game-id="audio-match"]')).toHaveAttribute(
      "data-availability",
      "unavailable",
    );
  });

  for (const gameId of PRACTICE_GAME_IDS.filter((id) => id !== "audio-match")) {
    test(`${gameId} grades an attempt and records it locally`, async ({ page }) => {
      await gotoApp(page, `/practice/${gameId}`);
      await waitForLearnerState(page);

      const panel = page.locator(`[data-game-id="${gameId}"]`);
      await expect(panel).toHaveCount(1);
      await expect(page.locator("[data-emitted-count]")).toHaveAttribute(
        "data-emitted-count",
        "0",
      );

      const outcome = await playPracticeGame(page, gameId);

      // Graded — the app says so in the region a screen reader would hear.
      await expect(page.locator("[data-feedback]")).toHaveAttribute(
        "data-feedback",
        outcome.kind,
      );
      // Scored — the attempt counter a learner can see moved.
      await expect(page.locator("[data-emitted-count]")).toHaveAttribute(
        "data-emitted-count",
        "1",
      );
      await expect(page.locator("main")).toContainText("Attempts this session: 1");

      // Recorded — the attempt is in local state, not just on screen.
      await expect
        .poll(async () => (await readLearnerState(page))?.events.length ?? 0, {
          message: "a graded attempt must persist a learner event",
        })
        .toBe(1);
    });
  }

  test("audio-match states it is unavailable instead of pretending to score", async ({
    page,
  }) => {
    await gotoApp(page, "/practice/audio-match");
    await waitForLearnerState(page);

    await expect(
      page.getByRole("heading", { level: 2, name: "Audio match" }),
    ).toBeVisible();
    await expect(page.locator('[data-availability="unavailable"]')).toContainText(
      /not available yet/i,
    );
    await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
    await expect(page.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "unavailable",
    );

    const disabled = page.getByRole("button", { name: /Match audio \(unavailable\)/ });
    await expect(disabled).toBeDisabled();

    await expect(page.locator("[data-emitted-count]")).toHaveAttribute(
      "data-emitted-count",
      "0",
    );
    expect(
      (await readLearnerState(page))?.events ?? [],
      "an unavailable game must not record attempts",
    ).toHaveLength(0);
  });

  test("word order accepts the rebuilt sentence and rejects a wrong order", async ({
    page,
  }) => {
    // Called out by the audit as never played; graded both ways so a change in
    // the ordering check cannot pass by always saying "correct".
    await gotoApp(page, "/practice/word-order");
    await waitForLearnerState(page);

    const pool = page.locator('[data-role="pool"]');
    const ordered = page.locator('[data-role="ordered"]');

    for (const token of ["bist", "Was", "du", "von", "Beruf?"]) {
      await pool.getByRole("button", { name: token, exact: true }).click();
    }
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "incorrect",
    );

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(ordered).toContainText("Tap tokens below to build the sentence.");

    for (const token of ["Was", "bist", "du", "von", "Beruf?"]) {
      await pool.getByRole("button", { name: token, exact: true }).click();
    }
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "correct",
    );
  });
});
