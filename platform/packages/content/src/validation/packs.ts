import type { AnswerSpec } from "../types/common.js";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackPrompt, PackReview, PackStructuredText } from "../types/packs.js";
import packSchema from "./packs.schema.json";
import languageSchema from "./packs-language.schema.json";
import difficultySchema from "./packs-difficulty.schema.json";
import { checkPackSchema, isRecord } from "./packs-schema.js";

export type PackValidationIssue = { code: string; path: string; message: string };
export { packSchema, languageSchema, difficultySchema };

function diagnostic(code: string, path: string, message: string): PackValidationIssue {
  return { code, path, message };
}
function duplicateIds(values: ReadonlyArray<{ id: string }>, path: string): PackValidationIssue[] {
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    const id = value.id.normalize("NFC").trim();
    if (seen.has(id)) return [diagnostic("DUPLICATE_ID", `${path}[${index}].id`, `Duplicate id: ${id}`)];
    seen.add(id);
    return [];
  });
}
type AnswerOption = { id: string; label: string | PackStructuredText };
function promptChoices(prompt: PackPrompt): AnswerOption[] | undefined {
  return typeof prompt === "string" ? undefined : prompt.choices;
}
function optionLabel(option: AnswerOption): string {
  return typeof option.label === "string" ? option.label : option.label.tokens.map(token => token.type === "gap" ? token.label : token.text).join("");
}
/** Resolve authored selection IDs before a template can expose an unanswerable task. */
function answerOptionIssues(answer: AnswerSpec, choices: AnswerOption[] | undefined, path: string, choicesPath: string): PackValidationIssue[] {
  const issues = choices ? duplicateIds(choices, choicesPath) : [];
  if (answer.type === "choice" && !choices?.length) {
    issues.push(diagnostic("MISSING_CHOICES", path, "Choice answers require authored answer choices"));
    return issues;
  }
  if (!choices?.length) return issues;
  const ids = new Set(choices.map(choice => choice.id));
  if (answer.type === "choice") {
    answer.correctIds.forEach((id, index) => {
      if (!ids.has(id)) issues.push(diagnostic("UNRESOLVED_CHOICE", `${path}.correctIds[${index}]`, `Unknown answer choice ${id}`));
    });
  } else if (answer.type === "order") {
    answer.correctOrder.forEach((id, index) => {
      if (!ids.has(id)) issues.push(diagnostic("UNRESOLVED_CHOICE", `${path}.correctOrder[${index}]`, `Unknown ordering choice ${id}`));
    });
  } else if (answer.type === "tokens") {
    const tokens = new Set([...ids, ...choices.map(optionLabel)]);
    answer.acceptedTokenSets.forEach((set, setIndex) => set.forEach((token, tokenIndex) => {
      if (!tokens.has(token)) issues.push(diagnostic("UNRESOLVED_CHOICE", `${path}.acceptedTokenSets[${setIndex}][${tokenIndex}]`, `Token is not an authored choice: ${token}`));
    }));
  }
  return issues;
}
function reviewIssues(review: PackReview, path: string): PackValidationIssue[] {
  if (review.status !== "reviewed") return [];
  const issues: PackValidationIssue[] = [];
  if (!review.reviewer?.trim()) issues.push(diagnostic("REVIEWER_REQUIRED", `${path}.reviewer`, "Reviewed content must name its qualified reviewer"));
  if (!review.reviewedAt || !/^\d{4}-\d{2}-\d{2}T/u.test(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt))) {
    issues.push(diagnostic("REVIEW_DATE_REQUIRED", `${path}.reviewedAt`, "Reviewed content must record an ISO 8601 review date"));
  }
  return issues;
}
function textIssues(value: unknown, path = "$", depth = 0): PackValidationIssue[] {
  if (depth > 64) return [diagnostic("CONTENT_DEPTH", path, "Content nesting is too deep")];
  if (typeof value === "string") {
    if (/<\s*\/?\s*[a-zA-Z][^>]*>/u.test(value)) return [diagnostic("HTML_CONTENT", path, "Raw HTML is not allowed in pack content")];
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => textIssues(item, `${path}[${index}]`, depth + 1));
  if (isRecord(value)) return Object.entries(value).flatMap(([key, item]) => textIssues(item, `${path}.${key}`, depth + 1));
  return [];
}
function mediaPathIssues(path: string, location: string, relativeOnly = false): PackValidationIssue[] {
  const invalid = path.includes("\\") || path.split(/[/?#]/u).includes("..") ||
    /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(path) && (relativeOnly || !/^https?:\/\//iu.test(path)) ||
    relativeOnly && path.startsWith("/");
  return invalid ? [diagnostic("UNSAFE_PATH", location, "Use a pack-relative file path or an HTTP(S) media URL, without traversal")]: [];
}

function languageTokenIssues(value: unknown, genders: ReadonlySet<string>, path = "$"): PackValidationIssue[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => languageTokenIssues(item, genders, `${path}[${index}]`));
  if (!isRecord(value)) return [];
  const issues = value.type === "gender" && typeof value.gender === "string" && !genders.has(value.gender)
    ? [diagnostic("UNKNOWN_GENDER", `${path}.gender`, `Gender token ${value.gender} is not defined by the language profile`)] : [];
  return [...issues, ...Object.entries(value).flatMap(([key, item]) => languageTokenIssues(item, genders, `${path}.${key}`))];
}

/** Validate an already hydrated installed or overlay pack. Never promotes review state. */
export function validatePack(value: unknown, language?: LanguageProfile): PackValidationIssue[] {
  const structural = checkPackSchema(value, packSchema);
  if (structural.length) return structural;
  if (language) {
    const profileIssues = validateLanguageProfile(language);
    if (profileIssues.length) return profileIssues.map(issue => ({ ...issue, path: `language${issue.path.slice(1)}` }));
  }
  const pack = value as ContentPack;
  const issues = [
    ...textIssues(value), ...reviewIssues(pack.review, "$.review"),
    ...duplicateIds(pack.units, "$.units"), ...duplicateIds(pack.maps, "$.maps"),
    ...duplicateIds(pack.items, "$.items"),
  ];
  if (language) issues.push(...languageTokenIssues(value, new Set(language.genders.map(gender => gender.id))));
  const units = new Set(pack.units.map(unit => unit.id));
  const items = new Map(pack.items.map(item => [item.id, item]));
  const lemmas = new Map<string, string>();
  if (language && pack.language !== language.id) issues.push(diagnostic("LANGUAGE_MISMATCH", "$.language", `Pack language ${pack.language} does not match profile ${language.id}`));
  pack.units.forEach((unit, index) => {
    if (unit.bookRef?.pageStart !== undefined && unit.bookRef.pageEnd !== undefined && unit.bookRef.pageStart > unit.bookRef.pageEnd) {
      issues.push(diagnostic("PAGE_RANGE", `$.units[${index}].bookRef`, "pageEnd must not precede pageStart"));
    }
  });
  pack.items.forEach((item, index) => {
    const path = `$.items[${index}]`;
    if (!units.has(item.unitId)) issues.push(diagnostic("UNRESOLVED_UNIT", `${path}.unitId`, `Unknown unit ${item.unitId}`));
    if (item.review) issues.push(...reviewIssues(item.review, `${path}.review`));
    if (pack.review.status === "reviewed" && item.review?.status === "pending-german-review") issues.push(diagnostic("REVIEW_PENDING", `${path}.review`, "A reviewed pack cannot contain pending content"));
    if (item.audio) issues.push(...mediaPathIssues(item.audio.src, `${path}.audio.src`));
    if (item.image) issues.push(...mediaPathIssues(item.image, `${path}.image`));
    for (const [form, audio] of Object.entries(item.pluralAudio ?? {})) issues.push(...mediaPathIssues(audio.src, `${path}.pluralAudio.${form}.src`));
    if (item.type === "lexeme") {
      const key = item.lemma.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
      const previous = lemmas.get(key);
      if (previous) issues.push(diagnostic("DUPLICATE_HEADWORD", `${path}.lemma`, `Duplicate headword ${item.lemma}: items ${previous} and ${item.id}; merge the source family before migration`));
      else lemmas.set(key, item.id);
      if (language && item.gender !== undefined) {
        const gender = language.genders.find(candidate => candidate.id === item.gender);
        if (!gender) issues.push(diagnostic("UNKNOWN_GENDER", `${path}.gender`, `Gender ${item.gender} is not defined by language profile ${language.id}`));
        else if (item.article !== undefined && item.article !== gender.article) issues.push(diagnostic("ARTICLE_MISMATCH", `${path}.article`, "Article must match the language profile's gender entry"));
      }
      item.examples?.forEach((example, exampleIndex) => {
        if (example.audio) issues.push(...mediaPathIssues(example.audio.src, `${path}.examples[${exampleIndex}].audio.src`));
      });
    } else if (item.type === "drill") {
      if (items.get(item.grammarPoint)?.type !== "grammarPoint") issues.push(diagnostic("UNRESOLVED_GRAMMAR", `${path}.grammarPoint`, `Expected a grammarPoint item: ${item.grammarPoint}`));
      if (item.buckets) issues.push(...duplicateIds(item.buckets, `${path}.buckets`));
      issues.push(...answerOptionIssues(item.answer, promptChoices(item.prompt), `${path}.answer`, `${path}.prompt.choices`));
    } else if (item.type === "grammarPoint") {
      item.drills?.forEach((id, drillIndex) => {
        const drill = items.get(id);
        if (drill?.type !== "drill" || drill.grammarPoint !== item.id) issues.push(diagnostic("UNRESOLVED_DRILL", `${path}.drills[${drillIndex}]`, `Expected a drill for grammar point ${item.id}: ${id}`));
      });
      item.examples.forEach((example, exampleIndex) => {
        if (example.audio) issues.push(...mediaPathIssues(example.audio.src, `${path}.examples[${exampleIndex}].audio.src`));
      });
    } else if (item.type === "examTask") {
      item.itemRefs.forEach((id, refIndex) => {
        if (!items.has(id) || id === item.id) issues.push(diagnostic("UNRESOLVED_ITEM", `${path}.itemRefs[${refIndex}]`, `Expected another item in this pack: ${id}`));
      });
    }
    if (item.type === "text" || item.type === "dialogue") {
      issues.push(...duplicateIds(item.questions ?? [], `${path}.questions`));
      item.questions?.forEach((question, questionIndex) => {
        const questionPath = `${path}.questions[${questionIndex}]`;
        const embeddedChoices = promptChoices(question.prompt);
        const choices = question.choices ?? embeddedChoices;
        const choicesPath = question.choices ? `${questionPath}.choices` : `${questionPath}.prompt.choices`;
        if (question.type === "multipleChoice") {
          if (question.answer.type !== "choice") issues.push(diagnostic("ANSWER_TYPE", `${questionPath}.answer.type`, "Multiple-choice questions require a choice answer"));
          if (!choices?.length) issues.push(diagnostic("MISSING_CHOICES", choicesPath, "Multiple-choice questions require authored answer choices"));
        }
        if (question.choices && embeddedChoices) issues.push(diagnostic("AMBIGUOUS_CHOICES", `${questionPath}.prompt.choices`, "Author choices either on the question or in its prompt, not both"));
        issues.push(...answerOptionIssues(question.answer, choices, `${questionPath}.answer`, choicesPath));
      });
      if (item.type === "dialogue") item.turns.forEach((turn, turnIndex) => {
        if (turn.audio) issues.push(...mediaPathIssues(turn.audio.src, `${path}.turns[${turnIndex}].audio.src`));
      });
    }
  });
  for (const [index, file] of (pack.itemFiles ?? []).entries()) issues.push(...mediaPathIssues(file, `$.itemFiles[${index}]`, true));
  if (pack.story) issues.push(...mediaPathIssues(pack.story, "$.story", true));
  if (pack.exam) issues.push(...mediaPathIssues(pack.exam, "$.exam", true));
  return issues;
}

export function assertContentPack(value: unknown, language?: LanguageProfile): asserts value is ContentPack {
  const issues = validatePack(value, language);
  if (issues.length) throw new Error(`Content pack validation failed:\n${issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join("\n")}`);
}

export function validateLanguageProfile(value: unknown): PackValidationIssue[] {
  const structural = checkPackSchema(value, languageSchema);
  if (structural.length) return structural;
  const language = value as LanguageProfile;
  const issues = [...textIssues(value), ...duplicateIds(language.genders, "$.genders"), ...duplicateIds(language.pluralPatterns, "$.pluralPatterns")];
  try { new Intl.Locale(language.locale); } catch { issues.push(diagnostic("INVALID_LOCALE", "$.locale", "Expected a valid BCP 47 locale")); }
  return issues;
}

export function validateDifficultyProfile(value: unknown): PackValidationIssue[] {
  const structural = checkPackSchema(value, difficultySchema);
  if (structural.length) return structural;
  const difficulty = value as DifficultyProfile;
  return difficulty.audioSpeedRange[0] <= difficulty.audioSpeedRange[1] ? [] : [diagnostic("AUDIO_SPEED_RANGE", "$.audioSpeedRange", "Minimum audio speed must not exceed maximum")];
}
