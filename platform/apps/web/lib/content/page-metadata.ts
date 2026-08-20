/**
 * The single source of learner-facing page titles and descriptions.
 *
 * A page title is the first thing a screen reader announces on route change
 * and the only orientation cue in a tab strip, a bookmark list or a browser
 * history entry (WCAG 2.4.2 Page Titled, Level A). Before this module every
 * route inherited the root layout's constant title, so 156 of 205 exported
 * pages announced "German Learning OS" and nothing else.
 *
 * Two rules hold everything together:
 *  - the product name is appended once, by the root layout's title template,
 *    so a page title here is only the part that identifies the page;
 *  - a page's title uses the same learner wording as its visible h1, and for
 *    lessons it goes through `lesson-label.ts`, so the title and the heading
 *    cannot drift apart (and "Lesson 01" can never reach a learner).
 */
import type { Metadata } from "next";
import type { LearnerDetailRecord } from "./detail-types";
import type { LearnerHubDefinition } from "./hub-types";
import { lessonLabel } from "./lesson-label";
import type { LearnerActivity, LearnerLesson } from "./types";

/** Product name. Appended to every page title by the root layout template. */
export const SITE_NAME = "German Learning OS";

/**
 * The root description. It reaches search results and link previews, so it is
 * written for a learner deciding whether to open the app — not for the team.
 */
export const SITE_DESCRIPTION =
  "Learn the German of Lessons 1 and 2: words, verbs, grammar, everyday phrases, listening and short practice rounds, with your progress kept on your own device.";

/** Separator between the page subject and the surface it belongs to. */
const PART = " · ";

/** Title + description for one page. */
export function pageMetadata(title: string, description: string): Metadata {
  return { title, description };
}

/** Hub landing page — reuses the hub's own learner-visible title and lede. */
export function hubPageMetadata(hub: LearnerHubDefinition): Metadata {
  return pageMetadata(hub.title, hub.description);
}

/** Lesson overview — `lessonLabel` keeps the wording identical to the page. */
export function lessonPageMetadata(lesson: LearnerLesson): Metadata {
  return pageMetadata(
    `${lessonLabel(lesson.routeSegment)}${PART}${lesson.titleDe}`,
    `${lesson.titleEn} — ${lesson.activityCount} activities, about ${lesson.estimatedMinutesTotal} minutes.`,
  );
}

/** Activity page — the visible h1 is the activity prompt. */
export function activityPageMetadata(
  lesson: LearnerLesson,
  activity: LearnerActivity,
): Metadata {
  return pageMetadata(
    `${activity.promptPlainText}${PART}${lessonLabel(lesson.routeSegment)}`,
    `${activity.stageTitleEn} step from ${lessonLabel(lesson.routeSegment)}: ${lesson.titleEn}.`,
  );
}

const DETAIL_SURFACE: Readonly<Record<LearnerDetailRecord["kind"], string>> =
  Object.freeze({
    Lexeme: "Vocabulary",
    Verb: "Verbs",
    QAPair: "Phrases & Q&A",
    GrammarConcept: "Grammar",
  });

/**
 * Detail page for one learning object. `displayText` is exactly the German the
 * page shows as its h1, so the title names what the learner is looking at.
 */
export function detailPageMetadata(detail: LearnerDetailRecord): Metadata {
  const surface = DETAIL_SURFACE[detail.kind];
  return pageMetadata(
    `${detail.displayText}${PART}${surface}`,
    detailDescription(detail),
  );
}

/**
 * The pronunciation listening surface (`/review-audio`).
 *
 * Not a learner page: it carries no place in the navigation and no learner
 * route links to it. It still exports HTML like every other route, so it needs
 * a title of its own — a tab reading only the product name is exactly the
 * defect this module exists to prevent, whoever the reader is.
 *
 * `robots` is the second half of "reachable by address only": the page is not
 * secret, but a search engine offering it to a learner would undo the point of
 * keeping it out of the menu.
 */
export function pronunciationReviewPageMetadata(): Metadata {
  return {
    ...pageMetadata(
      "Pronunciation listening check",
      "Every computer-voiced German clip the app can play, gathered on one page so a qualified listener can judge them and keep notes.",
    ),
    robots: { index: false, follow: false },
  };
}

function detailDescription(detail: LearnerDetailRecord): string {
  switch (detail.kind) {
    case "Lexeme":
      return `${detail.displayText} means “${detail.meaningEn}”. Forms, gender cue, pronunciation and practice.`;
    case "Verb":
      return `${detail.infinitive} means “${detail.meaningEn}”. Present-tense forms for every person, with a self-check.`;
    case "QAPair":
      return `Ask and answer “${detail.question.realization}” in the ${detail.register} register, with guided practice.`;
    case "GrammarConcept":
      return `${detail.titleEn} — what to notice, the rule step by step, and where it shows up in your lessons.`;
    default: {
      const exhaustive: never = detail;
      return exhaustive;
    }
  }
}
