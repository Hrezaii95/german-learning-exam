import type {
  ActivityId,
  LessonId,
  LoopMode,
  SkillDimension,
} from "./learner-content-types";

export type EnrichmentState =
  | "ready"
  | "partial"
  | "pending-review"
  | "missing"
  | "not-applicable";

export type EnrichmentSourceSummary = {
  sourcePriority: 1 | 2 | 3 | 4 | null;
  evidenceState: "published-fields";
  lessonIds: readonly LessonId[];
};

export type EnrichmentGap = {
  code: string;
  field: string;
  state: Exclude<EnrichmentState, "ready" | "not-applicable">;
  learnerMessage: string;
};

export type EnrichmentMediaSlot = {
  slotId: string;
  kind: "audio" | "image" | "infographic" | "source-listening";
  state: EnrichmentState;
  learnerMessage: string;
};

export type EnrichmentPageSection = {
  id: "hero" | "meaning" | "forms" | "notice" | "practice" | "related" | "media";
  title: string;
  state: EnrichmentState;
  fieldKeys: readonly string[];
};

export type EnrichmentContentTarget = {
  id: string;
  kind: "Lexeme" | "Verb" | "PhrasePattern" | "QAPair";
  displayTextDe: string;
  glossEn: string | null;
  source: EnrichmentSourceSummary;
};

export type EnrichmentGameEligibility = {
  gameId:
    | "flashcards"
    | "picture-match"
    | "article-sort"
    | "audio-match"
    | "plural-forge"
    | "verb-builder"
    | "sentence-rails"
    | "dialogue-ladder"
    | "spoken-repeat";
  state: EnrichmentState;
  reasonCode: string;
};

export type EnrichedActivity = {
  kind: "LearningActivity";
  id: ActivityId;
  lessonId: LessonId;
  lessonNumber: 1 | 2;
  stageId: string;
  stageTitleEn: string;
  mode: LoopMode;
  renderer: string;
  displayText: string;
  canonicalPath: string;
  skillDimensions: readonly SkillDimension[];
  source: EnrichmentSourceSummary;
  mappingBasis: "published-activity-contract-and-published-lesson-membership";
  contentTargets: readonly EnrichmentContentTarget[];
  relationIds: readonly string[];
  reviewEligible: boolean;
  gameEligibility: readonly EnrichmentGameEligibility[];
  mediaSlots: readonly EnrichmentMediaSlot[];
  sections: readonly EnrichmentPageSection[];
  gaps: readonly EnrichmentGap[];
};

export type ProfessionPluralState = {
  state: "ready" | "missing";
  forms: readonly string[];
  learnerMessage: string | null;
};

export type ProfessionPersonFormRelation = {
  relationId: string;
  pairedConceptId: string;
  pairedDisplayText: string;
  transformation:
    | "transparent-suffix-in"
    | "surface-stem-change-plus-in"
    | "published-lexical-pair";
  sharedPrefix: string;
  addedSuffix: string;
};

export type EnrichedProfessionCard = {
  kind: "Lexeme";
  id: `lex:${string}`;
  lessonId: "lesson:02";
  source: EnrichmentSourceSummary;
  displayTextDe: string;
  lemma: string;
  glossEn: string;
  article: "der" | "die" | "das";
  gender: "masculine" | "feminine" | "neuter";
  singular: string;
  plural: ProfessionPluralState;
  personForm: ProfessionPersonFormRelation;
  relationIds: readonly string[];
  activityIds: readonly ActivityId[];
  reviewEligibility: {
    conceptEligible: true;
    cardTemplateState: "missing" | "ready";
    schedulerReady: boolean;
  };
  gameEligibility: readonly EnrichmentGameEligibility[];
  mediaSlots: readonly EnrichmentMediaSlot[];
  sections: readonly EnrichmentPageSection[];
  gaps: readonly EnrichmentGap[];
};

export type LearnerEnrichmentProjection = {
  schemaVersion: "1.0.0";
  projectionKind: "learner-content-enrichment";
  generatedFrom: "validated-publication";
  policy: {
    audience: "learner";
    publicationStatus: "published-only";
    teacherCollectionState: "review-only-excluded";
    rawSourceDataIncluded: false;
    rawMediaDataIncluded: false;
  };
  counts: {
    lessons: 2;
    activities: 23;
    professionCards: 26;
    professionPairs: 13;
    reviewOnlyTeacherRowsExcluded: 48;
    reviewOnlyTeacherLexemesExcluded: 86;
    professionPluralGaps: number;
    professionAudioPendingReview: number;
    professionImageGaps: number;
    activityContentLinkGaps: number;
  };
  activities: readonly EnrichedActivity[];
  activitiesById: Readonly<Record<string, EnrichedActivity>>;
  professionCards: readonly EnrichedProfessionCard[];
  professionCardsById: Readonly<Record<string, EnrichedProfessionCard>>;
};
