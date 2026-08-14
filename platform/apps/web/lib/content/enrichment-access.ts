import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ContentBundle,
  Lexeme,
  PhrasePattern,
  QAPair,
  Relationship,
  Verb,
} from "@german-learning/content";
import { buildContentIndexes } from "@german-learning/content";
import { resolveMediaAvailability } from "./media-availability";
import { workbookAudioForActivity } from "../audio/workbook-audio";
import {
  loadValidatedBundleOrThrow,
  projectLearnerWebProjection,
} from "./project";
import type {
  EnrichedActivity,
  EnrichedProfessionCard,
  EnrichmentContentTarget,
  EnrichmentGameEligibility,
  EnrichmentGap,
  EnrichmentMediaSlot,
  EnrichmentPageSection,
  LearnerEnrichmentProjection,
  ProfessionPersonFormRelation,
} from "./enrichment-types";

const here = dirname(fileURLToPath(import.meta.url));
export const GENERATED_ENRICHMENT_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "enrichment",
  "learner-content-enrichment.json",
);

const EXPECTED_ACTIVITY_COUNT = 23;
const EXPECTED_PROFESSION_COUNT = 26;
const EXPECTED_PROFESSION_PAIR_COUNT = 13;
const EXPECTED_REVIEW_ONLY_TEACHER_ROWS = 48;
const EXPECTED_REVIEW_ONLY_TEACHER_LEXEMES = 86;

type PublishedTarget = Lexeme | Verb | PhrasePattern | QAPair;

const L1_GREETINGS = [
  "lex:hallo",
  "lex:guten-tag",
  "lex:guten-morgen",
  "lex:guten-abend",
  "lex:gute-nacht",
  "lex:tschues",
  "lex:auf-wiedersehen",
] as const;
const L1_WELLBEING = [
  "lex:super",
  "lex:sehr-gut-danke",
  "lex:gut-danke",
  "lex:es-geht",
  "lex:nicht-so-gut",
  "lex:auch-super",
  "qa:wellbeing-casual",
  "qa:wellbeing-formal",
] as const;
const L1_COUNTRIES = [
  "lex:deutschland",
  "lex:eritrea",
  "lex:oesterreich",
  "lex:spanien",
  "lex:frankreich",
  "lex:schweiz",
  "lex:tuerkei",
  "lex:usa",
] as const;
const L1_NAME_QA = [
  "qa:name-casual",
  "qa:name-formal",
  "qa:identity",
] as const;
const L1_ORIGIN_QA = ["qa:origin-casual", "qa:origin-formal"] as const;
const L1_VERBS = [
  "verb:sein",
  "verb:heissen",
  "verb:kommen",
  "verb:lernen",
] as const;

const L2_PROFILE = [
  "lex:jahr",
  "lex:kind",
  "lex:verheiratet",
  "lex:geschieden",
  "lex:single",
  "lex:allein",
  "lex:wohnort",
  "lex:herkunft",
  "lex:alter",
  "lex:familienstand",
  "lex:studium",
  "lex:beruf",
  "lex:job",
  "lex:stelle",
  "lex:ausbildung",
  "lex:praktikum",
  "lex:firma",
] as const;
const L2_QA = [
  "qa:profession-casual-main",
  "qa:profession-formal-main",
  "qa:work-formal-main",
  "qa:age-casual",
  "qa:age-formal",
  "qa:residence-casual",
  "qa:residence-formal",
] as const;

const ACTIVITY_TARGET_IDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "activity:lesson-01-greetings-by-context": L1_GREETINGS,
  "activity:lesson-01-greeting-farewell-match": L1_GREETINGS,
  "activity:lesson-01-name-model-dialogue": L1_NAME_QA,
  "activity:lesson-01-alphabet-listen-spell": [],
  "activity:lesson-01-heissen-sein-notice": ["verb:heissen", "verb:sein"],
  "activity:lesson-01-wellbeing-scale": L1_WELLBEING,
  "activity:lesson-01-origin-aus-contrast": [...L1_COUNTRIES, ...L1_ORIGIN_QA],
  "activity:lesson-01-pronoun-verb-builder": L1_VERBS,
  "activity:lesson-01-register-qa-builder": [
    ...L1_NAME_QA,
    ...L1_ORIGIN_QA,
    "qa:wellbeing-casual",
    "qa:wellbeing-formal",
  ],
  "activity:lesson-01-workbook-listening": [],
  "activity:lesson-01-guided-intro-recording": [
    ...L1_NAME_QA,
    ...L1_ORIGIN_QA,
    "qa:wellbeing-casual",
    "qa:wellbeing-formal",
  ],
  "activity:lesson-01-checkpoint-summary": [
    ...L1_GREETINGS,
    ...L1_VERBS,
    ...L1_NAME_QA,
    ...L1_ORIGIN_QA,
  ],
  "activity:lesson-02-personal-profile": [...L2_PROFILE, ...L2_QA.slice(3)],
  "activity:lesson-02-full-person-conjugation": ["verb:sein"],
  "activity:lesson-02-numbers-0-100": [],
  "activity:lesson-02-relationship-status": [
    "lex:verheiratet",
    "lex:geschieden",
    "lex:single",
    "lex:allein",
    "lex:kind",
  ],
  "activity:lesson-02-core-professions": [],
  "activity:lesson-02-person-form-morphology": [],
  "activity:lesson-02-profession-qa-builder": L2_QA.slice(0, 3),
  "activity:lesson-02-sein-arbeiten-contrast": ["verb:sein", ...L2_QA.slice(0, 3)],
  "activity:lesson-02-workbook-listening": [],
  "activity:lesson-02-profile-reading-writing": [...L2_PROFILE, ...L2_QA],
  "activity:lesson-02-checkpoint-summary": [...L2_PROFILE, ...L2_QA, "verb:sein"],
});

const ACTIVITY_INFOGRAPHIC_SLOT: Readonly<Record<string, string>> = Object.freeze({
  "activity:lesson-01-greetings-by-context": "info:l1-greetings-day",
  "activity:lesson-01-greeting-farewell-match": "info:l1-greetings-day",
  "activity:lesson-01-name-model-dialogue": "info:l1-introduction-flow",
  "activity:lesson-01-alphabet-listen-spell": "info:l1-alphabet-sounds",
  "activity:lesson-01-heissen-sein-notice": "info:l1-singular-verbs",
  "activity:lesson-01-wellbeing-scale": "info:l1-introduction-flow",
  "activity:lesson-01-origin-aus-contrast": "info:l1-countries-aus",
  "activity:lesson-01-pronoun-verb-builder": "info:l1-pronouns-roles",
  "activity:lesson-01-register-qa-builder": "info:l1-question-order",
  "activity:lesson-01-guided-intro-recording": "info:l1-introduction-flow",
  "activity:lesson-01-checkpoint-summary": "info:l1-2-cheatsheets",
  "activity:lesson-02-personal-profile": "info:l2-profile",
  "activity:lesson-02-full-person-conjugation": "info:l2-full-conjugation",
  "activity:lesson-02-numbers-0-100": "info:l2-numbers-0-100",
  "activity:lesson-02-relationship-status": "info:l2-negation-nicht",
  "activity:lesson-02-core-professions": "info:l2-core-professions",
  "activity:lesson-02-person-form-morphology": "info:l2-person-forms",
  "activity:lesson-02-profession-qa-builder": "info:l2-occupation-qa",
  "activity:lesson-02-sein-arbeiten-contrast": "info:l2-work-prepositions",
  "activity:lesson-02-profile-reading-writing": "info:l2-profile",
  "activity:lesson-02-checkpoint-summary": "info:l1-2-cheatsheets",
});

function textFromTokens(tokens: readonly ({ type: string; text?: string; label?: string })[]): string {
  return tokens.map((token) => token.type === "gap" ? token.label ?? "" : token.text ?? "").join("");
}

function phraseText(phrase: PhrasePattern): string {
  const fixed = textFromTokens(phrase.fixedTokens.tokens);
  if (fixed) return fixed;
  const first = phrase.acceptedRealizations[0];
  if (!first) throw new Error("ENRICHMENT_UNRESOLVED_PHRASE");
  return textFromTokens(first.tokens);
}

function targetDisplay(target: PublishedTarget, byId: ReadonlyMap<string, PublishedTarget>): string {
  if (target.kind === "Lexeme") {
    return target.noun ? `${target.noun.article} ${target.lemma}` : target.lemma;
  }
  if (target.kind === "Verb") return target.infinitive;
  if (target.kind === "PhrasePattern") return phraseText(target);
  const question = byId.get(target.questionPatternId);
  if (!question || question.kind !== "PhrasePattern") {
    throw new Error("ENRICHMENT_UNRESOLVED_QA_QUESTION");
  }
  return phraseText(question);
}

function targetGloss(target: PublishedTarget): string | null {
  if (target.kind === "Lexeme") return target.meanings[0]?.glossEn ?? null;
  if (target.kind === "Verb") return target.meanings[0]?.glossEn ?? null;
  return null;
}

function publishedTargets(bundle: ContentBundle): ReadonlyMap<string, PublishedTarget> {
  const out = new Map<string, PublishedTarget>();
  const candidates: PublishedTarget[] = [
    ...bundle.lexemes,
    ...bundle.verbs,
    ...bundle.phrasePatterns,
    ...bundle.qaPairs,
  ];
  for (const item of candidates) {
    if (item.publication.status !== "published") continue;
    if (out.has(item.id)) throw new Error("ENRICHMENT_DUPLICATE_PUBLISHED_TARGET");
    out.set(item.id, item);
  }
  return out;
}

function projectTarget(
  target: PublishedTarget,
  byId: ReadonlyMap<string, PublishedTarget>,
  indexes: ReturnType<typeof buildContentIndexes>,
): EnrichmentContentTarget {
  const record = indexes.byId.get(target.id);
  if (!record || record.publicationStatus !== "published") {
    throw new Error("ENRICHMENT_TARGET_NOT_LEARNER_PUBLISHED");
  }
  return Object.freeze({
    id: target.id,
    kind: target.kind,
    displayTextDe: targetDisplay(target, byId),
    glossEn: targetGloss(target),
    source: Object.freeze({
      sourcePriority: record.sourcePriority,
      evidenceState: "published-fields" as const,
      lessonIds: Object.freeze([...record.lessonIds]),
    }),
  });
}

function activityGames(activity: { mode: string; renderer: string }, targets: readonly EnrichmentContentTarget[]): EnrichmentGameEligibility[] {
  const hasVerb = targets.some((target) => target.kind === "Verb");
  const hasQa = targets.some((target) => target.kind === "QAPair" || target.kind === "PhrasePattern");
  const base: EnrichmentGameEligibility[] = [
    Object.freeze({
      gameId: "flashcards" as const,
      state: targets.length > 0 ? "partial" as const : "missing" as const,
      reasonCode: targets.length > 0 ? "published-targets-no-explicit-card-template" : "no-published-target-links",
    }),
  ];
  if (hasVerb) base.push(Object.freeze({ gameId: "verb-builder", state: "ready", reasonCode: "published-present-forms" }));
  if (hasQa) {
    base.push(Object.freeze({ gameId: "sentence-rails", state: "ready", reasonCode: "published-structured-patterns" }));
    base.push(Object.freeze({ gameId: "dialogue-ladder", state: "ready", reasonCode: "published-question-answer-links" }));
  }
  if (activity.mode === "hear") {
    base.push(Object.freeze({ gameId: "audio-match", state: "pending-review", reasonCode: "audio-human-review-open" }));
  }
  return base;
}

function activitySections(
  targetCount: number,
  mediaState: EnrichmentPageSection["state"],
): EnrichmentPageSection[] {
  return [
    Object.freeze({ id: "hero", title: "Activity", state: "ready", fieldKeys: Object.freeze(["displayText", "mode", "skillDimensions"]) }),
    Object.freeze({ id: "meaning", title: "Learn", state: targetCount > 0 ? "ready" : "missing", fieldKeys: Object.freeze(["contentTargets.displayTextDe", "contentTargets.glossEn"]) }),
    Object.freeze({ id: "notice", title: "Notice", state: targetCount > 0 ? "partial" : "missing", fieldKeys: Object.freeze(["relationIds"]) }),
    Object.freeze({ id: "practice", title: "Practise", state: targetCount > 0 ? "partial" : "missing", fieldKeys: Object.freeze(["gameEligibility", "reviewEligible"]) }),
    Object.freeze({ id: "related", title: "Related", state: targetCount > 0 ? "ready" : "missing", fieldKeys: Object.freeze(["contentTargets", "relationIds"]) }),
    Object.freeze({ id: "media", title: "Media", state: mediaState, fieldKeys: Object.freeze(["mediaSlots"]) }),
  ];
}

function relationIdsForTargets(bundle: ContentBundle, targetIds: ReadonlySet<string>): string[] {
  return bundle.relationships
    .filter((relation) => targetIds.has(relation.fromId) || targetIds.has(relation.toId))
    .filter((relation) => relation.type !== "member-of-collection")
    .filter((relation) => !relation.id.startsWith("rel:teacher-row-"))
    .map((relation) => relation.id)
    .sort((a, b) => a.localeCompare(b));
}

function projectActivities(bundle: ContentBundle): EnrichedActivity[] {
  const web = projectLearnerWebProjection(bundle);
  const indexes = buildContentIndexes(bundle);
  const byId = publishedTargets(bundle);
  const professionIds = publishedProfessionIds(bundle, indexes);
  const activities = web.activities.map((activity) => {
    let configured = ACTIVITY_TARGET_IDS[activity.id];
    if (!configured) throw new Error("ENRICHMENT_ACTIVITY_MAP_MISSING");
    if (
      activity.id === "activity:lesson-02-core-professions" ||
      activity.id === "activity:lesson-02-person-form-morphology"
    ) {
      configured = professionIds;
    } else if (activity.id === "activity:lesson-02-checkpoint-summary") {
      configured = [...configured, ...professionIds];
    }
    const uniqueIds = [...new Set(configured)].sort((a, b) => a.localeCompare(b));
    const targets = uniqueIds.map((id) => {
      const target = byId.get(id);
      if (!target) throw new Error("ENRICHMENT_ACTIVITY_TARGET_UNRESOLVED");
      const record = indexes.byId.get(id);
      if (!record?.lessonIds.includes(activity.lessonId)) {
        throw new Error("ENRICHMENT_ACTIVITY_TARGET_WRONG_LESSON");
      }
      return projectTarget(target, byId, indexes);
    });
    const targetSet = new Set(uniqueIds);
    const isWorkbook = activity.id.endsWith("workbook-listening");
    const infographicId = ACTIVITY_INFOGRAPHIC_SLOT[activity.id];
    const mediaSlots: EnrichmentMediaSlot[] = [];
    if (infographicId) {
      mediaSlots.push(Object.freeze({
        slotId: infographicId,
        kind: "infographic",
        state: "missing",
        learnerMessage: "The teaching visual for this activity is not available yet.",
      }));
    }
    if (isWorkbook) {
      // ADR-015/016 released the Lessons 1–2 workbook recordings, and the
      // activity page now plays them, so the old "not available yet" line was
      // describing a state the learner can already hear past.
      const trackCount = workbookAudioForActivity(activity.id).length;
      mediaSlots.push(Object.freeze({
        slotId: `source-listening:${activity.lessonId}`,
        kind: "source-listening",
        state: trackCount > 0 ? "ready" : "missing",
        learnerMessage:
          trackCount > 0
            ? `The original workbook recordings for this exercise are ready to play — ${trackCount} track${trackCount === 1 ? "" : "s"}.`
            : "The workbook listening audio is not available for this activity yet.",
      }));
    } else {
      const media = resolveMediaAvailability({
        conceptIds: uniqueIds,
        spokenTexts: targets.map((target) => target.displayTextDe),
      });
      mediaSlots.push(Object.freeze({
        slotId: `audio:${activity.id}`,
        kind: "audio",
        state: media.state === "preview" ? "ready" : media.state,
        learnerMessage: media.state === "preview" ? "Preview pronunciation is available. It is computer-generated and still waiting for a native-speaker check." : "Pronunciation audio is not available for this activity yet.",
      }));
    }
    const gaps: EnrichmentGap[] = [];
    if (uniqueIds.length === 0) {
      gaps.push(Object.freeze({
        code: "activity-content-links-missing",
        field: "contentTargets",
        state: "missing",
        learnerMessage: "The content for this activity is not available yet.",
      }));
    }
    if (infographicId) {
      gaps.push(Object.freeze({
        code: "activity-infographic-missing",
        field: "mediaSlots.infographic",
        state: "missing",
        learnerMessage: "The teaching visual for this activity is not available yet.",
      }));
    }
    const activityRecord = indexes.byId.get(activity.id);
    if (!activityRecord || activityRecord.sourcePriority !== 2) {
      throw new Error("ENRICHMENT_ACTIVITY_SOURCE_PRIORITY_MISMATCH");
    }
    return Object.freeze({
      kind: "LearningActivity" as const,
      id: activity.id,
      lessonId: activity.lessonId,
      lessonNumber: activity.lessonNumber as 1 | 2,
      stageId: activity.stageId,
      stageTitleEn: activity.stageTitleEn,
      mode: activity.mode,
      renderer: activity.renderer,
      displayText: activity.promptPlainText,
      canonicalPath: activity.canonicalPath,
      skillDimensions: Object.freeze([...activity.skillDimensions]),
      source: Object.freeze({
        sourcePriority: activityRecord.sourcePriority,
        evidenceState: "published-fields" as const,
        lessonIds: Object.freeze([activity.lessonId]),
      }),
      mappingBasis: "published-activity-contract-and-published-lesson-membership" as const,
      contentTargets: Object.freeze(targets),
      relationIds: Object.freeze(relationIdsForTargets(bundle, targetSet)),
      reviewEligible: targets.length > 0,
      gameEligibility: Object.freeze(activityGames(activity, targets)),
      mediaSlots: Object.freeze(mediaSlots),
      sections: Object.freeze(
        activitySections(
          targets.length,
          mediaSlots.every((slot) => slot.state === "ready")
            ? "ready"
            : mediaSlots.some((slot) => slot.state === "ready")
              ? "partial"
              : "pending-review",
        ),
      ),
      gaps: Object.freeze(gaps),
    });
  });
  if (activities.length !== EXPECTED_ACTIVITY_COUNT) throw new Error("ENRICHMENT_ACTIVITY_COUNT_MISMATCH");
  return activities.sort((a, b) => a.id.localeCompare(b.id));
}

function publishedProfessionRelations(
  bundle: ContentBundle,
  indexes: ReturnType<typeof buildContentIndexes>,
): Relationship[] {
  return bundle.relationships
    .filter((relationship) => relationship.type === "person-form-of")
    // Overlapping teacher rows can point at otherwise published core lexemes.
    // Their relationship remains review-only and must not enter this learner artifact.
    .filter((relationship) => !relationship.id.startsWith("rel:teacher-row-"))
    .filter((relationship) => indexes.byId.has(relationship.fromId) && indexes.byId.has(relationship.toId))
    .filter((relationship) => {
      const from = indexes.byId.get(relationship.fromId);
      const to = indexes.byId.get(relationship.toId);
      return from?.lessonIds.includes("lesson:02") && to?.lessonIds.includes("lesson:02");
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function publishedProfessionIds(
  bundle: ContentBundle,
  indexes: ReturnType<typeof buildContentIndexes>,
): string[] {
  return [...new Set(publishedProfessionRelations(bundle, indexes).flatMap((relation) => [relation.fromId, relation.toId]))]
    .sort((a, b) => a.localeCompare(b));
}

function commonPrefix(a: string, b: string): string {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  return a.slice(0, index);
}

function personFormRelation(
  lexeme: Lexeme,
  relation: Relationship,
  byLexeme: ReadonlyMap<string, Lexeme>,
): ProfessionPersonFormRelation {
  const pairedId = relation.fromId === lexeme.id ? relation.toId : relation.fromId;
  const paired = byLexeme.get(pairedId);
  if (!paired?.noun || paired.publication.status !== "published") {
    throw new Error("ENRICHMENT_PROFESSION_PAIR_UNRESOLVED");
  }
  const masculine = lexeme.noun?.gender === "masculine" ? lexeme : paired;
  const feminine = lexeme.noun?.gender === "feminine" ? lexeme : paired;
  const prefix = commonPrefix(masculine.lemma, feminine.lemma);
  const transparent = feminine.lemma === `${masculine.lemma}in`;
  const transformation = transparent
    ? "transparent-suffix-in" as const
    : feminine.lemma.endsWith("in")
      ? "surface-stem-change-plus-in" as const
      : "published-lexical-pair" as const;
  return Object.freeze({
    relationId: relation.id,
    pairedConceptId: paired.id,
    pairedDisplayText: `${paired.noun.article} ${paired.lemma}`,
    transformation,
    sharedPrefix: prefix,
    addedSuffix: feminine.lemma.slice(prefix.length),
  });
}

function professionGames(audioState: "ready" | "pending-review" | "missing", hasPlural: boolean): EnrichmentGameEligibility[] {
  return [
    Object.freeze({ gameId: "flashcards", state: "partial", reasonCode: "published-card-fields-explicit-template-missing" }),
    Object.freeze({ gameId: "article-sort", state: "ready", reasonCode: "published-article-and-gender" }),
    Object.freeze({ gameId: "picture-match", state: "missing", reasonCode: "approved-image-missing" }),
    Object.freeze({ gameId: "audio-match", state: audioState, reasonCode: audioState === "ready" ? "approved-audio" : "audio-human-review-open" }),
    Object.freeze({ gameId: "plural-forge", state: hasPlural ? "ready" : "missing", reasonCode: hasPlural ? "published-plural" : "published-plural-missing" }),
    Object.freeze({ gameId: "spoken-repeat", state: audioState, reasonCode: audioState === "ready" ? "approved-audio" : "audio-human-review-open" }),
  ];
}

function professionSections(
  hasPlural: boolean,
  audioState: "ready" | "pending-review" | "missing",
): EnrichmentPageSection[] {
  return [
    Object.freeze({ id: "hero", title: "Word", state: "ready", fieldKeys: Object.freeze(["displayTextDe", "glossEn"]) }),
    Object.freeze({ id: "meaning", title: "Meaning", state: "ready", fieldKeys: Object.freeze(["glossEn"]) }),
    Object.freeze({ id: "forms", title: "Forms", state: hasPlural ? "ready" : "partial", fieldKeys: Object.freeze(["article", "gender", "singular", "plural"]) }),
    Object.freeze({ id: "notice", title: "Person form", state: "ready", fieldKeys: Object.freeze(["personForm"]) }),
    Object.freeze({ id: "practice", title: "Practise", state: "partial", fieldKeys: Object.freeze(["reviewEligibility", "gameEligibility"]) }),
    Object.freeze({ id: "related", title: "Related", state: "ready", fieldKeys: Object.freeze(["personForm.pairedConceptId", "activityIds", "relationIds"]) }),
    Object.freeze({ id: "media", title: "Hear and see", state: audioState === "ready" ? "partial" : audioState, fieldKeys: Object.freeze(["mediaSlots"]) }),
  ];
}

function projectProfessions(bundle: ContentBundle): EnrichedProfessionCard[] {
  const indexes = buildContentIndexes(bundle);
  const relations = publishedProfessionRelations(bundle, indexes);
  if (relations.length !== EXPECTED_PROFESSION_PAIR_COUNT) throw new Error("ENRICHMENT_PROFESSION_PAIR_COUNT_MISMATCH");
  const relationById = new Map<string, Relationship>();
  for (const relation of relations) {
    relationById.set(relation.fromId, relation);
    relationById.set(relation.toId, relation);
  }
  const byLexeme = new Map<string, Lexeme>(
    bundle.lexemes.map((lexeme) => [lexeme.id, lexeme]),
  );
  const professionIds = publishedProfessionIds(bundle, indexes);
  const cards = professionIds.map((id) => {
    const lexeme = byLexeme.get(id);
    const relation = relationById.get(id);
    const record = indexes.byId.get(id);
    if (!lexeme?.noun || !relation || !record || lexeme.publication.status !== "published") {
      throw new Error("ENRICHMENT_PROFESSION_NOT_PUBLISHED");
    }
    const glossEn = lexeme.meanings[0]?.glossEn;
    if (!glossEn) throw new Error("ENRICHMENT_PROFESSION_GLOSS_MISSING");
    const displayTextDe = `${lexeme.noun.article} ${lexeme.lemma}`;
    const pluralForms = lexeme.noun.plurals.map((plural) => plural.form).filter(Boolean);
    const media = resolveMediaAvailability({ conceptIds: [lexeme.id], spokenTexts: [displayTextDe] });
    const audioState = media.state === "preview" ? "ready" as const : media.state;
    const mediaSlots: EnrichmentMediaSlot[] = [
      Object.freeze({
        slotId: `audio:${lexeme.id}`,
        kind: "audio",
        state: audioState,
        learnerMessage: audioState === "ready" ? "Preview pronunciation is available. It is computer-generated and still waiting for a native-speaker check." : "Pronunciation audio is not available for this word yet.",
      }),
      Object.freeze({
        slotId: `img:job:${lexeme.id.slice(4)}:v1`,
        kind: "image",
        state: "missing",
        learnerMessage: "An illustration for this word is not available yet.",
      }),
      Object.freeze({
        slotId: "info:l2-person-forms",
        kind: "infographic",
        state: "missing",
        learnerMessage: "The person-form visual is not available yet.",
      }),
    ];
    const gaps: EnrichmentGap[] = [];
    if (pluralForms.length === 0) {
      gaps.push(Object.freeze({
        code: "profession-plural-missing",
        field: "plural.forms",
        state: "missing",
        learnerMessage: "The plural form is not available yet.",
      }));
    }
    if (audioState !== "ready") {
      gaps.push(Object.freeze({
        code: "profession-audio-missing",
        field: "mediaSlots.audio",
        state: audioState,
        learnerMessage: "Pronunciation audio is not available for this word yet.",
      }));
    }
    gaps.push(Object.freeze({
      code: "profession-image-missing",
      field: "mediaSlots.image",
      state: "missing",
      learnerMessage: "An illustration for this word is not available yet.",
    }));
    const activityIds = [
      "activity:lesson-02-core-professions",
      "activity:lesson-02-person-form-morphology",
      "activity:lesson-02-checkpoint-summary",
    ] as const;
    return Object.freeze({
      kind: "Lexeme" as const,
      id: lexeme.id,
      lessonId: "lesson:02" as const,
      source: Object.freeze({
        sourcePriority: record.sourcePriority,
        evidenceState: "published-fields" as const,
        lessonIds: Object.freeze(["lesson:02" as const]),
      }),
      displayTextDe,
      lemma: lexeme.lemma,
      glossEn,
      article: lexeme.noun.article,
      gender: lexeme.noun.gender,
      singular: lexeme.noun.singular,
      plural: Object.freeze({
        state: pluralForms.length > 0 ? "ready" as const : "missing" as const,
        forms: Object.freeze(pluralForms),
        learnerMessage: pluralForms.length > 0 ? null : "The plural form is not available yet.",
      }),
      personForm: personFormRelation(lexeme, relation, byLexeme),
      relationIds: Object.freeze([relation.id]),
      activityIds: Object.freeze([...activityIds]),
      reviewEligibility: Object.freeze({
        conceptEligible: true as const,
        cardTemplateState: lexeme.cardTemplateIds.length > 0 ? "ready" as const : "missing" as const,
        schedulerReady: lexeme.cardTemplateIds.length > 0,
      }),
      gameEligibility: Object.freeze(professionGames(audioState, pluralForms.length > 0)),
      mediaSlots: Object.freeze(mediaSlots),
      sections: Object.freeze(professionSections(pluralForms.length > 0, audioState)),
      gaps: Object.freeze(gaps),
    });
  });
  if (cards.length !== EXPECTED_PROFESSION_COUNT) throw new Error("ENRICHMENT_PROFESSION_COUNT_MISMATCH");
  return cards.sort((a, b) => a.id.localeCompare(b.id));
}

function countReviewOnlyTeacherState(bundle: ContentBundle): { rows: number; lexemes: number } {
  const collection = bundle.collections.find((item) => item.id === "collection:teacher-professions");
  if (!collection || collection.publication.status !== "review") {
    throw new Error("ENRICHMENT_TEACHER_COLLECTION_POLICY_MISMATCH");
  }
  const teacherLexemes = bundle.lexemes.filter((lexeme) =>
    lexeme.publication.status === "review" &&
    lexeme.noun?.personFormGroupId?.startsWith("person-form:teacher-")
  );
  // The 48 source rows do not map one-to-one to person-form groups because
  // reviewed slash alternatives can share a group. Count registered source
  // locations internally; no row values or assertion data enters the artifact.
  const rows = new Set(
    bundle.sourceAssertions
      .filter((item) => item.sourceId === "source:teacher-professions-note")
      .map((item) => item.location.noteRow)
      .filter((row): row is number => typeof row === "number"),
  ).size;
  return { rows, lexemes: teacherLexemes.length };
}

export function projectLearnerEnrichment(bundle: ContentBundle): LearnerEnrichmentProjection {
  const teacher = countReviewOnlyTeacherState(bundle);
  if (teacher.rows !== EXPECTED_REVIEW_ONLY_TEACHER_ROWS || teacher.lexemes !== EXPECTED_REVIEW_ONLY_TEACHER_LEXEMES) {
    throw new Error("ENRICHMENT_TEACHER_EXCLUSION_COUNT_MISMATCH");
  }
  const activities = projectActivities(bundle);
  const professionCards = projectProfessions(bundle);
  const activitiesById = Object.fromEntries(activities.map((activity) => [activity.id, activity]));
  const professionCardsById = Object.fromEntries(professionCards.map((card) => [card.id, card]));
  const projection: LearnerEnrichmentProjection = {
    schemaVersion: "1.0.0",
    projectionKind: "learner-content-enrichment",
    generatedFrom: "validated-publication",
    policy: Object.freeze({
      audience: "learner",
      publicationStatus: "published-only",
      teacherCollectionState: "review-only-excluded",
      rawSourceDataIncluded: false,
      rawMediaDataIncluded: false,
    }),
    counts: Object.freeze({
      lessons: 2,
      activities: 23,
      professionCards: 26,
      professionPairs: 13,
      reviewOnlyTeacherRowsExcluded: 48,
      reviewOnlyTeacherLexemesExcluded: 86,
      professionPluralGaps: professionCards.filter((card) => card.plural.state === "missing").length,
      professionAudioPendingReview: professionCards.filter((card) => card.mediaSlots.some((slot) => slot.kind === "audio" && slot.state === "pending-review")).length,
      professionImageGaps: professionCards.filter((card) => card.mediaSlots.some((slot) => slot.kind === "image" && slot.state === "missing")).length,
      activityContentLinkGaps: activities.filter((activity) => activity.contentTargets.length === 0).length,
    }),
    activities: Object.freeze(activities),
    activitiesById: Object.freeze(activitiesById),
    professionCards: Object.freeze(professionCards),
    professionCardsById: Object.freeze(professionCardsById),
  };
  assertLearnerEnrichmentProjection(projection);
  return Object.freeze(projection);
}

export function projectPublishedLearnerEnrichment(publishedDir: string): LearnerEnrichmentProjection {
  return projectLearnerEnrichment(loadValidatedBundleOrThrow(publishedDir));
}

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value != null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableSort(nested)]),
    );
  }
  return value;
}

export function serializeEnrichmentProjectionDeterministic(projection: LearnerEnrichmentProjection): string {
  return `${JSON.stringify(stableSort(projection), null, 2)}\n`;
}

function collectKeysAndStrings(value: unknown, keys: string[], strings: string[]): void {
  if (typeof value === "string") {
    strings.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectKeysAndStrings(item, keys, strings);
    return;
  }
  if (value != null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      keys.push(key);
      collectKeysAndStrings(nested, keys, strings);
    }
  }
}

export function assertLearnerEnrichmentProjection(value: unknown): asserts value is LearnerEnrichmentProjection {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new Error("ENRICHMENT_INVALID_ROOT");
  const projection = value as LearnerEnrichmentProjection;
  if (projection.projectionKind !== "learner-content-enrichment" || projection.schemaVersion !== "1.0.0") throw new Error("ENRICHMENT_INVALID_IDENTITY");
  if (projection.activities?.length !== EXPECTED_ACTIVITY_COUNT || Object.keys(projection.activitiesById ?? {}).length !== EXPECTED_ACTIVITY_COUNT) throw new Error("ENRICHMENT_INVALID_ACTIVITY_COUNT");
  if (projection.professionCards?.length !== EXPECTED_PROFESSION_COUNT || Object.keys(projection.professionCardsById ?? {}).length !== EXPECTED_PROFESSION_COUNT) throw new Error("ENRICHMENT_INVALID_PROFESSION_COUNT");
  if (
    projection.counts.lessons !== 2 ||
    projection.counts.activities !== EXPECTED_ACTIVITY_COUNT ||
    projection.counts.professionCards !== EXPECTED_PROFESSION_COUNT ||
    projection.counts.professionPairs !== EXPECTED_PROFESSION_PAIR_COUNT ||
    projection.counts.reviewOnlyTeacherRowsExcluded !== EXPECTED_REVIEW_ONLY_TEACHER_ROWS ||
    projection.counts.reviewOnlyTeacherLexemesExcluded !== EXPECTED_REVIEW_ONLY_TEACHER_LEXEMES
  ) throw new Error("ENRICHMENT_INVALID_COUNTS");
  if (projection.policy.audience !== "learner" || projection.policy.publicationStatus !== "published-only" || projection.policy.teacherCollectionState !== "review-only-excluded") throw new Error("ENRICHMENT_INVALID_POLICY");
  for (const activity of projection.activities) {
    if (projection.activitiesById[activity.id] !== activity && JSON.stringify(projection.activitiesById[activity.id]) !== JSON.stringify(activity)) throw new Error("ENRICHMENT_ACTIVITY_INDEX_DRIFT");
    for (const target of activity.contentTargets) {
      if (target.source.evidenceState !== "published-fields") throw new Error("ENRICHMENT_UNPUBLISHED_TARGET");
    }
  }
  for (const card of projection.professionCards) {
    if (projection.professionCardsById[card.id] !== card && JSON.stringify(projection.professionCardsById[card.id]) !== JSON.stringify(card)) throw new Error("ENRICHMENT_PROFESSION_INDEX_DRIFT");
    if (card.lessonId !== "lesson:02" || card.source.evidenceState !== "published-fields") throw new Error("ENRICHMENT_PROFESSION_SCOPE_DRIFT");
  }
  const keys: string[] = [];
  const strings: string[] = [];
  collectKeysAndStrings(value, keys, strings);
  const forbiddenKey = /sourceassertion|assertionvalue|originalpath|privatepath|audiourl|mp3path|sha256|checksum|secret|password|apikey|credential|rawhtml/i;
  const forbiddenString = /assert:|\.mp3\b|resources[\\/]original|media[\\/]private|rights-gated:\/\/|collection:teacher-professions|rel:teacher-row-|person-form:teacher-|[A-Z]:\\|\/Users\/|<\/?[a-z][^>]*>/i;
  if (keys.some((key) => forbiddenKey.test(key))) throw new Error("ENRICHMENT_FORBIDDEN_KEY");
  if (strings.some((text) => forbiddenString.test(text))) throw new Error("ENRICHMENT_FORBIDDEN_STRING");
}

let cached: LearnerEnrichmentProjection | null = null;

export function getLearnerEnrichmentProjection(): LearnerEnrichmentProjection {
  if (cached) return cached;
  const parsed = JSON.parse(readFileSync(GENERATED_ENRICHMENT_PATH, "utf8")) as unknown;
  assertLearnerEnrichmentProjection(parsed);
  cached = parsed;
  return parsed;
}
