import { resolveIndexAudience } from "./audience.js";
import {
  getIndexInternal,
  isAuthorVisibleRecord,
} from "./internal.js";
import { projectEntityRecordLinks, projectEntityTags } from "./project.js";
import type {
  ContentIndexes,
  IndexedEntityRecord,
  MembershipQueryOptions,
} from "./types.js";

/**
 * Audience-projected entity record — same shape as projected `byId`.
 * Learner/default: published-only nested links and tags.
 * Review: published|review|draft links/tags; never blocked.
 */
export function getProjectedEntityRecord(
  indexes: ContentIndexes,
  id: string,
  options: MembershipQueryOptions = {},
): IndexedEntityRecord | undefined {
  const audience = resolveIndexAudience(options.audience);
  if (audience === "learner") {
    return indexes.byId.get(id);
  }
  const internal = getIndexInternal(indexes);
  const rec = internal.byId.get(id);
  if (!rec || !isAuthorVisibleRecord(rec)) return undefined;
  const tags = projectEntityTags(rec.tags, internal.authorRelationships, id);
  return projectEntityRecordLinks(
    rec,
    (linked) => {
      const linkedRec = internal.byId.get(linked);
      return linkedRec != null && isAuthorVisibleRecord(linkedRec);
    },
    tags,
  );
}
