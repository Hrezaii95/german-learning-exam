import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ActivityConceptVisual,
  GrammarConceptVisual,
  LessonJourneyVisual,
  NounSystemVisual,
  QuestionAnswerFlowVisual,
  VerbPatternVisual,
} from "../../apps/web/components/media/InstructionalVisuals.js";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import { illustrationForLesson } from "../../apps/web/lib/content/illustrations.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

describe("P5 instructional visual system", () => {
  const projection = projectPublishedLearnerWeb(publishedDir);
  const details = projectPublishedLearnerDetails(publishedDir);

  it("gives both lesson overviews a contextual image and an ordered visual route", () => {
    const lessonOne = projection.lessons.find((lesson) => lesson.id === "lesson:01")!;
    const lessonTwo = projection.lessons.find((lesson) => lesson.id === "lesson:02")!;

    expect(illustrationForLesson(lessonOne.id)?.filename).toBe("lesson-01-name-origin-class.png");
    expect(illustrationForLesson(lessonTwo.id)?.filename).toBe("lesson-02-professions-ensemble.png");
    expect(illustrationForLesson("lesson:03")).toBeNull();

    const lessonOneHtml = renderToStaticMarkup(createElement(LessonJourneyVisual, { lesson: lessonOne }));
    const lessonTwoHtml = renderToStaticMarkup(createElement(LessonJourneyVisual, { lesson: lessonTwo }));
    expect(lessonOneHtml).toContain('data-instructional-visual="lesson-01-journey"');
    expect(lessonOneHtml).toContain("Ich heiße …");
    expect(lessonOneHtml).toContain("du ↔ Sie");
    expect(lessonTwoHtml).toContain('data-instructional-visual="lesson-02-journey"');
    expect(lessonTwoHtml).toContain("0 → 100");
    expect(lessonTwoHtml).toContain("Was sind Sie von Beruf?");
  });

  it("maps twelve high-value activities to source-safe visual families", () => {
    const expected = new Map([
      ["activity:lesson-01-greetings-by-context", "greetings-dayparts"],
      ["activity:lesson-01-greeting-farewell-match", "greetings-dayparts"],
      ["activity:lesson-01-heissen-sein-notice", "core-verb-patterns"],
      ["activity:lesson-01-pronoun-verb-builder", "core-verb-patterns"],
      ["activity:lesson-02-full-person-conjugation", "core-verb-patterns"],
      ["activity:lesson-01-name-model-dialogue", "introduction-dialogue"],
      ["activity:lesson-01-register-qa-builder", "introduction-dialogue"],
      ["activity:lesson-02-numbers-0-100", "numbers-0-100"],
      ["activity:lesson-02-core-professions", "profession-pairs"],
      ["activity:lesson-02-person-form-morphology", "profession-pairs"],
      ["activity:lesson-02-profession-qa-builder", "profession-dialogue"],
      ["activity:lesson-02-sein-arbeiten-contrast", "profession-expressions"],
    ] as const);

    for (const [activityId, kind] of expected) {
      const html = renderToStaticMarkup(createElement(ActivityConceptVisual, { activityId }));
      expect(html, activityId).toContain(`data-instructional-visual="${kind}"`);
    }

    const listeningOnly = renderToStaticMarkup(createElement(ActivityConceptVisual, {
      activityId: "activity:lesson-01-workbook-listening",
    }));
    expect(listeningOnly).toBe("");
  });

  it("shows exact stored noun forms and never manufactures a missing plural", () => {
    const frau = details.detailsById["lex:frau"];
    const architekt = details.detailsById["lex:architekt"];
    const hallo = details.detailsById["lex:hallo"];
    if (frau?.kind !== "Lexeme" || architekt?.kind !== "Lexeme" || hallo?.kind !== "Lexeme") {
      throw new Error("Expected projected vocabulary details");
    }

    const publishedPlural = renderToStaticMarkup(createElement(NounSystemVisual, { detail: frau }));
    expect(publishedPlural).toContain("die Frau");
    expect(publishedPlural).toContain("die Frauen");
    expect(publishedPlural).toContain("+en");
    expect(publishedPlural).toContain('data-status="published"');

    const missingPlural = renderToStaticMarkup(createElement(NounSystemVisual, { detail: architekt }));
    expect(missingPlural).toContain("Plural awaiting content approval");
    expect(missingPlural).toContain('data-status="not-published"');
    expect(missingPlural).not.toContain("Architekten");

    expect(renderToStaticMarkup(createElement(NounSystemVisual, { detail: hallo }))).toBe("");
  });

  it("renders distinct regular, spelling-sensitive, and irregular verb cues", () => {
    const sein = details.detailsById["verb:sein"];
    const heissen = details.detailsById["verb:heissen"];
    const lernen = details.detailsById["verb:lernen"];
    if (sein?.kind !== "Verb" || heissen?.kind !== "Verb" || lernen?.kind !== "Verb") {
      throw new Error("Expected projected verb details");
    }

    const irregular = renderToStaticMarkup(createElement(VerbPatternVisual, { detail: sein }));
    expect(irregular).toContain("Learn sein as complete forms");
    expect(irregular).toContain('data-tone="irregular"');
    expect(irregular).toContain("bist");

    const spelling = renderToStaticMarkup(createElement(VerbPatternVisual, { detail: heissen }));
    expect(spelling).toContain('data-tone="special"');
    expect(spelling).toContain("heißt");

    const regular = renderToStaticMarkup(createElement(VerbPatternVisual, { detail: lernen }));
    expect(regular).toContain('data-tone="regular"');
    expect(regular).toContain("lern");
  });

  it("renders every published Q&A and grammar detail from its exact projected models", () => {
    const qaDetails = details.details.filter((detail) => detail.kind === "QAPair");
    const grammarDetails = details.details.filter((detail) => detail.kind === "GrammarConcept");
    expect(qaDetails).toHaveLength(14);
    expect(grammarDetails).toHaveLength(10);

    for (const detail of qaDetails) {
      const html = renderToStaticMarkup(createElement(QuestionAnswerFlowVisual, { detail }));
      expect(html, detail.id).toContain(detail.question.realization.replaceAll("'", "&#x27;"));
      expect(html, `${detail.id}/finite-verb`).toContain("finite verb");
      for (const answer of detail.answers) expect(html, `${detail.id}/${answer.id}`).toContain(answer.realization);
    }

    for (const detail of grammarDetails) {
      const html = renderToStaticMarkup(createElement(GrammarConceptVisual, { detail }));
      expect(html, detail.id).toContain(detail.titleEn);
      for (const step of detail.ruleSteps) {
        expect(html, `${detail.id}/${step.id}`).toContain(step.notice);
      }
    }
  });
});
