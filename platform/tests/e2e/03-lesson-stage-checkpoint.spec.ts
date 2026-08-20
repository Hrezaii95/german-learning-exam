import { expect, test } from "@playwright/test";
import { gotoApp, readLearnerState, waitForLearnerState } from "./support/app";
import { checkpointActivity } from "./support/content";
import { completeGradedActivity, startActivity } from "./support/journeys";

/**
 * Journey 3 — lessons index → lesson → stage → activity → checkpoint completed.
 *
 * Walked by clicking, never by typed URLs: the point is that the structure a
 * learner navigates through actually connects end to end.
 */
const checkpoint = checkpointActivity("01");

test.describe("journey 3 · lesson structure through to the checkpoint", () => {
  test("navigates lessons → lesson 1 → checkpoint stage → checkpoint activity", async ({
    page,
  }) => {
    await gotoApp(page, "/lessons");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lessons");

    const lessonOne = page
      .locator("article.panel")
      .filter({ hasText: "Ich heiße Miriam." })
      .first();
    await lessonOne.getByRole("link", { name: "Open overview" }).click();

    await expect(page).toHaveURL(/\/lessons\/01\/$/);
    await waitForLearnerState(page);

    // The five stages a learner is promised, in order.
    await expect(page.locator("article.stage-card h3")).toHaveText([
      "Lesson overview",
      "Learn",
      "Listening",
      "Practise",
      "Checkpoint",
    ]);

    const checkpointStage = page
      .locator("article.stage-card")
      .filter({ has: page.getByRole("heading", { name: "Checkpoint", exact: true }) });
    await expect(checkpointStage).toContainText("0 of 1 completed");
    await expect(checkpointStage).toContainText("Required");

    const link = checkpointStage.getByRole("link", {
      name: checkpoint.promptPlainText,
    });
    await expect(checkpointStage.locator("li")).toContainText("Not started");
    await link.click();

    await expect(page).toHaveURL(new RegExp(`${checkpoint.canonicalPath}/`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      checkpoint.promptPlainText,
    );
    await expect(
      page.getByRole("heading", { name: "Checkpoint questions" }),
    ).toBeVisible();
  });

  test("completing the checkpoint records it and offers the review handoff", async ({
    page,
  }) => {
    await gotoApp(page, checkpoint.canonicalPath);
    await waitForLearnerState(page);
    await startActivity(page);

    const completion = await completeGradedActivity(page);
    expect(completion).toMatch(/You completed all \d+ source-backed questions?\./);

    await expect(page.locator(".journey-status")).toContainText("Status: Completed");

    // The checkpoint is the one activity that hands the learner onward.
    const handoff = page.locator(".checkpoint-handoff");
    await expect(handoff).toContainText("Checkpoint recorded.");
    await expect(handoff.getByRole("link", { name: "Review" })).toBeVisible();
    await expect(handoff.getByRole("link", { name: "the lesson overview" })).toBeVisible();

    const state = await readLearnerState(page);
    expect(state?.activityProgress).toContainEqual(
      expect.objectContaining({
        activityId: checkpoint.id,
        stageId: "check",
        progressState: "completed",
      }),
    );

    // And the lesson it belongs to reflects it.
    await handoff.getByRole("link", { name: "the lesson overview" }).click();
    await waitForLearnerState(page);
    const checkpointStage = page
      .locator("article.stage-card")
      .filter({ has: page.getByRole("heading", { name: "Checkpoint", exact: true }) });
    await expect(checkpointStage).toContainText("1 of 1 completed");
    await expect(checkpointStage.locator("li")).toContainText("Completed");
  });
});
