export type {
  AuthorIndexCounts,
  ContentIndexes,
  DerivedIndexCounts,
  HubDestination,
  HubFilterInput,
  HubFilterProjections,
  HubName,
  IndexAudience,
  IndexedEntityKind,
  IndexedEntityRecord,
  IndexedRelationshipEdge,
  LearnedScope,
  LearnerIndexCounts,
  MembershipQueryOptions,
  RelationshipAdjacency,
  SearchBackContext,
  SearchDocument,
  SearchDocumentField,
  SearchHit,
  SearchMatch,
  SearchMatchField,
  SearchMatchReason,
  SearchOptions,
  SearchableKind,
} from "./types.js";

export type { AuthorIndexAccess } from "./author.js";

export { isIndexedEntityKind, isSearchableKind } from "./types.js";
export {
  buildContentIndexes,
  getIndexedEntity,
  assertSearchableKind,
} from "./build.js";
export { searchContent, normalizeQueryForTest } from "./search.js";
export {
  filterIndexedEntities,
  entitiesForLesson,
  membersOfCollection,
  getEntityRecord,
  reviewableConceptsForAudience,
  filterMembershipIds,
} from "./filters.js";
export { openAuthorIndexes } from "./author.js";
export {
  nfc,
  caseFoldNfc,
  foldUmlautDigraph,
  foldUmlautBase,
  germanMatchKeys,
  tokenizeNormalized,
  tokenizeAllKeys,
  plainTextFromStructured,
  assertIndexPlaintext,
} from "./normalize.js";
export { hubDestinationFor } from "./hub.js";
export {
  LEARNER_PUBLICATION_STATUSES,
  REVIEW_PUBLICATION_STATUSES,
  resolveIndexAudience,
  publicationStatusesForAudience,
  isVisiblePublicationStatus,
} from "./audience.js";
export { immutableMap, immutableSet } from "./immutable.js";
