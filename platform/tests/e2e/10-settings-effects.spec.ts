import { expect, test } from "@playwright/test";
import { gotoApp, readLearnerState, waitForLearnerState } from "./support/app";
import { activityById } from "./support/content";
import { playPracticeGame } from "./support/journeys";

/**
 * Journey 10 — change audio speed and timezone, and prove each one reaches the
 * surface that consumes it.
 *
 * A settings screen that saves a value nothing reads is a settings screen that
 * does nothing. So each assertion lands on the consumer:
 *   - audio speed → the workbook player's preferred-speed control AND the real
 *     `playbackRate` of the media element;
 *   - timezone → the badge date on the dashboard, which is computed by grouping
 *     event timestamps into calendar days in the configured zone.
 */

const WORKBOOK_ACTIVITY = activityById("activity:lesson-01-workbook-listening");

/**
 * Two zones 25 hours apart. Whatever instant an event is recorded at, UTC+14 and
 * UTC−11 always land on different calendar dates — so this proves the zone is
 * applied without depending on what time the suite happens to run.
 */
const ZONE_AHEAD = "Pacific/Kiritimati";
const ZONE_BEHIND = "Pacific/Midway";

async function saveSettings(
  page: import("@playwright/test").Page,
  { timezone, speed }: { timezone?: string; speed?: string },
): Promise<void> {
  await gotoApp(page, "/settings");
  await waitForLearnerState(page);
  if (timezone !== undefined) await page.getByLabel("IANA timezone").fill(timezone);
  if (speed !== undefined) await page.getByLabel("Audio speed").selectOption(speed);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("main")).toContainText("Settings saved.");
}

test.describe("journey 10 · settings reach the surfaces that consume them", () => {
  test("audio speed changes the workbook player and the real playback rate", async ({
    page,
  }) => {
    await gotoApp(page, WORKBOOK_ACTIVITY.canonicalPath);
    await waitForLearnerState(page);
    const panelBefore = page.locator("section.workbook-audio");
    await expect(panelBefore.getByRole("button", { name: "Preferred 1×" }).first())
      .toBeVisible();

    await saveSettings(page, { speed: "1.25" });
    expect((await readLearnerState(page))?.settings.preferredAudioSpeed).toBe(1.25);

    await gotoApp(page, WORKBOOK_ACTIVITY.canonicalPath);
    await waitForLearnerState(page);

    const panel = page.locator("section.workbook-audio");
    const preferred = panel.getByRole("button", { name: "Preferred 1.25×" }).first();
    await expect(preferred, "the player must offer the chosen speed").toBeVisible();
    await expect(preferred).toHaveAttribute("aria-pressed", "true");

    // The label alone proves nothing; the media element has to be at that rate.
    await expect
      .poll(
        async () =>
          panel
            .locator("audio")
            .first()
            .evaluate((el: HTMLAudioElement) => el.playbackRate),
        { message: "the chosen speed must be applied to the audio element" },
      )
      .toBe(1.25);

    // Per-track override still works and does not leak across tracks.
    await panel.getByRole("button", { name: "Study 0.8×" }).first().click();
    await expect
      .poll(async () =>
        panel
          .locator("audio")
          .first()
          .evaluate((el: HTMLAudioElement) => el.playbackRate),
      )
      .toBe(0.8);
    await expect
      .poll(async () =>
        panel
          .locator("audio")
          .nth(1)
          .evaluate((el: HTMLAudioElement) => el.playbackRate),
      )
      .toBe(1.25);
  });

  test("the chosen speed survives a reload", async ({ page }) => {
    await saveSettings(page, { speed: "1.5" });
    await page.reload();
    await waitForLearnerState(page);
    await expect(page.getByLabel("Audio speed")).toHaveValue("1.5");

    await gotoApp(page, WORKBOOK_ACTIVITY.canonicalPath);
    await waitForLearnerState(page);
    await expect(
      page.locator("section.workbook-audio").getByRole("button", {
        name: "Preferred 1.5×",
      }).first(),
    ).toBeVisible();
  });

  test("timezone changes the calendar day the dashboard reports a badge on", async ({
    page,
  }) => {
    // Earn a badge so there is a date to compute.
    await gotoApp(page, "/practice/article-choice");
    await waitForLearnerState(page);
    await playPracticeGame(page, "article-choice");
    await expect
      .poll(async () => (await readLearnerState(page))?.events.length ?? 0)
      .toBe(1);

    const readBadgeDate = async (): Promise<string> => {
      await gotoApp(page, "/");
      await waitForLearnerState(page);
      const badge = page
        .locator(".badge-card")
        .filter({ hasText: "First meaningful attempt" });
      await expect(badge).toHaveAttribute("data-earned", "true");
      const text = await badge.innerText();
      const match = /Earned\s+(\d{4}-\d{2}-\d{2})/.exec(text);
      expect(match, `no earned date in badge text: ${text}`).not.toBeNull();
      return match?.[1] ?? "";
    };

    await saveSettings(page, { timezone: ZONE_AHEAD });
    const ahead = await readBadgeDate();

    await saveSettings(page, { timezone: ZONE_BEHIND });
    const behind = await readBadgeDate();

    expect(
      ahead,
      "two zones 25 hours apart must report different calendar days",
    ).not.toBe(behind);
    expect(ahead > behind).toBe(true);
  });

  test("an invalid timezone is refused and nothing is saved", async ({ page }) => {
    await saveSettings(page, { timezone: "Europe/Berlin", speed: "1.25" });
    const before = await readLearnerState(page);

    await page.getByLabel("IANA timezone").fill("Not/AZone");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.locator("main")).toContainText(
      "Settings were rejected; check the timezone.",
    );

    expect(
      (await readLearnerState(page))?.settings,
      "a rejected save must not modify stored settings",
    ).toEqual(before?.settings);
  });
});
