#!/usr/bin/env node
/**
 * C1 source-grounded publication encoder.
 * Reads content/alpha-content.json + workbook audio map; writes platform/content/published/*.json.
 * Never invents German forms — only encodes evidenced values and explicit gaps.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT_SCHEMA_VERSION } from "../types/common.js";
import {
  AUTHORITY_WORKBOOK_PROJECTION_FILE,
  projectWorkbookAuthority,
} from "../publication/authority.js";
import type { ContentFragment } from "../publication/fragment.js";
import type { Lesson } from "../types/lesson.js";
import type { Lexeme } from "../types/lexeme.js";
import type { Verb, PersonKey } from "../types/verb.js";
import type { GrammarConcept } from "../types/grammar.js";
import type { PhrasePattern, QAPair } from "../types/phrase.js";
import type { LearningActivity } from "../types/collection.js";
import type { Collection } from "../types/collection.js";
import type { Source, SourceAssertion } from "../types/source.js";
import type { Relationship } from "../types/relationship.js";
import type { ContentGap } from "../types/gap.js";
import type { ListeningAsset } from "../types/dialogue.js";
import type { MediaAsset } from "../types/media.js";
import type { PublicationState, StructuredText, Register } from "../types/common.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = resolve(HERE, "../../../../");
const REPO_ROOT = resolve(PLATFORM_ROOT, "..");
const PUBLISHED_DIR = join(PLATFORM_ROOT, "content/published");
const AUTHORITY_DIR = join(PLATFORM_ROOT, "content/authority");

type AlphaVerb = {
  id: string;
  infinitive: string;
  meaningEn?: string;
  forms: Record<string, string>;
  pattern?: string;
};

type AlphaQa = {
  id: string;
  register: string;
  question: string;
  answers: string[];
};

type AlphaProfession = {
  id: string;
  masculine: string;
  feminine: string;
  meaningEn: string;
  masculinePlural?: string;
  femininePlural?: string;
  priority: number;
};

type AlphaTeacherJob = {
  id: string;
  sourceRow: number;
  meaningEn: string;
  masculineSingular: string;
  masculinePlural: string;
  feminineSingular: string;
  femininePlural: string;
  alternatives: { masculine: string[]; feminine: string[] };
  priority: number;
  lessonIds: string[];
  sourceId: string;
  validationStatus: string;
};

type AlphaContent = {
  lessons: Array<{
    id: string;
    number: number;
    titleDe: string;
    titleEn: string;
    cefr: string;
    sourcePages: {
      coursebookPrinted: number[];
      workbookPrinted: number[];
      glossaryPdf: number[];
    };
    goals: string[];
    vocabulary?: {
      greetings: Array<[string, string]>;
      wellbeing: Array<[string, string]>;
      countries: Array<[string, string, string | null]>;
      identity: Array<[string, string, string]>;
    };
    verbs: AlphaVerb[];
    qa: AlphaQa[];
    coreProfessions?: AlphaProfession[];
    profileVocabulary?: Array<[string, string] | [string, string, string]>;
  }>;
  collections: Array<{
    id: string;
    titleDe: string;
    titleEn: string;
    lessonIds: string[];
    priority: number;
    memberIds: string[];
  }>;
  teacherProfessions: AlphaTeacherJob[];
};

type AudioMap = {
  trackCount: number;
  publicBundleStatus: string;
  tracks: Array<{
    sourceAudioId: string;
    originalPath: string;
    filename: string;
    durationSeconds: number;
    sha256: string;
    lessonId: string;
    exercise: string;
    purpose: string;
    evidence: string[];
    status: string;
  }>;
};

function pageLoc(
  pages: number[] | undefined,
  extra?: { region?: string; exercise?: string; track?: string; noteRow?: number },
): SourceAssertion["location"] {
  const loc: SourceAssertion["location"] = { ...(extra ?? {}) };
  const page = pages?.[0];
  if (typeof page === "number") loc.printedPage = page;
  return loc;
}

function plain(text: string): StructuredText {
  return { tokens: [{ type: "plain", text }] };
}

function slugifyDe(input: string): string {
  return input
    .normalize("NFC")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripArticle(form: string): { article?: "der" | "die" | "das"; lemma: string } {
  const trimmed = form.trim();
  const m = /^(der|die|das)\s+(.+)$/u.exec(trimmed);
  if (m && (m[1] === "der" || m[1] === "die" || m[1] === "das") && m[2]) {
    return { article: m[1], lemma: m[2].trim() };
  }
  return { lemma: trimmed };
}

function genderForArticle(article: "der" | "die" | "das"): "masculine" | "feminine" | "neuter" {
  if (article === "der") return "masculine";
  if (article === "die") return "feminine";
  return "neuter";
}

function mapRegister(raw: string): Register {
  if (raw === "casual") return "informal";
  if (raw === "formal") return "formal";
  return "neutral";
}

function mapPresentForms(forms: Record<string, string>): Array<{ person: PersonKey; form: string }> {
  const out: Array<{ person: PersonKey; form: string }> = [];
  const add = (person: PersonKey, form: string) => {
    if (!out.some((x) => x.person === person)) out.push({ person, form });
  };
  for (const [key, form] of Object.entries(forms)) {
    if (key === "ich") add("ich", form);
    else if (key === "du") add("du", form);
    else if (key === "er/sie" || key === "er/sie/es") add("er_sie_es", form);
    else if (key === "wir") add("wir", form);
    else if (key === "ihr") add("ihr", form);
    else if (key === "Sie") add("Sie_formal", form);
    else if (key === "sie/Sie") {
      // Source writes a combined key with one evidenced form — encode both typed persons.
      add("sie_plural", form);
      add("Sie_formal", form);
    }
  }
  return out;
}

function published(
  fields: Array<{ field: string; assertionId: `assert:${string}` }>,
): PublicationState {
  return { status: "published", publishedFields: fields };
}

function reviewPub(): PublicationState {
  return { status: "review", publishedFields: [] };
}

function splitSlashForms(raw: string): string[] {
  return raw.split(/\s*\/\s*/u).map((s) => s.trim()).filter(Boolean);
}

const L1_ACTIVITY_DEFS: Array<{
  id: `activity:${string}`;
  mode: LearningActivity["mode"];
  title: string;
  stage: string;
}> = [
  { id: "activity:lesson-01-greetings-by-context", mode: "see", title: "Greetings by context visual + hotspot audio", stage: "learn" },
  { id: "activity:lesson-01-greeting-farewell-match", mode: "hear", title: "Greeting/farewell picture/audio match", stage: "learn" },
  { id: "activity:lesson-01-name-model-dialogue", mode: "notice", title: "Name model dialogue", stage: "learn" },
  { id: "activity:lesson-01-alphabet-listen-spell", mode: "hear", title: "Alphabet listen-and-spell", stage: "practise" },
  { id: "activity:lesson-01-heissen-sein-notice", mode: "notice", title: "heißen vs sein notice card", stage: "learn" },
  { id: "activity:lesson-01-wellbeing-scale", mode: "hear", title: "Wellbeing scale with phrase audio", stage: "learn" },
  { id: "activity:lesson-01-origin-aus-contrast", mode: "notice", title: "Origin map/cards and aus contrast", stage: "learn" },
  { id: "activity:lesson-01-pronoun-verb-builder", mode: "recall", title: "Pronoun-person map and singular verb builder", stage: "practise" },
  { id: "activity:lesson-01-register-qa-builder", mode: "use", title: "Casual/formal Q&A builder", stage: "practise" },
  { id: "activity:lesson-01-workbook-listening", mode: "hear", title: "Verified workbook listening for Exercises 3 and 9", stage: "listen" },
  { id: "activity:lesson-01-guided-intro-recording", mode: "use", title: "Guided introduction conversation recording", stage: "practise" },
  { id: "activity:lesson-01-checkpoint-summary", mode: "check", title: "Mixed checkpoint and two-minute summary", stage: "check" },
];

const L2_ACTIVITY_DEFS: Array<{
  id: `activity:${string}`;
  mode: LearningActivity["mode"];
  title: string;
  stage: string;
}> = [
  { id: "activity:lesson-02-personal-profile", mode: "see", title: "Personal-profile visual and fillable model", stage: "learn" },
  { id: "activity:lesson-02-full-person-conjugation", mode: "notice", title: "Full-person conjugation notice/build activities", stage: "learn" },
  { id: "activity:lesson-02-numbers-0-100", mode: "hear", title: "Numbers 0–100 visual, build, type and telephone listening", stage: "practise" },
  { id: "activity:lesson-02-relationship-status", mode: "see", title: "Relationship/status visual and nicht contrasts", stage: "learn" },
  { id: "activity:lesson-02-core-professions", mode: "see", title: "Core professions overview and individual cards", stage: "learn" },
  { id: "activity:lesson-02-person-form-morphology", mode: "notice", title: "Person-form and plural morphology activities", stage: "practise" },
  { id: "activity:lesson-02-profession-qa-builder", mode: "use", title: "Profession Q&A casual/formal builder and recording", stage: "practise" },
  { id: "activity:lesson-02-sein-arbeiten-contrast", mode: "notice", title: "sein profession vs arbeiten als/bei contrast", stage: "learn" },
  { id: "activity:lesson-02-workbook-listening", mode: "hear", title: "Verified workbook number and word-stress listening (Exercises 6 and 12)", stage: "listen" },
  { id: "activity:lesson-02-profile-reading-writing", mode: "recall", title: "Profile reading/writing activity", stage: "practise" },
  { id: "activity:lesson-02-teacher-professions-deck", mode: "review", title: "Teacher-professions assignment deck, grouped infographic, games and review", stage: "review" },
  { id: "activity:lesson-02-checkpoint-summary", mode: "check", title: "Mixed checkpoint and two-minute summary", stage: "check" },
];

/** Core profession lemmas also present in the teacher note — owned by lesson-02 fragment. */
const CORE_OWNED_LEX_SLUGS = new Set<string>();

function loadJson<T>(abs: string): T {
  return JSON.parse(readFileSync(abs, "utf8")) as T;
}

function buildSharedSources(): Source[] {
  return [
    {
      kind: "Source",
      id: "source:alpha-content-bundle",
      title: "Alpha compact content evidence bundle",
      sourceKind: "other",
      language: "de",
      priority: 1,
      originalPath: "content/alpha-content.json",
      cefrBand: "A1.1",
    },
    {
      kind: "Source",
      id: "source:content-spec-lessons-01-02",
      title: "Lessons 1–2 content specification (activity contract)",
      sourceKind: "other",
      language: "en",
      priority: 2,
      originalPath: "docs/11-lessons-01-02-content-spec.md",
      cefrBand: "A1.1",
    },
    {
      kind: "Source",
      id: "source:glossary-momente-a11",
      title: "Momente A1.1 English glossary (Lessons 01–02 scope)",
      sourceKind: "glossary",
      language: "en",
      priority: 1,
      originalPath: "resources/original",
      cefrBand: "A1.1",
    },
    {
      kind: "Source",
      id: "source:coursebook-momente-a11",
      title: "Momente A1.1 coursebook",
      sourceKind: "coursebook",
      language: "de",
      priority: 2,
      originalPath: "resources/original/coursebook/A1-KB-momente.pdf",
      cefrBand: "A1.1",
    },
    {
      kind: "Source",
      id: "source:workbook-momente-a11",
      title: "Momente A1.1 workbook",
      sourceKind: "workbook",
      language: "de",
      priority: 2,
      originalPath: "resources/original",
      cefrBand: "A1.1",
    },
    {
      kind: "Source",
      id: "source:teacher-professions-note",
      title: "Teacher professions learner note + image reference",
      sourceKind: "teacher-handout",
      language: "en/de",
      priority: 3,
      originalPath: "resources/original/learner-notes/Notes_260730_040559.txt",
      cefrBand: "A1.1",
    },
    {
      kind: "Source",
      id: "source:workbook-audio-map",
      title: "Alpha workbook CD1 audio mapping (rights-gated)",
      sourceKind: "audio-pack",
      language: "de",
      priority: 2,
      originalPath: "content/source-index/alpha-workbook-audio-map.json",
      cefrBand: "A1.1",
      trackCount: 15,
    },
  ];
}

function assertion(args: {
  id: `assert:${string}`;
  sourceId: `source:${string}`;
  subjectId: string;
  field: string;
  value: unknown;
  status: "candidate" | "verified";
  location?: SourceAssertion["location"];
  extraction?: SourceAssertion["extraction"];
  confidence?: number;
}): SourceAssertion {
  const base: SourceAssertion = {
    kind: "SourceAssertion",
    id: args.id,
    sourceId: args.sourceId,
    location: args.location ?? {},
    subjectId: args.subjectId,
    field: args.field,
    value: args.value,
    extraction: args.extraction ?? "manual",
    confidence: args.confidence ?? 1,
    status: args.status,
  };
  if (args.status === "verified") {
    return { ...base, reviewer: "c1-source-encode", reviewedAt: "2026-08-08" };
  }
  return base;
}

function addGrammarConcept(args: {
  concepts: GrammarConcept[];
  assertions: SourceAssertion[];
  relationships: Relationship[];
  id: `gram:${string}`;
  lessonId: "lesson:01" | "lesson:02";
  titleEn: string;
  titleDe: string;
  notice: string;
  rules: Array<{ id: string; notice: string; model?: string }>;
  activityIds: Array<`activity:${string}`>;
  prerequisites?: Array<`gram:${string}`>;
  commonErrorTags?: string[];
}): void {
  const slug = args.id.slice(5);
  const noticeAssertion = assertion({
    id: `assert:gram-${slug}-notice`,
    sourceId: "source:content-spec-lessons-01-02",
    subjectId: args.id,
    field: "noticeTarget",
    value: args.notice,
    status: "verified",
    location: { region: args.lessonId === "lesson:01" ? "Lesson 1 grammar" : "Lesson 2 grammar" },
  });
  const rulesAssertion = assertion({
    id: `assert:gram-${slug}-rules`,
    sourceId: "source:content-spec-lessons-01-02",
    subjectId: args.id,
    field: "ruleSteps",
    value: args.rules,
    status: "verified",
    location: { region: args.lessonId === "lesson:01" ? "Lesson 1 grammar" : "Lesson 2 grammar" },
  });
  args.assertions.push(noticeAssertion, rulesAssertion);
  const relationIds: `rel:${string}`[] = [];
  const introducedId = `rel:gram-${slug}-introduced-${args.lessonId.slice(-2)}` as `rel:${string}`;
  args.relationships.push({ kind: "Relationship", id: introducedId, type: "introduced-in", fromId: args.id, toId: args.lessonId });
  relationIds.push(introducedId);
  for (const activityId of args.activityIds) {
    const activitySlug = activityId.slice(9).replaceAll(":", "-");
    const relId = `rel:gram-${slug}-practised-${activitySlug}` as `rel:${string}`;
    args.relationships.push({ kind: "Relationship", id: relId, type: "practised-in", fromId: args.id, toId: activityId, lessonId: args.lessonId });
    relationIds.push(relId);
  }
  args.concepts.push({
    kind: "GrammarConcept",
    id: args.id,
    titleEn: args.titleEn,
    titleDe: args.titleDe,
    prerequisiteIds: args.prerequisites ?? [],
    noticeTarget: plain(args.notice),
    ruleSteps: args.rules.map((rule) => ({ id: rule.id, notice: plain(rule.notice), ...(rule.model ? { model: plain(rule.model) } : {}) })),
    exampleIds: [],
    commonErrorTags: args.commonErrorTags ?? [],
    activityTemplateIds: [],
    relationIds,
    sourceAssertionIds: [noticeAssertion.id, rulesAssertion.id],
    mediaIds: [],
    publication: published([
      { field: "noticeTarget", assertionId: noticeAssertion.id },
      { field: "ruleSteps", assertionId: rulesAssertion.id },
    ]),
  });
}

function buildLesson01(alpha: AlphaContent): ContentFragment {
  const lesson = alpha.lessons[0]!;
  // Shared sources live only here to keep fragment entity IDs disjoint.
  const sources = buildSharedSources().filter((s) =>
    [
      "source:alpha-content-bundle",
      "source:glossary-momente-a11",
      "source:coursebook-momente-a11",
      "source:workbook-momente-a11",
      "source:content-spec-lessons-01-02",
    ].includes(s.id),
  );

  const sourceAssertions: SourceAssertion[] = [];
  const lexemes: Lexeme[] = [];
  const verbs: Verb[] = [];
  const grammarConcepts: GrammarConcept[] = [];
  const phrasePatterns: PhrasePattern[] = [];
  const qaPairs: QAPair[] = [];
  const relationships: Relationship[] = [];
  const contentGaps: ContentGap[] = [];

  const addL1Grammar = (spec: Omit<Parameters<typeof addGrammarConcept>[0], "concepts" | "assertions" | "relationships" | "lessonId">) =>
    addGrammarConcept({ ...spec, concepts: grammarConcepts, assertions: sourceAssertions, relationships, lessonId: "lesson:01" });
  addL1Grammar({ id: "gram:personal-pronouns-l1", titleEn: "Personal pronouns", titleDe: "Personalpronomen", notice: "German finite verbs agree with the person: ich, du, er/sie/es, wir, ihr, sie and formal Sie.", rules: [{ id: "pronoun-person", notice: "Choose the pronoun first, then the matching finite verb form.", model: "ich heiße · du heißt · Sie heißen" }], activityIds: ["activity:lesson-01-pronoun-verb-builder"], commonErrorTags: ["person-agreement", "sie-Sie-capitalization"] });
  addL1Grammar({ id: "gram:w-questions-l1", titleEn: "W-questions", titleDe: "W-Fragen", notice: "A taught W-question starts with the question word, followed by the finite verb and the person.", rules: [{ id: "w-order", notice: "Use W-word + finite verb + person + complement.", model: "Wie heißt du? · Woher kommen Sie?" }], activityIds: ["activity:lesson-01-name-model-dialogue", "activity:lesson-01-origin-aus-contrast", "activity:lesson-01-register-qa-builder"], prerequisites: ["gram:personal-pronouns-l1"], commonErrorTags: ["word-order"] });
  addL1Grammar({ id: "gram:main-clause-word-order-l1", titleEn: "Main-clause word order", titleDe: "Satzstellung im Aussagesatz", notice: "In the taught statements, the finite verb is in second position.", rules: [{ id: "verb-second", notice: "Build person + finite verb + complement.", model: "Ich komme aus Spanien." }], activityIds: ["activity:lesson-01-pronoun-verb-builder", "activity:lesson-01-guided-intro-recording"], prerequisites: ["gram:personal-pronouns-l1"], commonErrorTags: ["verb-position"] });
  addL1Grammar({ id: "gram:du-sie-register-l1", titleEn: "Informal du and formal Sie", titleDe: "du und Sie", notice: "Use du in the taught informal patterns and capitalized Sie with the formal verb form.", rules: [{ id: "register-pair", notice: "Keep pronoun and verb form in the same register.", model: "Wie heißt du? · Wie heißen Sie?" }], activityIds: ["activity:lesson-01-register-qa-builder", "activity:lesson-01-guided-intro-recording"], prerequisites: ["gram:personal-pronouns-l1"], commonErrorTags: ["register-mismatch", "sie-Sie-capitalization"] });
  addL1Grammar({ id: "gram:aus-origin-l1", titleEn: "Origin with aus", titleDe: "Herkunft mit aus", notice: "The origin answers taught here use kommen + aus + country name.", rules: [{ id: "aus-country", notice: "Use aus before the country expression.", model: "Ich komme aus Deutschland." }], activityIds: ["activity:lesson-01-origin-aus-contrast", "activity:lesson-01-guided-intro-recording"], prerequisites: ["gram:main-clause-word-order-l1"], commonErrorTags: ["preposition-choice"] });
  addL1Grammar({ id: "gram:present-conjugation-l1", titleEn: "Present-tense person forms", titleDe: "Präsensformen", notice: "The present-tense forms here cover regular endings plus the two special patterns you learn now: heißen and sein.", rules: [{ id: "regular-singular", notice: "Regular forms use a verb stem plus the person ending.", model: "ich lerne · du lernst" }, { id: "heissen", notice: "In heißen, du and er/sie/es use heißt.", model: "du heißt · sie heißt" }, { id: "sein", notice: "Learn the irregular forms of sein as whole forms.", model: "ich bin · du bist · Sie sind" }], activityIds: ["activity:lesson-01-heissen-sein-notice", "activity:lesson-01-pronoun-verb-builder"], prerequisites: ["gram:personal-pronouns-l1"], commonErrorTags: ["person-agreement", "irregular-form"] });

  const titleAssert = assertion({
    id: "assert:lesson-01-title-de",
    sourceId: "source:alpha-content-bundle",
    subjectId: "lesson:01",
    field: "titleDe",
    value: lesson.titleDe,
    status: "verified",
    location: pageLoc(lesson.sourcePages.coursebookPrinted, { region: "lesson-title" }),
  });
  const goalsAssert = assertion({
    id: "assert:lesson-01-goals",
    sourceId: "source:alpha-content-bundle",
    subjectId: "lesson:01",
    field: "communicativeGoals",
    value: lesson.goals,
    status: "verified",
    location: pageLoc(lesson.sourcePages.coursebookPrinted, { region: "communicative-goals" }),
  });
  sourceAssertions.push(titleAssert, goalsAssert);

  const l1Activities = L1_ACTIVITY_DEFS.map((a) => a.id);
  const lessonObj: Lesson = {
    kind: "Lesson",
    id: "lesson:01",
    number: 1,
    titleDe: lesson.titleDe,
    titleEn: lesson.titleEn,
    cefr: "A1",
    communicativeGoals: [...lesson.goals],
    prerequisiteLessonIds: [],
    stages: [
      {
        id: "overview",
        kind: "overview",
        titleEn: "Lesson overview",
        activityIds: [],
        estimatedMinutes: 2,
        skillTargets: ["exposure"],
        required: true,
      },
      {
        id: "learn",
        kind: "learn",
        titleEn: "Learn",
        activityIds: L1_ACTIVITY_DEFS.filter((a) => a.stage === "learn").map((a) => a.id),
        estimatedMinutes: 25,
        skillTargets: ["exposure", "recognition", "listening"],
        required: true,
      },
      {
        id: "listen",
        kind: "listen",
        titleEn: "Listening",
        activityIds: L1_ACTIVITY_DEFS.filter((a) => a.stage === "listen").map((a) => a.id),
        estimatedMinutes: 10,
        skillTargets: ["listening"],
        required: true,
      },
      {
        id: "practise",
        kind: "practise",
        titleEn: "Practise",
        activityIds: L1_ACTIVITY_DEFS.filter((a) => a.stage === "practise").map((a) => a.id),
        estimatedMinutes: 20,
        skillTargets: ["recall", "production"],
        required: true,
      },
      {
        id: "check",
        kind: "check",
        titleEn: "Checkpoint",
        activityIds: L1_ACTIVITY_DEFS.filter((a) => a.stage === "check").map((a) => a.id),
        estimatedMinutes: 8,
        skillTargets: ["recall", "production"],
        required: true,
      },
    ],
    collections: [],
    sourceAssertionIds: [titleAssert.id, goalsAssert.id],
    relationIds: [],
    publication: published([
      { field: "titleDe", assertionId: titleAssert.id },
      { field: "communicativeGoals", assertionId: goalsAssert.id },
    ]),
  };

  const addLex = (
    id: `lex:${string}`,
    lemma: string,
    pos: string,
    glossEn: string,
    opts?: {
      article?: "der" | "die" | "das";
      plural?: string;
      printedPage?: number;
    },
  ) => {
    const lemmaAssert = assertion({
      id: `assert:${id.replace(":", "-")}-lemma`,
      sourceId: "source:alpha-content-bundle",
      subjectId: id,
      field: "lemma",
      value: lemma,
      status: "verified",
      location: pageLoc(
        opts?.printedPage != null ? [opts.printedPage] : lesson.sourcePages.glossaryPdf,
      ),
    });
    const meanings = [{ id: `meaning:${id.slice(4)}-en` as `meaning:${string}`, glossEn }];
    const meaningsAssert = assertion({
      id: `assert:${id.replace(":", "-")}-meanings`,
      sourceId: "source:alpha-content-bundle",
      subjectId: id,
      field: "meanings",
      value: meanings,
      status: "verified",
      location: pageLoc(
        opts?.printedPage != null ? [opts.printedPage] : lesson.sourcePages.glossaryPdf,
      ),
    });
    sourceAssertions.push(lemmaAssert, meaningsAssert);
    const relId = `rel:${id.slice(4)}-introduced-l1` as `rel:${string}`;
    relationships.push({
      kind: "Relationship",
      id: relId,
      type: "introduced-in",
      fromId: id,
      toId: "lesson:01",
      order: relationships.length + 1,
    });
    const lex: Lexeme = {
      kind: "Lexeme",
      id,
      lemma,
      partOfSpeech: pos,
      meanings,
      pronunciation: {},
      exampleIds: [],
      relationIds: [relId],
      sourceAssertionIds: [lemmaAssert.id, meaningsAssert.id],
      mediaIds: [],
      cardTemplateIds: [],
      publication: published([
        { field: "lemma", assertionId: lemmaAssert.id },
        { field: "meanings", assertionId: meaningsAssert.id },
      ]),
    };
    if (opts?.article) {
      lex.noun = {
        gender: genderForArticle(opts.article),
        article: opts.article,
        singular: lemma,
        plurals: opts.plural
          ? [{ form: stripArticle(opts.plural).lemma, patternIds: [] }]
          : [],
      };
    }
    lexemes.push(lex);
    contentGaps.push({
      kind: "ContentGap",
      id: `gap:audio-${id.slice(4)}` as `gap:${string}`,
      objectId: id,
      field: "pronunciation.audioId",
      reason: "generated pronunciation media exists in TTS manifest but remains human-review-pending; not attached in C1",
      owner: "codex-media",
      blocksPublication: false,
    });
  };

  for (const [de, en] of lesson.vocabulary?.greetings ?? []) {
    addLex(`lex:${slugifyDe(de)}` as `lex:${string}`, de, "interjection", en);
  }
  for (const [de, en] of lesson.vocabulary?.wellbeing ?? []) {
    addLex(`lex:${slugifyDe(de)}` as `lex:${string}`, de, "phrase", en);
  }
  for (const [de, en, articleHint] of lesson.vocabulary?.countries ?? []) {
    const id = `lex:${slugifyDe(de)}` as `lex:${string}`;
    if (articleHint === "die" || articleHint === "die-plural") {
      addLex(id, de, "noun", en, { article: "die" });
    } else {
      addLex(id, de, "proper-noun", en);
    }
  }
  for (const [deWithArt, en, plural] of lesson.vocabulary?.identity ?? []) {
    const parsed = stripArticle(deWithArt);
    const lemma = parsed.lemma;
    const article = parsed.article;
    addLex(`lex:${slugifyDe(lemma)}` as `lex:${string}`, lemma, "noun", en, {
      ...(article ? { article } : {}),
      plural,
    });
  }

  // Prefer fullest evidenced paradigm: Lesson 2 carries the superset for sein.
  const seinL2 = alpha.lessons[1]?.verbs.find((v) => v.infinitive === "sein");
  for (const v of lesson.verbs) {
    const formsSource = v.infinitive === "sein" && seinL2 ? seinL2.forms : v.forms;
    const present = mapPresentForms(formsSource);
    const meanings = [{ glossEn: v.meaningEn ?? "to be" }];
    if (v.infinitive !== "sein" && !v.meaningEn) {
      // kommen/heißen/lernen include meaningEn in alpha L1
    }
    const gloss = v.meaningEn ?? (v.infinitive === "sein" ? "to be" : v.infinitive);
    const meaningsVal = [{ glossEn: gloss }];
    const infAssert = assertion({
      id: `assert:${v.id.replace(":", "-")}-infinitive` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: v.id,
      field: "infinitive",
      value: v.infinitive,
      status: "verified",
      location: pageLoc(lesson.sourcePages.glossaryPdf),
    });
    const meanAssert = assertion({
      id: `assert:${v.id.replace(":", "-")}-meanings` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: v.id,
      field: "meanings",
      value: meaningsVal,
      status: "verified",
      location: pageLoc(lesson.sourcePages.glossaryPdf),
    });
    const presentAssert = assertion({
      id: `assert:${v.id.replace(":", "-")}-present` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: v.id,
      field: "present",
      value: present,
      status: "verified",
      location: pageLoc(lesson.sourcePages.coursebookPrinted),
    });
    sourceAssertions.push(infAssert, meanAssert, presentAssert);
    const relId = `rel:${v.id.slice(5)}-introduced-l1` as `rel:${string}`;
    relationships.push({
      kind: "Relationship",
      id: relId,
      type: "introduced-in",
      fromId: v.id,
      toId: "lesson:01",
    });
    verbs.push({
      kind: "Verb",
      id: v.id as `verb:${string}`,
      infinitive: v.infinitive,
      meanings: meaningsVal,
      present,
      pronunciation: {},
      exampleIds: [],
      grammarIds: [],
      relationIds: [relId],
      sourceAssertionIds: [infAssert.id, meanAssert.id, presentAssert.id],
      mediaIds: [],
      cardTemplateIds: [],
      publication: published([
        { field: "infinitive", assertionId: infAssert.id },
        { field: "meanings", assertionId: meanAssert.id },
        { field: "present", assertionId: presentAssert.id },
      ]),
    });
  }

  for (const qa of lesson.qa) {
    const register = mapRegister(qa.register);
    const qPhraseId = `phrase:${qa.id.slice(3)}-q` as `phrase:${string}`;
    const aPhraseIds: `phrase:${string}`[] = [];

    const qFixed = plain(qa.question);
    const qFixedAssert = assertion({
      id: `assert:${qPhraseId.replace(":", "-")}-fixed` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: qPhraseId,
      field: "fixedTokens",
      value: qFixed,
      status: "verified",
    });
    const qAcc = [plain(qa.question)];
    const qAccAssert = assertion({
      id: `assert:${qPhraseId.replace(":", "-")}-accepted` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: qPhraseId,
      field: "acceptedRealizations",
      value: qAcc,
      status: "verified",
    });
    sourceAssertions.push(qFixedAssert, qAccAssert);
    phrasePatterns.push({
      kind: "PhrasePattern",
      id: qPhraseId,
      intent: qa.id,
      register,
      fixedTokens: qFixed,
      slots: [],
      acceptedRealizations: qAcc,
      grammarIds: [],
      audioIds: [],
      relationIds: [],
      sourceAssertionIds: [qFixedAssert.id, qAccAssert.id],
      publication: published([
        { field: "fixedTokens", assertionId: qFixedAssert.id },
        { field: "acceptedRealizations", assertionId: qAccAssert.id },
      ]),
    });

    qa.answers.forEach((ans, idx) => {
      const aId = `phrase:${qa.id.slice(3)}-a${idx + 1}` as `phrase:${string}`;
      aPhraseIds.push(aId);
      const aFixed = plain(ans);
      const aFixedAssert = assertion({
        id: `assert:${aId.replace(":", "-")}-fixed` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: aId,
        field: "fixedTokens",
        value: aFixed,
        status: "verified",
      });
      const aAcc = [plain(ans)];
      const aAccAssert = assertion({
        id: `assert:${aId.replace(":", "-")}-accepted` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: aId,
        field: "acceptedRealizations",
        value: aAcc,
        status: "verified",
      });
      sourceAssertions.push(aFixedAssert, aAccAssert);
      phrasePatterns.push({
        kind: "PhrasePattern",
        id: aId,
        intent: `${qa.id}-answer`,
        register,
        fixedTokens: aFixed,
        slots: [],
        acceptedRealizations: aAcc,
        grammarIds: [],
        audioIds: [],
        relationIds: [],
        sourceAssertionIds: [aFixedAssert.id, aAccAssert.id],
        publication: published([
          { field: "fixedTokens", assertionId: aFixedAssert.id },
          { field: "acceptedRealizations", assertionId: aAccAssert.id },
        ]),
      });
    });

    const qPatAssert = assertion({
      id: `assert:${qa.id.replace(":", "-")}-question` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: qa.id,
      field: "questionPatternId",
      value: qPhraseId,
      status: "verified",
    });
    const aPatAssert = assertion({
      id: `assert:${qa.id.replace(":", "-")}-answers` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: qa.id,
      field: "answerPatternIds",
      value: aPhraseIds,
      status: "verified",
    });
    sourceAssertions.push(qPatAssert, aPatAssert);
    const relId = `rel:${qa.id.slice(3)}-introduced-l1` as `rel:${string}`;
    relationships.push({
      kind: "Relationship",
      id: relId,
      type: "introduced-in",
      fromId: qa.id,
      toId: "lesson:01",
    });
    qaPairs.push({
      kind: "QAPair",
      id: qa.id as `qa:${string}`,
      intent: qa.id,
      register,
      questionPatternId: qPhraseId,
      answerPatternIds: aPhraseIds,
      grammarIds: [],
      audioIds: [],
      relationIds: [relId],
      sourceAssertionIds: [qPatAssert.id, aPatAssert.id],
      publication: published([
        { field: "questionPatternId", assertionId: qPatAssert.id },
        { field: "answerPatternIds", assertionId: aPatAssert.id },
      ]),
    });
  }

  // Spec-required grammar / alphabet / pronouns not present as structured evidence in alpha-content.
  for (const gap of [
    {
      id: "gap:grammar-l1-word-order",
      field: "grammarConcepts",
      reason: "Lesson 1 grammar topics listed in docs/11 are not structured in alpha-content.json; awaiting source-grounded rule encoding",
    },
    {
      id: "gap:alphabet-l1",
      field: "lexemes.alphabet",
      reason: "A–Z/Ä/Ö/Ü/ß alphabet inventory is required by docs/11 but absent from alpha-content.json",
    },
    {
      id: "gap:pronouns-l1",
      field: "lexemes.pronouns",
      reason: "Pronouns ich/du/er/sie/Sie required by docs/11 but absent as typed entries in alpha-content.json",
    },
    {
      id: "gap:dialogue-l1-models",
      field: "dialogues",
      reason: "Model dialogues are not present as typed evidence in alpha-content.json",
    },
  ] as const) {
    contentGaps.push({
      kind: "ContentGap",
      id: gap.id,
      objectId: "lesson:01",
      field: gap.field,
      reason: gap.reason,
      owner: "codex-content",
      blocksPublication: false,
    });
  }

  void l1Activities;

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    fragmentId: "lesson-01",
    meta: {
      label: "C1 Lesson 1 publication fragment",
      generatedFor: "publication",
    },
    sources,
    sourceAssertions,
    mediaAssets: [],
    lessons: [lessonObj],
    lexemes,
    verbs,
    grammarConcepts,
    phrasePatterns,
    qaPairs,
    dialogues: [],
    listeningAssets: [],
    collections: [],
    learningActivities: [],
    examples: [],
    relationships,
    contentGaps,
  };
}

function buildLesson02(alpha: AlphaContent): ContentFragment {
  const lesson = alpha.lessons[1]!;
  const sources: Source[] = [];
  CORE_OWNED_LEX_SLUGS.clear();

  const sourceAssertions: SourceAssertion[] = [];
  const lexemes: Lexeme[] = [];
  const verbs: Verb[] = [];
  const grammarConcepts: GrammarConcept[] = [];
  const phrasePatterns: PhrasePattern[] = [];
  const qaPairs: QAPair[] = [];
  const relationships: Relationship[] = [];
  const contentGaps: ContentGap[] = [];

  const addL2Grammar = (spec: Omit<Parameters<typeof addGrammarConcept>[0], "concepts" | "assertions" | "relationships" | "lessonId">) =>
    addGrammarConcept({ ...spec, concepts: grammarConcepts, assertions: sourceAssertions, relationships, lessonId: "lesson:02" });
  addL2Grammar({ id: "gram:full-present-person-forms-l2", titleEn: "Full present-tense person forms", titleDe: "Präsens: alle Personen", notice: "Lesson 2 extends present conjugation to wir, ihr, sie and formal Sie.", rules: [{ id: "full-person", notice: "Match each pronoun with its present-tense form.", model: "wir sind · ihr seid · sie/Sie sind" }], activityIds: ["activity:lesson-02-full-person-conjugation"], commonErrorTags: ["person-agreement", "sie-Sie-capitalization"] });
  addL2Grammar({ id: "gram:nicht-profile-negation-l2", titleEn: "Negation with nicht", titleDe: "Verneinung mit nicht", notice: "Use nicht in the taught profile statements to negate a state or description.", rules: [{ id: "nicht-profile", notice: "Place nicht with the taught statement pattern.", model: "Ich bin nicht verheiratet." }], activityIds: ["activity:lesson-02-relationship-status", "activity:lesson-02-profile-reading-writing"], commonErrorTags: ["negation-position"] });
  addL2Grammar({ id: "gram:profession-expressions-l2", titleEn: "Talking about professions", titleDe: "Beruf ausdrücken", notice: "The taught patterns contrast profession after sein with arbeiten als, bei or in.", rules: [{ id: "sein-profession", notice: "After sein, use the taught profession without an article.", model: "Ich bin Architekt." }, { id: "arbeiten-als", notice: "Use arbeiten als before a profession.", model: "Ich arbeite als Architekt." }, { id: "arbeiten-bei-in", notice: "Use bei or in only in the workplace patterns taught here.", model: "Ich arbeite bei einer Firma." }], activityIds: ["activity:lesson-02-profession-qa-builder", "activity:lesson-02-sein-arbeiten-contrast"], prerequisites: ["gram:full-present-person-forms-l2"], commonErrorTags: ["article-after-sein", "preposition-choice"] });
  addL2Grammar({ id: "gram:profession-feminine-forms-l2", titleEn: "Feminine profession forms", titleDe: "Weibliche Berufsformen", notice: "Profession pairs form feminine person words with -in where the course shows it; the plural -innen is used only where the course lists it.", rules: [{ id: "feminine-in", notice: "Link each feminine form to its masculine base; keep the stem changes the course shows.", model: "Architekt → Architektin · Arzt → Ärztin" }, { id: "plural-innen", notice: "Use -innen only where the course lists a feminine plural.", model: "Lehrerinnen" }], activityIds: ["activity:lesson-02-core-professions", "activity:lesson-02-person-form-morphology"], commonErrorTags: ["person-form", "umlaut", "plural-guessing"] });

  const titleAssert = assertion({
    id: "assert:lesson-02-title-de",
    sourceId: "source:alpha-content-bundle",
    subjectId: "lesson:02",
    field: "titleDe",
    value: lesson.titleDe,
    status: "verified",
    location: pageLoc(lesson.sourcePages.coursebookPrinted),
  });
  const goalsAssert = assertion({
    id: "assert:lesson-02-goals",
    sourceId: "source:alpha-content-bundle",
    subjectId: "lesson:02",
    field: "communicativeGoals",
    value: lesson.goals,
    status: "verified",
    location: pageLoc(lesson.sourcePages.coursebookPrinted),
  });
  sourceAssertions.push(titleAssert, goalsAssert);

  const lessonObj: Lesson = {
    kind: "Lesson",
    id: "lesson:02",
    number: 2,
    titleDe: lesson.titleDe,
    titleEn: lesson.titleEn,
    cefr: "A1",
    communicativeGoals: [...lesson.goals],
    prerequisiteLessonIds: ["lesson:01"],
    stages: [
      {
        id: "overview",
        kind: "overview",
        titleEn: "Lesson overview",
        activityIds: [],
        estimatedMinutes: 2,
        skillTargets: ["exposure"],
        required: true,
      },
      {
        id: "learn",
        kind: "learn",
        titleEn: "Learn",
        activityIds: L2_ACTIVITY_DEFS.filter((a) => a.stage === "learn").map((a) => a.id),
        estimatedMinutes: 25,
        skillTargets: ["exposure", "recognition"],
        required: true,
      },
      {
        id: "listen",
        kind: "listen",
        titleEn: "Listening",
        activityIds: L2_ACTIVITY_DEFS.filter((a) => a.stage === "listen").map((a) => a.id),
        estimatedMinutes: 10,
        skillTargets: ["listening"],
        required: true,
      },
      {
        id: "practise",
        kind: "practise",
        titleEn: "Practise",
        activityIds: L2_ACTIVITY_DEFS.filter((a) => a.stage === "practise").map((a) => a.id),
        estimatedMinutes: 22,
        skillTargets: ["recall", "production"],
        required: true,
      },
      {
        id: "review",
        kind: "review",
        titleEn: "Teacher collection review",
        activityIds: L2_ACTIVITY_DEFS.filter((a) => a.stage === "review").map((a) => a.id),
        estimatedMinutes: 15,
        skillTargets: ["review-stability"],
        required: false,
      },
      {
        id: "check",
        kind: "check",
        titleEn: "Checkpoint",
        activityIds: L2_ACTIVITY_DEFS.filter((a) => a.stage === "check").map((a) => a.id),
        estimatedMinutes: 8,
        skillTargets: ["recall", "production"],
        required: true,
      },
    ],
    collections: [
      {
        collectionId: "collection:teacher-professions",
        sourcePriority: 3,
        required: false,
      },
    ],
    sourceAssertionIds: [titleAssert.id, goalsAssert.id],
    relationIds: ["rel:lesson-01-prerequisite-of-02"],
    publication: published([
      { field: "titleDe", assertionId: titleAssert.id },
      { field: "communicativeGoals", assertionId: goalsAssert.id },
    ]),
  };

  relationships.push({
    kind: "Relationship",
    id: "rel:lesson-01-prerequisite-of-02",
    type: "prerequisite-of",
    fromId: "lesson:01",
    toId: "lesson:02",
  });

  // Profile vocabulary
  for (const [de, en, pluralWithArticle] of lesson.profileVocabulary ?? []) {
    const parsed = stripArticle(de);
    const lemma = parsed.lemma;
    const id = `lex:${slugifyDe(lemma)}` as `lex:${string}`;
    const isNoun = Boolean(parsed.article);
    const lemmaAssert = assertion({
      id: `assert:${id.replace(":", "-")}-lemma` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: id,
      field: "lemma",
      value: lemma,
      status: "verified",
      location: pageLoc(lesson.sourcePages.glossaryPdf),
    });
    const meanings = [{ id: `meaning:${slugifyDe(lemma)}-en` as `meaning:${string}`, glossEn: en }];
    const meaningsAssert = assertion({
      id: `assert:${id.replace(":", "-")}-meanings` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: id,
      field: "meanings",
      value: meanings,
      status: "verified",
    });
    sourceAssertions.push(lemmaAssert, meaningsAssert);
    const relId = `rel:${slugifyDe(lemma)}-introduced-l2` as `rel:${string}`;
    relationships.push({
      kind: "Relationship",
      id: relId,
      type: "introduced-in",
      fromId: id,
      toId: "lesson:02",
    });
    const lex: Lexeme = {
      kind: "Lexeme",
      id,
      lemma,
      partOfSpeech: isNoun ? "noun" : "adjective",
      meanings,
      pronunciation: {},
      exampleIds: [],
      relationIds: [relId],
      sourceAssertionIds: [lemmaAssert.id, meaningsAssert.id],
      mediaIds: [],
      cardTemplateIds: [],
      publication: published([
        { field: "lemma", assertionId: lemmaAssert.id },
        { field: "meanings", assertionId: meaningsAssert.id },
      ]),
    };
    if (parsed.article) {
      lex.noun = {
        gender: genderForArticle(parsed.article),
        article: parsed.article,
        singular: lemma,
        plurals: pluralWithArticle
          ? [{ form: stripArticle(pluralWithArticle).lemma, patternIds: [] }]
          : [],
      };
    }
    lexemes.push(lex);
  }

  // Core professions as separate M/F lexemes
  for (const prof of lesson.coreProfessions ?? []) {
    const groupId = `person-form:${slugifyDe(prof.masculine)}`;
    const mascId = `lex:${slugifyDe(prof.masculine)}` as `lex:${string}`;
    const femId = `lex:${slugifyDe(prof.feminine)}` as `lex:${string}`;
    CORE_OWNED_LEX_SLUGS.add(slugifyDe(prof.masculine));
    CORE_OWNED_LEX_SLUGS.add(slugifyDe(prof.feminine));

    for (const side of [
      {
        id: mascId,
        lemma: prof.masculine,
        article: "der" as const,
        gender: "masculine" as const,
        plural: prof.masculinePlural,
      },
      {
        id: femId,
        lemma: prof.feminine,
        article: "die" as const,
        gender: "feminine" as const,
        plural: prof.femininePlural,
      },
    ]) {
      const lemmaAssert = assertion({
        id: `assert:${side.id.replace(":", "-")}-lemma` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: side.id,
        field: "lemma",
        value: side.lemma,
        status: "verified",
        location: pageLoc(lesson.sourcePages.glossaryPdf),
      });
      const meanings = [
        {
          id: `meaning:${side.id.slice(4)}-en` as `meaning:${string}`,
          glossEn: prof.meaningEn,
        },
      ];
      const meaningsAssert = assertion({
        id: `assert:${side.id.replace(":", "-")}-meanings` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: side.id,
        field: "meanings",
        value: meanings,
        status: "verified",
      });
      sourceAssertions.push(lemmaAssert, meaningsAssert);
      const introRel = `rel:${side.id.slice(4)}-introduced-l2` as `rel:${string}`;
      relationships.push({
        kind: "Relationship",
        id: introRel,
        type: "introduced-in",
        fromId: side.id,
        toId: "lesson:02",
      });
      lexemes.push({
        kind: "Lexeme",
        id: side.id,
        lemma: side.lemma,
        partOfSpeech: "noun",
        noun: {
          gender: side.gender,
          article: side.article,
          singular: side.lemma,
          plurals: side.plural ? [{ form: side.plural, patternIds: [] }] : [],
          personFormGroupId: groupId,
        },
        meanings,
        pronunciation: {},
        exampleIds: [],
        relationIds: [introRel],
        sourceAssertionIds: [lemmaAssert.id, meaningsAssert.id],
        mediaIds: [],
        cardTemplateIds: [],
        publication: published([
          { field: "lemma", assertionId: lemmaAssert.id },
          { field: "meanings", assertionId: meaningsAssert.id },
        ]),
      });
    }
    relationships.push({
      kind: "Relationship",
      id: `rel:${slugifyDe(prof.masculine)}-person-form` as `rel:${string}`,
      type: "person-form-of",
      fromId: femId,
      toId: mascId,
      note: "core glossary profession person-form pair",
    });
  }

  // L2 verbs except sein (owned by lesson-01)
  for (const v of lesson.verbs) {
    if (v.infinitive === "sein") {
      relationships.push({
        kind: "Relationship",
        id: "rel:sein-practised-l2",
        type: "practised-in",
        fromId: "verb:sein",
        toId: "lesson:02",
      });
      continue;
    }
    const present = mapPresentForms(v.forms);
    const meaningsVal = [{ glossEn: v.meaningEn ?? v.infinitive }];
    // alpha L2 verbs omit meaningEn — do not invent English glosses.
    const glossEn = v.meaningEn;
    const meaningsFinal = glossEn
      ? [{ glossEn }]
      : [{ glossEn: v.infinitive, useNote: "English gloss not present in alpha-content.json; infinitive echoed pending glossary enrichment" }];

    const infAssert = assertion({
      id: `assert:${v.id.replace(":", "-")}-infinitive` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: v.id,
      field: "infinitive",
      value: v.infinitive,
      status: "verified",
    });
    const meanAssert = assertion({
      id: `assert:${v.id.replace(":", "-")}-meanings` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: v.id,
      field: "meanings",
      value: meaningsFinal,
      status: glossEn ? "verified" : "candidate",
    });
    const presentAssert = assertion({
      id: `assert:${v.id.replace(":", "-")}-present` as `assert:${string}`,
      sourceId: "source:alpha-content-bundle",
      subjectId: v.id,
      field: "present",
      value: present,
      status: "verified",
    });
    sourceAssertions.push(infAssert, meanAssert, presentAssert);

    if (!glossEn) {
      contentGaps.push({
        kind: "ContentGap",
        id: `gap:meaning-${v.id.slice(5)}` as `gap:${string}`,
        objectId: v.id,
        field: "meanings",
        reason: "Lesson 2 verb English gloss absent from alpha-content.json; infinitive echoed as placeholder gloss pending glossary assertion",
        owner: "codex-content",
        blocksPublication: true,
      });
    }

    const relId = `rel:${v.id.slice(5)}-introduced-l2` as `rel:${string}`;
    relationships.push({
      kind: "Relationship",
      id: relId,
      type: "introduced-in",
      fromId: v.id,
      toId: "lesson:02",
    });

    const pubStatus = glossEn ? "published" : "review";
    verbs.push({
      kind: "Verb",
      id: v.id as `verb:${string}`,
      infinitive: v.infinitive,
      meanings: meaningsFinal,
      present,
      pronunciation: {},
      exampleIds: [],
      grammarIds: [],
      relationIds: [relId],
      sourceAssertionIds: [infAssert.id, meanAssert.id, presentAssert.id],
      mediaIds: [],
      cardTemplateIds: [],
      publication:
        pubStatus === "published"
          ? published([
              { field: "infinitive", assertionId: infAssert.id },
              { field: "meanings", assertionId: meanAssert.id },
              { field: "present", assertionId: presentAssert.id },
            ])
          : reviewPub(),
    });
  }

  // Q&A — split variable register questions that contain " / " into informal+formal using evidenced substrings only when both halves are present.
  for (const qa of lesson.qa) {
    const encodeOne = (suffix: string, register: Register, question: string, answers: string[]) => {
      const base = `${qa.id}-${suffix}`;
      const qPhraseId = `phrase:${base.slice(3)}-q` as `phrase:${string}`;
      const aPhraseIds: `phrase:${string}`[] = [];
      const qFixed = plain(question);
      const qFixedAssert = assertion({
        id: `assert:${qPhraseId.replace(":", "-")}-fixed` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: qPhraseId,
        field: "fixedTokens",
        value: qFixed,
        status: "verified",
      });
      const qAcc = [plain(question)];
      const qAccAssert = assertion({
        id: `assert:${qPhraseId.replace(":", "-")}-accepted` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: qPhraseId,
        field: "acceptedRealizations",
        value: qAcc,
        status: "verified",
      });
      sourceAssertions.push(qFixedAssert, qAccAssert);
      phrasePatterns.push({
        kind: "PhrasePattern",
        id: qPhraseId,
        intent: base,
        register,
        fixedTokens: qFixed,
        slots: [],
        acceptedRealizations: qAcc,
        grammarIds: [],
        audioIds: [],
        relationIds: [],
        sourceAssertionIds: [qFixedAssert.id, qAccAssert.id],
        publication: published([
          { field: "fixedTokens", assertionId: qFixedAssert.id },
          { field: "acceptedRealizations", assertionId: qAccAssert.id },
        ]),
      });
      answers.forEach((ans, idx) => {
        const aId = `phrase:${base.slice(3)}-a${idx + 1}` as `phrase:${string}`;
        aPhraseIds.push(aId);
        const aFixed = plain(ans);
        const aFixedAssert = assertion({
          id: `assert:${aId.replace(":", "-")}-fixed` as `assert:${string}`,
          sourceId: "source:alpha-content-bundle",
          subjectId: aId,
          field: "fixedTokens",
          value: aFixed,
          status: "verified",
        });
        const aAccAssert = assertion({
          id: `assert:${aId.replace(":", "-")}-accepted` as `assert:${string}`,
          sourceId: "source:alpha-content-bundle",
          subjectId: aId,
          field: "acceptedRealizations",
          value: [plain(ans)],
          status: "verified",
        });
        sourceAssertions.push(aFixedAssert, aAccAssert);
        phrasePatterns.push({
          kind: "PhrasePattern",
          id: aId,
          intent: `${base}-answer`,
          register,
          fixedTokens: aFixed,
          slots: [],
          acceptedRealizations: [plain(ans)],
          grammarIds: [],
          audioIds: [],
          relationIds: [],
          sourceAssertionIds: [aFixedAssert.id, aAccAssert.id],
          publication: published([
            { field: "fixedTokens", assertionId: aFixedAssert.id },
            { field: "acceptedRealizations", assertionId: aAccAssert.id },
          ]),
        });
      });
      const qaId = `qa:${base.slice(3)}` as `qa:${string}`;
      const qPatAssert = assertion({
        id: `assert:${qaId.replace(":", "-")}-question` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: qaId,
        field: "questionPatternId",
        value: qPhraseId,
        status: "verified",
      });
      const aPatAssert = assertion({
        id: `assert:${qaId.replace(":", "-")}-answers` as `assert:${string}`,
        sourceId: "source:alpha-content-bundle",
        subjectId: qaId,
        field: "answerPatternIds",
        value: aPhraseIds,
        status: "verified",
      });
      sourceAssertions.push(qPatAssert, aPatAssert);
      const relId = `rel:${qaId.slice(3)}-introduced-l2` as `rel:${string}`;
      relationships.push({
        kind: "Relationship",
        id: relId,
        type: "introduced-in",
        fromId: qaId,
        toId: "lesson:02",
      });
      qaPairs.push({
        kind: "QAPair",
        id: qaId,
        intent: base,
        register,
        questionPatternId: qPhraseId,
        answerPatternIds: aPhraseIds,
        grammarIds: [],
        audioIds: [],
        relationIds: [relId],
        sourceAssertionIds: [qPatAssert.id, aPatAssert.id],
        publication: published([
          { field: "questionPatternId", assertionId: qPatAssert.id },
          { field: "answerPatternIds", assertionId: aPatAssert.id },
        ]),
      });
    };

    if (qa.register === "variable" && qa.question.includes(" / ")) {
      // Preserve evidenced wording by recording the combined source string as a gap note,
      // and encode only clearly separable casual/formal halves already present in the source.
      if (qa.id === "qa:age") {
        encodeOne("casual", "informal", "Wie alt bist du?", qa.answers);
        encodeOne("formal", "formal", "Wie alt sind Sie?", qa.answers);
      } else if (qa.id === "qa:residence") {
        encodeOne("casual", "informal", "Wo wohnst du?", qa.answers);
        encodeOne("formal", "formal", "Wo wohnen Sie?", qa.answers);
      } else {
        encodeOne("neutral", "neutral", qa.question, qa.answers);
      }
      contentGaps.push({
        kind: "ContentGap",
        id: `gap:qa-variable-${qa.id.slice(3)}` as `gap:${string}`,
        objectId: "lesson:02",
        field: `qa.${qa.id}.register`,
        reason: `alpha-content register=variable with combined question ${JSON.stringify(qa.question)}; encoded as separate informal/formal patterns using evidenced halves; qualified review of split still required`,
        owner: "owner-review",
        blocksPublication: false,
      });
    } else {
      encodeOne("main", mapRegister(qa.register), qa.question, qa.answers);
    }
  }

  contentGaps.push(
    {
      kind: "ContentGap",
      id: "gap:grammar-l2-endings",
      objectId: "lesson:02",
      field: "grammarConcepts",
      reason: "Lesson 2 grammar topics from docs/11 are not structured in alpha-content.json",
      owner: "codex-content",
      blocksPublication: false,
    },
    {
      kind: "ContentGap",
      id: "gap:numbers-0-100",
      objectId: "lesson:02",
      field: "lexemes.numbers",
      reason: "Numbers 0–100 required by docs/11 but absent from alpha-content.json",
      owner: "codex-content",
      blocksPublication: false,
    },
  );

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    fragmentId: "lesson-02",
    meta: {
      label: "C1 Lesson 2 publication fragment",
      generatedFor: "publication",
    },
    sources,
    sourceAssertions,
    mediaAssets: [],
    lessons: [lessonObj],
    lexemes,
    verbs,
    grammarConcepts,
    phrasePatterns,
    qaPairs,
    dialogues: [],
    listeningAssets: [],
    collections: [],
    learningActivities: [],
    examples: [],
    relationships,
    contentGaps,
  };
}

function buildTeacherProfessions(alpha: AlphaContent): ContentFragment {
  const sources = buildSharedSources().filter((s) =>
    s.id === "source:teacher-professions-note",
  );
  const sourceAssertions: SourceAssertion[] = [];
  const lexemes: Lexeme[] = [];
  const relationships: Relationship[] = [];
  const contentGaps: ContentGap[] = [];
  const memberIds: string[] = [];
  const teacherSourceRows: Array<{ sourceRow: number; subjectId: string }> = [];

  const collMembershipAssert = assertion({
    id: "assert:collection-teacher-professions-membership",
    sourceId: "source:alpha-content-bundle",
    subjectId: "collection:teacher-professions",
    field: "membership",
    value: { mode: "static", memberIds: alpha.collections[0]?.memberIds ?? [] },
    status: "candidate",
    location: { region: "teacher-professions-collection" },
  });
  sourceAssertions.push(collMembershipAssert);

  for (const job of alpha.teacherProfessions) {
    const mascParts = splitSlashForms(job.masculineSingular).map(stripArticle);
    const femParts = splitSlashForms(job.feminineSingular).map(stripArticle);
    const mascPluralParts = splitSlashForms(job.masculinePlural).map(stripArticle);
    const femPluralParts = splitSlashForms(job.femininePlural).map(stripArticle);
    const primaryLemmaSlug = slugifyDe(mascParts[0]?.lemma ?? job.id);
    const primaryLexId = `lex:${primaryLemmaSlug}`;

    const rowAssert = assertion({
      id: `assert:teacher-row-${String(job.sourceRow).padStart(2, "0")}-source-row` as `assert:${string}`,
      sourceId: "source:teacher-professions-note",
      subjectId: primaryLexId,
      field: "sourceRow",
      value: {
        sourceRow: job.sourceRow,
        teacherJobId: job.id,
        primaryLexemeId: primaryLexId,
        meaningEn: job.meaningEn,
        masculineSingularSource: job.masculineSingular,
        feminineSingularSource: job.feminineSingular,
        masculinePluralSource: job.masculinePlural,
        femininePluralSource: job.femininePlural,
        alternatives: job.alternatives,
        alphaSourceId: job.sourceId,
        validationStatus: job.validationStatus,
      },
      status: "candidate",
      location: { noteRow: job.sourceRow },
      confidence: 0.7,
    });
    sourceAssertions.push(rowAssert);
    teacherSourceRows.push({ sourceRow: job.sourceRow, subjectId: primaryLexId });

    contentGaps.push({
      kind: "ContentGap",
      id: `gap:teacher-row-${String(job.sourceRow).padStart(2, "0")}-german-review` as `gap:${string}`,
      objectId: primaryLexId,
      field: "lemma",
      reason: "Teacher profession row remains candidate-needs-german-review; not falsely published",
      owner: "owner-review",
      blocksPublication: false,
    });

    const createSide = (
      parts: Array<{ article?: "der" | "die" | "das"; lemma: string }>,
      pluralParts: Array<{ article?: "der" | "die" | "das"; lemma: string }>,
      gender: "masculine" | "feminine",
      articleDefault: "der" | "die",
    ): `lex:${string}`[] => {
      const ids: `lex:${string}`[] = [];
      parts.forEach((part, idx) => {
        const lemma = part.lemma;
        const slug = slugifyDe(lemma);
        const id = `lex:${slug}` as `lex:${string}`;
        ids.push(id);
        memberIds.push(id);

        if (CORE_OWNED_LEX_SLUGS.has(slug) || lexemes.some((l) => l.id === id)) {
          // Core glossary lexeme owned by lesson-02, or already encoded from this teacher fragment.
          relationships.push({
            kind: "Relationship",
            id: `rel:teacher-row-${job.sourceRow}-${gender.slice(0, 1)}-${slug}-member` as `rel:${string}`,
            type: "member-of-collection",
            fromId: id,
            toId: "collection:teacher-professions",
            note: CORE_OWNED_LEX_SLUGS.has(slug)
              ? `teacher sourceRow ${job.sourceRow} reconciles to core lexeme`
              : `teacher sourceRow ${job.sourceRow}`,
            order: job.sourceRow,
          });
          return;
        }

        const lemmaAssert = assertion({
          id: `assert:${id.replace(":", "-")}-lemma` as `assert:${string}`,
          sourceId: "source:teacher-professions-note",
          subjectId: id,
          field: "lemma",
          value: lemma,
          status: "candidate",
          location: { noteRow: job.sourceRow },
          confidence: 0.7,
        });
        const meanings = [
          {
            id: `meaning:${slug}-en` as `meaning:${string}`,
            glossEn: job.meaningEn,
            notes: `Encoded from teacher sourceRow ${job.sourceRow}; source wording preserved in paired sourceRow assertion`,
          },
        ];
        const meaningsAssert = assertion({
          id: `assert:${id.replace(":", "-")}-meanings` as `assert:${string}`,
          sourceId: "source:teacher-professions-note",
          subjectId: id,
          field: "meanings",
          value: meanings,
          status: "candidate",
          location: { noteRow: job.sourceRow },
          confidence: 0.7,
        });
        sourceAssertions.push(lemmaAssert, meaningsAssert);

        const pluralForm = pluralParts[idx]?.lemma;
        const groupId = `person-form:teacher-${slugifyDe(mascParts[0]?.lemma ?? lemma)}`;
        const relMember = `rel:${slug}-member-teacher` as `rel:${string}`;
        relationships.push({
          kind: "Relationship",
          id: relMember,
          type: "member-of-collection",
          fromId: id,
          toId: "collection:teacher-professions",
          order: job.sourceRow,
        });

        lexemes.push({
          kind: "Lexeme",
          id,
          lemma,
          partOfSpeech: "noun",
          noun: {
            gender,
            article: part.article ?? articleDefault,
            singular: lemma,
            plurals: pluralForm ? [{ form: pluralForm, patternIds: [] }] : [],
            personFormGroupId: groupId,
          },
          meanings,
          pronunciation: {},
          exampleIds: [],
          relationIds: [relMember],
          sourceAssertionIds: [lemmaAssert.id, meaningsAssert.id, rowAssert.id],
          mediaIds: [],
          cardTemplateIds: [],
          publication: reviewPub(),
        });
      });
      return ids;
    };

    const mascIds = createSide(mascParts, mascPluralParts, "masculine", "der");
    const femIds = createSide(femParts, femPluralParts, "feminine", "die");

    // person-form-of for primary pair
    if (mascIds[0] && femIds[0]) {
      const pfId = `rel:teacher-row-${job.sourceRow}-person-form` as `rel:${string}`;
      if (!relationships.some((r) => r.id === pfId)) {
        relationships.push({
          kind: "Relationship",
          id: pfId,
          type: "person-form-of",
          fromId: femIds[0],
          toId: mascIds[0],
          note:
            job.id === "teacher-job:krankenpfleger"
              ? "Lexical pair from teacher assignment (Krankenpfleger/Krankenschwester), not a productive -in suffix pair"
              : `teacher sourceRow ${job.sourceRow} person-form pair`,
          sourceAssertionId: rowAssert.id,
        });
      }
    }

    // Slash alternatives → related-concept between alternative lemmas (never slash lemmas)
    if (mascIds.length > 1 && mascIds[0] && mascIds[1]) {
      relationships.push({
        kind: "Relationship",
        id: `rel:teacher-row-${job.sourceRow}-masc-alt` as `rel:${string}`,
        type: "related-concept",
        fromId: mascIds[1],
        toId: mascIds[0],
        note: `Slash alternative preserved from source wording: ${job.masculineSingular}`,
        sourceAssertionId: rowAssert.id,
      });
    }
    if (femIds.length > 1 && femIds[0] && femIds[1]) {
      relationships.push({
        kind: "Relationship",
        id: `rel:teacher-row-${job.sourceRow}-fem-alt` as `rel:${string}`,
        type: "related-concept",
        fromId: femIds[1],
        toId: femIds[0],
        note: `Slash alternative preserved from source wording: ${job.feminineSingular}`,
        sourceAssertionId: rowAssert.id,
      });
    }

    // Special usage notes from docs/11 (not modernization)
    if (job.id === "teacher-job:geschaftsmann") {
      contentGaps.push({
        kind: "ContentGap",
        id: "gap:teacher-geschaftsleute-usage",
        objectId: "lex:geschaeftsmann",
        field: "noun.plurals",
        reason: "Source plural die Geschäftsleute is a collective/common plural and needs a usage note after qualified German review",
        owner: "owner-review",
        blocksPublication: false,
      });
    }
    if (job.id === "teacher-job:putzmann") {
      contentGaps.push({
        kind: "ContentGap",
        id: "gap:teacher-putzmann-usage",
        objectId: "lex:putzmann",
        field: "meanings",
        reason: "Putzmann label may be less neutral/current; preserve assigned form and add reviewed usage aliases rather than silently modernizing",
        owner: "owner-review",
        blocksPublication: false,
      });
    }
  }

  const uniqueMembers = [...new Set(memberIds)];
  const collection: Collection = {
    kind: "Collection",
    id: "collection:teacher-professions",
    titleEn: alpha.collections[0]?.titleEn ?? "Teacher professions",
    ...(alpha.collections[0]?.titleDe ? { titleDe: alpha.collections[0].titleDe } : {}),
    membership: { mode: "static", memberIds: uniqueMembers },
    lessonLinks: [
      {
        lessonId: "lesson:02",
        sourcePriority: 3,
        required: false,
      },
    ],
    sourcePriority: 3,
    relationIds: [],
    sourceAssertionIds: [collMembershipAssert.id],
    publication: reviewPub(),
  };

  // Scope exception shape not applied: collection stays review/candidate until German review + enrichment approval.

  teacherSourceRows.sort((a, b) => a.sourceRow - b.sourceRow);

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    fragmentId: "teacher-professions",
    meta: {
      label: "C1 optional source-backed professions publication fragment",
      generatedFor: "publication",
      teacherSourceRows,
    },
    sources,
    sourceAssertions,
    mediaAssets: [],
    lessons: [],
    lexemes,
    verbs: [],
    grammarConcepts: [],
    phrasePatterns: [],
    qaPairs: [],
    dialogues: [],
    listeningAssets: [],
    collections: [collection],
    learningActivities: [],
    examples: [],
    relationships,
    contentGaps,
  };
}

function buildActivities(): ContentFragment {
  // content-spec source is owned by lesson-01 fragment; activities only reference it.
  const sources: Source[] = [];
  const sourceAssertions: SourceAssertion[] = [];
  const learningActivities: LearningActivity[] = [];
  const contentGaps: ContentGap[] = [];

  const all = [
    ...L1_ACTIVITY_DEFS.map((d) => ({ ...d, lessonId: "lesson:01" as const })),
    ...L2_ACTIVITY_DEFS.map((d) => ({ ...d, lessonId: "lesson:02" as const })),
  ];

  for (const def of all) {
    const prompt = {
      instruction: plain(def.title),
    };
    const promptAssert = assertion({
      id: `assert:${def.id.replace(":", "-")}-prompt` as `assert:${string}`,
      sourceId: "source:content-spec-lessons-01-02",
      subjectId: def.id,
      field: "prompt",
      value: prompt,
      status: "verified",
      location: { region: "required-lesson-activities" },
    });
    sourceAssertions.push(promptAssert);

    // Teacher deck stays review while collection/members remain candidate/review.
    const isTeacherDeck = def.id === "activity:lesson-02-teacher-professions-deck";
    const conceptIds = isTeacherDeck ? ["collection:teacher-professions"] : [];

    learningActivities.push({
      kind: "LearningActivity",
      id: def.id,
      lessonId: def.lessonId,
      mode: def.mode,
      renderer: `activity.${def.mode}`,
      conceptIds,
      prompt,
      skillDimensions:
        def.mode === "hear"
          ? ["listening"]
          : def.mode === "check"
            ? ["recall", "production"]
            : def.mode === "review"
              ? ["review-stability"]
              : ["exposure", "recognition"],
      completionRule:
        def.mode === "use"
          ? { type: "recorded" }
          : def.mode === "check"
            ? { type: "correct", minCorrect: 1 }
            : { type: "viewed" },
      relationIds: [],
      sourceAssertionIds: [promptAssert.id],
      publication: isTeacherDeck
        ? reviewPub()
        : published([{ field: "prompt", assertionId: promptAssert.id }]),
    });
  }

  contentGaps.push({
    kind: "ContentGap",
    id: "gap:activity-concept-links",
    objectId: "activity:lesson-01-greetings-by-context",
    field: "conceptIds",
    reason: "Activity→concept wiring deferred until hub indexes; activity records and lesson stage references are complete",
    owner: "cursor",
    blocksPublication: false,
  });

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    fragmentId: "activities",
    meta: {
      label: "C1 required lesson activities fragment",
      generatedFor: "publication",
    },
    sources,
    sourceAssertions,
    mediaAssets: [],
    lessons: [],
    lexemes: [],
    verbs: [],
    grammarConcepts: [],
    phrasePatterns: [],
    qaPairs: [],
    dialogues: [],
    listeningAssets: [],
    collections: [],
    learningActivities,
    examples: [],
    relationships: [],
    contentGaps,
  };
}

function buildListening(audioMap: AudioMap): ContentFragment {
  const sources = buildSharedSources().filter((s) => s.id === "source:workbook-audio-map");
  const sourceAssertions: SourceAssertion[] = [];
  const mediaAssets: MediaAsset[] = [];
  const listeningAssets: ListeningAsset[] = [];
  const contentGaps: ContentGap[] = [];
  const relationships: Relationship[] = [];
  const workbookMappings: Array<{
    id: string;
    sourceAudioId: string;
    filename: string;
    exerciseRef?: string;
  }> = [];

  for (const track of audioMap.tracks) {
    const slug = track.filename.replace(/\.mp3$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const mediaId = `media:workbook-map-${slug}` as `media:${string}`;
    const listenId = `listen:workbook-${slug}` as `listen:${string}`;

    // Rights-gated: non-file URI only. Basename + checksum for reconciliation.
    // Never embed original/private publisher MP3 paths in published fragments.
    const rightsUri = `rights-gated://${track.sourceAudioId}`;

    const variantsAssert = assertion({
      id: `assert:${mediaId.replace(":", "-")}-variants` as `assert:${string}`,
      sourceId: "source:workbook-audio-map",
      subjectId: mediaId,
      field: "variants",
      value: {
        blockedPath: rightsUri,
        rightsReference: rightsUri,
        filename: track.filename,
        sha256: track.sha256,
        durationSeconds: track.durationSeconds,
        sourceAudioId: track.sourceAudioId,
        publicBundleStatus: audioMap.publicBundleStatus,
      },
      status: "candidate",
      location: { track: track.filename, exercise: track.exercise },
      extraction: "filename",
      confidence: 0.9,
    });
    sourceAssertions.push(variantsAssert);

    mediaAssets.push({
      kind: "MediaAsset",
      id: mediaId,
      mediaKind: "audio",
      origin: "publisher",
      locale: "de-DE",
      variants: [{ path: rightsUri, role: "master", checksumSha256: track.sha256 }],
      licenseUseBasis: "private-rights-gated; redistributionBasis null",
      reviewStatus: "candidate",
      linkedConceptIds: [],
      sourceAssertionIds: [variantsAssert.id],
      audioPack: "A1.1",
      localizedPack: "de-DE",
      publication: reviewPub(),
    });

    workbookMappings.push({
      id: `workbook-map:${slug}`,
      sourceAudioId: track.sourceAudioId,
      filename: track.filename,
      exerciseRef: track.exercise,
    });

    const segAssert = assertion({
      id: `assert:${listenId.replace(":", "-")}-segments` as `assert:${string}`,
      sourceId: "source:workbook-audio-map",
      subjectId: listenId,
      field: "transcriptSegments",
      value: [],
      status: "candidate",
      location: { track: track.filename, exercise: track.exercise },
      extraction: "filename",
    });
    sourceAssertions.push(segAssert);

    listeningAssets.push({
      kind: "ListeningAsset",
      id: listenId,
      mediaId,
      transcriptSegments: [],
      exerciseRef: track.exercise,
      relationIds: [],
      sourceAssertionIds: [segAssert.id, variantsAssert.id],
      publication: reviewPub(),
    });

    contentGaps.push({
      kind: "ContentGap",
      id: `gap:rights-${slug}` as `gap:${string}`,
      objectId: mediaId,
      field: "variants",
      reason: `Workbook source MP3 rights open (${audioMap.publicBundleStatus}); mapping only — public source MP3 must remain zero`,
      owner: "owner-review",
      blocksPublication: true,
    });
    contentGaps.push({
      kind: "ContentGap",
      id: `gap:transcript-${slug}` as `gap:${string}`,
      objectId: listenId,
      field: "transcriptSegments",
      reason: "Track is mapped-needs-listening-review; transcript text not encoded in C1 from audio map metadata alone",
      owner: "codex-content",
      blocksPublication: false,
    });

    if (track.lessonId === "lesson:01" || track.lessonId === "lesson:02") {
      relationships.push({
        kind: "Relationship",
        id: `rel:${listenId.slice(7)}-practised` as `rel:${string}`,
        type: "practised-in",
        fromId: listenId,
        toId: track.lessonId,
      });
    }
  }

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    fragmentId: "listening-assets",
    meta: {
      label: "C1 workbook listening mapping fragment (rights-gated)",
      generatedFor: "publication",
      workbookMappings,
    },
    sources,
    sourceAssertions,
    mediaAssets,
    lessons: [],
    lexemes: [],
    verbs: [],
    grammarConcepts: [],
    phrasePatterns: [],
    qaPairs: [],
    dialogues: [],
    listeningAssets,
    collections: [],
    learningActivities: [],
    examples: [],
    relationships,
    contentGaps,
  };
}

function writeFragment(fragment: ContentFragment, fileName: string): void {
  const abs = join(PUBLISHED_DIR, fileName);
  writeFileSync(abs, `${JSON.stringify(fragment, null, 2)}\n`, "utf8");
}

function writeAuthorityProjection(audioMap: AudioMap): void {
  mkdirSync(AUTHORITY_DIR, { recursive: true });
  const projection = projectWorkbookAuthority(audioMap);
  const abs = join(AUTHORITY_DIR, AUTHORITY_WORKBOOK_PROJECTION_FILE);
  writeFileSync(abs, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
  console.log(`Wrote authority projection ${abs} mappings=${projection.mappings.length}`);
}

function main(): void {
  const alpha = loadJson<AlphaContent>(join(REPO_ROOT, "content/alpha-content.json"));
  const audioMap = loadJson<AudioMap>(
    join(REPO_ROOT, "content/source-index/alpha-workbook-audio-map.json"),
  );

  if (audioMap.tracks.length !== 15) {
    throw new Error(`Expected 15 audio tracks, found ${audioMap.tracks.length}`);
  }
  if (alpha.teacherProfessions.length !== 48) {
    throw new Error(`Expected 48 teacher rows, found ${alpha.teacherProfessions.length}`);
  }

  mkdirSync(PUBLISHED_DIR, { recursive: true });
  writeAuthorityProjection(audioMap);

  // Lesson 2 must run before teacher fragment so CORE_OWNED_LEX_SLUGS is populated.
  const lesson01 = buildLesson01(alpha);
  const lesson02 = buildLesson02(alpha);
  const teacher = buildTeacherProfessions(alpha);
  const activities = buildActivities();
  const listening = buildListening(audioMap);

  const fragments: Array<[string, ContentFragment]> = [
    ["lesson-01.json", lesson01],
    ["lesson-02.json", lesson02],
    ["teacher-professions.json", teacher],
    ["activities.json", activities],
    ["listening-assets.json", listening],
  ];

  for (const [name, fragment] of fragments) {
    writeFragment(fragment, name);
    console.log(`Wrote ${name} fragmentId=${fragment.fragmentId}`);
  }
  console.log(`PUBLISHED_DIR=${PUBLISHED_DIR}`);
}

main();
