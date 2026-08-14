import {
  buildContentIndexes,
  hubDestinationFor,
  type ContentBundle,
  type ContentIndexes,
  type SearchableKind,
  type TextToken,
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
import { projectHubExperience } from "./hub-experiences";

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
      "Words from your course, including the Lesson 2 job vocabulary.",
  }),
  verbs: Object.freeze({
    title: "Verbs",
    description:
      "Verbs you can study now. Verbs still being checked are not listed yet.",
  }),
  grammar: Object.freeze({
    title: "Grammar",
    description:
      "Grammar concepts for Lessons 1–2.",
  }),
  phrases: Object.freeze({
    title: "Phrases & Q&A",
    description:
      "Phrase patterns and question-and-answer pairs for greetings, identity, and related exchanges.",
  }),
  listening: Object.freeze({
    title: "Listening",
    description:
      "All 15 approved workbook tracks for Lessons 1–2, grouped by lesson and exercise with direct practice links.",
  }),
  concepts: Object.freeze({
    title: "Concepts",
    description:
      "Six learning paths that connect vocabulary, grammar, phrases, listening, and activities.",
  }),
});

/**
 * Any raw content id that would be developer language in a learner surface.
 * Mirrors the RAW_OBJECT_ID rule of the learner-language release gate so a
 * malformed model fails the build here rather than in exported HTML.
 */
const RAW_CONTENT_ID_PATTERN =
  /\b(?:lex|verb|gram|phrase|qa|listen|activity|lesson|collection|media|assert|rel|ex):[a-z0-9-]/i;

function plainTokensText(tokens: readonly TextToken[]): string {
  return tokens
    .map((token) => (token.type === "gap" ? token.label : token.text))
    .join("");
}

/**
 * Grammar cards answer "what does this rule look like in German?", so every
 * grammar record carries one worked model. The model is the first published
 * rule step that has one — the same `ruleSteps[].model` field the grammar
 * detail page renders — so the card and the detail page never disagree.
 * A concept that publishes no model carries no model at all.
 */
function projectGrammarModels(
  bundle: ContentBundle,
): ReadonlyMap<string, string> {
  const models = new Map<string, string>();
  for (const concept of bundle.grammarConcepts) {
    if (concept.publication.status !== "published") continue;
    for (const step of concept.ruleSteps) {
      if (!step.model) continue;
      const text = plainTokensText(step.model.tokens).trim();
      if (text.length === 0) continue;
      if (RAW_CONTENT_ID_PATTERN.test(text)) {
        throw new HubProjectionError(
          `Grammar model for ${concept.id} contains a raw content id`,
        );
      }
      models.set(concept.id, text);
      break;
    }
  }
  return models;
}

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

/**
 * Q&A pairs carry a machine intent (`qa:age-casual`) as their index label, which
 * a learner must never see. The search document already carries the German
 * question itself as its `realization` field — that is the learner-facing name.
 */
function learnerHubLabel(
  indexes: ContentIndexes,
  id: string,
  kind: LearnerHubEntityKind,
  indexLabel: string,
): string {
  if (kind !== "QAPair") return indexLabel;
  const realization = indexes.searchDocumentsById
    .get(id)
    ?.fields.find((field) => field.field === "realization")
    ?.displayText.trim();
  if (!realization) {
    throw new HubProjectionError(
      `Q&A pair ${id} has no question wording to show as its hub label`,
    );
  }
  return realization;
}

function projectHubRecord(
  indexes: ContentIndexes,
  id: string,
  expectedHub: LearnerHubId,
  models: ReadonlyMap<string, string>,
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

  const model = models.get(record.id);

  return Object.freeze({
    id: record.id,
    kind: record.kind,
    publicationStatus: "published",
    displayLabel: learnerHubLabel(indexes, record.id, record.kind, record.displayLabel),
    category: record.category,
    lessonIds: Object.freeze([...record.lessonIds].sort((a, b) => a.localeCompare(b))),
    sourcePriority: record.sourcePriority,
    hubDestination: Object.freeze({
      hub: destination.hub,
      path: destination.path,
    }),
    ...(model === undefined ? {} : { model }),
    searchFields: projectSearchFields(indexes, id),
  });
}

function projectHub(
  indexes: ContentIndexes,
  hubId: LearnerHubId,
  models: ReadonlyMap<string, string>,
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
    .map((id) => projectHubRecord(indexes, id, hubId, models));

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
    experience: projectHubExperience(indexes, hubId),
  });
}

/**
 * Build a deterministic learner-safe hub list projection from ContentIndexes.
 * Uses only the public learner projection — never openAuthorIndexes. The
 * bundle is read solely for published card content the search index does not
 * carry (the grammar worked model), under the same published-only guards.
 */
export function projectLearnerHubProjection(
  indexes: ContentIndexes,
  bundle: ContentBundle,
): LearnerHubProjection {
  const models = projectGrammarModels(bundle);
  const hubs = LEARNER_HUB_IDS.map((hubId) => projectHub(indexes, hubId, models));
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
  return projectLearnerHubProjection(indexes, bundle);
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
