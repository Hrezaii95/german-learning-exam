/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ActivityInteraction } from "../../apps/web/components/activities/ActivityInteraction.js";
import { LocaleProvider } from "../../apps/web/components/i18n/LocaleProvider.js";
import { LearnerStateProvider } from "../../apps/web/components/learner-state/LearnerStateProvider.js";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";
import { getEnrichedActivity } from "../../apps/web/lib/content/enrichment-client.js";
import { LOCALE_KEY, translate } from "../../apps/web/lib/i18n/catalog.js";
import { germanStudyGloss } from "../../apps/web/lib/i18n/german-study-glosses.js";
import { buildActivityReviewQueue, createLearnerStateController } from "../../apps/web/lib/learner-state/index.js";

const projection = loadLearnerProjection();
const GREETINGS = "activity:lesson-01-greeting-farewell-match";

function renderGerman(activityId: string, extra: Partial<Parameters<typeof ActivityInteraction>[0]> = {}) {
  window.localStorage.setItem(LOCALE_KEY, "de");
  const activity = projection.activities.find((item) => item.id === activityId)!;
  return render(createElement(LocaleProvider, null,
    createElement(LearnerStateProvider, null,
      createElement(ActivityInteraction, { activity, enrichment: getEnrichedActivity(activityId), ...extra }),
    ),
  ));
}

async function savedState() {
  await screen.findByText(translate("Attempt saved on this device.", "de"));
  const controller = createLearnerStateController({ store: window.localStorage });
  return (await controller.initialize()).hydration!.state;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("German-interface practice cues", () => {
  it("covers every published L1/L2 gloss with a definition rather than its German answer", () => {
    const meanings = new Set<string>();
    for (const activity of projection.activities) {
      const enriched = getEnrichedActivity(activity.id)!;
      for (const target of enriched.contentTargets) {
        if (!target.glossEn) continue;
        meanings.add(target.glossEn);
        const cue = germanStudyGloss(target.glossEn, target.displayTextDe);
        expect(cue, target.id).not.toBeNull();
        expect(cue?.toLocaleLowerCase("de-DE"), target.id)
          .not.toBe(target.displayTextDe.replace(/^(der|die|das) /u, "").toLocaleLowerCase("de-DE"));
      }
    }
    expect(meanings.size).toBeGreaterThan(50);
    // This is a teaching context, not a change to ordinary dictionary meanings.
    expect(translate("Goodbye", "de")).toBe("Auf Wiedersehen");
  });

  it("asks for a greeting's meaning and saves a genuine unaided recognition attempt", async () => {
    const user = userEvent.setup();
    renderGerman(GREETINGS);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toContain("Auf Wiedersehen");
    expect(screen.queryByRole("radio", { name: "Auf Wiedersehen" })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "höflicher Gruß beim Abschied" }));
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const state = await savedState();
    expect(state.events.filter((event) => event.kind === "objectiveAttempt")).toMatchObject([
      { conceptId: "lex:auf-wiedersehen", graderOutcome: "correct", hintsUsed: 0 },
    ]);
  });

  it("uses the same definitions in corrective feedback and retains an assisted correction for review", async () => {
    const user = userEvent.setup();
    renderGerman(GREETINGS);
    await user.click(screen.getByRole("radio", { name: "Gruß am Abend" }));
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const feedback = document.querySelector(".activity-feedback")!.textContent;
    expect(feedback).toContain("Auf Wiedersehen");
    expect(feedback).toContain("höflicher Gruß beim Abschied");
    expect(feedback).toContain("Guten Abend");
    expect(feedback).toContain("Gruß am Abend");
    await user.click(screen.getByRole("radio", { name: "höflicher Gruß beim Abschied" }));
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const state = await savedState();
    expect(buildActivityReviewQueue({ state })).toMatchObject([
      { conceptId: "lex:auf-wiedersehen", assistedRetry: true },
    ]);
  });

  it.each([
    ["activity:lesson-01-register-qa-builder", "qa:name-formal", "Wie heißen Sie?", "Frage eine Person höflich nach ihrem Namen. Verwende Sie."],
    ["activity:lesson-01-register-qa-builder", "qa:origin-casual", "Woher kommst du?", "Frage, aus welchem Land eine Person kommt. Verwende du."],
    ["activity:lesson-02-profession-qa-builder", "qa:profession-formal-main", "Was sind Sie von Beruf?", "Frage höflich nach der beruflichen Tätigkeit. Verwende Sie und von Beruf."],
  ])("gives a communicative purpose for %s / %s without showing the full answer", async (activityId, targetId, answer, cue) => {
    const user = userEvent.setup();
    renderGerman(activityId, { reviewTarget: targetId, reviewFamily: "formManipulation" });
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(cue);
    expect(screen.getByRole("heading", { level: 3 }).textContent).not.toContain(answer);
    for (const token of answer.split(" ")) await user.click(screen.getByRole("button", { name: token }));
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const state = await savedState();
    expect(state.events.filter((event) => event.kind === "objectiveAttempt")).toMatchObject([
      { conceptId: targetId, graderOutcome: "correct", hintsUsed: 0 },
    ]);
  });

  it("uses a definition for typed recall without giving away sein", async () => {
    const user = userEvent.setup();
    renderGerman("activity:lesson-02-sein-arbeiten-contrast", { reviewTarget: "verb:sein", reviewFamily: "typedRecall" });
    const prompt = screen.getByRole("heading", { level: 3 }).textContent!;
    expect(prompt).toContain("Grundform zu bin, bist und ist");
    expect(prompt).not.toMatch(/\bsein\b/u);
    await user.type(screen.getByRole("textbox"), "sein");
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const state = await savedState();
    expect(state.events.filter((event) => event.kind === "objectiveAttempt")).toMatchObject([
      { conceptId: "verb:sein", graderOutcome: "correct", hintsUsed: 0 },
    ]);
  });

  it("does not credit an identical fallback meaning as unaided recognition", async () => {
    const user = userEvent.setup();
    const enrichment = getEnrichedActivity(GREETINGS)!;
    renderGerman(GREETINGS, {
      enrichment: {
        ...enrichment,
        contentTargets: enrichment.contentTargets.map((target) => target.id === "lex:auf-wiedersehen"
          ? { ...target, glossEn: "Auf Wiedersehen" }
          : target),
      },
    });
    await user.click(screen.getByRole("radio", { name: "Auf Wiedersehen" }));
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const state = await savedState();
    expect(state.events.filter((event) => event.kind === "objectiveAttempt")).toMatchObject([
      { conceptId: "lex:auf-wiedersehen", graderOutcome: "correct", hintsUsed: 1 },
    ]);
  });

  it("does not credit an identical fallback prompt as unaided typed recall", async () => {
    const user = userEvent.setup();
    const activityId = "activity:lesson-02-sein-arbeiten-contrast";
    const enrichment = getEnrichedActivity(activityId)!;
    renderGerman(activityId, {
      reviewTarget: "verb:sein", reviewFamily: "typedRecall",
      enrichment: {
        ...enrichment,
        contentTargets: enrichment.contentTargets.map((target) => target.id === "verb:sein"
          ? { ...target, glossEn: "sein" }
          : target),
      },
    });
    expect(screen.getByRole("heading", { level: 3 }).textContent).toMatch(/\bsein\b/u);
    await user.type(screen.getByRole("textbox"), "sein");
    await user.click(screen.getByRole("button", { name: translate("Check answer", "de") }));
    const state = await savedState();
    expect(state.events.filter((event) => event.kind === "objectiveAttempt")).toMatchObject([
      { conceptId: "verb:sein", graderOutcome: "correct", hintsUsed: 1 },
    ]);
  });
});
