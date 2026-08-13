import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT } from "./learner-publication-policy";
import {
  DETAIL_REPRESENTATIVE_CONTRACT,
  QA_PROFESSION_CASUAL_CANONICAL,
  VERB_SEIN_CANONICAL,
  VERB_SEIN_PRESENT_CANONICAL,
  VOCAB_ARCHITEKT_CANONICAL,
  stableStringifyDetailValue,
} from "./detail-canonical-contract";
import {
  DETAIL_KIND_BY_ID,
  DETAIL_REPRESENTATIVE_IDS,
  detailCanonicalPath,
  detailHubForId,
  type DetailRepresentativeId,
  type LearnerDetailProjection,
  type LearnerDetailRecord,
  type LearnerMediaAvailability,
} from "./detail-types";
import { LEARNER_HUB_IDS, type LearnerHubId, type LearnerHubProjection } from "./hub-types";
import { isSafeNavigationPath } from "./navigation-context";
import type {
  LearnerSearchDocument,
  LearnerSearchField,
  LearnerSearchProjection,
} from "./search-types";
import type { LearnerWebProjection } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
export const GENERATED_PROJECTION_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-projection.json",
);
export const GENERATED_HUB_PROJECTION_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-hubs.json",
);
export const GENERATED_SEARCH_PROJECTION_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-search.json",
);
export const GENERATED_DETAIL_PROJECTION_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-details.json",
);

let cached: LearnerWebProjection | null = null;
let cachedHubs: LearnerHubProjection | null = null;
let cachedSearch: LearnerSearchProjection | null = null;
let cachedDetails: LearnerDetailProjection | null = null;

const SEARCH_TOP_LEVEL_KEYS = [
  "schemaVersion",
  "projectionKind",
  "documentCount",
  "documents",
  "documentsById",
] as const;

const SEARCHABLE_KINDS = new Set<string>([
  "Lesson",
  "LearningActivity",
  "Lexeme",
  "Verb",
  "GrammarConcept",
  "PhrasePattern",
  "QAPair",
  "Dialogue",
  "ListeningAsset",
  "Collection",
]);

const MATCH_FIELDS = new Set<string>([
  "label",
  "lemma",
  "infinitive",
  "meaning",
  "intent",
  "title",
  "realization",
  "form",
  "category",
]);

const HUB_NAMES = new Set<string>([
  "vocabulary",
  "verbs",
  "grammar",
  "phrases",
  "listening",
  "concepts",
  "lessons",
  "review",
]);

const FORBIDDEN_SEARCH_KEY_FRAGMENTS = [
  "SourceAssertion",
  "sourceAssertion",
  "assertionValue",
  "assertionValues",
  "redistributionBasis",
  "originalPath",
  "privatePath",
  "absolutePath",
  "audioUrl",
  "mp3Path",
  "apiKey",
  "api_key",
  "secret",
  "password",
  "token",
  "credential",
] as const;

const FORBIDDEN_SEARCH_STRING_PATTERNS: readonly RegExp[] = [
  /assert:/i,
  /\.mp3\b/i,
  /resources\/original/i,
  /[A-Z]:\\/,
  /\/Users\//,
];

function assertHubProjection(parsed: LearnerHubProjection): void {
  if (
    parsed.projectionKind !== "learner-hubs" ||
    parsed.schemaVersion !== "1.0.0" ||
    parsed.hubCount !== 6 ||
    !Array.isArray(parsed.hubs) ||
    parsed.hubs.length !== 6
  ) {
    throw new Error("Learner hub projection artifact is invalid or incomplete");
  }

  const seen = new Set<string>();
  for (const hubId of LEARNER_HUB_IDS) {
    const hub = parsed.hubsById?.[hubId] ?? parsed.hubs.find((h) => h.id === hubId);
    if (!hub) {
      throw new Error(`Learner hub projection missing hub ${hubId}`);
    }
    if (hub.path !== `/${hubId}`) {
      throw new Error(`Learner hub ${hubId} has unexpected path ${hub.path}`);
    }
    if (hub.itemCount !== hub.items.length) {
      throw new Error(`Learner hub ${hubId} itemCount mismatch`);
    }
    for (const item of hub.items) {
      if (item.publicationStatus !== "published") {
        throw new Error(`Hub item ${item.id} is not published`);
      }
      if (seen.has(item.id)) {
        throw new Error(`Duplicate hub item id ${item.id}`);
      }
      seen.add(item.id);
      if (item.hubDestination.hub !== hubId) {
        throw new Error(`Hub item ${item.id} destination hub mismatch`);
      }
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function walkForbiddenKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) walkForbiddenKeys(item);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    const lower = key.toLowerCase();
    for (const frag of FORBIDDEN_SEARCH_KEY_FRAGMENTS) {
      if (lower.includes(frag.toLowerCase())) {
        throw new Error("Learner search projection contains a forbidden key");
      }
    }
    walkForbiddenKeys(nested);
  }
}

function walkForbiddenStrings(value: unknown): void {
  if (typeof value === "string") {
    for (const pattern of FORBIDDEN_SEARCH_STRING_PATTERNS) {
      if (pattern.test(value)) {
        throw new Error("Learner search projection contains a forbidden string");
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkForbiddenStrings(item);
    return;
  }
  if (isPlainObject(value)) {
    for (const nested of Object.values(value)) walkForbiddenStrings(nested);
  }
}

function assertSearchField(field: unknown): asserts field is LearnerSearchField {
  if (!isPlainObject(field)) {
    throw new Error("Learner search field shape is invalid");
  }
  if (typeof field.field !== "string" || !MATCH_FIELDS.has(field.field)) {
    throw new Error("Learner search field name is invalid");
  }
  if (typeof field.displayText !== "string") {
    throw new Error("Learner search field displayText is invalid");
  }
  if (!Array.isArray(field.matchKeys) || field.matchKeys.some((k) => typeof k !== "string")) {
    throw new Error("Learner search field matchKeys are invalid");
  }
}

function assertSearchDocument(doc: unknown): asserts doc is LearnerSearchDocument {
  if (!isPlainObject(doc)) {
    throw new Error("Learner search document shape is invalid");
  }
  if (typeof doc.id !== "string" || doc.id.length === 0) {
    throw new Error("Learner search document id is invalid");
  }
  if (typeof doc.kind !== "string" || !SEARCHABLE_KINDS.has(doc.kind)) {
    throw new Error("Learner search document kind is invalid");
  }
  if (typeof doc.displayLabel !== "string") {
    throw new Error("Learner search document displayLabel is invalid");
  }
  if (doc.publicationStatus !== "published") {
    throw new Error("Learner search document is not published");
  }
  if (
    !(
      doc.sourcePriority === null ||
      doc.sourcePriority === 1 ||
      doc.sourcePriority === 2 ||
      doc.sourcePriority === 3 ||
      doc.sourcePriority === 4
    )
  ) {
    throw new Error("Learner search document sourcePriority is invalid");
  }
  if (
    !Array.isArray(doc.lessonIds) ||
    doc.lessonIds.some((id) => typeof id !== "string")
  ) {
    throw new Error("Learner search document lessonIds are invalid");
  }
  if (!(doc.category === null || typeof doc.category === "string")) {
    throw new Error("Learner search document category is invalid");
  }
  if (!isPlainObject(doc.hubDestination)) {
    throw new Error("Learner search hubDestination is invalid");
  }
  if (
    typeof doc.hubDestination.hub !== "string" ||
    !HUB_NAMES.has(doc.hubDestination.hub)
  ) {
    throw new Error("Learner search hubDestination hub is invalid");
  }
  // Non-canonical index paths must not appear on the learner artifact.
  if ("path" in doc.hubDestination) {
    throw new Error("Learner search hubDestination must omit path");
  }
  if (!Array.isArray(doc.fields)) {
    throw new Error("Learner search document fields are invalid");
  }
  for (const field of doc.fields) assertSearchField(field);

  if (doc.canonicalHref === null) {
    // Deferred detail — OK.
  } else if (typeof doc.canonicalHref === "string") {
    if (!isSafeNavigationPath(doc.canonicalHref)) {
      throw new Error("Learner search canonicalHref failed allowlist");
    }
  } else {
    throw new Error("Learner search canonicalHref is invalid");
  }
}

/**
 * Fail-closed validation for the learner search projection.
 * Unsafe values are never echoed in error messages.
 */
export function assertLearnerSearchProjection(
  parsed: LearnerSearchProjection,
): void {
  if (!isPlainObject(parsed)) {
    throw new Error("Learner search projection artifact is invalid or incomplete");
  }

  const keys = Object.keys(parsed).sort();
  const expected = [...SEARCH_TOP_LEVEL_KEYS].sort();
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    throw new Error("Learner search projection has unexpected top-level shape");
  }

  if (
    parsed.projectionKind !== "learner-search" ||
    parsed.schemaVersion !== "1.0.0" ||
    !Array.isArray(parsed.documents) ||
    typeof parsed.documentCount !== "number" ||
    parsed.documentCount !== parsed.documents.length ||
    !isPlainObject(parsed.documentsById)
  ) {
    throw new Error("Learner search projection artifact is invalid or incomplete");
  }

  const seen = new Set<string>();
  for (const doc of parsed.documents) {
    assertSearchDocument(doc);
    if (seen.has(doc.id)) {
      throw new Error("Duplicate search document id");
    }
    seen.add(doc.id);
    const byId = parsed.documentsById[doc.id];
    if (byId == null || byId.id !== doc.id) {
      throw new Error("Search documentsById is inconsistent");
    }
  }

  const byIdKeys = Object.keys(parsed.documentsById);
  if (byIdKeys.length !== parsed.documents.length) {
    throw new Error("Search documentsById count mismatch");
  }

  walkForbiddenKeys(parsed);
  walkForbiddenStrings(parsed);
}

/** @deprecated Prefer assertLearnerSearchProjection — kept as internal alias. */
function assertSearchProjection(parsed: LearnerSearchProjection): void {
  assertLearnerSearchProjection(parsed);
}

/** Load the build-time learner-safe projection artifact. */
export function loadLearnerProjection(): LearnerWebProjection {
  if (cached) return cached;
  const raw = readFileSync(GENERATED_PROJECTION_PATH, "utf8");
  const parsed = JSON.parse(raw) as LearnerWebProjection;
  if (
    parsed.projectionKind !== "learner-web" ||
    parsed.lessonCount !== 2 ||
    parsed.activityCount !== EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT
  ) {
    throw new Error("Learner projection artifact is invalid or incomplete");
  }
  cached = parsed;
  return parsed;
}

/** Load the build-time learner-safe hub list artifact. */
export function loadLearnerHubProjection(): LearnerHubProjection {
  if (cachedHubs) return cachedHubs;
  const raw = readFileSync(GENERATED_HUB_PROJECTION_PATH, "utf8");
  const parsed = JSON.parse(raw) as LearnerHubProjection;
  assertHubProjection(parsed);
  cachedHubs = parsed;
  return parsed;
}

/** Load the build-time learner-safe global search artifact. */
export function loadLearnerSearchProjection(): LearnerSearchProjection {
  if (cachedSearch) return cachedSearch;
  const raw = readFileSync(GENERATED_SEARCH_PROJECTION_PATH, "utf8");
  const parsed = JSON.parse(raw) as LearnerSearchProjection;
  assertSearchProjection(parsed);
  cachedSearch = parsed;
  return parsed;
}

export function getHubById(hubId: LearnerHubId) {
  return loadLearnerHubProjection().hubsById[hubId];
}

export function getLessonBySegment(segment: string) {
  return loadLearnerProjection().lessons.find(
    (lesson) => lesson.routeSegment === segment,
  );
}

export function getActivityById(activityId: string) {
  return loadLearnerProjection().activities.find(
    (activity) => activity.id === activityId,
  );
}

export function getOwnership(activityId: string) {
  return loadLearnerProjection().ownershipByActivityId[activityId];
}

const DETAIL_TOP_LEVEL_KEYS = [
  "schemaVersion",
  "projectionKind",
  "representativeCount",
  "representatives",
  "representativesById",
  "detailCount",
  "details",
  "detailsById",
] as const;

const FORBIDDEN_DETAIL_KEY_FRAGMENTS = [
  ...FORBIDDEN_SEARCH_KEY_FRAGMENTS,
  "reviewStatus",
  "spokenText",
  "conceptIds",
  "bytes",
  "sha256",
] as const;

const FORBIDDEN_DETAIL_STRING_PATTERNS: readonly RegExp[] = [
  ...FORBIDDEN_SEARCH_STRING_PATTERNS,
  /media\/generated/i,
  /candidate-needs-listening-review/i,
  /Architekten/i,
  /Architektinnen/i,
];

const MEDIA_STATES = new Set(["approved", "pending-review", "missing"]);

function assertMedia(media: unknown): asserts media is LearnerMediaAvailability {
  if (!isPlainObject(media)) {
    throw new Error("Detail media shape is invalid");
  }
  if (typeof media.state !== "string" || !MEDIA_STATES.has(media.state)) {
    throw new Error("Detail media state is invalid");
  }
  if (media.state === "approved") {
    if (typeof media.assetId !== "string" || media.assetId.length === 0) {
      throw new Error("Approved media requires assetId");
    }
  } else if (media.assetId !== null) {
    throw new Error("Non-approved media must not expose assetId");
  }
}

function assertGenericDetailRecord(raw: unknown): asserts raw is LearnerDetailRecord {
  if (!isPlainObject(raw)) {
    throw new Error("Detail record shape is invalid");
  }
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new Error("Detail record id is invalid");
  }
  const hub = detailHubForId(raw.id);
  const expectedKind = hub === "vocabulary" ? "Lexeme" : hub === "verbs" ? "Verb" : hub === "grammar" ? "GrammarConcept" : hub === "phrases" ? "QAPair" : null;
  if (hub == null || raw.kind !== expectedKind || raw.hubSegment !== hub) {
    throw new Error("Detail record kind mismatch");
  }
  if (raw.publicationStatus !== "published") {
    throw new Error("Detail record is not published");
  }
  if (typeof raw.displayText !== "string" || raw.displayText.length === 0) {
    throw new Error("Detail displayText is invalid");
  }
  if (
    typeof raw.canonicalPath !== "string" ||
    raw.canonicalPath !== detailCanonicalPath(hub, raw.id) ||
    !isSafeNavigationPath(raw.canonicalPath)
  ) {
    throw new Error("Detail canonicalPath failed allowlist");
  }
  if (!Array.isArray(raw.lessonIds) || raw.lessonIds.some((v) => typeof v !== "string")) {
    throw new Error("Detail lessonIds are invalid");
  }
  assertMedia(raw.media);

  if (raw.kind === "Lexeme") {
    if (typeof raw.lemma !== "string" || typeof raw.singular !== "string" || typeof raw.meaningEn !== "string") {
      throw new Error("Vocabulary fields are invalid");
    }
    if (!Array.isArray(raw.plurals) || raw.plurals.some((value) => typeof value !== "string")) {
      throw new Error("Vocabulary plurals are invalid");
    }
    if (raw.article !== null && typeof raw.article !== "string") throw new Error("Vocabulary article is invalid");
    if (raw.gender !== null && !["masculine", "feminine", "neuter"].includes(String(raw.gender))) throw new Error("Vocabulary gender is invalid");
  } else if (raw.kind === "Verb") {
    if (typeof raw.infinitive !== "string" || typeof raw.meaningEn !== "string" || typeof raw.paradigmNote !== "string" || !Array.isArray(raw.present)) {
      throw new Error("Verb fields are invalid");
    }
  } else if (raw.kind === "QAPair") {
    if (!["informal", "formal", "neutral"].includes(String(raw.register)) || !isPlainObject(raw.question) || !Array.isArray(raw.answers) || raw.answers.length === 0 || !Array.isArray(raw.acceptedRealizations) || !Array.isArray(raw.conversationLevels)) {
      throw new Error("QA fields are invalid");
    }
  } else if (raw.kind === "GrammarConcept") {
    if (
      typeof raw.titleDe !== "string" ||
      raw.titleDe.length === 0 ||
      typeof raw.titleEn !== "string" ||
      raw.titleEn.length === 0 ||
      typeof raw.notice !== "string" ||
      raw.notice.length === 0 ||
      !Array.isArray(raw.ruleSteps) ||
      raw.ruleSteps.length === 0 ||
      !Array.isArray(raw.prerequisiteIds) ||
      !Array.isArray(raw.prerequisiteLabels) ||
      raw.prerequisiteIds.length !== raw.prerequisiteLabels.length ||
      !Array.isArray(raw.commonErrorTags) ||
      !Array.isArray(raw.activityIds)
    ) {
      throw new Error("Grammar fields are invalid");
    }
    for (const step of raw.ruleSteps) {
      if (
        !isPlainObject(step) ||
        typeof step.id !== "string" ||
        step.id.length === 0 ||
        typeof step.notice !== "string" ||
        step.notice.length === 0 ||
        !(step.model === null || typeof step.model === "string")
      ) {
        throw new Error("Grammar rule step is invalid");
      }
    }
    if (
      raw.prerequisiteIds.some((value) => typeof value !== "string") ||
      raw.prerequisiteLabels.some((value) => typeof value !== "string") ||
      raw.commonErrorTags.some((value) => typeof value !== "string") ||
      raw.activityIds.some((value) => typeof value !== "string")
    ) {
      throw new Error("Grammar reference fields are invalid");
    }
  }
}

function assertDetailRecord(raw: unknown): asserts raw is LearnerDetailRecord {
  assertGenericDetailRecord(raw);
  if (!DETAIL_REPRESENTATIVE_IDS.includes(raw.id as DetailRepresentativeId)) {
    throw new Error("Detail record id is not a representative");
  }
  const id = raw.id as DetailRepresentativeId;
  const contractMeta = DETAIL_REPRESENTATIVE_CONTRACT.byId[id];
  if (raw.kind !== DETAIL_KIND_BY_ID[id] || raw.kind !== contractMeta.kind) {
    throw new Error("Detail record kind mismatch");
  }

  if (raw.kind === "Lexeme") {
    if (raw.id !== VOCAB_ARCHITEKT_CANONICAL.id) {
      throw new Error("Unexpected vocabulary id");
    }
    if (
      raw.displayText !== VOCAB_ARCHITEKT_CANONICAL.displayText ||
      raw.lemma !== VOCAB_ARCHITEKT_CANONICAL.lemma ||
      raw.article !== VOCAB_ARCHITEKT_CANONICAL.article ||
      raw.gender !== VOCAB_ARCHITEKT_CANONICAL.gender ||
      raw.singular !== VOCAB_ARCHITEKT_CANONICAL.singular ||
      raw.meaningEn !== VOCAB_ARCHITEKT_CANONICAL.meaningEn
    ) {
      throw new Error("Vocabulary canonical fields mismatch");
    }
    if (!Array.isArray(raw.plurals) || raw.plurals.length !== 0) {
      throw new Error("Vocabulary plurals must be empty pending approval");
    }
    if (raw.pluralGapMessage !== VOCAB_ARCHITEKT_CANONICAL.pluralGapMessage) {
      throw new Error("Vocabulary plural gap message mismatch");
    }
    if (!isPlainObject(raw.personForm)) {
      throw new Error("Vocabulary personForm is invalid");
    }
    const pf = VOCAB_ARCHITEKT_CANONICAL.personForm;
    if (
      raw.personForm.relatedId !== pf.relatedId ||
      raw.personForm.relatedDisplayText !== pf.relatedDisplayText ||
      raw.personForm.relatedArticle !== pf.relatedArticle ||
      raw.personForm.relatedGender !== pf.relatedGender ||
      raw.personForm.relatedLemma !== pf.relatedLemma ||
      raw.personForm.relatedMeaningEn !== pf.relatedMeaningEn ||
      raw.personForm.sharedStem !== pf.sharedStem ||
      raw.personForm.feminineSuffix !== pf.feminineSuffix ||
      raw.personForm.operationLabel !== pf.operationLabel
    ) {
      throw new Error("Vocabulary person-form relation mismatch");
    }
  }

  if (raw.kind === "Verb") {
    if (raw.id !== VERB_SEIN_CANONICAL.id) {
      throw new Error("Unexpected verb id");
    }
    if (
      raw.displayText !== VERB_SEIN_CANONICAL.displayText ||
      raw.infinitive !== VERB_SEIN_CANONICAL.infinitive ||
      raw.meaningEn !== VERB_SEIN_CANONICAL.meaningEn ||
      raw.paradigmNote !== VERB_SEIN_CANONICAL.paradigmNote
    ) {
      throw new Error("Verb canonical fields mismatch");
    }
    if (!Array.isArray(raw.present) || raw.present.length !== VERB_SEIN_PRESENT_CANONICAL.length) {
      throw new Error("Verb present paradigm must have seven forms");
    }
    for (let i = 0; i < VERB_SEIN_PRESENT_CANONICAL.length; i += 1) {
      const expected = VERB_SEIN_PRESENT_CANONICAL[i]!;
      const actual = raw.present[i];
      if (
        !isPlainObject(actual) ||
        actual.person !== expected.person ||
        actual.form !== expected.form
      ) {
        throw new Error("Verb present paradigm forms mismatch");
      }
    }
  }

  if (raw.kind === "QAPair") {
    if (raw.id !== QA_PROFESSION_CASUAL_CANONICAL.id) {
      throw new Error("Unexpected QA id");
    }
    if (raw.register !== QA_PROFESSION_CASUAL_CANONICAL.register) {
      throw new Error("QA register mismatch");
    }
    if (
      raw.displayText !== QA_PROFESSION_CASUAL_CANONICAL.displayText ||
      !isPlainObject(raw.question) ||
      raw.question.realization !== QA_PROFESSION_CASUAL_CANONICAL.questionRealization
    ) {
      throw new Error("QA question is invalid");
    }
    if (
      !Array.isArray(raw.answers) ||
      raw.answers.length !== QA_PROFESSION_CASUAL_CANONICAL.answerRealizations.length
    ) {
      throw new Error("QA answers must be exactly three");
    }
    for (let i = 0; i < QA_PROFESSION_CASUAL_CANONICAL.answerRealizations.length; i += 1) {
      const expected = QA_PROFESSION_CASUAL_CANONICAL.answerRealizations[i]!;
      const actual = raw.answers[i];
      if (!isPlainObject(actual) || actual.realization !== expected) {
        throw new Error("QA answer realizations mismatch");
      }
    }
  }
}

/**
 * Fail-closed validation for the learner detail projection.
 * Unsafe values are never echoed in error messages.
 */
export function assertLearnerDetailProjection(
  parsed: LearnerDetailProjection,
): void {
  if (!isPlainObject(parsed)) {
    throw new Error("Learner detail projection artifact is invalid or incomplete");
  }

  const keys = Object.keys(parsed).sort();
  const expected = [...DETAIL_TOP_LEVEL_KEYS].sort();
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    throw new Error("Learner detail projection has unexpected top-level shape");
  }

  if (
    parsed.projectionKind !== "learner-details" ||
    parsed.schemaVersion !== "1.0.0" ||
    parsed.representativeCount !== 3 ||
    !Array.isArray(parsed.representatives) ||
    parsed.representatives.length !== 3 ||
    !isPlainObject(parsed.representativesById) ||
    !Number.isSafeInteger(parsed.detailCount) ||
    parsed.detailCount < 3 ||
    !Array.isArray(parsed.details) ||
    parsed.details.length !== parsed.detailCount ||
    !isPlainObject(parsed.detailsById)
  ) {
    throw new Error("Learner detail projection artifact is invalid or incomplete");
  }

  const byIdKeys = Object.keys(parsed.representativesById).sort();
  const expectedIds = [...DETAIL_REPRESENTATIVE_IDS].sort();
  if (
    byIdKeys.length !== expectedIds.length ||
    byIdKeys.some((key, index) => key !== expectedIds[index])
  ) {
    throw new Error("Detail representativesById key set mismatch");
  }

  const seen = new Set<string>();
  for (const record of parsed.representatives) {
    assertDetailRecord(record);
    if (seen.has(record.id)) {
      throw new Error("Duplicate detail representative id");
    }
    seen.add(record.id);
    const byId = parsed.representativesById[record.id as DetailRepresentativeId];
    if (byId == null || byId.id !== record.id) {
      throw new Error("Detail representativesById is inconsistent");
    }
    // Serve path reads byId — require structural equality with representatives[].
    if (stableStringifyDetailValue(record) !== stableStringifyDetailValue(byId)) {
      throw new Error("Detail representativesById is inconsistent");
    }
    assertDetailRecord(byId);
  }

  for (const id of DETAIL_REPRESENTATIVE_IDS) {
    if (!seen.has(id)) {
      throw new Error("Detail projection missing required representative");
    }
  }

  const detailIds = new Set<string>();
  for (const record of parsed.details) {
    assertGenericDetailRecord(record);
    if (detailIds.has(record.id)) throw new Error("Duplicate learner detail id");
    detailIds.add(record.id);
    const byId = parsed.detailsById[record.id];
    if (byId == null || stableStringifyDetailValue(record) !== stableStringifyDetailValue(byId)) {
      throw new Error("Detail detailsById is inconsistent");
    }
    assertGenericDetailRecord(byId);
  }
  const detailByIdKeys = Object.keys(parsed.detailsById);
  if (detailByIdKeys.length !== parsed.detailCount || detailByIdKeys.some((id) => !detailIds.has(id))) {
    throw new Error("Detail detailsById key set mismatch");
  }
  for (const id of DETAIL_REPRESENTATIVE_IDS) {
    const detail = parsed.detailsById[id];
    if (!detail || stableStringifyDetailValue(detail) !== stableStringifyDetailValue(parsed.representativesById[id])) {
      throw new Error("Detail representative is inconsistent with full detail set");
    }
  }

  // Reuse search walkers with detail-specific extras.
  const walkKeys = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) walkKeys(item);
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, nested] of Object.entries(value)) {
      const lower = key.toLowerCase();
      for (const frag of FORBIDDEN_DETAIL_KEY_FRAGMENTS) {
        if (lower.includes(frag.toLowerCase())) {
          throw new Error("Learner detail projection contains a forbidden key");
        }
      }
      walkKeys(nested);
    }
  };
  const walkStrings = (value: unknown): void => {
    if (typeof value === "string") {
      for (const pattern of FORBIDDEN_DETAIL_STRING_PATTERNS) {
        if (pattern.test(value)) {
          throw new Error("Learner detail projection contains a forbidden string");
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walkStrings(item);
      return;
    }
    if (isPlainObject(value)) {
      for (const nested of Object.values(value)) walkStrings(nested);
    }
  };

  walkKeys(parsed);
  walkStrings(parsed);
}

/** Load the build-time learner-safe representative detail artifact. */
export function loadLearnerDetailProjection(): LearnerDetailProjection {
  if (cachedDetails) return cachedDetails;
  const raw = readFileSync(GENERATED_DETAIL_PROJECTION_PATH, "utf8");
  const parsed = JSON.parse(raw) as LearnerDetailProjection;
  assertLearnerDetailProjection(parsed);
  cachedDetails = parsed;
  return parsed;
}

export function getDetailRepresentative(id: string): LearnerDetailRecord | null {
  if (!(DETAIL_REPRESENTATIVE_IDS as readonly string[]).includes(id)) {
    return null;
  }
  return loadLearnerDetailProjection().representativesById[
    id as DetailRepresentativeId
  ];
}

export function getLearnerDetail(id: string): LearnerDetailRecord | null {
  return loadLearnerDetailProjection().detailsById[id] ?? null;
}
