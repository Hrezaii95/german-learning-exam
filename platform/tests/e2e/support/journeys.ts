import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Reusable learner actions. Each one drives the same controls a person uses and
 * waits on a state change the person can see — never on a timer.
 */

/** The live region the activity runtime announces grading through. */
export function activityFeedback(page: Page): Locator {
  return page.locator("section.activity-practice p.live-region").first();
}

/**
 * Wait for a live region to speak again.
 *
 * `data-announcement-seq` is bumped on every announcement, including an
 * identical repeat — so it, not the message text, is the honest "the app just
 * responded" signal. Polling it means a repeated "Not yet." is still observed.
 */
async function nextAnnouncement(
  region: Locator,
  act: () => Promise<void>,
): Promise<string> {
  const before = await region.getAttribute("data-announcement-seq");
  await act();
  await expect
    .poll(async () => region.getAttribute("data-announcement-seq"), {
      message: "live region should announce the result of the submission",
      timeout: 15_000,
    })
    .not.toBe(before);
  return (await region.innerText()).trim();
}

export { nextAnnouncement };

/**
 * Answer a graded activity to completion by choosing options.
 *
 * The answer key lives in application source this suite must not import, so the
 * driver discovers the right option the way a learner without the key does:
 * pick an untried option, read the feedback, move on when it says Correct. The
 * bound is small and fixed (4 options × 8 questions), so a genuine grading
 * regression shows up as an exhausted question rather than a hang.
 *
 * Returns the completion announcement.
 */
export async function completeGradedActivity(page: Page): Promise<string> {
  const form = page.locator("form.activity-question");
  const feedback = activityFeedback(page);
  await expect(form).toBeVisible();

  let currentPrompt = "";
  let tried = new Set<string>();

  for (let step = 0; step < 60; step += 1) {
    const prompt = (await form.locator("h3").first().innerText()).trim();
    if (prompt !== currentPrompt) {
      currentPrompt = prompt;
      tried = new Set<string>();
    }

    const options = form.locator("label.activity-choice");
    const optionCount = await options.count();
    if (optionCount === 0) {
      throw new Error(
        `activity question "${prompt}" is not multiple-choice; this driver ` +
          `only covers choice questions`,
      );
    }

    let chosen: string | null = null;
    for (let i = 0; i < optionCount; i += 1) {
      const option = options.nth(i);
      const value = (await option.locator("input").inputValue()).trim();
      if (tried.has(value)) continue;
      await option.click();
      tried.add(value);
      chosen = value;
      break;
    }
    if (chosen === null) {
      throw new Error(
        `every option for "${prompt}" was rejected — no answer graded correct`,
      );
    }

    const message = await nextAnnouncement(feedback, async () => {
      await form.getByRole("button", { name: "Check answer" }).click();
    });

    if (/completed all/i.test(message)) return message;
    if (/^Correct/i.test(message)) continue;
    if (/^Not yet/i.test(message)) continue;
    throw new Error(`unexpected grading message: ${message}`);
  }
  throw new Error("graded activity did not complete within the step budget");
}

/**
 * Complete the ungraded listening-check variant (the two workbook-listening
 * activities), which finishes on a note plus a confirmation instead of grading.
 */
export async function completeListeningCheck(page: Page): Promise<void> {
  const section = page.locator("section.activity-practice");
  await section
    .getByLabel("What did you hear or practise?")
    .fill("Heard the alphabet spelled out and the names repeated.");
  await section
    .getByRole("checkbox", {
      name: "I used the linked lesson audio or listening material.",
    })
    .check();
  const feedback = activityFeedback(page);
  const message = await nextAnnouncement(feedback, async () => {
    await section.getByRole("button", { name: "Finish listening check" }).click();
  });
  expect(message).toMatch(/Listening pass complete/i);
}

/** Press "Start activity" once hydration has enabled it. */
export async function startActivity(page: Page): Promise<void> {
  const start = page.getByRole("button", { name: "Start activity" });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.locator(".journey-status")).toContainText("Status: In progress");
}

/** The correct interaction for each practice game, as a learner performs it. */
export interface GameOutcome {
  /** data-feedback kind the game reports for a correct/complete interaction. */
  kind: string;
  /** Whether the interaction emits a persisted learner event. */
  emits: boolean;
}

export async function playPracticeGame(
  scope: Page | Locator,
  gameId: string,
): Promise<GameOutcome> {
  // Page and Locator share the query surface used below, so a review card can
  // be scoped to its panel while a practice page passes the whole page.
  const root = scope;
  const submit = root.getByRole("button", { name: "Submit" });

  switch (gameId) {
    case "flashcards": {
      // Self-rating is the whole interaction; the flip is what a learner does
      // first, and it is also what the game records as a hint.
      await root.getByRole("button", { pressed: false }).first().click();
      await root.getByRole("button", { name: "good", exact: true }).click();
      return { kind: "self-rated", emits: true };
    }
    case "picture-word-match": {
      await root.getByRole("radio", { name: /der Architekt/ }).check();
      await submit.click();
      return { kind: "correct", emits: true };
    }
    case "article-choice": {
      await root.getByRole("radio", { name: /^der$/ }).check();
      await submit.click();
      return { kind: "correct", emits: true };
    }
    case "audio-match": {
      // Ships deliberately unavailable — there is nothing to play.
      return { kind: "unavailable", emits: false };
    }
    case "word-order": {
      const pool = root.locator('[data-role="pool"]');
      for (const token of ["Was", "bist", "du", "von", "Beruf?"]) {
        await pool.getByRole("button", { name: token, exact: true }).click();
      }
      await submit.click();
      return { kind: "correct", emits: true };
    }
    case "verb-builder": {
      await root.getByLabel("Type the present form for ich").fill("bin");
      await submit.click();
      return { kind: "correct", emits: true };
    }
    case "morphology-puzzle": {
      await root.getByLabel("Type the feminine form").fill("Architektin");
      await submit.click();
      return { kind: "correct", emits: true };
    }
    case "qa-production": {
      // Review's production card and conversation level four share a component.
      await root
        .getByLabel("Type your answer")
        .fill("Ich bin … von Beruf.");
      await submit.click();
      return { kind: "correct", emits: true };
    }
    default:
      throw new Error(`no driver for game "${gameId}"`);
  }
}

/**
 * Add every eligible review card on a detail page, the only learner action that
 * creates review cards.
 */
export async function addReviewCardsHere(page: Page): Promise<number> {
  const add = page.getByRole("button", { name: /^Add to review \(\d+\)$/ });
  await expect(add).toBeEnabled();
  const label = (await add.innerText()).trim();
  const expected = Number(/\((\d+)\)/.exec(label)?.[1] ?? "0");
  expect(expected).toBeGreaterThan(0);
  await add.click();
  await expect(
    page.getByRole("button", { name: `Added to review (${expected})` }),
  ).toBeDisabled();
  return expected;
}
