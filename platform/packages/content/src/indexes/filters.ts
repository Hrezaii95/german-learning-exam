import type { LessonId } from "../ids/index.js";
import type { PublicationStatus } from "../types/common.js";
import {
  isVisiblePublicationStatus,
  publicationStatusesForAudience,
  resolveIndexAudience,
} from "./audience.js";
import { getProjectedEntityRecord } from "./record-access.js";
import { getIndexInternal } from "./internal.js";
import { projectEntityTags } from "./project.js";
import type {
  ContentIndexes,
  HubFilterInput,
  IndexedEntityRecord,
  MembershipQueryOptions,
  SearchableKind,
} from "./types.js";
import { isSearchableKind } from "./types.js";

function hasRelationship(
  indexes: ContentIndexes,
  id: string,
  types: readonly string[] | undefined,
  relatedToId: string | undefined,
  audience: "learner" | "review",
): boolean {
  const internal = getIndexInternal(indexes);
  const adjacency =
    audience === "review"
      ? internal.authorRelationships
      : internal.learnerRelationships;
  const out = adjacency.outgoing.get(id) ?? [];
  const inn = adjacency.incoming.get(id) ?? [];
  const edges = [...out, ...inn];
  if (edges.length === 0) return false;

  return edges.some((edge) => {
    if (types != null && types.length > 0 && !types.includes(edge.type)) {
      return false;
    }
    if (relatedToId != null) {
      return edge.fromId === relatedToId || edge.toId === relatedToId;
    }
    return true;
  });
}

/**
 * Tags from the audience-projected relationship graph plus non-rel source tags
 * (grammar commonErrorTags). Merges optional runtime learnerTagsById.
 */
function entityTags(
  indexes: ContentIndexes,
  id: string,
  filter: HubFilterInput,
): readonly string[] {
  const internal = getIndexInternal(indexes);
  const audience = resolveIndexAudience(filter.audience);
  const adjacency =
    audience === "review"
      ? internal.authorRelationships
      : internal.learnerRelationships;
  const full = internal.tagsByEntityId.get(id) ?? [];
  const source = projectEntityTags(full, adjacency, id);
  const learner = filter.projections?.learnerTagsById?.get(id) ?? [];
  if (learner.length === 0) return source;
  const merged: string[] = [...source];
  for (const t of learner) {
    if (!merged.includes(t)) merged.push(t);
  }
  return merged;
}

function passesTags(
  indexes: ContentIndexes,
  id: string,
  filter: HubFilterInput,
): boolean {
  if (filter.tags == null || filter.tags.length === 0) return true;
  const have = new Set(entityTags(indexes, id, filter));
  return filter.tags.every((t) => have.has(t));
}

function passesLearnedScope(id: string, filter: HubFilterInput): boolean {
  const scope = filter.learnedScope ?? "all";
  if (scope === "all") return true;
  const projections = filter.projections;
  if (scope === "learned") {
    return projections?.learnedIds?.has(id) === true;
  }
  // all-ready: missing readyIds fails closed (none) — never fall back to learnedIds.
  if (projections?.readyIds == null) return false;
  return projections.readyIds.has(id);
}

/**
 * masteryKey selects a named projection in projections.masteryProjections.
 * Wrong/missing key or missing allowed set fails closed.
 */
function passesMastery(id: string, filter: HubFilterInput): boolean {
  if (filter.masteryKey == null) return true;
  const projections = filter.projections;
  if (!projections?.masteryProjections || !projections.masteryAllowed) {
    return false;
  }
  const named = projections.masteryProjections.get(filter.masteryKey);
  if (named == null) return false;
  const status = named.get(id);
  if (status == null) return false;
  return projections.masteryAllowed.has(status);
}

function passesDue(id: string, filter: HubFilterInput): boolean {
  if (filter.dueKey !== true) return true;
  return filter.projections?.dueIds?.has(id) === true;
}

function effectiveStatusAllowList(
  filter: HubFilterInput,
): ReadonlySet<PublicationStatus> {
  const audience = resolveIndexAudience(filter.audience);
  const audienceAllowed = publicationStatusesForAudience(audience);
  if (filter.publicationStatuses == null || filter.publicationStatuses.length === 0) {
    return new Set(audienceAllowed);
  }
  const requested = new Set(filter.publicationStatuses);
  const intersected = new Set<PublicationStatus>();
  for (const s of audienceAllowed) {
    if (requested.has(s)) intersected.add(s);
  }
  // blocked can never enter even if requested
  intersected.delete("blocked");
  return intersected;
}

function audienceVisibleLessonIds(
  indexes: ContentIndexes,
  lessonIds: readonly LessonId[],
  audience: "learner" | "review",
): LessonId[] {
  const internal = getIndexInternal(indexes);
  return lessonIds.filter((lid) => {
    const lesson = internal.byId.get(lid);
    return (
      lesson != null &&
      lesson.kind === "Lesson" &&
      isVisiblePublicationStatus(lesson.publicationStatus, audience)
    );
  });
}

/**
 * Hub filter primitives for the six hubs.
 * Defaults to audience learner (published only). Does not implement mastery state —
 * accepts typed optional projections only.
 */
export function filterIndexedEntities(
  indexes: ContentIndexes,
  candidateIds: readonly string[] | "all-searchable",
  filter: HubFilterInput = {},
): string[] {
  const internal = getIndexInternal(indexes);
  const ids =
    candidateIds === "all-searchable"
      ? internal.searchDocuments.map((d) => d.id)
      : candidateIds;

  const kindSet =
    filter.kinds != null && filter.kinds.length > 0
      ? new Set<SearchableKind>(filter.kinds)
      : null;
  const lessonSet =
    filter.lessonIds != null && filter.lessonIds.length > 0
      ? new Set<LessonId>(filter.lessonIds)
      : null;
  const prioritySet =
    filter.priorities != null && filter.priorities.length > 0
      ? new Set(filter.priorities)
      : null;
  const statusSet = effectiveStatusAllowList(filter);
  const audience = resolveIndexAudience(filter.audience);

  const out: string[] = [];
  for (const id of ids) {
    const rec = internal.byId.get(id);
    if (!rec) {
      if (candidateIds !== "all-searchable") {
        throw new Error(`INDEX_UNKNOWN_CANDIDATE: unknown id ${id}`);
      }
      continue;
    }
    if (!rec.searchable || !isSearchableKind(rec.kind)) continue;

    if (kindSet && !kindSet.has(rec.kind)) continue;
    if (
      rec.publicationStatus == null ||
      !statusSet.has(rec.publicationStatus)
    ) {
      continue;
    }
    if (prioritySet && (rec.sourcePriority == null || !prioritySet.has(rec.sourcePriority))) {
      continue;
    }
    if (lessonSet) {
      const visibleLessons = audienceVisibleLessonIds(
        indexes,
        rec.lessonIds,
        audience,
      );
      const hit = visibleLessons.some((lid) => lessonSet.has(lid));
      if (!hit) continue;
    }
    if (filter.category != null && filter.category.length > 0) {
      if (rec.category !== filter.category) continue;
    }
    if (!passesTags(indexes, id, filter)) continue;
    if (
      (filter.relationshipTypes != null && filter.relationshipTypes.length > 0) ||
      filter.relatedToId != null
    ) {
      if (
        !hasRelationship(
          indexes,
          id,
          filter.relationshipTypes,
          filter.relatedToId,
          audience,
        )
      ) {
        continue;
      }
    }
    if (!passesLearnedScope(id, filter)) continue;
    if (!passesMastery(id, filter)) continue;
    if (!passesDue(id, filter)) continue;

    out.push(id);
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/**
 * Filter membership IDs by audience. Unknown/stale IDs throw a stable integrity error
 * rather than being silently discarded.
 */
export function filterMembershipIds(
  indexes: ContentIndexes,
  ids: readonly string[],
  options: MembershipQueryOptions = {},
  context = "membership",
): string[] {
  const audience = resolveIndexAudience(options.audience);
  const internal = getIndexInternal(indexes);
  const out: string[] = [];
  for (const id of ids) {
    const rec = internal.byId.get(id);
    if (!rec) {
      throw new Error(
        `INDEX_MEMBERSHIP_INTEGRITY: unknown/stale id ${id} in ${context}`,
      );
    }
    if (!isVisiblePublicationStatus(rec.publicationStatus, audience)) continue;
    out.push(id);
  }
  return out;
}

/**
 * Entities belonging to a lesson (learner-safe by default).
 * Omitting options returns published members only.
 * Pass audience:"review" for review/draft; blocked never included.
 * Hidden/blocked Lesson identity yields an empty membership list.
 */
export function entitiesForLesson(
  indexes: ContentIndexes,
  lessonId: LessonId,
  options: MembershipQueryOptions = {},
): readonly string[] {
  const audience = resolveIndexAudience(options.audience);
  const internal = getIndexInternal(indexes);
  const lesson = internal.byId.get(lessonId);
  if (
    lesson == null ||
    lesson.kind !== "Lesson" ||
    !isVisiblePublicationStatus(lesson.publicationStatus, audience)
  ) {
    return [];
  }
  const raw = internal.lessonMembership.get(lessonId) ?? [];
  return filterMembershipIds(indexes, raw, options, `lesson:${lessonId}`);
}

/**
 * Collection members (learner-safe by default).
 * Omitting options returns published members only.
 * Pass audience:"review" for review/draft; blocked never included.
 */
export function membersOfCollection(
  indexes: ContentIndexes,
  collectionId: string,
  options: MembershipQueryOptions = {},
): readonly string[] {
  const raw =
    getIndexInternal(indexes).collectionMembers.get(collectionId) ?? [];
  return filterMembershipIds(
    indexes,
    raw,
    options,
    `collection:${collectionId}`,
  );
}

/**
 * Entity record lookup. Defaults to learner/published-only.
 * Returns the same audience-projected shape as projected `byId`
 * (nested links and tags filtered). Pass audience:"review" for review/draft;
 * never returns blocked.
 */
export function getEntityRecord(
  indexes: ContentIndexes,
  id: string,
  options: MembershipQueryOptions = {},
): IndexedEntityRecord | undefined {
  return getProjectedEntityRecord(indexes, id, options);
}

/**
 * Reviewable concept IDs for the given audience.
 * Learner → published only; review → published|review|draft; never blocked.
 */
export function reviewableConceptsForAudience(
  indexes: ContentIndexes,
  options: MembershipQueryOptions = {},
): ReadonlySet<string> {
  const audience = resolveIndexAudience(options.audience);
  const internal = getIndexInternal(indexes);
  return audience === "review"
    ? internal.authorReviewableConceptIds
    : internal.reviewableConceptIds;
}
