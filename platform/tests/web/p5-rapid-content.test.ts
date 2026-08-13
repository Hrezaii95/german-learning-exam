import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RapidContentSections } from "../../apps/web/components/content/rapid-learning-sections.js";
import {
  assertRapidLearnerContent,
  getRapidLearnerContent,
  rapidQaById,
  rapidVerbById,
} from "../../apps/web/lib/content/rapid-content.js";

describe("P5 rapid Lessons 1–2 content", () => {
  it("keeps exact published counts and review-state boundaries", () => {
    const content = getRapidLearnerContent();
    expect(content.scope.lessonIds).toEqual(["lesson:01", "lesson:02"]);
    expect(content.greetings).toHaveLength(7);
    expect(content.professionPairs).toHaveLength(13);
    expect(content.qaGroups).toHaveLength(11);
    expect(content.verbs.map((verb) => verb.id)).toEqual([
      "verb:sein",
      "verb:heissen",
      "verb:kommen",
    ]);
    expect(rapidVerbById("verb:arbeiten")).toBeNull();
    expect(rapidVerbById("verb:wohnen")).toBeNull();
    expect(content.verbGap.state).toBe("publication-pending");
    expect(content.pluralGap.state).toBe("missing");
  });

  it("uses exact approved phrase patterns for Q&A and practice", () => {
    expect(rapidQaById("qa:name-casual")?.question).toBe("Wie heißt du?");
    expect(rapidQaById("qa:origin-formal")?.answers).toEqual(["Ich komme aus …"]);
    expect(rapidQaById("qa:profession-casual-main")?.answers).toContain("Ich arbeite als …");
    expect(rapidQaById("qa:residence-casual")?.question).toBe("Wo wohnst du?");
    expect(getRapidLearnerContent().practicePrompts.find((prompt) => prompt.id === "practice:sein-du")?.answer).toBe("bist");
  });

  it("renders semantic responsive-ready sections and explicit gaps", () => {
    const html = renderToStaticMarkup(createElement(RapidContentSections));
    expect(html).toContain("Meet, greet, and say goodbye");
    expect(html).toContain("Ask, then answer");
    expect(html).toContain("Core verb patterns");
    expect(html).toContain("Article, gender, and person form");
    expect(html).toContain("der Architekt");
    expect(html).toContain("die Ärztin");
    expect(html).toContain("Arzt → Ärztin (stem change + in)");
    expect(html).toContain("Known content gaps");
    expect(html).toContain("lang=\"de\"");
    expect(html).toContain("aria-label=\"Article and gender legend\"");
  });

  it("fails closed on count drift and review-only leakage", () => {
    const drift = structuredClone(getRapidLearnerContent()) as unknown as {
      greetings: unknown[];
    };
    drift.greetings.pop();
    expect(() => assertRapidLearnerContent(drift)).toThrow("RAPID_CONTENT_INVALID_COUNTS");

    const leak = structuredClone(getRapidLearnerContent()) as unknown as {
      gaps: Array<{ learnerMessage: string }>;
    };
    leak.gaps[0]!.learnerMessage = "collection:teacher-professions";
    expect(() => assertRapidLearnerContent(leak)).toThrow(
      "RAPID_CONTENT_PRIVATE_OR_REVIEW_ONLY_LEAK",
    );
  });
});

