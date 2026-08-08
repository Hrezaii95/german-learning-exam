import type { LessonId } from "../ids/index.js";
import type { PublicationStatus, SourcePriority } from "../types/common.js";
import type {
  AuthorIndexCounts,
  ContentIndexes,
  IndexedEntityKind,
  IndexedEntityRecord,
  LearnerIndexCounts,
  RelationshipAdjacency,
  SearchDocument,
} from "./types.js";

/**
 * Full author/build index state. Never exported on the public learner facade;
 * retrieved only via WeakMap + explicit author capability.
 */
export type IndexInternalState = {
  byId: ReadonlyMap<string, IndexedEntityRecord>;
  byKind: ReadonlyMap<IndexedEntityKind, readonly string[]>;
  lessonMembership: ReadonlyMap<LessonId, readonly string[]>;
  entityLessons: ReadonlyMap<string, readonly LessonId[]>;
  /** Full unfiltered adjacency (includes edges to review/draft/blocked). */
  relationships: RelationshipAdjacency;
  /** Published-only adjacency (both endpoints published). */
  learnerRelationships: RelationshipAdjacency;
  /** Author adjacency: both endpoints published|review|draft; never blocked. */
  authorRelationships: RelationshipAdjacency;
  sourcePriorityById: ReadonlyMap<string, SourcePriority>;
  publicationStatusById: ReadonlyMap<string, PublicationStatus>;
  mediaByEntityId: ReadonlyMap<string, readonly string[]>;
  entitiesByMediaId: ReadonlyMap<string, readonly string[]>;
  examplesByEntityId: ReadonlyMap<string, readonly string[]>;
  entitiesByExampleId: ReadonlyMap<string, readonly string[]>;
  collectionMembers: ReadonlyMap<string, readonly string[]>;
  entityCollections: ReadonlyMap<string, readonly string[]>;
  activitiesByLesson: ReadonlyMap<LessonId, readonly string[]>;
  activitiesByConcept: ReadonlyMap<string, readonly string[]>;
  tagsByEntityId: ReadonlyMap<string, readonly string[]>;
  reviewableConceptIds: ReadonlySet<string>;
  authorReviewableConceptIds: ReadonlySet<string>;
  searchDocuments: readonly SearchDocument[];
  searchDocumentsById: ReadonlyMap<string, SearchDocument>;
  learnerCounts: LearnerIndexCounts;
  authorCounts: AuthorIndexCounts;
};

const INTERNAL = new WeakMap<object, IndexInternalState>();

export function attachIndexInternal(
  indexes: ContentIndexes,
  state: IndexInternalState,
): void {
  INTERNAL.set(indexes, state);
}

export function getIndexInternal(indexes: ContentIndexes): IndexInternalState {
  const state = INTERNAL.get(indexes);
  if (state == null) {
    throw new Error(
      "INDEX_INTERNAL_MISSING: indexes object has no author/build state; use buildContentIndexes()",
    );
  }
  return state;
}

export function isPublishedRecord(rec: IndexedEntityRecord): boolean {
  return rec.publicationStatus === "published";
}

/** Author/review visibility: published|review|draft; never blocked; never null-status. */
export function isAuthorVisibleRecord(rec: IndexedEntityRecord): boolean {
  const status = rec.publicationStatus;
  return status === "published" || status === "review" || status === "draft";
}
