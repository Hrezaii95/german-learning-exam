import type { EntityKind, LessonId } from "../ids/index.js";
import type {
  PublicationStatus,
  SourcePriority,
} from "../types/common.js";
import type { RelationshipType } from "../types/relationship.js";

/** Entity kinds that participate in typed indexes / hub filters. */
export type IndexedEntityKind =
  | "Lesson"
  | "LearningActivity"
  | "Lexeme"
  | "Verb"
  | "GrammarConcept"
  | "PhrasePattern"
  | "QAPair"
  | "Dialogue"
  | "ListeningAsset"
  | "Collection"
  | "MediaAsset"
  | "Source"
  | "SourceAssertion"
  | "Relationship"
  | "ContentGap"
  | "Example";

/** Kinds eligible for learner/author search documents. */
export type SearchableKind =
  | "Lesson"
  | "LearningActivity"
  | "Lexeme"
  | "Verb"
  | "GrammarConcept"
  | "PhrasePattern"
  | "QAPair"
  | "Dialogue"
  | "ListeningAsset"
  | "Collection";

export type HubName =
  | "vocabulary"
  | "verbs"
  | "grammar"
  | "phrases"
  | "listening"
  | "concepts"
  | "lessons"
  | "review";

export type HubDestination = {
  hub: HubName;
  path: string;
};

export type SearchMatchField =
  | "label"
  | "lemma"
  | "infinitive"
  | "meaning"
  | "intent"
  | "title"
  | "realization"
  | "form"
  | "category";

export type SearchMatchReason =
  | "exact"
  | "prefix"
  | "token"
  | "substring"
  | "normalized-alias";

export type SearchMatch = {
  field: SearchMatchField;
  reason: SearchMatchReason;
};

/**
 * Navigation back-context for search → detail. Never includes assertion values.
 */
export type SearchBackContext = {
  entryContext: "search";
  query: string;
  includeReview: boolean;
  resultId: string;
  resultKind: SearchableKind;
};

export type SearchHit = {
  id: string;
  kind: SearchableKind;
  displayLabel: string;
  lessonIds: readonly LessonId[];
  sourcePriority: SourcePriority | null;
  publicationStatus: PublicationStatus;
  hubDestination: HubDestination;
  backContext: SearchBackContext;
  score: number;
  match: SearchMatch;
};

/** Learner vs author/review visibility. Default is learner (published only). */
export type IndexAudience = "learner" | "review";

export type SearchOptions = {
  /**
   * Explicit audience. Default `"learner"` (published only).
   * `"review"` exposes review/draft for author surfaces; never blocked.
   * Explicit `audience:"learner"` + `includeReview:true` throws INDEX_AUDIENCE_CONFLICT.
   */
  audience?: IndexAudience;
  /**
   * Legacy equivalent to `audience: "review"` when `audience` is omitted.
   * Prefer `audience` for new callers. Contradicts explicit `audience:"learner"`.
   */
  includeReview?: boolean;
  /** Optional kind restriction. */
  kinds?: readonly SearchableKind[];
  /** Max results (default 50). */
  limit?: number;
};

/**
 * Optional learner-state projections for hub filters.
 * Mastery/due are not computed here — callers supply typed projections.
 */
export type LearnedScope = "learned" | "all-ready" | "all";

export type HubFilterProjections = {
  /** IDs considered learned/unlocked (for learned scope). */
  learnedIds?: ReadonlySet<string>;
  /** IDs considered ready/unlocked for all-ready scope. Required when learnedScope is all-ready. */
  readyIds?: ReadonlySet<string>;
  /**
   * Named mastery projections keyed by masteryKey.
   * Selecting masteryKey looks up this map deterministically.
   */
  masteryProjections?: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Allowed mastery status values within the selected projection. */
  masteryAllowed?: ReadonlySet<string>;
  /** IDs currently due for review. */
  dueIds?: ReadonlySet<string>;
  /**
   * Explicit runtime learner tags by entity ID (never invented by the index).
   * Merged with source-derived entity tags for tag filters.
   */
  learnerTagsById?: ReadonlyMap<string, readonly string[]>;
};

export type HubFilterInput = {
  /**
   * Default `"learner"` → published only.
   * `"review"` → published|review|draft; blocked never visible.
   */
  audience?: IndexAudience;
  lessonIds?: readonly LessonId[];
  /** learned/all-ready placeholder; default all when omitted. */
  learnedScope?: LearnedScope;
  priorities?: readonly SourcePriority[];
  kinds?: readonly SearchableKind[];
  /** Lexeme partOfSpeech, media kind, register, etc. */
  category?: string;
  /**
   * Require entity to carry all of these tags (source-derived and/or learnerTagsById).
   * Source tags use `rel:<relationshipType>` and grammar `commonErrorTags`.
   */
  tags?: readonly string[];
  /** Require a relationship of this type involving the entity. */
  relationshipTypes?: readonly RelationshipType[];
  /** Require adjacency to this ID (any direction) for relationshipTypes or any type. */
  relatedToId?: string;
  /**
   * Named mastery projection key — selects projections.masteryProjections.get(masteryKey).
   * Missing/wrong key fails closed.
   */
  masteryKey?: string;
  /** When true, require id ∈ projections.dueIds. */
  dueKey?: boolean;
  /**
   * Further restrict publication status within the audience allow-list.
   * Cannot expand past audience (blocked never allowed).
   */
  publicationStatuses?: readonly PublicationStatus[];
  projections?: HubFilterProjections;
};

export type MembershipQueryOptions = {
  audience?: IndexAudience;
};

export type IndexedEntityRecord = {
  id: string;
  kind: IndexedEntityKind;
  publicationStatus: PublicationStatus | null;
  sourcePriority: SourcePriority | null;
  lessonIds: readonly LessonId[];
  displayLabel: string;
  category: string | null;
  mediaIds: readonly string[];
  exampleIds: readonly string[];
  collectionIds: readonly string[];
  activityIds: readonly string[];
  /** Source-derived tags only (rel:* and grammar commonErrorTags). */
  tags: readonly string[];
  reviewable: boolean;
  searchable: boolean;
};

export type RelationshipAdjacency = {
  /** fromId → edges */
  outgoing: ReadonlyMap<string, readonly IndexedRelationshipEdge[]>;
  /** toId → edges */
  incoming: ReadonlyMap<string, readonly IndexedRelationshipEdge[]>;
  /** type → edges */
  byType: ReadonlyMap<RelationshipType, readonly IndexedRelationshipEdge[]>;
};

export type IndexedRelationshipEdge = {
  id: string;
  type: RelationshipType;
  fromId: string;
  toId: string;
  lessonId: string | null;
  order: number | null;
};

export type SearchDocumentField = {
  field: SearchMatchField;
  /** Canonical learner-facing text (NFC). Never mutation of display. */
  displayText: string;
  /** Normalized keys used only for matching. */
  matchKeys: readonly string[];
};

export type SearchDocument = {
  id: string;
  kind: SearchableKind;
  displayLabel: string;
  publicationStatus: PublicationStatus;
  sourcePriority: SourcePriority | null;
  lessonIds: readonly LessonId[];
  category: string | null;
  hubDestination: HubDestination;
  fields: readonly SearchDocumentField[];
};

/**
 * Counts for the public learner/published projection only.
 * Never includes review/draft/blocked aggregates or author-only fields.
 */
export type LearnerIndexCounts = {
  entitiesByKind: Readonly<Partial<Record<IndexedEntityKind, number>>>;
  entitiesByPublicationStatus: Readonly<Partial<Record<PublicationStatus, number>>>;
  lessonMembershipCounts: Readonly<Record<string, number>>;
  relationshipEdgeCount: number;
  collectionMembershipCount: number;
  mediaLinkCount: number;
  exampleLinkCount: number;
  activityCount: number;
  reviewableConceptCount: number;
  searchableDocumentCount: number;
};

/**
 * Counts for explicit `openAuthorIndexes` — published|review|draft only; never blocked.
 */
export type AuthorIndexCounts = {
  entitiesByKind: Readonly<Partial<Record<IndexedEntityKind, number>>>;
  entitiesByPublicationStatus: Readonly<Partial<Record<PublicationStatus, number>>>;
  lessonMembershipCounts: Readonly<Record<string, number>>;
  relationshipEdgeCount: number;
  collectionMembershipCount: number;
  mediaLinkCount: number;
  exampleLinkCount: number;
  activityCount: number;
  reviewableConceptCount: number;
  authorReviewableConceptCount: number;
  searchableDocumentCount: number;
  publishedSearchableCount: number;
  reviewSearchableCount: number;
};

/** @deprecated Use LearnerIndexCounts — public counts are learner/published only. */
export type DerivedIndexCounts = LearnerIndexCounts;

/**
 * Immutable learner-facing typed indexes.
 *
 * Public maps/projections are published-only (including relationship adjacency:
 * an edge is visible only when both endpoints are published). Full author/build
 * state is module-private; use `openAuthorIndexes(indexes)` for an explicit
 * typed author/review capability (never blocked). Helpers default to learner
 * scope; pass `audience:"review"` for review/draft.
 */
export type ContentIndexes = {
  /** Published entities only. Linked ID arrays are published-only. */
  readonly byId: ReadonlyMap<string, IndexedEntityRecord>;
  /** Published entity IDs by kind. */
  readonly byKind: ReadonlyMap<IndexedEntityKind, readonly string[]>;
  /** Published lesson members only. Prefer entitiesForLesson. */
  readonly lessonMembership: ReadonlyMap<LessonId, readonly string[]>;
  readonly entityLessons: ReadonlyMap<string, readonly LessonId[]>;
  /**
   * Published-only adjacency: edge visible iff both endpoints are published.
   * Does not reveal review/draft/blocked IDs or teacher-collection membership.
   */
  readonly relationships: RelationshipAdjacency;
  readonly sourcePriorityById: ReadonlyMap<string, SourcePriority>;
  readonly publicationStatusById: ReadonlyMap<string, PublicationStatus>;
  readonly mediaByEntityId: ReadonlyMap<string, readonly string[]>;
  readonly entitiesByMediaId: ReadonlyMap<string, readonly string[]>;
  readonly examplesByEntityId: ReadonlyMap<string, readonly string[]>;
  readonly entitiesByExampleId: ReadonlyMap<string, readonly string[]>;
  /** Published collection members only. Prefer membersOfCollection. */
  readonly collectionMembers: ReadonlyMap<string, readonly string[]>;
  readonly entityCollections: ReadonlyMap<string, readonly string[]>;
  readonly activitiesByLesson: ReadonlyMap<LessonId, readonly string[]>;
  readonly activitiesByConcept: ReadonlyMap<string, readonly string[]>;
  /** Source-derived tags by entity id (published entities; rel:* from learner graph). */
  readonly tagsByEntityId: ReadonlyMap<string, readonly string[]>;
  /** Learner reviewable concepts: published only. */
  readonly reviewableConceptIds: ReadonlySet<string>;
  /** Published search documents only. */
  readonly searchDocuments: readonly SearchDocument[];
  readonly searchDocumentsById: ReadonlyMap<string, SearchDocument>;
  /** Learner/published projection counts only. */
  readonly counts: LearnerIndexCounts;
};

/** Narrow EntityKind / IndexedEntityKind overlap helpers. */
export function isSearchableKind(kind: string): kind is SearchableKind {
  return (
    kind === "Lesson" ||
    kind === "LearningActivity" ||
    kind === "Lexeme" ||
    kind === "Verb" ||
    kind === "GrammarConcept" ||
    kind === "PhrasePattern" ||
    kind === "QAPair" ||
    kind === "Dialogue" ||
    kind === "ListeningAsset" ||
    kind === "Collection"
  );
}

export function isIndexedEntityKind(kind: string): kind is IndexedEntityKind {
  return (
    isSearchableKind(kind) ||
    kind === "MediaAsset" ||
    kind === "Source" ||
    kind === "SourceAssertion" ||
    kind === "Relationship" ||
    kind === "ContentGap" ||
    kind === "Example"
  );
}

export type { EntityKind };
