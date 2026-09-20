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
    await gotoApp(page, "/listening/?kind=workbook");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Listen. Read. Listen again.");
    await expect(page.locator(".book-track")).toHaveCount(1);
    await expect(page.locator(".recording-browser>div>button")).toHaveCount(12);
    const firstCard=page.locator(".book-track");
    const track=firstCard.locator("audio");
    await expect(track).toHaveAttribute("aria-label", /^workbook .*original recording$/);
    const src=await track.getAttribute("src");
    expect(src).toContain("/book/audio/");
    const audioResponse=page.waitForResponse(res=>res.url()===new URL(src!,page.url()).href);
    await firstCard.getByRole("button",{name:"Play from start",exact:true}).click();
    const response=await audioResponse;
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

    // The learner's Play from start action must advance the native player.
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
