import type { LessonId } from "../ids/index.js";
import type { RelationshipType } from "../types/relationship.js";
import { RELATIONSHIP_TYPES } from "../types/relationship.js";
import { immutableMap } from "./immutable.js";
import type {
  IndexedEntityRecord,
  IndexedRelationshipEdge,
  RelationshipAdjacency,
  SearchDocument,
} from "./types.js";

function freezeArray<T>(items: T[]): readonly T[] {
  return Object.freeze(items.slice()) as readonly T[];
}

/**
 * Project adjacency to edges whose endpoints both pass `isVisibleEndpoint`.
 * Relationships have no independent publication status; endpoint visibility
 * (and never-blocked) is the learner/author boundary.
 *
 * Optional `lessonId` metadata is retained only when it resolves to an
 * audience-visible entity of kind Lesson; otherwise the metadata is nulled
 * on a fresh edge object (never mutate shared full-state edges).
 */
export function projectRelationshipAdjacency(
  full: RelationshipAdjacency,
  isVisibleEndpoint: (id: string) => boolean,
  isVisibleLesson: (id: string) => boolean,
): RelationshipAdjacency {
  const outgoing = new Map<string, IndexedRelationshipEdge[]>();
  const incoming = new Map<string, IndexedRelationshipEdge[]>();
  const byType = new Map<RelationshipType, IndexedRelationshipEdge[]>();
  for (const t of RELATIONSHIP_TYPES) byType.set(t, []);

  for (const edges of full.byType.values()) {
    for (const edge of edges) {
      if (!isVisibleEndpoint(edge.fromId) || !isVisibleEndpoint(edge.toId)) {
        continue;
      }
      const projected: IndexedRelationshipEdge =
        edge.lessonId != null && !isVisibleLesson(edge.lessonId)
          ? Object.freeze({
              id: edge.id,
              type: edge.type,
              fromId: edge.fromId,
              toId: edge.toId,
              lessonId: null,
              order: edge.order,
            })
          : edge;
      const out = outgoing.get(edge.fromId) ?? [];
      out.push(projected);
      outgoing.set(edge.fromId, out);
      const inn = incoming.get(edge.toId) ?? [];
      inn.push(projected);
      incoming.set(edge.toId, inn);
      const typed = byType.get(edge.type) ?? [];
      typed.push(projected);
      byType.set(edge.type, typed);
    }
  }

  return Object.freeze({
    outgoing: immutableMap(
      new Map([...outgoing].map(([k, v]) => [k, freezeArray(v)])),
    ),
    incoming: immutableMap(
      new Map([...incoming].map(([k, v]) => [k, freezeArray(v)])),
    ),
    byType: immutableMap(
      new Map([...byType].map(([k, v]) => [k, freezeArray(v)])),
    ),
  });
}

export function countRelationshipEdges(adj: RelationshipAdjacency): number {
  let n = 0;
  for (const edges of adj.byType.values()) n += edges.length;
  return n;
}

export function countIdListValues(
  map: ReadonlyMap<string, readonly string[]>,
): number {
  let n = 0;
  for (const ids of map.values()) n += ids.length;
  return n;
}

/**
 * Relationship tags (`rel:*`) from the audience-projected adjacency only.
 * Non-relationship source tags (e.g. grammar commonErrorTags) are preserved.
 */
export function projectEntityTags(
  fullTags: readonly string[],
  adjacency: RelationshipAdjacency,
  entityId: string,
): readonly string[] {
  const nonRel = fullTags.filter((t) => !t.startsWith("rel:"));
  const rel = new Set<string>();
  for (const edge of adjacency.outgoing.get(entityId) ?? []) {
    rel.add(`rel:${edge.type}`);
  }
  for (const edge of adjacency.incoming.get(entityId) ?? []) {
    rel.add(`rel:${edge.type}`);
  }
  return freezeArray([...nonRel, ...rel].sort((a, b) => a.localeCompare(b)));
}

/**
 * Strip non-visible linked IDs (including lesson identity) and apply
 * audience-projected tags. Linked arrays and lessonIds match projected byId.
 */
export function projectEntityRecordLinks(
  rec: IndexedEntityRecord,
  isVisible: (id: string) => boolean,
  projectedTags?: readonly string[],
): IndexedEntityRecord {
  return Object.freeze({
    id: rec.id,
    kind: rec.kind,
    publicationStatus: rec.publicationStatus,
    sourcePriority: rec.sourcePriority,
    lessonIds: freezeArray(rec.lessonIds.filter(isVisible)),
    displayLabel: rec.displayLabel,
    category: rec.category,
    mediaIds: freezeArray(rec.mediaIds.filter(isVisible)),
    exampleIds: freezeArray(rec.exampleIds.filter(isVisible)),
    collectionIds: freezeArray(rec.collectionIds.filter(isVisible)),
    activityIds: freezeArray(rec.activityIds.filter(isVisible)),
    tags: projectedTags != null ? freezeArray([...projectedTags]) : rec.tags,
    reviewable: rec.reviewable,
    searchable: rec.searchable,
  });
}

/** Drop hidden/blocked Lesson IDs from search-document membership. */
export function projectSearchDocumentLessons(
  doc: SearchDocument,
  isVisibleLesson: (id: string) => boolean,
): SearchDocument {
  return Object.freeze({
    id: doc.id,
    kind: doc.kind,
    displayLabel: doc.displayLabel,
    publicationStatus: doc.publicationStatus,
    sourcePriority: doc.sourcePriority,
    lessonIds: freezeArray(doc.lessonIds.filter(isVisibleLesson)),
    category: doc.category,
    hubDestination: doc.hubDestination,
    fields: doc.fields,
  });
}

/**
 * Lesson-keyed membership/activity maps: omit keys for non-visible Lessons;
 * keep only audience-visible member IDs.
 */
export function filterLessonKeyedMembership(
  source: ReadonlyMap<LessonId, readonly string[]>,
  isVisibleLesson: (id: string) => boolean,
  isVisibleMember: (id: string) => boolean,
): ReadonlyMap<LessonId, readonly string[]> {
  const next = new Map<LessonId, readonly string[]>();
  for (const [lid, ids] of source) {
    if (!isVisibleLesson(lid)) continue;
    const filtered = ids.filter(isVisibleMember);
    next.set(lid, freezeArray(filtered));
  }
  return immutableMap(next);
}

/** Filter entity→lesson maps: entity must be visible; lesson IDs audience-visible. */
export function filterEntityLessons(
  source: ReadonlyMap<string, readonly LessonId[]>,
  isVisibleEntity: (id: string) => boolean,
  isVisibleLesson: (id: string) => boolean,
): ReadonlyMap<string, readonly LessonId[]> {
  const next = new Map<string, readonly LessonId[]>();
  for (const [id, lessons] of source) {
    if (!isVisibleEntity(id)) continue;
    const filtered = lessons.filter(isVisibleLesson);
    next.set(id, freezeArray(filtered));
  }
  return immutableMap(next);
}
