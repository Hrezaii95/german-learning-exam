import {
  DETAIL_HUB_BY_ID,
  DETAIL_KIND_BY_ID,
  detailCanonicalPath,
  isDetailRepresentativeId,
} from "./detail-types";
import {
  buildContentIndexes,
  type ContentBundle,
  type ContentIndexes,
  type SearchableKind,
} from "@german-learning/content";
import {
  loadValidatedBundleOrThrow,
  projectLearnerWebProjection,
} from "./project";
import type {
  LearnerSearchDocument,
  LearnerSearchField,
  LearnerSearchHubName,
  LearnerSearchMatchField,
  LearnerSearchProjection,
  LearnerSearchableKind,
} from "./search-types";

export class SearchProjectionError extends Error {
  readonly code = "SEARCH_PROJECTION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "SearchProjectionError";
  }
}

const SEARCHABLE_KINDS = new Set<string>([
  "Lesson",
  "LearningActivity",
  "Lexeme",
  "Verb",
  "GrammarConcept",
  "PhrasePattern",
  "QAPair",
  "Dialogue",
  "ListeningAsset",
  "Collection",
]);

function isSearchableKind(value: string): value is LearnerSearchableKind {
  return SEARCHABLE_KINDS.has(value);
}

function isMatchField(value: string): value is LearnerSearchMatchField {
  return (
    value === "label" ||
    value === "lemma" ||
    value === "infinitive" ||
    value === "meaning" ||
    value === "intent" ||
    value === "title" ||
    value === "realization" ||
    value === "form" ||
    value === "category"
  );
}

function isHubName(value: string): value is LearnerSearchHubName {
  return (
    value === "vocabulary" ||
    value === "verbs" ||
    value === "grammar" ||
    value === "phrases" ||
    value === "listening" ||
    value === "concepts" ||
    value === "lessons" ||
    value === "review"
  );
}

function resolveCanonicalHref(
  kind: LearnerSearchableKind,
  id: string,
  hubPath: string,
  activityPathById: ReadonlyMap<string, string>,
): string | null {
  if (kind === "Lesson") {
    const slug = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
    return `/lessons/${slug}`;
  }
  if (kind === "LearningActivity") {
    return activityPathById.get(id) ?? null;
  }
  // Only the three implemented representative details are linkable.
  if (isDetailRepresentativeId(id) && DETAIL_KIND_BY_ID[id] === kind) {
    return detailCanonicalPath(DETAIL_HUB_BY_ID[id], id);
  }
  void hubPath;
  return null;
}

function projectFields(
  indexes: ContentIndexes,
  id: string,
): readonly LearnerSearchField[] {
  const doc = indexes.searchDocumentsById.get(id);
  if (!doc) {
    throw new SearchProjectionError(`Missing search document for ${id}`);
  }
  return Object.freeze(
    doc.fields.map((field) => {
      if (!isMatchField(field.field)) {
        throw new SearchProjectionError(
          `Unexpected search field ${field.field} on ${id}`,
        );
      }
      return Object.freeze({
        field: field.field,
        displayText: field.displayText,
        matchKeys: Object.freeze([...field.matchKeys]),
      });
    }),
  );
}

function projectDocument(
  indexes: ContentIndexes,
  id: string,
  activityPathById: ReadonlyMap<string, string>,
): LearnerSearchDocument | null {
  const doc = indexes.searchDocumentsById.get(id);
  if (!doc) {
    throw new SearchProjectionError(`Missing search document ${id}`);
  }
  if (doc.publicationStatus !== "published") {
    return null;
  }
  if (!isSearchableKind(doc.kind)) {
    throw new SearchProjectionError(`Non-searchable kind ${doc.kind} for ${id}`);
  }
  if (!isHubName(doc.hubDestination.hub)) {
    throw new SearchProjectionError(
      `Unexpected hub destination ${doc.hubDestination.hub} for ${id}`,
    );
  }

  const lessonIds = [...doc.lessonIds]
    .filter((lessonId) => {
      const lesson = indexes.byId.get(lessonId);
      return (
        lesson != null &&
        lesson.kind === "Lesson" &&
        lesson.publicationStatus === "published"
      );
    })
    .sort((a, b) => a.localeCompare(b));

  return Object.freeze({
    id: doc.id,
    kind: doc.kind,
    displayLabel: doc.displayLabel,
    publicationStatus: "published",
    sourcePriority: doc.sourcePriority,
    lessonIds: Object.freeze(lessonIds),
    category: doc.category,
    // Omit index `path` — often non-canonical (raw `:`) and unused by UI.
    hubDestination: Object.freeze({
      hub: doc.hubDestination.hub,
    }),
    fields: projectFields(indexes, id),
    canonicalHref: resolveCanonicalHref(
      doc.kind,
      doc.id,
      doc.hubDestination.path,
      activityPathById,
    ),
  });
}

/**
 * Build a deterministic learner-safe search artifact from ContentIndexes.
 * Uses only the public learner projection — never openAuthorIndexes.
 */
export function projectLearnerSearchProjection(
  indexes: ContentIndexes,
  activityPathById: ReadonlyMap<string, string>,
): LearnerSearchProjection {
  const ids = [...indexes.searchDocumentsById.keys()].sort((a, b) =>
    a.localeCompare(b),
  );
  const documents: LearnerSearchDocument[] = [];
  for (const id of ids) {
    const projected = projectDocument(indexes, id, activityPathById);
    if (projected) documents.push(projected);
  }

  const documentsById = Object.freeze(
    Object.fromEntries(documents.map((doc) => [doc.id, doc])),
  );

  return Object.freeze({
    schemaVersion: "1.0.0",
    projectionKind: "learner-search",
    documentCount: documents.length,
    documents: Object.freeze(documents),
    documentsById,
  });
}

export function projectLearnerSearchFromBundle(
  bundle: ContentBundle,
  activityPathById: ReadonlyMap<string, string>,
): LearnerSearchProjection {
  const indexes = buildContentIndexes(bundle);
  return projectLearnerSearchProjection(indexes, activityPathById);
}

export function projectPublishedLearnerSearch(
  publishedDir: string,
): LearnerSearchProjection {
  const bundle = loadValidatedBundleOrThrow(publishedDir);
  const web = projectLearnerWebProjection(bundle);
  const activityPathById = new Map(
    web.activities.map((activity) => [activity.id, activity.canonicalPath]),
  );
  return projectLearnerSearchFromBundle(bundle, activityPathById);
}

/** Stable JSON for generated search artifacts (sorted object keys recursively). */
export function serializeSearchProjectionDeterministic(
  projection: LearnerSearchProjection,
): string {
  return `${stableStringify(projection)}\n`;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value != null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of entries) {
      out[key] = sortValue(nested);
    }
    return out;
  }
  return value;
}

export type { SearchableKind };
