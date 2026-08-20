import { expect, test } from "@playwright/test";
import {
  LEARNER_STATE_KEY,
  gotoApp,
  readLearnerState,
  waitForLearnerState,
} from "./support/app";
import { activityById, firstActivity } from "./support/content";
import { completeGradedActivity, startActivity } from "./support/journeys";

/**
 * Journey 2 — complete an activity, reload, and prove the progress survived.
 *
 * This is the journey the component suite structurally cannot cover: every
 * jsdom test mocks or hand-seeds the store, so the write→serialize→reload→parse
 * →rehydrate→re-render round trip has never actually run. A regression anywhere
 * on that path is invisible to 659 passing unit tests and total to a learner.
 */
test.describe("journey 2 · completion survives a reload", () => {
  test("completing an activity persists across a full page reload", async ({ page }) => {
    await gotoApp(page, firstActivity.canonicalPath);
    await waitForLearnerState(page);
    await startActivity(page);

    const completion = await completeGradedActivity(page);
    expect(completion).toMatch(/You completed all \d+ source-backed questions?\./);

    await expect(page.locator(".journey-status")).toContainText("Status: Completed");

    // Written, before we touch the browser again.
    const beforeReload = await readLearnerState(page);
    expect(beforeReload?.activityProgress).toContainEqual(
      expect.objectContaining({
        activityId: firstActivity.id,
        progressState: "completed",
      }),
    );
    expect(
      beforeReload?.resume,
      "finishing an activity should move the resume point on",
    ).not.toBeNull();

    // The boundary this whole spec exists for.
    await page.reload();
    await waitForLearnerState(page);

    await expect(
      page.locator(".journey-status"),
      "completion must still be shown after a reload, not recomputed as new",
    ).toContainText("Status: Completed");
    await expect(page.getByRole("button", { name: "Start activity" })).toHaveCount(0);

    const afterReload = await readLearnerState(page);
    expect(afterReload?.activityProgress).toEqual(beforeReload?.activityProgress);
    expect(afterReload?.resume).toEqual(beforeReload?.resume);
  });

  test("mastery evidence from an activity survives a reload", async ({ page }) => {
    // Only four activities own a mastery concept (PERSISTED_OWNER_BY_ACTIVITY),
    // so this is the one shape of activity that writes to the event log. The
    // first spec proves progress crosses the storage boundary; this proves the
    // evidence does too, which is what mastery is later derived from.
    const evidenceActivity = activityById("activity:lesson-02-core-professions");

    await gotoApp(page, evidenceActivity.canonicalPath);
    await waitForLearnerState(page);
    await startActivity(page);
    await completeGradedActivity(page);

    await expect
      .poll(async () => (await readLearnerState(page))?.events.length ?? 0, {
        message: "a concept-owning activity must record mastery evidence",
      })
      .toBeGreaterThan(0);

    const before = await readLearnerState(page);
    expect(before?.events[0]).toMatchObject({
      kind: "objectiveAttempt",
      activityId: evidenceActivity.id,
      conceptId: "lex:architekt",
    });

    await page.reload();
    await waitForLearnerState(page);

    const after = await readLearnerState(page);
    expect(after?.events).toEqual(before?.events);
    await expect(page.locator(".journey-status")).toContainText("Status: Completed");
  });

  test("completed work is reflected on the lesson and the dashboard after reload", async ({
    page,
  }) => {
    await gotoApp(page, firstActivity.canonicalPath);
    await waitForLearnerState(page);
    await startActivity(page);
    await completeGradedActivity(page);

    await gotoApp(page, `/lessons/${firstActivity.lessonRouteSegment}`);
    await waitForLearnerState(page);
    await expect(page.locator(".lesson-progress")).toContainText("1 of 12 completed");

    const learnStage = page
      .locator("article.stage-card")
      .filter({ has: page.getByRole("heading", { name: "Learn", exact: true }) });
    await expect(learnStage).toContainText("1 of 6 completed");
    await expect(
      learnStage.locator("li").filter({ hasText: firstActivity.promptPlainText }),
    ).toContainText("Completed");

    await gotoApp(page, "/");
    await waitForLearnerState(page);
    await expect(page.locator("main")).toContainText("1 of 12 done");
  });

  test("a hostile localStorage value fails closed instead of silently resetting", async ({
    page,
  }) => {
    // Corruption must never be papered over: the learner's data is the product.
    await gotoApp(page, "/");
    await page.evaluate((key) => {
      window.localStorage.setItem(key, "{not json");
    }, LEARNER_STATE_KEY);

    await gotoApp(page, "/settings");
    // Scoped to the page's own alert — Next mounts a permanent empty
    // route-announcer that also carries role="alert".
    await expect(page.locator("main [role='alert']")).toContainText(
      /Learner state operation failed|storage/i,
    );

    const raw = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      LEARNER_STATE_KEY,
    );
    expect(raw, "corrupt state must be preserved, not overwritten").toBe("{not json");
  });
});
