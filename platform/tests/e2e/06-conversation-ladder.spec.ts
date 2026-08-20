import { expect, type Locator, type Page, test } from "@playwright/test";
import { gotoApp, waitForLearnerState } from "./support/app";
import { detailPath } from "./support/content";

/**
 * Journey 6 — climb the conversation ladder to level five.
 *
 * The audit flagged that level five is never reached. Levels one to four are
 * text; level five is the spoken role-play and its completion gate is real:
 * `emitRecordingCycle` refuses unless the recorder actually recorded and played
 * back. Nothing in the application is stubbed here — Chromium runs the real
 * MediaRecorder against its synthetic capture device
 * (`--use-fake-device-for-media-stream`), so `getUserMedia`, `MediaRecorder`,
 * the object URL and the playback `ended` event all execute for real.
 */

const CONVERSATION_PATH = detailPath("qa:profession-casual-main").replace(
  "/phrases/",
  "/conversation/",
);

/** The German answer patterns use U+2026, not three dots. */
const ANSWER = "Ich bin … von Beruf.";

function ladderButton(page: Page, levelId: string): Locator {
  return page.locator(`[data-level-id="${levelId}"]`);
}

async function continueFromLevel(page: Page, levelId: string): Promise<void> {
  await page
    .locator(`[data-level="${levelId}"]`)
    .getByRole("button", { name: "Continue" })
    .click();
}

test.describe("journey 6 · conversation ladder to level five", () => {
  test("climbs all five levels and completes the spoken role-play", async ({ page }) => {
    await gotoApp(page, CONVERSATION_PATH);
    await waitForLearnerState(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Five-level ladder");
    await expect(page.locator("[data-conversation]")).toContainText(
      "Current level: Model (1/5)",
    );
    // Locked until earned — the ladder is a gate, not a menu.
    await expect(ladderButton(page, "spoken-role-play")).toBeDisabled();

    // --- Level 1: model ---
    await expect(page.getByRole("heading", { name: "Model", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mark studied / continue" }).click();
    await expect(page.locator("[data-conversation]")).toContainText(
      "Current level: Guided recognition (2/5)",
    );

    // --- Level 2: guided recognition ---
    const recognition = page.locator('[data-level="guided-recognition"]');
    await recognition.getByRole("radio", { name: ANSWER }).check();
    await recognition.getByRole("button", { name: "Submit" }).click();
    await expect(recognition.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "correct",
    );
    await continueFromLevel(page, "guided-recognition");
    await expect(page.locator("[data-conversation]")).toContainText(
      "Current level: Substitution (3/5)",
    );

    // --- Level 3: substitution (rebuild one exact answer from fragments) ---
    const substitution = page.locator('[data-level="substitution"]');
    const pool = substitution.locator('[data-role="pool"]');
    for (const fragment of ["Ich", "bin", "…", "von", "Beruf."]) {
      await pool.getByRole("button", { name: fragment, exact: true }).click();
    }
    await substitution.getByRole("button", { name: "Submit" }).click();
    await expect(substitution.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "correct",
    );
    await continueFromLevel(page, "substitution");
    await expect(page.locator("[data-conversation]")).toContainText(
      "Current level: Independent construction (4/5)",
    );

    // --- Level 4: independent construction (typed) ---
    const construction = page.locator('[data-level="independent-construction"]');
    await construction.getByLabel("Type your answer").fill(ANSWER);
    await construction.getByRole("button", { name: "Submit" }).click();
    await expect(construction.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "correct",
    );
    await continueFromLevel(page, "independent-construction");

    // --- Level 5: spoken role-play ---
    await expect(page.locator("[data-conversation]")).toContainText(
      "Current level: Spoken role-play (5/5)",
    );
    const spoken = page.locator('[data-level="spoken-role-play"]');
    await expect(
      page.getByRole("heading", { name: "Spoken role-play" }),
    ).toBeVisible();

    await spoken.getByRole("button", { name: "Review the prompt" }).click();
    await expect(
      spoken.getByRole("button", { name: "Prompt reviewed" }),
    ).toBeVisible();

    await enableMicrophone(page, spoken);
    await recordAndPlayBack(page, spoken);

    await spoken.getByRole("button", { name: "good", exact: true }).click();
    await spoken.getByRole("button", { name: "Mark self-check complete" }).click();
    await spoken.getByRole("button", { name: "Complete speaking level" }).click();

    await expect(spoken.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "recording-complete",
    );
    await expect(ladderButton(page, "spoken-role-play")).toHaveAttribute(
      "data-completed",
      "true",
    );
    await expect(ladderButton(page, "spoken-role-play")).toContainText("Done");
  });

  test("the speaking level refuses to complete without a real recording cycle", async ({
    page,
  }) => {
    // Guards the gate itself: without this, a broken recorder would let the
    // ladder "complete" on a self-rating alone.
    await gotoApp(page, CONVERSATION_PATH);
    await waitForLearnerState(page);

    await page.getByRole("button", { name: "Mark studied / continue" }).click();
    for (const levelId of [
      "guided-recognition",
      "substitution",
      "independent-construction",
    ]) {
      const level = page.locator(`[data-level="${levelId}"]`);
      if (levelId === "guided-recognition") {
        await level.getByRole("radio", { name: ANSWER }).check();
      } else if (levelId === "substitution") {
        const pool = level.locator('[data-role="pool"]');
        for (const fragment of ["Ich", "bin", "…", "von", "Beruf."]) {
          await pool.getByRole("button", { name: fragment, exact: true }).click();
        }
      } else {
        await level.getByLabel("Type your answer").fill(ANSWER);
      }
      await level.getByRole("button", { name: "Submit" }).click();
      await level.getByRole("button", { name: "Continue" }).click();
    }

    const spoken = page.locator('[data-level="spoken-role-play"]');
    await spoken.getByRole("button", { name: "good", exact: true }).click();
    await spoken.getByRole("button", { name: "Mark self-check complete" }).click();
    await spoken.getByRole("button", { name: "Complete speaking level" }).click();

    await expect(spoken.locator("[data-feedback]")).toHaveAttribute(
      "data-feedback",
      "recording-incomplete",
    );
    await expect(spoken).toContainText(
      "Complete record, playback, and self-check before finishing this level.",
    );
  });
});

/** Grant and initialise the recorder against Chromium's synthetic device. */
async function enableMicrophone(page: Page, spoken: Locator): Promise<void> {
  const enable = spoken.locator('[data-mic-enable="true"]');
  await expect(enable).toBeEnabled();
  await enable.click();
  await expect(spoken, "microphone should become ready").toHaveAttribute(
    "data-recorder-phase",
    "ready",
    { timeout: 20_000 },
  );
}

/**
 * Run one real capture cycle.
 *
 * MediaRecorder only reports data once the encoder has produced a chunk; a stop
 * issued before then yields an empty blob and the app correctly refuses it. So
 * this retries the capture rather than sleeping to "make sure" — each attempt
 * waits on the recorder's own published phase, and an app that can never
 * capture fails here loudly instead of hanging.
 */
async function recordAndPlayBack(page: Page, spoken: Locator): Promise<void> {
  const MAX_ATTEMPTS = 8;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await spoken.getByRole("button", { name: "Start recording" }).click();
    await expect(spoken).toHaveAttribute("data-recorder-phase", "recording");

    // Let the encoder run for a bounded number of real animation frames. This
    // is a capture window, not a delay to paper over a race: without audio
    // frames there is nothing to record, and the count is what the retry loop
    // grows when a device is slow to deliver the first chunk.
    await page.evaluate(
      (frames) =>
        new Promise<void>((resolve) => {
          let seen = 0;
          const tick = (): void => {
            seen += 1;
            if (seen >= frames) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      attempt * 10,
    );

    await spoken.getByRole("button", { name: "Stop recording" }).click();
    await expect
      .poll(async () => spoken.getAttribute("data-recorder-phase"), {
        message: "the recorder should settle after stopping",
        timeout: 20_000,
      })
      .not.toBe("stop-pending");

    const phase = await spoken.getAttribute("data-recorder-phase");
    if (phase === "finalized") {
      await spoken.getByRole("button", { name: "Play recording" }).click();
      await expect
        .poll(async () => spoken.getAttribute("data-recorder-phase"), {
          message: "playback should run and end",
          timeout: 20_000,
        })
        .toBe("finalized");
      return;
    }

    // Empty blob: the app says so honestly. Discard and capture again.
    await expect(spoken).toContainText(/Recording produced no audio|Recording failed/);
    await spoken.getByRole("button", { name: "Retry / discard" }).click();
    await expect(spoken).toHaveAttribute("data-recorder-phase", "ready");
  }
  throw new Error(
    `the recorder produced no audio in ${MAX_ATTEMPTS} capture attempts`,
  );
}
