import type { ContentBundle } from "../types/bundle.js";
import type { LessonId } from "../ids/index.js";
import type {
  PublicationStatus,
  SourcePriority,
  StructuredText,
} from "../types/common.js";
import type { RelationshipType } from "../types/relationship.js";
import { RELATIONSHIP_TYPES } from "../types/relationship.js";
import { hubDestinationFor } from "./hub.js";
import {
  attachIndexInternal,
  getIndexInternal,
  isAuthorVisibleRecord,
  isPublishedRecord,
  type IndexInternalState,
} from "./internal.js";
import { immutableMap, immutableSet } from "./immutable.js";
import {
  assertIndexPlaintext,
  germanMatchKeys,
  nfc,
  plainTextFromStructured,
} from "./normalize.js";
import {
  countIdListValues,
  countRelationshipEdges,
  filterEntityLessons,
  filterLessonKeyedMembership,
  projectEntityRecordLinks,
  projectEntityTags,
  projectRelationshipAdjacency,
  projectSearchDocumentLessons,
} from "./project.js";
import { getProjectedEntityRecord } from "./record-access.js";
import type {
  AuthorIndexCounts,
  ContentIndexes,
  IndexedEntityKind,
  IndexedEntityRecord,
  IndexedRelationshipEdge,
  LearnerIndexCounts,
  RelationshipAdjacency,
  SearchDocument,
  SearchDocumentField,
  SearchMatchField,
  SearchableKind,
} from "./types.js";
import { isIndexedEntityKind, isSearchableKind } from "./types.js";

const REVIEWABLE_KINDS = new Set<IndexedEntityKind>([
  "Lexeme",
  "Verb",
  "GrammarConcept",
  "PhrasePattern",
  "QAPair",
  "Dialogue",
  "ListeningAsset",
]);

const AUTHOR_REVIEWABLE_PUBLICATION = new Set<PublicationStatus>([
  "published",
  "review",
  "draft",
]);

function pushUnique(list: string[], id: string): void {
  if (!list.includes(id)) list.push(id);
}

function pushUniqueLesson(list: LessonId[], id: LessonId): void {
  if (!list.includes(id)) list.push(id);
}

function asLessonId(id: string): LessonId | null {
  return id.startsWith("lesson:") ? (id as LessonId) : null;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

function field(
  matchField: SearchMatchField,
  displayText: string,
): SearchDocumentField | null {
  const text = assertIndexPlaintext(displayText).trim();
  if (text.length === 0) return null;
  return {
    field: matchField,
    displayText: text,
    matchKeys: germanMatchKeys(text),
  };
}

function addField(fields: SearchDocumentField[], f: SearchDocumentField | null): void {
  if (f) fields.push(f);
}

function structuredFields(
  matchField: SearchMatchField,
  value: StructuredText | undefined,
): SearchDocumentField | null {
  if (!value) return null;
  return field(matchField, plainTextFromStructured(value));
}

function freezeArray<T>(items: T[]): readonly T[] {
  return Object.freeze(items.slice()) as readonly T[];
}

function requireId(
  id: string,
  mutable: Map<string, MutableRecord>,
  context: string,
): void {
  if (!mutable.has(id)) {
    throw new Error(`Unresolved index input at ${context}: missing id ${id}`);
  }
}

function sourcePriorityFromAssertions(
  assertionIds: readonly string[],
  assertionPriority: Map<string, SourcePriority>,
): SourcePriority | null {
  let min: SourcePriority | null = null;
  for (const id of assertionIds) {
    const p = assertionPriority.get(id);
    if (p == null) continue;
    if (min == null || p < min) min = p;
  }
  return min;
}

type MutableRecord = {
  id: string;
  kind: IndexedEntityKind;
  publicationStatus: PublicationStatus | null;
  sourcePriority: SourcePriority | null;
  lessonIds: LessonId[];
  displayLabel: string;
  category: string | null;
  mediaIds: string[];
  exampleIds: string[];
  collectionIds: string[];
  activityIds: string[];
  tags: string[];
  reviewable: boolean;
  searchable: boolean;
};

function toRecord(m: MutableRecord): IndexedEntityRecord {
  return Object.freeze({
    id: m.id,
    kind: m.kind,
    publicationStatus: m.publicationStatus,
    sourcePriority: m.sourcePriority,
    lessonIds: freezeArray(m.lessonIds),
    displayLabel: m.displayLabel,
    category: m.category,
    mediaIds: freezeArray(m.mediaIds),
    exampleIds: freezeArray(m.exampleIds),
    collectionIds: freezeArray(m.collectionIds),
    activityIds: freezeArray(m.activityIds),
    tags: freezeArray(m.tags),
    reviewable: m.reviewable,
    searchable: m.searchable,
  });
}

const DYNAMIC_QUERY_KEYS = new Set(["type", "lessonId", "tags"]);

function materializeDynamicMembers(
  collectionId: string,
  query: Record<string, unknown>,
  mutable: Map<string, MutableRecord>,
): string[] {
  for (const key of Object.keys(query)) {
    if (!DYNAMIC_QUERY_KEYS.has(key)) {
      throw new Error(
        `INDEX_DYNAMIC_COLLECTION_UNSUPPORTED: ${collectionId} unknown query key ${key}`,
      );
    }
  }

  const typeVal = query.type;
  const lessonVal = query.lessonId;
  const tagsVal = query.tags;

  const hasType = typeof typeVal === "string" && typeVal.length > 0;
  const hasLesson = typeof lessonVal === "string" && lessonVal.length > 0;
  const hasTags = Array.isArray(tagsVal) && tagsVal.length > 0;
  if (!hasType && !hasLesson && !hasTags) {
    throw new Error(
      `INDEX_DYNAMIC_COLLECTION_UNSUPPORTED: ${collectionId} query is empty/ambiguous`,
    );
  }
  if (hasType && !isIndexedEntityKind(typeVal as string)) {
    throw new Error(
      `INDEX_DYNAMIC_COLLECTION_UNSUPPORTED: ${collectionId} unsupported type ${typeVal}`,
    );
  }
  if (hasLesson) {
    const lessonId = lessonVal as LessonId;
    const lessonRec = mutable.get(lessonId);
    if (!lessonRec) {
      throw new Error(
        `INDEX_DYNAMIC_LESSON_UNRESOLVED: ${collectionId} lessonId ${lessonId} not found`,
      );
    }
    if (lessonRec.kind !== "Lesson") {
      throw new Error(
        `INDEX_DYNAMIC_LESSON_WRONG_KIND: ${collectionId} lessonId ${lessonId} is ${lessonRec.kind}, expected Lesson`,
      );
    }
  }

  const members: string[] = [];
  for (const rec of mutable.values()) {
    if (!rec.searchable || !isSearchableKind(rec.kind)) continue;
    if (hasType && rec.kind !== typeVal) continue;
    if (hasLesson && !rec.lessonIds.includes(lessonVal as LessonId)) continue;
    if (hasTags) {
      const tagSet = new Set(rec.tags);
      if (!(tagsVal as string[]).every((t) => tagSet.has(t))) continue;
    }
    members.push(rec.id);
  }
  members.sort((a, b) => a.localeCompare(b));
  return members;
}

/**
 * Build immutable typed indexes from a ContentBundle.
 * Throws on duplicate IDs, unresolved refs, or contradictory membership/ownership
 * even if a caller bypassed prior validation.
 */
export function buildContentIndexes(bundle: ContentBundle): ContentIndexes {
  const byId = new Map<string, IndexedEntityRecord>();
  const mutable = new Map<string, MutableRecord>();
  const byKindLists = new Map<IndexedEntityKind, string[]>();

  const register = (rec: MutableRecord): void => {
    if (mutable.has(rec.id) || byId.has(rec.id)) {
      throw new Error(`Duplicate ID in content indexes: ${rec.id}`);
    }
    mutable.set(rec.id, rec);
    const list = byKindLists.get(rec.kind) ?? [];
    list.push(rec.id);
    byKindLists.set(rec.kind, list);
  };

  const sourcePriorityBySourceId = new Map<string, SourcePriority>();
  for (const source of bundle.sources) {
    sourcePriorityBySourceId.set(source.id, source.priority);
    register({
      id: source.id,
      kind: "Source",
      publicationStatus: null,
      sourcePriority: source.priority,
      lessonIds: [],
      displayLabel: nfc(source.title),
      category: source.sourceKind,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: false,
    });
  }

  const assertionPriority = new Map<string, SourcePriority>();
  for (const assertion of bundle.sourceAssertions) {
    const prio = sourcePriorityBySourceId.get(assertion.sourceId);
    if (prio == null) {
      throw new Error(
        `Unresolved index input at SourceAssertion ${assertion.id}: missing source ${assertion.sourceId}`,
      );
    }
    assertionPriority.set(assertion.id, prio);
    register({
      id: assertion.id,
      kind: "SourceAssertion",
      publicationStatus: null,
      sourcePriority: prio,
      lessonIds: [],
      displayLabel: assertion.id,
      category: assertion.field,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: false,
    });
  }

  for (const media of bundle.mediaAssets) {
    register({
      id: media.id,
      kind: "MediaAsset",
      publicationStatus: media.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        media.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: media.spokenText
        ? assertIndexPlaintext(media.spokenText, "MediaAsset.spokenText")
        : media.id,
      category: media.mediaKind,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: false,
    });
  }

  for (const example of bundle.examples ?? []) {
    register({
      id: example.id,
      kind: "Example",
      publicationStatus: null,
      sourcePriority: sourcePriorityFromAssertions(
        example.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: plainTextFromStructured(example.text) || example.id,
      category: null,
      mediaIds: example.audioId ? [example.audioId] : [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: false,
    });
  }

  for (const lesson of bundle.lessons) {
    register({
      id: lesson.id,
      kind: "Lesson",
      publicationStatus: lesson.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        lesson.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [lesson.id],
      displayLabel: assertIndexPlaintext(lesson.titleDe, "Lesson.titleDe"),
      category: `lesson-${lesson.number}`,
      mediaIds: lesson.summaryInfographicId ? [lesson.summaryInfographicId] : [],
      exampleIds: [],
      collectionIds: lesson.collections.map((c) => c.collectionId),
      activityIds: lesson.stages.flatMap((s) => s.activityIds),
      tags: [],
      reviewable: false,
      searchable: true,
    });
  }

  for (const lex of bundle.lexemes) {
    const label = lex.noun
      ? assertIndexPlaintext(
          `${lex.noun.article} ${lex.lemma}`,
          "Lexeme.lemma",
        )
      : assertIndexPlaintext(lex.lemma, "Lexeme.lemma");
    register({
      id: lex.id,
      kind: "Lexeme",
      publicationStatus: lex.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        lex.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: label,
      category: lex.partOfSpeech,
      mediaIds: [...lex.mediaIds],
      exampleIds: [...lex.exampleIds],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: true,
      searchable: true,
    });
  }

  for (const verb of bundle.verbs) {
    register({
      id: verb.id,
      kind: "Verb",
      publicationStatus: verb.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        verb.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: assertIndexPlaintext(verb.infinitive, "Verb.infinitive"),
      category: "verb",
      mediaIds: [...verb.mediaIds],
      exampleIds: [...verb.exampleIds],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: true,
      searchable: true,
    });
  }

  for (const gram of bundle.grammarConcepts) {
    const tags = [...gram.commonErrorTags].sort();
    register({
      id: gram.id,
      kind: "GrammarConcept",
      publicationStatus: gram.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        gram.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: assertIndexPlaintext(
        gram.titleDe ?? gram.titleEn,
        "GrammarConcept.title",
      ),
      category: "grammar",
      mediaIds: [
        ...gram.mediaIds,
        ...(gram.infographicId ? [gram.infographicId] : []),
      ],
      exampleIds: [...gram.exampleIds],
      collectionIds: [],
      activityIds: [],
      tags,
      reviewable: true,
      searchable: true,
    });
  }

  for (const phrase of bundle.phrasePatterns) {
    const realization = plainTextFromStructured(phrase.fixedTokens);
    register({
      id: phrase.id,
      kind: "PhrasePattern",
      publicationStatus: phrase.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        phrase.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel:
        realization || assertIndexPlaintext(phrase.intent, "PhrasePattern.intent"),
      category: phrase.register,
      mediaIds: [...phrase.audioIds],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: true,
      searchable: true,
    });
  }

  for (const qa of bundle.qaPairs) {
    register({
      id: qa.id,
      kind: "QAPair",
      publicationStatus: qa.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        qa.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: assertIndexPlaintext(qa.intent, "QAPair.intent"),
      category: qa.register,
      mediaIds: [...qa.audioIds],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: true,
      searchable: true,
    });
  }

  for (const dialogue of bundle.dialogues) {
    register({
      id: dialogue.id,
      kind: "Dialogue",
      publicationStatus: dialogue.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        dialogue.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: assertIndexPlaintext(dialogue.titleEn, "Dialogue.titleEn"),
      category: "dialogue",
      mediaIds: [...dialogue.mediaIds],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: true,
      searchable: true,
    });
  }

  for (const listen of bundle.listeningAssets) {
    register({
      id: listen.id,
      kind: "ListeningAsset",
      publicationStatus: listen.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        listen.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds: [],
      displayLabel: listen.exerciseRef
        ? assertIndexPlaintext(listen.exerciseRef, "ListeningAsset.exerciseRef")
        : listen.id,
      category: "listening",
      mediaIds: [
        listen.mediaId,
        ...(listen.parentTrackMediaId ? [listen.parentTrackMediaId] : []),
      ],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: true,
      searchable: true,
    });
  }

  for (const collection of bundle.collections) {
    register({
      id: collection.id,
      kind: "Collection",
      publicationStatus: collection.publication.status,
      sourcePriority: collection.sourcePriority,
      lessonIds: collection.lessonLinks.map((l) => l.lessonId),
      displayLabel: assertIndexPlaintext(
        collection.titleDe ?? collection.titleEn,
        "Collection.title",
      ),
      category: `priority-${collection.sourcePriority}`,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: true,
    });
  }

  // Activity registration — lessonIds start from declared lessonId only.
  for (const activity of bundle.learningActivities) {
    const lessonIds: LessonId[] = activity.lessonId ? [activity.lessonId] : [];
    register({
      id: activity.id,
      kind: "LearningActivity",
      publicationStatus: activity.publication.status,
      sourcePriority: sourcePriorityFromAssertions(
        activity.sourceAssertionIds,
        assertionPriority,
      ),
      lessonIds,
      displayLabel: plainTextFromStructured(activity.prompt.instruction) || activity.id,
      category: activity.mode,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: true,
    });
  }

  for (const gap of bundle.contentGaps) {
    register({
      id: gap.id,
      kind: "ContentGap",
      publicationStatus: null,
      sourcePriority: null,
      lessonIds: [],
      displayLabel: gap.id,
      category: gap.owner,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: false,
    });
  }

  // Relationship edges
  const edges: IndexedRelationshipEdge[] = [];
  const outgoing = new Map<string, IndexedRelationshipEdge[]>();
  const incoming = new Map<string, IndexedRelationshipEdge[]>();
  const byType = new Map<RelationshipType, IndexedRelationshipEdge[]>();
  for (const t of RELATIONSHIP_TYPES) byType.set(t, []);

  for (const rel of bundle.relationships) {
    if (mutable.has(rel.id)) {
      throw new Error(`Duplicate ID in content indexes: ${rel.id}`);
    }
    if (!mutable.has(rel.fromId)) {
      throw new Error(
        `Unresolved index input at Relationship ${rel.id}.fromId: missing id ${rel.fromId}`,
      );
    }
    if (!mutable.has(rel.toId)) {
      throw new Error(
        `Unresolved index input at Relationship ${rel.id}.toId: missing id ${rel.toId}`,
      );
    }
    let resolvedLessonId: LessonId | null = null;
    if (typeof rel.lessonId === "string" && rel.lessonId.length > 0) {
      const lessonRec = mutable.get(rel.lessonId);
      if (!lessonRec) {
        throw new Error(
          `INDEX_RELATIONSHIP_LESSON_UNRESOLVED: ${rel.id} lessonId ${rel.lessonId} not found`,
        );
      }
      if (lessonRec.kind !== "Lesson") {
        throw new Error(
          `INDEX_RELATIONSHIP_LESSON_WRONG_KIND: ${rel.id} lessonId ${rel.lessonId} is ${lessonRec.kind}, expected Lesson`,
        );
      }
      resolvedLessonId = rel.lessonId as LessonId;
    }
    const edge: IndexedRelationshipEdge = Object.freeze({
      id: rel.id,
      type: rel.type,
      fromId: rel.fromId,
      toId: rel.toId,
      lessonId: resolvedLessonId,
      order: rel.order ?? null,
    });
    edges.push(edge);
    const out = outgoing.get(rel.fromId) ?? [];
    out.push(edge);
    outgoing.set(rel.fromId, out);
    const inn = incoming.get(rel.toId) ?? [];
    inn.push(edge);
    incoming.set(rel.toId, inn);
    const typed = byType.get(rel.type) ?? [];
    typed.push(edge);
    byType.set(rel.type, typed);

    register({
      id: rel.id,
      kind: "Relationship",
      publicationStatus: null,
      sourcePriority: null,
      lessonIds: resolvedLessonId ? [resolvedLessonId] : [],
      displayLabel: rel.id,
      category: rel.type,
      mediaIds: [],
      exampleIds: [],
      collectionIds: [],
      activityIds: [],
      tags: [],
      reviewable: false,
      searchable: false,
    });
  }

  // Derive relationship-type tags on endpoints (source-supported; never invented).
  for (const edge of edges) {
    const tag = `rel:${edge.type}`;
    const from = mutable.get(edge.fromId);
    const to = mutable.get(edge.toId);
    if (from) pushUnique(from.tags, tag);
    if (to) pushUnique(to.tags, tag);
  }
  for (const m of mutable.values()) m.tags.sort();

  // Resolve media / example refs
  for (const rec of mutable.values()) {
    for (const mediaId of rec.mediaIds) {
      if (!mutable.has(mediaId)) {
        throw new Error(
          `Unresolved index input at ${rec.id}.mediaIds: missing id ${mediaId}`,
        );
      }
      if (mutable.get(mediaId)?.kind !== "MediaAsset") {
        throw new Error(
          `Unresolved index input at ${rec.id}.mediaIds: ${mediaId} is not a MediaAsset`,
        );
      }
    }
    for (const exampleId of rec.exampleIds) {
      if (!mutable.has(exampleId)) {
        throw new Error(
          `Unresolved index input at ${rec.id}.exampleIds: missing id ${exampleId}`,
        );
      }
      if (mutable.get(exampleId)?.kind !== "Example") {
        throw new Error(
          `Unresolved index input at ${rec.id}.exampleIds: ${exampleId} is not an Example`,
        );
      }
    }
  }

  // Lesson membership from introduced-in / practised-in before dynamic collections.
  for (const edge of byType.get("introduced-in") ?? []) {
    const lessonId = asLessonId(edge.toId);
    if (!lessonId) continue;
    const m = mutable.get(edge.fromId);
    if (m) pushUniqueLesson(m.lessonIds, lessonId);
  }
  for (const edge of byType.get("practised-in") ?? []) {
    const lessonId = asLessonId(edge.toId);
    if (lessonId) {
      const m = mutable.get(edge.fromId);
      if (m) pushUniqueLesson(m.lessonIds, lessonId);
      continue;
    }
    const activity = mutable.get(edge.toId);
    if (activity?.kind === "LearningActivity") {
      for (const lid of activity.lessonIds) {
        const m = mutable.get(edge.fromId);
        if (m) pushUniqueLesson(m.lessonIds, lid);
      }
    }
  }

  // Activity ↔ concept + ownership from lesson stages
  const activitiesByLesson = new Map<LessonId, string[]>();
  const activitiesByConcept = new Map<string, string[]>();
  const stageLessonsByActivity = new Map<string, LessonId[]>();

  for (const lesson of bundle.lessons) {
    for (const stage of lesson.stages) {
      for (const activityId of stage.activityIds) {
        requireId(activityId, mutable, `${lesson.id}.stages.activityIds`);
        const listed = stageLessonsByActivity.get(activityId) ?? [];
        pushUniqueLesson(listed, lesson.id);
        stageLessonsByActivity.set(activityId, listed);
      }
    }
  }

  for (const activity of bundle.learningActivities) {
    const stageLessons = stageLessonsByActivity.get(activity.id) ?? [];
    if (stageLessons.length > 1) {
      throw new Error(
        `INDEX_CONTRADICTORY_ACTIVITY_OWNERSHIP: ${activity.id} listed under multiple lessons (${stageLessons.join(", ")})`,
      );
    }
    if (
      activity.lessonId &&
      stageLessons.length === 1 &&
      activity.lessonId !== stageLessons[0]
    ) {
      throw new Error(
        `INDEX_CONTRADICTORY_ACTIVITY_OWNERSHIP: ${activity.id} lessonId ${activity.lessonId} disagrees with stage ownership ${stageLessons[0]}`,
      );
    }

    const act = mutable.get(activity.id)!;
    // Canonical lesson: declared lessonId, else sole stage lesson.
    const canonical = activity.lessonId ?? stageLessons[0] ?? null;
    act.lessonIds = canonical ? [canonical] : [];

    if (canonical) {
      requireId(canonical, mutable, `${activity.id}.lessonId`);
      const list = activitiesByLesson.get(canonical) ?? [];
      pushUnique(list, activity.id);
      activitiesByLesson.set(canonical, list);
    }

    for (const conceptId of activity.conceptIds) {
      requireId(conceptId, mutable, `${activity.id}.conceptIds`);
      const list = activitiesByConcept.get(conceptId) ?? [];
      pushUnique(list, activity.id);
      activitiesByConcept.set(conceptId, list);
      const concept = mutable.get(conceptId)!;
      pushUnique(concept.activityIds, activity.id);
      if (canonical) pushUniqueLesson(concept.lessonIds, canonical);
      if (concept.kind === "Collection" && canonical) {
        pushUniqueLesson(act.lessonIds, canonical);
      }
    }
  }

  // Collection membership:
  // 1) resolve static members + agree with member-of-collection edges
  // 2) propagate collection-derived lesson membership
  // 3) materialize dynamic queries against finalized lesson membership
  // 4) propagate lessons for dynamic members
  const collectionMembers = new Map<string, string[]>();
  const entityCollections = new Map<string, string[]>();

  const bindCollectionMembers = (
    collectionId: string,
    members: string[],
  ): void => {
    for (const memberId of members) {
      const ec = entityCollections.get(memberId) ?? [];
      pushUnique(ec, collectionId);
      entityCollections.set(memberId, ec);
      const m = mutable.get(memberId);
      if (m) pushUnique(m.collectionIds, collectionId);
    }
    collectionMembers.set(collectionId, members);
  };

  const edgeMembersFor = (collectionId: string): Set<string> => {
    const edgeMemberSet = new Set<string>();
    for (const edge of byType.get("member-of-collection") ?? []) {
      if (edge.toId !== collectionId) continue;
      requireId(edge.fromId, mutable, `${edge.id}.fromId`);
      edgeMemberSet.add(edge.fromId);
    }
    return edgeMemberSet;
  };

  const propagateCollectionLessonIds = (
    collectionIds: Iterable<string>,
  ): void => {
    for (const collectionId of collectionIds) {
      const collection = mutable.get(collectionId);
      const members = collectionMembers.get(collectionId) ?? [];
      if (!collection) continue;
      for (const memberId of members) {
        const m = mutable.get(memberId);
        if (!m) continue;
        for (const lid of collection.lessonIds) pushUniqueLesson(m.lessonIds, lid);
      }
    }
  };

  const propagateLessonCollectionLinks = (): void => {
    for (const lesson of bundle.lessons) {
      for (const link of lesson.collections) {
        requireId(link.collectionId, mutable, `${lesson.id}.collections`);
        const members = collectionMembers.get(link.collectionId) ?? [];
        for (const memberId of members) {
          const m = mutable.get(memberId);
          if (m) pushUniqueLesson(m.lessonIds, lesson.id);
        }
        const col = mutable.get(link.collectionId);
        if (col) pushUniqueLesson(col.lessonIds, lesson.id);
      }
    }
  };

  const staticCollectionIds: string[] = [];
  const dynamicCollections = bundle.collections.filter(
    (c) => c.membership.mode === "dynamic",
  );

  for (const collection of bundle.collections) {
    for (const link of collection.lessonLinks) {
      requireId(link.lessonId, mutable, `${collection.id}.lessonLinks`);
    }
    if (collection.membership.mode !== "static") continue;
    staticCollectionIds.push(collection.id);
    const edgeMemberSet = edgeMembersFor(collection.id);
    const staticSet = new Set(collection.membership.memberIds);
    for (const memberId of staticSet) {
      requireId(memberId, mutable, `${collection.id}.membership.memberIds`);
    }
    if (edgeMemberSet.size > 0 && !setsEqual(staticSet, edgeMemberSet)) {
      throw new Error(
        `INDEX_CONTRADICTORY_MEMBERSHIP: ${collection.id} static members disagree with member-of-collection relationships`,
      );
    }
    bindCollectionMembers(
      collection.id,
      [...staticSet].sort((a, b) => a.localeCompare(b)),
    );
  }

  // Finalize lesson membership from static collections before dynamic queries.
  propagateCollectionLessonIds(staticCollectionIds);
  propagateLessonCollectionLinks();

  for (const collection of dynamicCollections) {
    const edgeMemberSet = edgeMembersFor(collection.id);
    const membership = collection.membership;
    if (membership.mode !== "dynamic") {
      throw new Error(
        `INDEX_DYNAMIC_COLLECTION_UNSUPPORTED: ${collection.id} expected dynamic membership`,
      );
    }
    const members = materializeDynamicMembers(
      collection.id,
      membership.query as Record<string, unknown>,
      mutable,
    );
    if (edgeMemberSet.size > 0) {
      const materialized = new Set(members);
      if (!setsEqual(materialized, edgeMemberSet)) {
        throw new Error(
          `INDEX_CONTRADICTORY_MEMBERSHIP: ${collection.id} dynamic members disagree with member-of-collection relationships`,
        );
      }
    }
    bindCollectionMembers(collection.id, members);
  }

  propagateCollectionLessonIds(dynamicCollections.map((c) => c.id));
  propagateLessonCollectionLinks();

  // Finalize immutable byId / lesson maps.
  const lessonMembership = new Map<LessonId, string[]>();
  const entityLessons = new Map<string, LessonId[]>();
  const sourcePriorityById = new Map<string, SourcePriority>();
  const publicationStatusById = new Map<string, PublicationStatus>();
  const mediaByEntityId = new Map<string, string[]>();
  const entitiesByMediaId = new Map<string, string[]>();
  const examplesByEntityId = new Map<string, string[]>();
  const entitiesByExampleId = new Map<string, string[]>();
  const tagsByEntityId = new Map<string, string[]>();
  const reviewableConceptIds = new Set<string>();
  const authorReviewableConceptIds = new Set<string>();

  for (const m of mutable.values()) {
    m.lessonIds.sort();
    m.tags.sort();
    const frozen = toRecord(m);
    byId.set(m.id, frozen);
    entityLessons.set(m.id, [...m.lessonIds]);
    for (const lid of m.lessonIds) {
      const list = lessonMembership.get(lid) ?? [];
      pushUnique(list, m.id);
      lessonMembership.set(lid, list);
    }
    if (m.sourcePriority != null) sourcePriorityById.set(m.id, m.sourcePriority);
    if (m.publicationStatus != null) {
      publicationStatusById.set(m.id, m.publicationStatus);
    }
    if (m.tags.length > 0) tagsByEntityId.set(m.id, [...m.tags]);
    if (m.mediaIds.length > 0) {
      mediaByEntityId.set(m.id, [...m.mediaIds]);
      for (const mediaId of m.mediaIds) {
        const list = entitiesByMediaId.get(mediaId) ?? [];
        pushUnique(list, m.id);
        entitiesByMediaId.set(mediaId, list);
      }
    }
    if (m.exampleIds.length > 0) {
      examplesByEntityId.set(m.id, [...m.exampleIds]);
      for (const exampleId of m.exampleIds) {
        const list = entitiesByExampleId.get(exampleId) ?? [];
        pushUnique(list, m.id);
        entitiesByExampleId.set(exampleId, list);
      }
    }
    if (
      m.reviewable &&
      REVIEWABLE_KINDS.has(m.kind) &&
      m.publicationStatus != null
    ) {
      if (m.publicationStatus === "published") {
        reviewableConceptIds.add(m.id);
      }
      if (AUTHOR_REVIEWABLE_PUBLICATION.has(m.publicationStatus)) {
        authorReviewableConceptIds.add(m.id);
      }
    }
  }

  for (const [lid, list] of lessonMembership) list.sort();
  for (const [, list] of byKindLists) list.sort();
  for (const [, list] of collectionMembers) list.sort();
  for (const [, list] of entityCollections) list.sort();
  for (const [, list] of activitiesByLesson) list.sort();
  for (const [, list] of activitiesByConcept) list.sort();
  for (const [, list] of mediaByEntityId) list.sort();
  for (const [, list] of entitiesByMediaId) list.sort();
  for (const [, list] of examplesByEntityId) list.sort();
  for (const [, list] of entitiesByExampleId) list.sort();
  for (const [, list] of tagsByEntityId) list.sort();

  const relationships: RelationshipAdjacency = Object.freeze({
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

  // Search documents
  const searchDocuments: SearchDocument[] = [];
  const searchDocumentsById = new Map<string, SearchDocument>();

  const emitSearchDoc = (doc: SearchDocument): void => {
    const frozen: SearchDocument = Object.freeze({
      ...doc,
      lessonIds: freezeArray([...doc.lessonIds]),
      fields: freezeArray(
        doc.fields.map((f) =>
          Object.freeze({ ...f, matchKeys: freezeArray([...f.matchKeys]) }),
        ),
      ),
      hubDestination: Object.freeze({ ...doc.hubDestination }),
    });
    searchDocuments.push(frozen);
    searchDocumentsById.set(frozen.id, frozen);
  };

  for (const lex of bundle.lexemes) {
    const rec = byId.get(lex.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("lemma", lex.lemma));
    addField(fields, field("label", rec.displayLabel));
    if (lex.noun) {
      addField(fields, field("form", lex.noun.singular));
      for (const pl of lex.noun.plurals) addField(fields, field("form", pl.form));
    }
    for (const meaning of lex.meanings) {
      addField(fields, field("meaning", meaning.glossEn));
      if (meaning.glossEs) addField(fields, field("meaning", meaning.glossEs));
    }
    if (lex.partOfSpeech) addField(fields, field("category", lex.partOfSpeech));
    emitSearchDoc({
      id: lex.id,
      kind: "Lexeme",
      displayLabel: rec.displayLabel,
      publicationStatus: lex.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("Lexeme", lex.id),
      fields,
    });
  }

  for (const verb of bundle.verbs) {
    const rec = byId.get(verb.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("infinitive", verb.infinitive));
    addField(fields, field("label", verb.infinitive));
    for (const meaning of verb.meanings) {
      addField(fields, field("meaning", meaning.glossEn));
    }
    for (const form of verb.present) {
      addField(fields, field("form", form.form));
    }
    emitSearchDoc({
      id: verb.id,
      kind: "Verb",
      displayLabel: rec.displayLabel,
      publicationStatus: verb.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("Verb", verb.id),
      fields,
    });
  }

  for (const gram of bundle.grammarConcepts) {
    const rec = byId.get(gram.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("title", gram.titleEn));
    if (gram.titleDe) addField(fields, field("title", gram.titleDe));
    addField(fields, field("label", rec.displayLabel));
    emitSearchDoc({
      id: gram.id,
      kind: "GrammarConcept",
      displayLabel: rec.displayLabel,
      publicationStatus: gram.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("GrammarConcept", gram.id),
      fields,
    });
  }

  for (const phrase of bundle.phrasePatterns) {
    const rec = byId.get(phrase.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("intent", phrase.intent));
    if (phrase.intent.startsWith("qa:")) {
      addField(fields, field("intent", phrase.intent.slice(3)));
    }
    addField(fields, structuredFields("realization", phrase.fixedTokens));
    for (const r of phrase.acceptedRealizations) {
      addField(fields, structuredFields("realization", r));
    }
    addField(fields, field("label", rec.displayLabel));
    addField(fields, field("category", phrase.register));
    emitSearchDoc({
      id: phrase.id,
      kind: "PhrasePattern",
      displayLabel: rec.displayLabel,
      publicationStatus: phrase.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("PhrasePattern", phrase.id),
      fields,
    });
  }

  for (const qa of bundle.qaPairs) {
    const rec = byId.get(qa.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("intent", qa.intent));
    if (qa.intent.startsWith("qa:")) {
      addField(fields, field("intent", qa.intent.slice(3)));
    }
    addField(fields, field("label", rec.displayLabel));
    addField(fields, field("category", qa.register));
    const question = bundle.phrasePatterns.find((p) => p.id === qa.questionPatternId);
    if (question) {
      addField(fields, structuredFields("realization", question.fixedTokens));
    }
    emitSearchDoc({
      id: qa.id,
      kind: "QAPair",
      displayLabel: rec.displayLabel,
      publicationStatus: qa.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("QAPair", qa.id),
      fields,
    });
  }

  for (const dialogue of bundle.dialogues) {
    const rec = byId.get(dialogue.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("title", dialogue.titleEn));
    addField(fields, field("label", rec.displayLabel));
    emitSearchDoc({
      id: dialogue.id,
      kind: "Dialogue",
      displayLabel: rec.displayLabel,
      publicationStatus: dialogue.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("Dialogue", dialogue.id),
      fields,
    });
  }

  for (const listen of bundle.listeningAssets) {
    const rec = byId.get(listen.id)!;
    const fields: SearchDocumentField[] = [];
    if (listen.exerciseRef) addField(fields, field("label", listen.exerciseRef));
    addField(fields, field("label", listen.id));
    for (const seg of listen.transcriptSegments) {
      addField(fields, structuredFields("realization", seg.textDe));
    }
    emitSearchDoc({
      id: listen.id,
      kind: "ListeningAsset",
      displayLabel: rec.displayLabel,
      publicationStatus: listen.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("ListeningAsset", listen.id),
      fields,
    });
  }

  for (const collection of bundle.collections) {
    const rec = byId.get(collection.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("title", collection.titleEn));
    if (collection.titleDe) addField(fields, field("title", collection.titleDe));
    addField(fields, field("label", rec.displayLabel));
    emitSearchDoc({
      id: collection.id,
      kind: "Collection",
      displayLabel: rec.displayLabel,
      publicationStatus: collection.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("Collection", collection.id),
      fields,
    });
  }

  for (const lesson of bundle.lessons) {
    const rec = byId.get(lesson.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, field("title", lesson.titleDe));
    addField(fields, field("title", lesson.titleEn));
    addField(fields, field("label", rec.displayLabel));
    emitSearchDoc({
      id: lesson.id,
      kind: "Lesson",
      displayLabel: rec.displayLabel,
      publicationStatus: lesson.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("Lesson", lesson.id),
      fields,
    });
  }

  for (const activity of bundle.learningActivities) {
    const rec = byId.get(activity.id)!;
    const fields: SearchDocumentField[] = [];
    addField(fields, structuredFields("label", activity.prompt.instruction));
    if (activity.prompt.stem) {
      addField(fields, structuredFields("label", activity.prompt.stem));
    }
    addField(fields, field("label", rec.displayLabel));
    addField(fields, field("category", activity.mode));
    emitSearchDoc({
      id: activity.id,
      kind: "LearningActivity",
      displayLabel: rec.displayLabel,
      publicationStatus: activity.publication.status,
      sourcePriority: rec.sourcePriority,
      lessonIds: rec.lessonIds,
      category: rec.category,
      hubDestination: hubDestinationFor("LearningActivity", activity.id),
      fields,
    });
  }

  searchDocuments.sort((a, b) => a.id.localeCompare(b.id));

  const byKindFrozen = new Map<IndexedEntityKind, readonly string[]>();
  for (const [k, v] of byKindLists) byKindFrozen.set(k, freezeArray(v));

  const fullById = immutableMap(byId);
  const fullByKind = immutableMap(byKindFrozen);
  const fullLessonMembership = immutableMap(
    new Map([...lessonMembership].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullEntityLessons = immutableMap(
    new Map([...entityLessons].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullSourcePriorityById = immutableMap(sourcePriorityById);
  const fullPublicationStatusById = immutableMap(publicationStatusById);
  const fullMediaByEntityId = immutableMap(
    new Map([...mediaByEntityId].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullEntitiesByMediaId = immutableMap(
    new Map([...entitiesByMediaId].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullExamplesByEntityId = immutableMap(
    new Map([...examplesByEntityId].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullEntitiesByExampleId = immutableMap(
    new Map([...entitiesByExampleId].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullCollectionMembers = immutableMap(
    new Map([...collectionMembers].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullEntityCollections = immutableMap(
    new Map([...entityCollections].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullActivitiesByLesson = immutableMap(
    new Map([...activitiesByLesson].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullActivitiesByConcept = immutableMap(
    new Map([...activitiesByConcept].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullTagsByEntityId = immutableMap(
    new Map([...tagsByEntityId].map(([k, v]) => [k, freezeArray(v)])),
  );
  const fullReviewable = immutableSet(reviewableConceptIds);
  const fullAuthorReviewable = immutableSet(authorReviewableConceptIds);
  const fullSearchDocuments = freezeArray(searchDocuments);
  const fullSearchDocumentsById = immutableMap(searchDocumentsById);

  const learnerVisible = (id: string): boolean => {
    const rec = fullById.get(id);
    return rec != null && isPublishedRecord(rec);
  };
  const authorVisible = (id: string): boolean => {
    const rec = fullById.get(id);
    return rec != null && isAuthorVisibleRecord(rec);
  };
  const learnerVisibleLesson = (id: string): boolean => {
    const rec = fullById.get(id);
    return rec != null && rec.kind === "Lesson" && isPublishedRecord(rec);
  };
  const authorVisibleLesson = (id: string): boolean => {
    const rec = fullById.get(id);
    return rec != null && rec.kind === "Lesson" && isAuthorVisibleRecord(rec);
  };

  const learnerRelationships = projectRelationshipAdjacency(
    relationships,
    learnerVisible,
    learnerVisibleLesson,
  );
  const authorRelationships = projectRelationshipAdjacency(
    relationships,
    authorVisible,
    authorVisibleLesson,
  );

  // Learner facade: published-only projections (no raw review/draft/blocked bypass).
  const learnerByIdRaw = new Map<string, IndexedEntityRecord>();
  for (const [id, rec] of byId) {
    if (isPublishedRecord(rec)) learnerByIdRaw.set(id, rec);
  }
  const learnerByIdMap = new Map<string, IndexedEntityRecord>();
  for (const [id, rec] of learnerByIdRaw) {
    const tags = projectEntityTags(rec.tags, learnerRelationships, id);
    learnerByIdMap.set(
      id,
      projectEntityRecordLinks(rec, learnerVisible, tags),
    );
  }
  const learnerById = immutableMap(learnerByIdMap);
  const learnerByKind = new Map<IndexedEntityKind, readonly string[]>();
  for (const [kind, ids] of byKindFrozen) {
    learnerByKind.set(
      kind,
      freezeArray(ids.filter((id) => learnerById.has(id))),
    );
  }
  const filterEntityKeyedBoth = (
    source: ReadonlyMap<string, readonly string[]>,
  ): ReadonlyMap<string, readonly string[]> => {
    const next = new Map<string, readonly string[]>();
    for (const [key, ids] of source) {
      if (!learnerById.has(key)) continue;
      const filtered = ids.filter((id) => learnerById.has(id));
      if (filtered.length === 0) continue;
      next.set(key, freezeArray(filtered));
    }
    return immutableMap(next);
  };
  const filterReverseKeyed = (
    source: ReadonlyMap<string, readonly string[]>,
  ): ReadonlyMap<string, readonly string[]> => {
    const next = new Map<string, readonly string[]>();
    for (const [key, ids] of source) {
      if (!learnerById.has(key)) continue;
      const filtered = ids.filter((id) => learnerById.has(id));
      if (filtered.length === 0) continue;
      next.set(key, freezeArray(filtered));
    }
    return immutableMap(next);
  };
  const isVisibleLearnerLesson = (id: string): boolean => {
    const rec = learnerById.get(id);
    return rec != null && rec.kind === "Lesson";
  };
  const learnerLessonMembership = filterLessonKeyedMembership(
    fullLessonMembership,
    isVisibleLearnerLesson,
    learnerVisible,
  );
  const learnerEntityLessons = filterEntityLessons(
    fullEntityLessons,
    learnerVisible,
    isVisibleLearnerLesson,
  );
  const learnerPublication = new Map<string, PublicationStatus>();
  const learnerPriority = new Map<string, SourcePriority>();
  for (const [id, rec] of learnerById) {
    if (rec.publicationStatus != null) {
      learnerPublication.set(id, rec.publicationStatus);
    }
    if (rec.sourcePriority != null) learnerPriority.set(id, rec.sourcePriority);
  }
  const learnerSearchDocs = freezeArray(
    fullSearchDocuments
      .filter((d) => d.publicationStatus === "published")
      .map((d) => projectSearchDocumentLessons(d, isVisibleLearnerLesson)),
  );
  const learnerSearchById = new Map<string, SearchDocument>();
  for (const d of learnerSearchDocs) learnerSearchById.set(d.id, d);

  const learnerMediaByEntityId = filterEntityKeyedBoth(fullMediaByEntityId);
  const learnerEntitiesByMediaId = filterReverseKeyed(fullEntitiesByMediaId);
  const learnerExamplesByEntityId = filterEntityKeyedBoth(fullExamplesByEntityId);
  const learnerEntitiesByExampleId = filterReverseKeyed(fullEntitiesByExampleId);
  const learnerCollectionMembers = filterEntityKeyedBoth(fullCollectionMembers);
  const learnerEntityCollections = filterEntityKeyedBoth(fullEntityCollections);
  const learnerActivitiesByLesson = filterLessonKeyedMembership(
    fullActivitiesByLesson,
    isVisibleLearnerLesson,
    learnerVisible,
  );
  const learnerActivitiesByConcept = filterEntityKeyedBoth(
    fullActivitiesByConcept,
  );
  const learnerTagsByEntityId = (() => {
    const next = new Map<string, readonly string[]>();
    for (const [id, rec] of learnerById) {
      if (rec.tags.length > 0) next.set(id, rec.tags);
    }
    return immutableMap(next);
  })();

  const learnerEntitiesByKind: Partial<Record<IndexedEntityKind, number>> = {};
  for (const [kind, ids] of learnerByKind) {
    learnerEntitiesByKind[kind] = ids.length;
  }
  const learnerStatusCounts: Partial<Record<PublicationStatus, number>> = {};
  for (const status of learnerPublication.values()) {
    learnerStatusCounts[status] = (learnerStatusCounts[status] ?? 0) + 1;
  }
  const learnerLessonMembershipCounts: Record<string, number> = {};
  for (const [lid, ids] of learnerLessonMembership) {
    learnerLessonMembershipCounts[lid] = ids.length;
  }
  let learnerActivityCount = 0;
  for (const rec of learnerById.values()) {
    if (rec.kind === "LearningActivity") learnerActivityCount += 1;
  }

  const learnerCounts: LearnerIndexCounts = Object.freeze({
    entitiesByKind: Object.freeze({ ...learnerEntitiesByKind }),
    entitiesByPublicationStatus: Object.freeze({ ...learnerStatusCounts }),
    lessonMembershipCounts: Object.freeze({ ...learnerLessonMembershipCounts }),
    relationshipEdgeCount: countRelationshipEdges(learnerRelationships),
    collectionMembershipCount: countIdListValues(learnerCollectionMembers),
    mediaLinkCount: countIdListValues(learnerMediaByEntityId),
    exampleLinkCount: countIdListValues(learnerExamplesByEntityId),
    activityCount: learnerActivityCount,
    reviewableConceptCount: fullReviewable.size,
    searchableDocumentCount: learnerSearchDocs.length,
  });

  // Author counts from author-visible projections (never blocked).
  const authorEntitiesByKind: Partial<Record<IndexedEntityKind, number>> = {};
  const authorStatusCounts: Partial<Record<PublicationStatus, number>> = {};
  let authorActivityCount = 0;
  for (const rec of fullById.values()) {
    if (!isAuthorVisibleRecord(rec)) continue;
    authorEntitiesByKind[rec.kind] = (authorEntitiesByKind[rec.kind] ?? 0) + 1;
    if (rec.publicationStatus != null) {
      authorStatusCounts[rec.publicationStatus] =
        (authorStatusCounts[rec.publicationStatus] ?? 0) + 1;
    }
    if (rec.kind === "LearningActivity") authorActivityCount += 1;
  }
  const authorLessonMembershipCounts: Record<string, number> = {};
  for (const [lid, ids] of fullLessonMembership) {
    if (!authorVisible(lid)) continue;
    const lessonRec = fullById.get(lid);
    if (lessonRec?.kind !== "Lesson") continue;
    authorLessonMembershipCounts[lid] = ids.filter(authorVisible).length;
  }
  let authorCollectionMembershipCount = 0;
  for (const [collId, ids] of fullCollectionMembers) {
    if (!authorVisible(collId)) continue;
    authorCollectionMembershipCount += ids.filter(authorVisible).length;
  }
  let authorMediaLinkCount = 0;
  for (const [entId, ids] of fullMediaByEntityId) {
    if (!authorVisible(entId)) continue;
    authorMediaLinkCount += ids.filter(authorVisible).length;
  }
  let authorExampleLinkCount = 0;
  for (const [entId, ids] of fullExamplesByEntityId) {
    if (!authorVisible(entId)) continue;
    authorExampleLinkCount += ids.filter(authorVisible).length;
  }
  const publishedSearchableCount = fullSearchDocuments.filter(
    (d) => d.publicationStatus === "published",
  ).length;
  const reviewSearchableCount = fullSearchDocuments.filter(
    (d) => d.publicationStatus === "review" || d.publicationStatus === "draft",
  ).length;
  const authorSearchableDocumentCount = fullSearchDocuments.filter((d) =>
    authorVisible(d.id),
  ).length;

  const authorCounts: AuthorIndexCounts = Object.freeze({
    entitiesByKind: Object.freeze({ ...authorEntitiesByKind }),
    entitiesByPublicationStatus: Object.freeze({ ...authorStatusCounts }),
    lessonMembershipCounts: Object.freeze({ ...authorLessonMembershipCounts }),
    relationshipEdgeCount: countRelationshipEdges(authorRelationships),
    collectionMembershipCount: authorCollectionMembershipCount,
    mediaLinkCount: authorMediaLinkCount,
    exampleLinkCount: authorExampleLinkCount,
    activityCount: authorActivityCount,
    reviewableConceptCount: fullReviewable.size,
    authorReviewableConceptCount: fullAuthorReviewable.size,
    searchableDocumentCount: authorSearchableDocumentCount,
    publishedSearchableCount,
    reviewSearchableCount,
  });

  const internalState: IndexInternalState = {
    byId: fullById,
    byKind: fullByKind,
    lessonMembership: fullLessonMembership,
    entityLessons: fullEntityLessons,
    relationships,
    learnerRelationships,
    authorRelationships,
    sourcePriorityById: fullSourcePriorityById,
    publicationStatusById: fullPublicationStatusById,
    mediaByEntityId: fullMediaByEntityId,
    entitiesByMediaId: fullEntitiesByMediaId,
    examplesByEntityId: fullExamplesByEntityId,
    entitiesByExampleId: fullEntitiesByExampleId,
    collectionMembers: fullCollectionMembers,
    entityCollections: fullEntityCollections,
    activitiesByLesson: fullActivitiesByLesson,
    activitiesByConcept: fullActivitiesByConcept,
    tagsByEntityId: fullTagsByEntityId,
    reviewableConceptIds: fullReviewable,
    authorReviewableConceptIds: fullAuthorReviewable,
    searchDocuments: fullSearchDocuments,
    searchDocumentsById: fullSearchDocumentsById,
    learnerCounts,
    authorCounts,
  };

  const indexes: ContentIndexes = {
    byId: learnerById,
    byKind: immutableMap(learnerByKind),
    lessonMembership: learnerLessonMembership,
    entityLessons: learnerEntityLessons,
    relationships: learnerRelationships,
    sourcePriorityById: immutableMap(learnerPriority),
    publicationStatusById: immutableMap(learnerPublication),
    mediaByEntityId: learnerMediaByEntityId,
    entitiesByMediaId: learnerEntitiesByMediaId,
    examplesByEntityId: learnerExamplesByEntityId,
    entitiesByExampleId: learnerEntitiesByExampleId,
    collectionMembers: learnerCollectionMembers,
    entityCollections: learnerEntityCollections,
    activitiesByLesson: learnerActivitiesByLesson,
    activitiesByConcept: learnerActivitiesByConcept,
    tagsByEntityId: learnerTagsByEntityId,
    reviewableConceptIds: fullReviewable,
    searchDocuments: learnerSearchDocs,
    searchDocumentsById: immutableMap(learnerSearchById),
    counts: learnerCounts,
  };

  const frozen = Object.freeze(indexes);
  attachIndexInternal(frozen, internalState);
  return frozen;
}

export function getIndexedEntity(
  indexes: ContentIndexes,
  id: string,
  options: { audience?: "learner" | "review" } = {},
): IndexedEntityRecord | undefined {
  return getProjectedEntityRecord(indexes, id, options);
}

export function assertSearchableKind(kind: string): asserts kind is SearchableKind {
  if (!isSearchableKind(kind)) {
    throw new Error(`Not a searchable kind: ${kind}`);
  }
}
