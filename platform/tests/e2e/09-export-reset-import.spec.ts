import { readFile, writeFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { gotoApp, readLearnerState, waitForLearnerState } from "./support/app";
import { detailPath } from "./support/content";
import { addReviewCardsHere } from "./support/journeys";

/**
 * Journey 9 — export, reset, re-import, recover everything.
 *
 * This is the learner's only backup. It has to survive a real file download, a
 * real destructive reset, and a real file upload — three things a jsdom test
 * cannot perform. Recovery is asserted against the state itself, not against a
 * success message, because "imported" is a claim and the state is the fact.
 */

async function seedLearnerWork(page: Page): Promise<void> {
  await gotoApp(page, detailPath("lex:architekt"));
  await waitForLearnerState(page);
  await addReviewCardsHere(page);

  await page.getByRole("button", { name: "Difficult", exact: true }).click();
  await expect
    .poll(async () => (await readLearnerState(page))?.tags.length ?? 0, {
      message: "tagging should persist",
    })
    .toBe(1);

  await gotoApp(page, "/settings");
  await waitForLearnerState(page);
  await page.getByLabel("IANA timezone").fill("Europe/Berlin");
  await page.getByLabel("Audio speed").selectOption("1.25");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("main")).toContainText("Settings saved.");
}

test.describe("journey 9 · export, reset, import, recover", () => {
  test("a reset learner recovers everything from their own export file", async ({
    page,
  }) => {
    await seedLearnerWork(page);

    const before = await readLearnerState(page);
    expect(before?.reviewCards.length).toBeGreaterThan(0);
    expect(before?.tags).toHaveLength(1);
    expect(before?.settings).toEqual({
      preferredAudioSpeed: 1.25,
      timezone: "Europe/Berlin",
    });

    // --- export ---
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON export" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("german-learning-state.json");

    const exportPath = await download.path();
    expect(exportPath, "the export must produce a real file").toBeTruthy();
    const exported = await readFile(exportPath as string, "utf8");
    const parsed = JSON.parse(exported) as Record<string, unknown>;
    expect(parsed["exportMeta"]).toMatchObject({ includesRawAudioBytes: false });
    expect(parsed["reviewCards"]).toHaveLength(before?.reviewCards.length ?? -1);
    expect(
      exported,
      "an export must never carry raw audio or derived reward figures",
    ).not.toMatch(/"(?:xp|streak|badges?|audioBytes|rawAudio|blob)"/i);

    await expect(page.locator("main")).toContainText(
      "Export downloaded. Raw recording audio is not included.",
    );

    // --- reset (destructive, behind a confirm) ---
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe(
        "Reset all local learner state on this device?",
      );
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Reset local data" }).click();
    await expect(page.locator("main")).toContainText("Local learner state reset.");

    await expect
      .poll(async () => (await readLearnerState(page))?.reviewCards.length ?? -1, {
        message: "reset must empty the review deck",
      })
      .toBe(0);
    const wiped = await readLearnerState(page);
    expect(wiped?.tags).toHaveLength(0);
    expect(wiped?.events).toHaveLength(0);
    expect(wiped?.settings).toEqual({ preferredAudioSpeed: 1, timezone: "UTC" });

    // The reset is visible to the learner, not only in storage.
    await page.reload();
    await waitForLearnerState(page);
    await expect(page.getByLabel("IANA timezone")).toHaveValue("UTC");
    await expect(page.getByLabel("Audio speed")).toHaveValue("1");

    // --- import the learner's own file back ---
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe(
        "Replace everything saved on this device with the contents of this file?",
      );
      void dialog.accept();
    });
    await page.locator('input[type="file"]').setInputFiles(exportPath as string);
    await expect(page.locator("main")).toContainText(
      "Learner state imported and replayed.",
    );

    // --- full recovery, asserted against state and against the UI ---
    await expect
      .poll(async () => (await readLearnerState(page))?.reviewCards.length ?? -1, {
        message: "import must restore the review deck",
      })
      .toBe(before?.reviewCards.length);

    const recovered = await readLearnerState(page);
    expect(recovered?.tags).toEqual(before?.tags);
    expect(recovered?.settings).toEqual(before?.settings);
    expect(recovered?.activityProgress).toEqual(before?.activityProgress);

    await page.reload();
    await waitForLearnerState(page);
    await expect(page.getByLabel("IANA timezone")).toHaveValue("Europe/Berlin");
    await expect(page.getByLabel("Audio speed")).toHaveValue("1.25");

    // The recovered cards are usable again, not just present in JSON.
    await gotoApp(page, "/review");
    await waitForLearnerState(page);
    await expect(page.locator("main")).toContainText(
      `${before?.reviewCards.length} eligible`,
    );
  });

  test("declining the reset confirmation changes nothing", async ({ page }) => {
    await seedLearnerWork(page);
    const before = await readLearnerState(page);

    page.once("dialog", (dialog) => {
      void dialog.dismiss();
    });
    await page.getByRole("button", { name: "Reset local data" }).click();

    await expect(page.getByLabel("Audio speed")).toHaveValue("1.25");
    expect(await readLearnerState(page)).toEqual(before);
  });

  test("a corrupt import is rejected and the existing state is preserved", async ({
    page,
  }, testInfo) => {
    await seedLearnerWork(page);
    const before = await readLearnerState(page);

    const badFile = testInfo.outputPath("corrupt-export.json");
    await writeFile(badFile, "{ not json", "utf8");

    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.locator('input[type="file"]').setInputFiles(badFile);

    await expect(page.locator("main")).toContainText(
      "Import rejected. Existing local state was preserved.",
    );
    expect(await readLearnerState(page)).toEqual(before);
  });
});
