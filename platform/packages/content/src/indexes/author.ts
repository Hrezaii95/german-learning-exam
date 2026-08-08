import type { LessonId } from "../ids/index.js";
import type { PublicationStatus, SourcePriority } from "../types/common.js";
import { immutableMap } from "./immutable.js";
import {
  getIndexInternal,
  isAuthorVisibleRecord,
  type IndexInternalState,
} from "./internal.js";
import {
  filterEntityLessons,
  filterLessonKeyedMembership,
  projectEntityRecordLinks,
  projectEntityTags,
  projectSearchDocumentLessons,
} from "./project.js";
import type {
  AuthorIndexCounts,
  ContentIndexes,
  IndexedEntityKind,
  IndexedEntityRecord,
  RelationshipAdjacency,
  SearchDocument,
} from "./types.js";

/**
 * Explicit author/review capability over full build state.
 * Exposes published|review|draft (never blocked). Not available via normal
 * learner facade maps. Author adjacency omits edges with blocked endpoints.
 * Lesson identity, nested links, and rel:* tags are audience-projected.
 */
export type AuthorIndexAccess = {
  readonly byId: ReadonlyMap<string, IndexedEntityRecord>;
  readonly byKind: ReadonlyMap<IndexedEntityKind, readonly string[]>;
  readonly lessonMembership: ReadonlyMap<LessonId, readonly string[]>;
  readonly entityLessons: ReadonlyMap<string, readonly LessonId[]>;
  readonly relationships: RelationshipAdjacency;
  readonly sourcePriorityById: ReadonlyMap<string, SourcePriority>;
  readonly publicationStatusById: ReadonlyMap<string, PublicationStatus>;
  readonly collectionMembers: ReadonlyMap<string, readonly string[]>;
  readonly entityCollections: ReadonlyMap<string, readonly string[]>;
  readonly activitiesByLesson: ReadonlyMap<LessonId, readonly string[]>;
  readonly activitiesByConcept: ReadonlyMap<string, readonly string[]>;
  readonly searchDocuments: readonly SearchDocument[];
  readonly searchDocumentsById: ReadonlyMap<string, SearchDocument>;
  /** Explicit author/review set: published|review|draft; never blocked. */
  readonly authorReviewableConceptIds: ReadonlySet<string>;
  /** Author counts (excludes blocked aggregates). */
  readonly counts: AuthorIndexCounts;
};

function authorVisibleMap(
  full: ReadonlyMap<string, IndexedEntityRecord>,
  adjacency: RelationshipAdjacency,
): ReadonlyMap<string, IndexedEntityRecord> {
  const visible = (id: string): boolean => {
    const rec = full.get(id);
    return rec != null && isAuthorVisibleRecord(rec);
  };
  const next = new Map<string, IndexedEntityRecord>();
  for (const [id, rec] of full) {
    if (isAuthorVisibleRecord(rec)) {
      const tags = projectEntityTags(rec.tags, adjacency, id);
      next.set(id, projectEntityRecordLinks(rec, visible, tags));
    }
  }
  return immutableMap(next);
}

function filterIdListsByVisible(
  lists: ReadonlyMap<string, readonly string[]>,
  visible: ReadonlyMap<string, IndexedEntityRecord>,
): ReadonlyMap<string, readonly string[]> {
  const next = new Map<string, readonly string[]>();
  for (const [key, ids] of lists) {
    if (!visible.has(key)) continue;
    const filtered = ids.filter((id) => visible.has(id));
    if (filtered.length === 0) continue;
    next.set(key, Object.freeze(filtered) as readonly string[]);
  }
  return immutableMap(next);
}

function filterSearchDocs(
  docs: readonly SearchDocument[],
  visible: ReadonlyMap<string, IndexedEntityRecord>,
): {
  documents: readonly SearchDocument[];
  byId: ReadonlyMap<string, SearchDocument>;
} {
  const isVisibleLesson = (id: string): boolean => {
    const rec = visible.get(id);
    return rec != null && rec.kind === "Lesson";
  };
  const documents = Object.freeze(
    docs
      .filter((d) => visible.has(d.id))
      .map((d) => projectSearchDocumentLessons(d, isVisibleLesson)),
  ) as readonly SearchDocument[];
  const byId = new Map<string, SearchDocument>();
  for (const d of documents) byId.set(d.id, d);
  return { documents, byId: immutableMap(byId) };
}

function projectAuthorAccess(state: IndexInternalState): AuthorIndexAccess {
  const byId = authorVisibleMap(state.byId, state.authorRelationships);
  const byKind = new Map<IndexedEntityKind, readonly string[]>();
  for (const [kind, ids] of state.byKind) {
    byKind.set(
      kind,
      Object.freeze(ids.filter((id) => byId.has(id))) as readonly string[],
    );
  }
  const { documents, byId: searchById } = filterSearchDocs(
    state.searchDocuments,
    byId,
  );
  const publicationStatusById = new Map<string, PublicationStatus>();
  const sourcePriorityById = new Map<string, SourcePriority>();
  for (const [id, rec] of byId) {
    if (rec.publicationStatus != null) {
      publicationStatusById.set(id, rec.publicationStatus);
    }
    if (rec.sourcePriority != null) {
      sourcePriorityById.set(id, rec.sourcePriority);
    }
  }
  const isVisibleLesson = (id: string): boolean => {
    const rec = byId.get(id);
    return rec != null && rec.kind === "Lesson";
  };
  const isVisibleMember = (id: string): boolean => byId.has(id);

  return Object.freeze({
    byId,
    byKind: immutableMap(byKind),
    lessonMembership: filterLessonKeyedMembership(
      state.lessonMembership,
      isVisibleLesson,
      isVisibleMember,
    ),
    entityLessons: filterEntityLessons(
      state.entityLessons,
      isVisibleMember,
      isVisibleLesson,
    ),
    relationships: state.authorRelationships,
    sourcePriorityById: immutableMap(sourcePriorityById),
    publicationStatusById: immutableMap(publicationStatusById),
    collectionMembers: filterIdListsByVisible(state.collectionMembers, byId),
    entityCollections: filterIdListsByVisible(state.entityCollections, byId),
    activitiesByLesson: filterLessonKeyedMembership(
      state.activitiesByLesson,
      isVisibleLesson,
      isVisibleMember,
    ),
    activitiesByConcept: filterIdListsByVisible(state.activitiesByConcept, byId),
    searchDocuments: documents,
    searchDocumentsById: searchById,
    authorReviewableConceptIds: state.authorReviewableConceptIds,
    counts: state.authorCounts,
  });
}

/**
 * Explicit typed author/review capability.
 * Required to read review/draft records, author adjacency, or non-learner search docs.
 * Never exposes blocked entities or blocked-endpoint relationships.
 */
export function openAuthorIndexes(indexes: ContentIndexes): AuthorIndexAccess {
  return projectAuthorAccess(getIndexInternal(indexes));
}
