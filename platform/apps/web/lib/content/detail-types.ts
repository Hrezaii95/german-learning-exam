/**
 * Learner-safe representative detail projection (P3D).
 * Exactly three published representatives; no review plurals, paths, or secrets.
 */

import { encodePublicTypedIdSlug } from "./path-utils";

export const DETAIL_REPRESENTATIVE_IDS = [
  "lex:architekt",
  "verb:sein",
  "qa:profession-casual-main",
] as const;

export type DetailRepresentativeId =
  (typeof DETAIL_REPRESENTATIVE_IDS)[number];

export type DetailKind = "Lexeme" | "Verb" | "QAPair";

export type DetailHubSegment = "vocabulary" | "verbs" | "phrases";

export type MediaAvailabilityState =
  | "approved"
  | "pending-review"
  | "missing";

/** Safe media availability — assetId only when approved; never path/hash. */
export type LearnerMediaAvailability = {
  readonly state: MediaAvailabilityState;
  readonly assetId: string | null;
};

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
  readonly id: "lex:architekt";
  readonly hubSegment: "vocabulary";
  readonly displayText: string;
  readonly publicationStatus: "published";
  readonly lessonIds: readonly string[];
  readonly sourcePriority: 1 | 2 | 3 | 4 | null;
  readonly lemma: string;
  readonly meaningEn: string;
  readonly article: string;
  readonly gender: LearnerGender;
  readonly singular: string;
  readonly plurals: readonly string[];
  readonly pluralGapMessage: string | null;
  readonly personForm: LearnerPersonFormRelation;
  readonly media: LearnerMediaAvailability;
  readonly canonicalPath: string;
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
  readonly id: "verb:sein";
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
  readonly id: "qa:profession-casual-main";
  readonly hubSegment: "phrases";
  readonly displayText: string;
  readonly publicationStatus: "published";
  readonly lessonIds: readonly string[];
  readonly sourcePriority: 1 | 2 | 3 | 4 | null;
  readonly intent: string;
  readonly register: "informal";
  readonly question: LearnerQaPattern;
  readonly answers: readonly LearnerQaPattern[];
  readonly acceptedRealizations: readonly string[];
  readonly conversationLevels: readonly LearnerConversationLevel[];
  readonly media: LearnerMediaAvailability;
  readonly canonicalPath: string;
};

export type LearnerDetailRecord =
  | LearnerVocabularyDetail
  | LearnerVerbDetail
  | LearnerQaDetail;

export type LearnerDetailProjection = {
  readonly schemaVersion: "1.0.0";
  readonly projectionKind: "learner-details";
  readonly representativeCount: 3;
  readonly representatives: readonly LearnerDetailRecord[];
  readonly representativesById: Readonly<
    Record<DetailRepresentativeId, LearnerDetailRecord>
  >;
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
