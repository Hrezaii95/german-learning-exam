import {
  buildContentIndexes,
  hubDestinationFor,
  type ContentBundle,
  type ContentIndexes,
  type SearchableKind,
} from "@german-learning/content";
import { loadValidatedBundleOrThrow } from "./project";
import {
  LEARNER_HUB_IDS,
  type LearnerHubDefinition,
  type LearnerHubEntityKind,
  type LearnerHubId,
  type LearnerHubProjection,
  type LearnerHubRecord,
  type LearnerHubSearchField,
} from "./hub-types";

export class HubProjectionError extends Error {
  readonly code = "HUB_PROJECTION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "HubProjectionError";
  }
}

const HUB_KIND_MEMBERSHIP: Readonly<
  Record<LearnerHubId, readonly LearnerHubEntityKind[]>
> = Object.freeze({
  vocabulary: Object.freeze(["Lexeme"] as const),
  verbs: Object.freeze(["Verb"] as const),
  grammar: Object.freeze(["GrammarConcept"] as const),
  phrases: Object.freeze(["PhrasePattern", "QAPair"] as const),
  listening: Object.freeze(["Dialogue", "ListeningAsset"] as const),
  concepts: Object.freeze(["Collection"] as const),
});

const HUB_COPY: Readonly<
  Record<LearnerHubId, { title: string; description: string }>
> = Object.freeze({
  vocabulary: Object.freeze({
    title: "Vocabulary",
    description:
      "Published lexemes from the validated course package, including Lesson 2 job vocabulary when published.",
  }),
  verbs: Object.freeze({
    title: "Verbs",
    description:
      "Published verbs available to learners. Review-only verbs stay out of this list until approved.",
  }),
  grammar: Object.freeze({
    title: "Grammar",
    description:
      "Published grammar concepts for Lessons 1–2. Empty until grammar records are learner-published.",
  }),
  phrases: Object.freeze({
    title: "Phrases & Q&A",
    description:
      "Published phrase patterns and Q&A pairs for greetings, identity, and related exchanges.",
  }),
  listening: Object.freeze({
    title: "Listening",
    description:
      "Published dialogues and listening assets. Empty while listening remains review-only or absent.",
  }),
  concepts: Object.freeze({
    title: "Concepts",
    description:
      "Published concept collections. Empty while collections such as teacher decks remain review-only.",
  }),
});

function isLearnerHubId(value: string): value is LearnerHubId {
  return (LEARNER_HUB_IDS as readonly string[]).includes(value);
}

function isHubEntityKind(value: string): value is LearnerHubEntityKind {
  return (
    value === "Lexeme" ||
    value === "Verb" ||
    value === "GrammarConcept" ||
    value === "PhrasePattern" ||
    value === "QAPair" ||
    value === "Dialogue" ||
    value === "ListeningAsset" ||
    value === "Collection"
  );
}

function projectSearchFields(
  indexes: ContentIndexes,
  id: string,
): readonly LearnerHubSearchField[] {
  const doc = indexes.searchDocumentsById.get(id);
  if (!doc) {
    throw new HubProjectionError(`Missing search document for hub entity ${id}`);
  }
  return Object.freeze(
    doc.fields.map((field) =>
      Object.freeze({
        field: field.field,
        displayText: field.displayText,
        matchKeys: Object.freeze([...field.matchKeys]),
      }),
    ),
  );
}

function projectHubRecord(
  indexes: ContentIndexes,
  id: string,
  expectedHub: LearnerHubId,
): LearnerHubRecord {
  const record = indexes.byId.get(id);
  if (!record) {
    throw new HubProjectionError(`Missing indexed entity ${id}`);
  }
  if (record.publicationStatus !== "published") {
    throw new HubProjectionError(
      `Hub entity ${id} is not published (status=${record.publicationStatus})`,
    );
  }
  if (!isHubEntityKind(record.kind)) {
    throw new HubProjectionError(
      `Entity ${id} kind ${record.kind} is not a hub membership kind`,
    );
  }
  if (!record.searchable) {
    throw new HubProjectionError(`Hub entity ${id} is not searchable`);
  }

  const destination = hubDestinationFor(
    record.kind as SearchableKind,
    record.id,
  );
  if (!isLearnerHubId(destination.hub) || destination.hub !== expectedHub) {
    throw new HubProjectionError(
      `Hub destination mismatch for ${id}: expected ${expectedHub}, got ${destination.hub}`,
    );
  }

  return Object.freeze({
    id: record.id,
    kind: record.kind,
    publicationStatus: "published",
    displayLabel: record.displayLabel,
    category: record.category,
    lessonIds: Object.freeze([...record.lessonIds].sort((a, b) => a.localeCompare(b))),
    sourcePriority: record.sourcePriority,
    hubDestination: Object.freeze({
      hub: destination.hub,
      path: destination.path,
    }),
    searchFields: projectSearchFields(indexes, id),
  });
}

function projectHub(
  indexes: ContentIndexes,
  hubId: LearnerHubId,
): LearnerHubDefinition {
  const kinds = HUB_KIND_MEMBERSHIP[hubId];
  const idSet = new Set<string>();
  for (const kind of kinds) {
    for (const id of indexes.byKind.get(kind) ?? []) {
      idSet.add(id);
    }
  }

  const items = [...idSet]
    .sort((a, b) => a.localeCompare(b))
    .map((id) => projectHubRecord(indexes, id, hubId));

  const categorySet = new Set<string>();
  for (const item of items) {
    if (item.category != null && item.category.length > 0) {
      categorySet.add(item.category);
    }
  }

  const copy = HUB_COPY[hubId];
  return Object.freeze({
    id: hubId,
    path: `/${hubId}`,
    title: copy.title,
    description: copy.description,
    kinds: kinds,
    itemCount: items.length,
    categories: Object.freeze([...categorySet].sort((a, b) => a.localeCompare(b))),
    items: Object.freeze(items),
  });
}

/**
 * Build a deterministic learner-safe hub list projection from ContentIndexes.
 * Uses only the public learner projection — never openAuthorIndexes.
 */
export function projectLearnerHubProjection(
  indexes: ContentIndexes,
): LearnerHubProjection {
  const hubs = LEARNER_HUB_IDS.map((hubId) => projectHub(indexes, hubId));
  const hubsById = Object.freeze(
    Object.fromEntries(hubs.map((hub) => [hub.id, hub])) as Record<
      LearnerHubId,
      LearnerHubDefinition
    >,
  );

  if (hubs.length !== 6) {
    throw new HubProjectionError(`Expected 6 hubs, found ${hubs.length}`);
  }

  return Object.freeze({
    schemaVersion: "1.0.0",
    projectionKind: "learner-hubs",
    hubCount: 6,
    hubs: Object.freeze(hubs),
    hubsById,
  });
}

export function projectLearnerHubsFromBundle(
  bundle: ContentBundle,
): LearnerHubProjection {
  const indexes = buildContentIndexes(bundle);
  return projectLearnerHubProjection(indexes);
}

export function projectPublishedLearnerHubs(
  publishedDir: string,
): LearnerHubProjection {
  const bundle = loadValidatedBundleOrThrow(publishedDir);
  return projectLearnerHubsFromBundle(bundle);
}

/** Stable JSON for generated hub artifacts (sorted object keys recursively). */
export function serializeHubProjectionDeterministic(
  projection: LearnerHubProjection,
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

export { HUB_KIND_MEMBERSHIP };
