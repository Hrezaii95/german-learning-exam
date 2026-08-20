import { expect, test } from "@playwright/test";
import { gotoApp, waitForLearnerState } from "./support/app";
import { activityById } from "./support/content";

/**
 * Journey 8 — play a published workbook track and assert real playback.
 *
 * "Assert real audio playback state" means the media element decoded actual
 * bytes and the clock advanced. A test that only checks an `<audio>` tag exists
 * would pass against a 404 or a zero-byte file, which is exactly the failure a
 * licensed-audio release cannot afford.
 */
test.describe("journey 8 · workbook listening plays for real", () => {
  test("a published track loads, plays, and advances its clock", async ({ page }) => {
    const audioResponse = page.waitForResponse(
      (res) => res.url().includes("/audio/source-workbook-approved-v1/"),
    );

    await gotoApp(page, "/listening");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Listening");
    await expect(page.locator("main")).toContainText("15 items");
    await expect(page.getByRole("heading", { name: "Workbook exercises" })).toBeVisible();

    const firstCard = page.locator('[data-hub-card="listening"]').first();
    await expect(firstCard.getByRole("heading", { level: 2 })).toHaveText(
      "Names and spelling",
    );
    await expect(firstCard).toContainText("AB 3 · Lesson 1");
    await expect(firstCard).toContainText("4 tracks");

    const track = firstCard.locator("audio").first();
    await expect(track).toHaveAttribute(
      "aria-label",
      "AB 3, track 1.01, Names and spelling",
    );

    // The bytes really came from the server, under the base path.
    const response = await audioResponse;
    expect(response.status()).toBeLessThan(400);
    expect(response.headers()["content-type"]).toContain("audio/mpeg");

    // Metadata decoded — a broken or empty file has no duration.
    await expect
      .poll(
        async () => track.evaluate((el: HTMLAudioElement) => el.readyState),
        { message: "the track should load enough data to play", timeout: 20_000 },
      )
      .toBeGreaterThanOrEqual(2);

    const duration = await track.evaluate((el: HTMLAudioElement) => el.duration);
    expect(duration).toBeGreaterThan(1);

    // Native <audio controls> has no app-owned play button; play it the way the
    // browser's own control does.
    await track.evaluate(async (el: HTMLAudioElement) => {
      await el.play();
    });

    await expect
      .poll(
        async () =>
          track.evaluate((el: HTMLAudioElement) => !el.paused && el.currentTime > 0),
        { message: "playback should actually start and the clock should advance" },
      )
      .toBe(true);

    await track.evaluate((el: HTMLAudioElement) => {
      el.pause();
    });
    await expect
      .poll(async () => track.evaluate((el: HTMLAudioElement) => el.paused))
      .toBe(true);
  });

  test("the activity panel plays only one track at a time", async ({ page }) => {
    // Two tracks playing over each other makes a listening exercise useless.
    const activity = activityById("activity:lesson-01-workbook-listening");
    await gotoApp(page, activity.canonicalPath);
    await waitForLearnerState(page);

    const panel = page.locator("section.workbook-audio");
    await expect(
      panel.getByRole("heading", { name: "Listen, slow down, repeat" }),
    ).toBeVisible();

    const tracks = panel.locator("audio");
    const count = await tracks.count();
    expect(count).toBeGreaterThan(1);

    await tracks.nth(0).evaluate(async (el: HTMLAudioElement) => {
      await el.play();
    });
    await expect
      .poll(async () => tracks.nth(0).evaluate((el: HTMLAudioElement) => !el.paused))
      .toBe(true);

    await tracks.nth(1).evaluate(async (el: HTMLAudioElement) => {
      await el.play();
    });
    await expect
      .poll(
        async () => tracks.nth(0).evaluate((el: HTMLAudioElement) => el.paused),
        { message: "starting a second track must pause the first" },
      )
      .toBe(true);
    await expect
      .poll(async () => tracks.nth(1).evaluate((el: HTMLAudioElement) => !el.paused))
      .toBe(true);
  });
});
