import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { gotoApp, readStorage, readStorageJson } from "./support/app";

/**
 * Journey 12 — one sitting at the pronunciation listening check.
 *
 * The page exists because 110 generated clips were scattered across ~119 detail
 * pages behind individual Listen buttons, which made the human listening step
 * impossible to actually perform. This journey is that step in miniature:
 * narrow to one sound, judge a clip, come back and find the work still there,
 * and carry it out as a file. Every assertion is against the real static export
 * served over HTTP, so a page that only looks right in a unit test fails here.
 *
 * It closes nothing. Only a qualified German listener can say whether the voice
 * is good enough to teach with; this proves the instrument works.
 */

const REVIEWER_KEY =
  "german-learning-reviewer-tools:pronunciation-listening:v1";
const LEARNER_KEY = "german-learning:learner-state:v1";

type StoredBook = {
  reviewer: string;
  entries: Record<
    string,
    { clipId: string; sha256: string; verdict: string | null; note: string }
  >;
};

test.describe("journey 12 · a pronunciation listening sitting", () => {
  test("filter a sound, judge a clip, resume after a reload, carry it out", async ({
    page,
  }) => {
    // --- the page states what it is before it shows anything ---------------
    await gotoApp(page, "/review-audio");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pronunciation listening check",
    );
    const truth = page.locator(".review-audio__truth");
    await expect(truth).toContainText("The voice is a computer");
    await expect(truth).toContainText("de-DE-KatjaNeural");
    await expect(truth).toContainText("edge-tts");
    await expect(truth).toContainText("Only a qualified German speaker can decide");
    await expect(truth).toContainText("110 clips");
    await expect(truth).toContainText("354");

    // Every clip a learner can hear is on this one page.
    const players = page.locator("audio[data-review-audio]");
    await expect(players).toHaveCount(110);
    await expect(page.locator(".review-clip")).toHaveCount(110);

    // The learner store as it stands before anything is judged. The root
    // layout's provider writes an empty envelope on any route — that is the
    // app's own behaviour, not this page's — so the invariant worth asserting
    // is that a sitting here leaves it byte-identical.
    const learnerBefore = await readStorageJson(page, LEARNER_KEY);

    // --- narrow to the hardest phonetic class ------------------------------
    const rSound = page.getByRole("button", { name: /^German r \(\d+\)/ });
    await expect(rSound).toHaveAttribute("aria-pressed", "false");
    await rSound.click();
    await expect(rSound).toHaveAttribute("aria-pressed", "true");

    const filtered = page.locator(".review-clip");
    const filteredCount = await filtered.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(110);
    await expect(page.locator(".review-board__progress")).toContainText(
      `Showing ${filteredCount} of 110 clips`,
    );

    // --- the audio is real bytes, not a hopeful tag ------------------------
    const firstCard = filtered.first();
    const reference = await firstCard.getAttribute("data-clip-reference");
    expect(reference).toBeTruthy();
    const src = await firstCard.locator("audio").getAttribute("src");
    expect(src).toContain("/audio/tts-de-de-v1/");
    const audioResponse = await page.request.get(src as string);
    expect(audioResponse.status()).toBe(200);
    expect(audioResponse.headers()["content-type"]).toContain("audio");

    // --- record a verdict and a note --------------------------------------
    await firstCard.getByRole("radio", { name: /^Approve/ }).check();
    await firstCard
      .getByRole("textbox", { name: /^Note/ })
      .fill("The final r is a vowel, as it should be.");
    await page.getByLabel("Who is listening?").fill("Anna B.");

    await expect(page.locator(".review-board__count")).toContainText(
      "1 of 110",
    );
    // The board's own live region, not the offline runtime's — both are
    // `role="status"`, and only one of them is this page's feedback channel.
    await expect(page.locator(".review-board__spoken")).toContainText(
      "1 of 110 reviewed",
    );
    await expect(firstCard).toHaveAttribute("data-verdict", "approve");

    // The reviewer's opinion lives under its own key, and learner progress is
    // untouched — this page must never write into somebody's course record.
    const book = await readStorageJson<StoredBook>(page, REVIEWER_KEY);
    expect(book?.reviewer).toBe("Anna B.");
    const rows = Object.values(book?.entries ?? {});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.verdict).toBe("approve");
    expect(rows[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);

    // Learner progress is exactly where it was: judging a recording is not a
    // learning event, and none of it may leak into somebody's course record.
    const storage = await readStorage(page);
    expect(Object.keys(storage)).toContain(REVIEWER_KEY);
    expect(await readStorageJson(page, LEARNER_KEY)).toEqual(learnerBefore);
    const learnerRaw = storage[LEARNER_KEY] ?? "";
    expect(learnerRaw).not.toContain("approve");
    expect(learnerRaw).not.toContain("Anna B.");
    expect(learnerRaw).not.toContain(rows[0]?.sha256 as string);

    // --- a real reload: the work is still there ----------------------------
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pronunciation listening check",
    );
    await expect(page.locator(".review-board__count")).toContainText(
      "1 of 110",
    );
    await expect(page.getByLabel("Who is listening?")).toHaveValue("Anna B.");

    const restored = page.locator(`[data-clip-reference="${reference}"]`);
    await expect(restored).toHaveAttribute("data-verdict", "approve");
    await expect(restored.getByRole("radio", { name: /^Approve/ })).toBeChecked();
    await expect(restored.getByRole("textbox", { name: /^Note/ })).toHaveValue(
      "The final r is a vowel, as it should be.",
    );

    // --- resume where the sitting stopped ----------------------------------
    await page.getByLabel("Only the ones I have not reviewed yet").check();
    await expect(page.locator(".review-clip")).toHaveCount(109);
    await expect(
      page.locator(`[data-clip-reference="${reference}"]`),
    ).toHaveCount(0);
    await page.getByLabel("Only the ones I have not reviewed yet").uncheck();

    // --- carry the sitting out of the room ---------------------------------
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download my notes" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^german-pronunciation-listening-notes-.*\.json$/,
    );

    const exportPath = await download.path();
    expect(exportPath, "the download must produce a real file").toBeTruthy();
    const notes = JSON.parse(
      await readFile(exportPath as string, "utf8"),
    ) as {
      documentKind: string;
      reviewer: string;
      voice: string;
      clipsInApp: number;
      clipsInWholeGeneratedSet: number;
      clipsReviewed: number;
      notice: string;
      rows: readonly {
        clipId: string;
        sha256: string;
        audioMatchesVerdict: boolean;
        spokenText: string;
        verdict: string;
        note: string;
        reviewer: string;
        recordedAt: string;
      }[];
    };

    expect(notes.documentKind).toBe("german-pronunciation-listening-notes");
    expect(notes.reviewer).toBe("Anna B.");
    expect(notes.voice).toBe("de-DE-KatjaNeural");
    expect(notes.clipsInApp).toBe(110);
    expect(notes.clipsInWholeGeneratedSet).toBe(354);
    expect(notes.clipsReviewed).toBe(1);
    expect(notes.notice).toContain("computer-generated");
    expect(notes.rows).toHaveLength(1);

    const row = notes.rows[0];
    expect(row?.clipId).toMatch(/^aud:tts:[0-9a-f]+:v\d+$/);
    // The short reference on screen is the head of the full id in the file, so
    // a note written against "clip 9b5ae837" resolves without guesswork.
    expect(row?.clipId).toContain(reference as string);
    expect(row?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.audioMatchesVerdict).toBe(true);
    expect(row?.spokenText.length).toBeGreaterThan(0);
    expect(row?.verdict).toBe("approve");
    expect(row?.note).toBe("The final r is a vowel, as it should be.");
    expect(row?.reviewer).toBe("Anna B.");
    expect(new Date(row?.recordedAt as string).getTime()).toBeGreaterThan(0);
  });

  test("stays out of the learner's way", async ({ page }) => {
    // Reachable by address only: no learner surface offers a way in, and the
    // page says so rather than leaving it to be discovered.
    await gotoApp(page, "/");
    await expect(page.locator('a[href*="review-audio"]')).toHaveCount(0);
    await expect(
      page.locator("nav").filter({ hasText: "Pronunciation" }),
    ).toHaveCount(0);

    await gotoApp(page, "/review-audio");
    await expect(page.locator(".review-audio__truth")).toContainText(
      "It is not in the menu",
    );
    // Outside the app shell entirely — no rail, no bottom bar to click away to.
    await expect(page.locator("nav")).toHaveCount(0);
    await expect(page.locator(".app-shell")).toHaveCount(0);
  });
});
