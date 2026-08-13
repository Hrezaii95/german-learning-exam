/**
 * Learner-safe detail projection. The original three representatives retain
 * their richer contracts while every published Lexeme, Verb, and QAPair gets
 * a canonical detail route with honest gap states.
 */

import { encodePublicTypedIdSlug } from "./path-utils";

export const DETAIL_REPRESENTATIVE_IDS = [
  "lex:architekt",
  "verb:sein",
  "qa:profession-casual-main",
] as const;

export type DetailRepresentativeId =
  (typeof DETAIL_REPRESENTATIVE_IDS)[number];

export type DetailKind = "Lexeme" | "Verb" | "QAPair" | "GrammarConcept";

export type DetailHubSegment = "vocabulary" | "verbs" | "grammar" | "phrases";

export type MediaAvailabilityState =
  | "preview"
  | "pending-review"
  | "missing";

/** Safe preview availability — deployable path only; source-private paths/hashes stay excluded. */
export type LearnerPreviewPronunciation = {
  readonly state: "preview";
  readonly assetId: string;
  /** Root-relative deployable path. The Pages base is added in the client. */
  readonly publicPath: string;
  /** Exact learner-source string used to select the generated clip. */
  readonly sourceText: string;
  /** Exact text supplied to the speech generator. Equal to sourceText. */
  readonly spokenText: string;
  readonly locale: "de-DE";
  readonly voice: string;
  readonly generationRate: string;
  readonly origin: "synthesized-edge-tts";
};

export type LearnerUnavailablePronunciation = {
  readonly state: Exclude<MediaAvailabilityState, "preview">;
  readonly assetId: null;
};

export type LearnerMediaAvailability =
  | LearnerPreviewPronunciation
  | LearnerUnavailablePronunciation;

export type LearnerGender = "masculine" | "feminine" | "neuter";

export type LearnerPersonFormRelation = {
  readonly relatedId: string;
  readonly relatedDisplayText: string;
  readonly relatedArticle: string;
  readonly relatedGender: LearnerGender;
  readonly relatedLemma: string;
  readonly relatedMeaningEn: string;
  /** Morphological operation derived from the published lemma pair only. */
  readonly sharedStem: string;
  readonly feminineSuffix: string;
  readonly operationLabel: string;
};

export type LearnerVocabularyDetail = {
  readonly kind: "Lexeme";
  readonly id: string;
  readonly hubSegment: "vocabulary";
  readonly displayText: string;
  readonly publicationStatus: "published";
  readonly lessonIds: readonly string[];
  readonly sourcePriority: 1 | 2 | 3 | 4 | null;
  readonly lemma: string;
  readonly meaningEn: string;
  readonly article: string | null;
  readonly gender: LearnerGender | null;
  readonly singular: string;
  readonly plurals: readonly string[];
  readonly pluralGapMessage: string | null;
  readonly personForm: LearnerPersonFormRelation | null;
  readonly media: LearnerMediaAvailability;
  readonly canonicalPath: string;
};

export type LearnerVocabularyRepresentative = Omit<
  LearnerVocabularyDetail,
  "id" | "article" | "gender" | "personForm"
> & {
  readonly id: "lex:architekt";
  readonly article: string;
  readonly gender: LearnerGender;
  readonly personForm: LearnerPersonFormRelation;
};

export type LearnerVerbPersonKey =
  | "ich"
  | "du"
  | "er_sie_es"
  | "wir"
  | "ihr"
  | "sie_plural"
  | "Sie_formal";

export type LearnerVerbPresentForm = {
  readonly person: LearnerVerbPersonKey;
  readonly form: string;
  readonly personLabel: string;
};

export type LearnerVerbDetail = {
  readonly kind: "Verb";
  readonly id: string;
  readonly hubSegment: "verbs";
  readonly displayText: string;
  readonly publicationStatus: "published";
  readonly lessonIds: readonly string[];
  readonly sourcePriority: 1 | 2 | 3 | 4 | null;
  readonly infinitive: string;
  readonly meaningEn: string;
  readonly present: readonly LearnerVerbPresentForm[];
  readonly paradigmNote: string;
  readonly media: LearnerMediaAvailability;
  readonly canonicalPath: string;
};

export type LearnerVerbRepresentative = Omit<LearnerVerbDetail, "id"> & {
  readonly id: "verb:sein";
};

export type LearnerQaPattern = {
  readonly id: string;
  readonly realization: string;
  readonly role: "question" | "answer";
};

export type LearnerConversationLevel = {
  readonly id: string;
  readonly title: string;
  readonly status: "available" | "pending-p4";
  readonly description: string;
};

export type LearnerQaDetail = {
  readonly kind: "QAPair";
  readonly id: string;
  readonly hubSegment: "phrases";
  readonly displayText: string;
  readonly publicationStatus: "published";
  readonly lessonIds: readonly string[];
  readonly sourcePriority: 1 | 2 | 3 | 4 | null;
  readonly intent: string;
  readonly register: "informal" | "formal" | "neutral";
  readonly question: LearnerQaPattern;
  readonly answers: readonly LearnerQaPattern[];
  readonly acceptedRealizations: readonly string[];
  readonly conversationLevels: readonly LearnerConversationLevel[];
  readonly media: LearnerMediaAvailability;
  readonly canonicalPath: string;
};

export type LearnerQaRepresentative = Omit<LearnerQaDetail, "id" | "register"> & {
  readonly id: "qa:profession-casual-main";
  readonly register: "informal";
};

export type LearnerGrammarRuleStep = {
  readonly id: string;
  readonly notice: string;
  readonly model: string | null;
};

export type LearnerGrammarDetail = {
  readonly kind: "GrammarConcept";
  readonly id: string;
  readonly hubSegment: "grammar";
  readonly displayText: string;
  readonly publicationStatus: "published";
  readonly lessonIds: readonly string[];
  readonly sourcePriority: 1 | 2 | 3 | 4 | null;
  readonly titleDe: string;
  readonly titleEn: string;
  readonly notice: string;
  readonly ruleSteps: readonly LearnerGrammarRuleStep[];
  readonly prerequisiteIds: readonly string[];
  readonly prerequisiteLabels: readonly string[];
  readonly commonErrorTags: readonly string[];
  readonly activityIds: readonly string[];
  readonly media: LearnerMediaAvailability;
  readonly canonicalPath: string;
};

export type LearnerDetailRecord =
  | LearnerVocabularyDetail
  | LearnerVerbDetail
  | LearnerQaDetail
  | LearnerGrammarDetail;

export type LearnerDetailProjection = {
  readonly schemaVersion: "1.0.0";
  readonly projectionKind: "learner-details";
  readonly representativeCount: 3;
  readonly representatives: readonly (
    | LearnerVocabularyRepresentative
    | LearnerVerbRepresentative
    | LearnerQaRepresentative
  )[];
  readonly representativesById: Readonly<{
    "lex:architekt": LearnerVocabularyRepresentative;
    "verb:sein": LearnerVerbRepresentative;
    "qa:profession-casual-main": LearnerQaRepresentative;
  }>;
  readonly detailCount: number;
  readonly details: readonly LearnerDetailRecord[];
  readonly detailsById: Readonly<Record<string, LearnerDetailRecord>>;
};

export const DETAIL_HUB_BY_ID: Readonly<
  Record<DetailRepresentativeId, DetailHubSegment>
> = Object.freeze({
  "lex:architekt": "vocabulary",
  "verb:sein": "verbs",
  "qa:profession-casual-main": "phrases",
});

export const DETAIL_KIND_BY_ID: Readonly<
  Record<DetailRepresentativeId, DetailKind>
> = Object.freeze({
  "lex:architekt": "Lexeme",
  "verb:sein": "Verb",
  "qa:profession-casual-main": "QAPair",
});

export function isDetailRepresentativeId(
  value: string,
): value is DetailRepresentativeId {
  return (DETAIL_REPRESENTATIVE_IDS as readonly string[]).includes(value);
}

export function detailHubForId(entityId: string): DetailHubSegment | null {
  if (entityId.startsWith("lex:")) return "vocabulary";
  if (entityId.startsWith("verb:")) return "verbs";
  if (entityId.startsWith("qa:")) return "phrases";
  if (entityId.startsWith("gram:")) return "grammar";
  return null;
}

export function encodeDetailRouteSegment(entityId: string): string {
  return encodePublicTypedIdSlug(entityId);
}

export function detailCanonicalPath(
  hubSegment: DetailHubSegment,
  entityId: string,
): string {
  return `/${hubSegment}/${encodeDetailRouteSegment(entityId)}`;
}

/** Exact set of learner-linked detail hrefs for search/hubs. */
export function listImplementedDetailPaths(): readonly string[] {
  return DETAIL_REPRESENTATIVE_IDS.map((id) =>
    detailCanonicalPath(DETAIL_HUB_BY_ID[id], id),
  );
}

export function isProjectedDetailId(
  projection: LearnerDetailProjection,
  value: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(projection.detailsById, value);
}

export function listProjectedDetailPaths(
  projection: LearnerDetailProjection,
): readonly string[] {
  return projection.details.map((detail) => detail.canonicalPath);
}
