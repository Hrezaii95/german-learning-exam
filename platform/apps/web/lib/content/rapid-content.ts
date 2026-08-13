import rapidContentJson from "../../generated/rapid-content/lesson-01-02.json";
import type { RapidLearnerContent } from "./rapid-content-types";

function assertString(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(code);
}

function collectStrings(value: unknown, target: string[]): void {
  if (typeof value === "string") {
    target.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, target);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, target);
    }
  }
}

export function assertRapidLearnerContent(
  value: unknown,
): asserts value is RapidLearnerContent {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("RAPID_CONTENT_NOT_OBJECT");
  }
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== "1.0.0" ||
    candidate.projectionKind !== "rapid-learner-content"
  ) {
    throw new Error("RAPID_CONTENT_INVALID_ENVELOPE");
  }
  const greetings = candidate.greetings;
  const qaGroups = candidate.qaGroups;
  const verbs = candidate.verbs;
  const pairs = candidate.professionPairs;
  const prompts = candidate.practicePrompts;
  const gaps = candidate.gaps;
  if (
    !Array.isArray(greetings) ||
    greetings.length !== 7 ||
    !Array.isArray(qaGroups) ||
    qaGroups.length !== 11 ||
    !Array.isArray(verbs) ||
    verbs.length !== 3 ||
    !Array.isArray(pairs) ||
    pairs.length !== 13 ||
    !Array.isArray(prompts) ||
    prompts.length < 6 ||
    !Array.isArray(gaps) ||
    gaps.length < 4
  ) {
    throw new Error("RAPID_CONTENT_INVALID_COUNTS");
  }
  for (const greeting of greetings as Array<Record<string, unknown>>) {
    assertString(greeting.id, "RAPID_GREETING_ID_MISSING");
    assertString(greeting.de, "RAPID_GREETING_DE_MISSING");
    assertString(greeting.en, "RAPID_GREETING_EN_MISSING");
  }
  for (const group of qaGroups as Array<Record<string, unknown>>) {
    assertString(group.id, "RAPID_QA_ID_MISSING");
    assertString(group.question, "RAPID_QA_QUESTION_MISSING");
    if (!Array.isArray(group.answers) || group.answers.length === 0) {
      throw new Error("RAPID_QA_ANSWERS_MISSING");
    }
  }
  const verbIds = (verbs as Array<Record<string, unknown>>).map((verb) => verb.id);
  if (
    verbIds.join(",") !== "verb:sein,verb:heissen,verb:kommen" ||
    (verbs as Array<Record<string, unknown>>).some(
      (verb) => !Array.isArray(verb.forms) || verb.forms.length === 0,
    )
  ) {
    throw new Error("RAPID_VERB_PUBLICATION_BOUNDARY_DRIFT");
  }
  const strings: string[] = [];
  collectStrings(value, strings);
  const forbidden =
    /collection:teacher-professions|rel:teacher-row-|person-form:teacher-|resources[\\/]original|\.mp3\b|[A-Z]:\\|<\/?[a-z][^>]*>/i;
  if (strings.some((entry) => forbidden.test(entry))) {
    throw new Error("RAPID_CONTENT_PRIVATE_OR_REVIEW_ONLY_LEAK");
  }
}

let cached: RapidLearnerContent | null = null;

export function getRapidLearnerContent(): RapidLearnerContent {
  if (cached) return cached;
  const candidate: unknown = rapidContentJson;
  assertRapidLearnerContent(candidate);
  cached = candidate;
  return cached;
}

export function rapidQaById(id: string) {
  return getRapidLearnerContent().qaGroups.find((group) => group.id === id) ?? null;
}

export function rapidVerbById(id: string) {
  return getRapidLearnerContent().verbs.find((verb) => verb.id === id) ?? null;
}

