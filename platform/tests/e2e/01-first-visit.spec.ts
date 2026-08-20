import { expect, test } from "@playwright/test";
import { PAGES_BASE, gotoApp, readLearnerState, waitForLearnerState } from "./support/app";
import { firstActivity } from "./support/content";
import { startActivity } from "./support/journeys";

/**
 * Journey 1 — first visit → dashboard → start the first Lesson 1 activity.
 *
 * A brand-new learner arrives with empty storage. The dashboard has to offer a
 * way in that actually leads to Lesson 1's first activity, and the activity has
 * to become startable once local state loads.
 */
test.describe("journey 1 · first visit to first activity", () => {
  test("a first-time learner is offered Lesson 1 and can start it", async ({ page }) => {
    await gotoApp(page, "/");
    await waitForLearnerState(page);

    // A first visit initialises an empty envelope rather than leaving the key
    // absent, so "fresh" means empty — not missing.
    const initial = await readLearnerState(page);
    expect(initial?.activityProgress, "no progress on a first visit").toEqual([]);
    expect(initial?.events, "no attempts on a first visit").toEqual([]);
    expect(initial?.reviewCards, "no review deck on a first visit").toEqual([]);
    expect(initial?.resume, "nothing to resume on a first visit").toBeNull();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your learning studio",
    );

    const continueCard = page.locator("section.studio-card--continue");
    await expect(continueCard).toContainText("Start here");
    await expect(continueCard).toContainText("Begin with the first Lesson 1 activity.");
    await expect(continueCard).toContainText("Lesson 1");

    const cta = continueCard.getByRole("link", { name: "Start learning" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      "href",
      `${PAGES_BASE}${firstActivity.canonicalPath}/`,
    );

    await cta.click();

    await expect(page).toHaveURL(
      new RegExp(`${PAGES_BASE}${firstActivity.canonicalPath}/$`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      firstActivity.promptPlainText,
    );
    await expect(page.locator("header.page-header")).toContainText("Activity 1 of 12");

    // Hydration flips the disabled server-rendered control into a real one.
    await waitForLearnerState(page);
    await expect(page.locator(".journey-status")).toContainText("Status: Not started");

    await startActivity(page);

    const state = await readLearnerState(page);
    expect(state, "starting an activity must persist local progress").not.toBeNull();
    expect(state?.activityProgress).toContainEqual(
      expect.objectContaining({
        activityId: firstActivity.id,
        lessonId: firstActivity.lessonId,
        progressState: "inProgress",
      }),
    );
  });

  test("visiting an activity sets the resume point the dashboard offers next", async ({
    page,
  }) => {
    await gotoApp(page, firstActivity.canonicalPath);
    await waitForLearnerState(page);

    await expect
      .poll(async () => (await readLearnerState(page))?.resume?.activityId, {
        message: "the visited activity should become the resume point",
      })
      .toBe(firstActivity.id);

    await gotoApp(page, "/");
    await waitForLearnerState(page);

    const continueCard = page.locator("section.studio-card--continue");
    await expect(continueCard).toContainText("Continue");
    await expect(
      continueCard.getByRole("link", { name: "Continue learning" }),
    ).toBeVisible();
  });
});
