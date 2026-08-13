import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityInteraction } from "../../apps/web/components/activities/ActivityInteraction.js";
import { buildActivityPracticePlan } from "../../apps/web/components/activities/activity-content.js";
import { getEnrichedActivity } from "../../apps/web/lib/content/enrichment-client.js";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";

describe("lesson activity content plans", () => {
  const projection = loadLearnerProjection();
  const plans = projection.activities.map((activity) => ({
    activity,
    plan: buildActivityPracticePlan(activity, getEnrichedActivity(activity.id)),
  }));

  it("builds a learner-visible interaction for all 23 published activities", () => {
    expect(projection.activities).toHaveLength(23);
    expect(plans).toHaveLength(23);
    for (const { activity, plan } of plans) {
      expect(plan.activityId).toBe(activity.id);
      expect(plan.title.length).toBeGreaterThan(0);
      expect(plan.instructions.length).toBeGreaterThan(0);
      if (plan.mechanic === "listening-notes") {
        expect(plan.gradeable).toBe(false);
        expect(plan.missingReason).toMatch(/no (gradeable content targets|answer key)/i);
      } else {
        expect(plan.gradeable).toBe(true);
        expect(plan.questions.length).toBeGreaterThan(0);
        for (const question of plan.questions) {
          expect(question.expected.length).toBeGreaterThan(0);
          if (question.targetId !== null) {
            expect(question.targetId).toMatch(/^(lex|verb|phrase|qa):/);
          }
        }
      }
    }
  });

  it("uses the complete requested mechanic set and limits honest missing states to projection gaps", () => {
    const mechanics = new Set(plans.map(({ plan }) => plan.mechanic));
    expect(mechanics).toEqual(new Set([
      "matching",
      "selection",
      "typing",
      "builder",
      "checkpoint",
      "listening-notes",
    ]));

    const listeningOnlyIds = plans
      .filter(({ plan }) => plan.mechanic === "listening-notes")
      .map(({ activity }) => activity.id)
      .sort();
    expect(listeningOnlyIds).toEqual([
      "activity:lesson-01-workbook-listening",
      "activity:lesson-02-workbook-listening",
    ]);
  });

  it("uses exact source-backed spelling and number practice instead of an empty listening note", () => {
    const alphabet = plans.find(({ activity }) => activity.id === "activity:lesson-01-alphabet-listen-spell")!.plan;
    const numbers = plans.find(({ activity }) => activity.id === "activity:lesson-02-numbers-0-100")!.plan;
    expect(alphabet.questions.map((question) => question.expected)).toContain("Ä Ö Ü ß");
    expect(alphabet.questions[0]?.accepted).toContain("ÄÖÜß");
    expect(numbers.questions.map((question) => question.expected)).toEqual([
      "einundzwanzig",
      "siebenunddreißig",
      "sechsundvierzig",
      "vierundsechzig",
      "zweiundsiebzig",
      "achtundachtzig",
      "neunundneunzig",
      "hundert",
    ]);
    expect(numbers.questions.at(-1)?.accepted).toContain("einhundert");
  });

  it("renders native form controls for every activity instead of completion-only placeholders", () => {
    for (const { activity } of plans) {
      const html = renderToStaticMarkup(createElement(ActivityInteraction, {
        activity,
        enrichment: getEnrichedActivity(activity.id),
      }));
      expect(html).toContain("Interactive activity");
      expect(html).toMatch(/<(input|textarea|button)[ >]/);
      expect(html).not.toContain("Open practice games");
    }
  });
});
