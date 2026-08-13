import type {
  PublishedContentEntityKind,
  PublishedContentResolver,
  ReviewModality,
} from "@german-learning/learning";
import hubProjectionJson from "../../generated/learner-hubs.json";
import learnerProjectionJson from "../../generated/learner-projection.json";
import searchProjectionJson from "../../generated/learner-search.json";

export const ALPHA_CONTENT_BUNDLE = Object.freeze({
  schemaVersion: "1.0.0",
  bundleId: "alpha-lessons-01-02",
} as const);

export const REVIEW_TEMPLATE_IDS = Object.freeze([
  "template:architekt-flashcard-recall",
  "template:architekt-picture-recognition",
  "template:architekt-article-recognition",
  "template:architekt-person-form",
  "template:sein-present-form",
  "template:profession-qa-word-order",
  "template:profession-qa-production",
] as const);

export type ReviewTemplateId = (typeof REVIEW_TEMPLATE_IDS)[number];

export const REVIEW_GAME_IDS = Object.freeze([
  "flashcards",
  "picture-word-match",
  "article-choice",
  "morphology-puzzle",
  "verb-builder",
  "word-order",
] as const);

export type ReviewGameId = (typeof REVIEW_GAME_IDS)[number];

export type ReviewRendererId = ReviewGameId | "qa-production";

export type ReviewTemplateRecord = Readonly<{
  id: ReviewTemplateId;
  conceptId: string;
  modality: ReviewModality;
  rendererId: ReviewRendererId;
  gameId: ReviewGameId | null;
  lessonId: "lesson:02";
  activityId: string;
}>;

const rawTemplates: readonly ReviewTemplateRecord[] = [
  {
    id: "template:architekt-flashcard-recall",
    conceptId: "lex:architekt",
    modality: "recall",
    rendererId: "flashcards",
    gameId: "flashcards",
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-core-professions",
  },
  {
    id: "template:architekt-picture-recognition",
    conceptId: "lex:architekt",
    modality: "recognition",
    rendererId: "picture-word-match",
    gameId: "picture-word-match",
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-core-professions",
  },
  {
    id: "template:architekt-article-recognition",
    conceptId: "lex:architekt",
    modality: "recognition",
    rendererId: "article-choice",
    gameId: "article-choice",
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-core-professions",
  },
  {
    id: "template:architekt-person-form",
    conceptId: "lex:architekt",
    modality: "form",
    rendererId: "morphology-puzzle",
    gameId: "morphology-puzzle",
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-person-form-morphology",
  },
  {
    id: "template:sein-present-form",
    conceptId: "verb:sein",
    modality: "form",
    rendererId: "verb-builder",
    gameId: "verb-builder",
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-sein-arbeiten-contrast",
  },
  {
    id: "template:profession-qa-word-order",
    conceptId: "qa:profession-casual-main",
    modality: "form",
    rendererId: "word-order",
    gameId: "word-order",
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-profession-qa-builder",
  },
  {
    id: "template:profession-qa-production",
    conceptId: "qa:profession-casual-main",
    modality: "production",
    rendererId: "qa-production",
    gameId: null,
    lessonId: "lesson:02",
    activityId: "activity:lesson-02-profession-qa-builder",
  },
];

const CONCEPT_KINDS = new Set([
  "Lexeme",
  "Verb",
  "GrammarConcept",
  "PhrasePattern",
  "QAPair",
  "Dialogue",
]);

type ProjectionLesson = {
  id: string;
  stages: readonly { id: string; activityIds: readonly string[] }[];
};

type ProjectionActivity = { id: string; lessonId: string; stageId: string };
type ProjectionOwnership = { activityId: string; lessonId: string; stageId: string };

type ProjectionHubItem = {
  id: string;
  kind: string;
  publicationStatus: string;
  lessonIds: readonly string[];
  sourcePriority: number | null;
  displayLabel: string;
};

type ProjectionSearchDocument = {
  id: string;
  kind: string;
  publicationStatus: string;
  displayLabel: string;
  fields: readonly { field: string; displayText: string }[];
};

const learnerProjection = learnerProjectionJson as unknown as {
  schemaVersion: string;
  projectionKind: string;
  lessonCount: number;
  activityCount: number;
  lessons: readonly ProjectionLesson[];
  activities: readonly ProjectionActivity[];
  ownershipByActivityId: Readonly<Record<string, ProjectionOwnership>>;
};

const hubProjection = hubProjectionJson as unknown as {
  schemaVersion: string;
  projectionKind: string;
  hubs: readonly { items: readonly ProjectionHubItem[] }[];
};

const searchProjection = searchProjectionJson as unknown as {
  schemaVersion: string;
  projectionKind: string;
  documentsById: Readonly<Record<string, ProjectionSearchDocument>>;
};

function failRegistry(): never {
  throw new Error("Learner-state publication registry is invalid");
}

function freezeRecord<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

function exactSet(actual: ReadonlySet<string>, expected: readonly string[]): boolean {
  if (actual.size !== expected.length) return false;
  return expected.every((id) => actual.has(id));
}

const templateIds = new Set<string>();
const gameIds = new Set<string>();
const templates = rawTemplates.map((template) => {
  if (templateIds.has(template.id)) failRegistry();
  templateIds.add(template.id);
  if (template.gameId !== null) {
    if (gameIds.has(template.gameId)) failRegistry();
    gameIds.add(template.gameId);
  }
  return freezeRecord(template);
});

if (
  !exactSet(templateIds, REVIEW_TEMPLATE_IDS) ||
  !exactSet(gameIds, REVIEW_GAME_IDS)
) {
  failRegistry();
}

export const REVIEW_TEMPLATES = Object.freeze(templates);
export const REVIEW_TEMPLATES_BY_ID: Readonly<Record<ReviewTemplateId, ReviewTemplateRecord>> =
  Object.freeze(
    Object.fromEntries(REVIEW_TEMPLATES.map((row) => [row.id, row])) as Record<
      ReviewTemplateId,
      ReviewTemplateRecord
    >,
  );
export const REVIEW_TEMPLATES_BY_GAME: Readonly<Record<ReviewGameId, ReviewTemplateRecord>> =
  Object.freeze(
    Object.fromEntries(
      REVIEW_TEMPLATES.filter(
        (row): row is ReviewTemplateRecord & { gameId: ReviewGameId } => row.gameId !== null,
      ).map((row) => [row.gameId, row]),
    ) as Record<
      ReviewGameId,
      ReviewTemplateRecord
    >,
  );

const entityKinds = new Map<string, PublishedContentEntityKind>();
const lessonStageIds = new Map<string, ReadonlySet<string>>();
const activityOwnership = new Map<
  string,
  Readonly<{ lessonId: string; stageId: string }>
>();
const conceptMetadata = new Map<
  string,
  Readonly<{
    displayLabel: string;
    lessonIds: readonly string[];
    sourcePriority: number;
  }>
>();

function addEntity(id: string, kind: PublishedContentEntityKind): void {
  if (typeof id !== "string" || id.length === 0 || entityKinds.has(id)) failRegistry();
  entityKinds.set(id, kind);
}

if (
  learnerProjection.schemaVersion !== "1.0.0" ||
  learnerProjection.projectionKind !== "learner-web" ||
  learnerProjection.lessonCount !== learnerProjection.lessons.length ||
  learnerProjection.activityCount !== learnerProjection.activities.length ||
  hubProjection.schemaVersion !== "1.0.0" ||
  hubProjection.projectionKind !== "learner-hubs" ||
  searchProjection.schemaVersion !== "1.0.0" ||
  searchProjection.projectionKind !== "learner-search"
) {
  failRegistry();
}

for (const lesson of learnerProjection.lessons) {
  addEntity(lesson.id, "Lesson");
  const stages = new Set<string>();
  for (const stage of lesson.stages) {
    if (stages.has(stage.id)) failRegistry();
    stages.add(stage.id);
  }
  lessonStageIds.set(lesson.id, stages);
}

for (const activity of learnerProjection.activities) {
  addEntity(activity.id, "LearningActivity");
  const ownership = learnerProjection.ownershipByActivityId[activity.id];
  if (
    ownership === undefined ||
    ownership.activityId !== activity.id ||
    ownership.lessonId !== activity.lessonId ||
    ownership.stageId !== activity.stageId ||
    !lessonStageIds.get(activity.lessonId)?.has(activity.stageId)
  ) {
    failRegistry();
  }
  const lesson = learnerProjection.lessons.find((row) => row.id === activity.lessonId);
  const stage = lesson?.stages.find((row) => row.id === activity.stageId);
  if (!stage?.activityIds.includes(activity.id)) failRegistry();
  activityOwnership.set(
    activity.id,
    freezeRecord({ lessonId: activity.lessonId, stageId: activity.stageId }),
  );
}

const ownershipKeys = Object.keys(learnerProjection.ownershipByActivityId);
if (!exactSet(new Set(ownershipKeys), learnerProjection.activities.map((row) => row.id))) {
  failRegistry();
}

for (const item of hubProjection.hubs.flatMap((hub) => hub.items)) {
  if (!CONCEPT_KINDS.has(item.kind)) continue;
  if (item.publicationStatus !== "published") failRegistry();
  addEntity(item.id, "Concept");
  const search = searchProjection.documentsById[item.id];
  if (
    search === undefined ||
    search.kind !== item.kind ||
    search.publicationStatus !== "published"
  ) {
    failRegistry();
  }
  const fallbackLabel = search.fields.find((field) => field.field === "realization")?.displayText;
  const displayLabel =
    search.displayLabel !== item.id ? search.displayLabel : fallbackLabel;
  if (displayLabel === undefined || displayLabel.length === 0) failRegistry();
  conceptMetadata.set(
    item.id,
    Object.freeze({
      displayLabel,
      lessonIds: Object.freeze([...item.lessonIds]),
      sourcePriority: item.sourcePriority ?? 4,
    }),
  );
}

for (const template of REVIEW_TEMPLATES) {
  addEntity(template.id, "Template");
  if (
    entityKinds.get(template.conceptId) !== "Concept" ||
    entityKinds.get(template.lessonId) !== "Lesson" ||
    entityKinds.get(template.activityId) !== "LearningActivity" ||
    activityOwnership.get(template.activityId)?.lessonId !== template.lessonId
  ) {
    failRegistry();
  }
}

const EXPECTED_ENTITY_IDS = Object.freeze([
  ...learnerProjection.lessons.map((row) => row.id),
  ...learnerProjection.activities.map((row) => row.id),
  ...conceptMetadata.keys(),
  ...REVIEW_TEMPLATE_IDS,
].sort());

/** Runtime no-missing/no-extra assertion for the complete learner-state registry. */
export function assertExactLearnerStateRegistry(): void {
  if (!exactSet(new Set(entityKinds.keys()), EXPECTED_ENTITY_IDS)) failRegistry();
  if (!exactSet(new Set(Object.keys(REVIEW_TEMPLATES_BY_ID)), REVIEW_TEMPLATE_IDS)) {
    failRegistry();
  }
  if (!exactSet(new Set(Object.keys(REVIEW_TEMPLATES_BY_GAME)), REVIEW_GAME_IDS)) {
    failRegistry();
  }
}

assertExactLearnerStateRegistry();

export const learnerPublishedContentResolver: PublishedContentResolver = Object.freeze({
  isPublished(id: string): boolean {
    return entityKinds.has(id);
  },
  entityKind(id: string): PublishedContentEntityKind | null {
    return entityKinds.get(id) ?? null;
  },
  lessonOwnsStage(lessonId: string, stageId: string): boolean {
    return lessonStageIds.get(lessonId)?.has(stageId) === true;
  },
  stageOwnsActivity(lessonId: string, stageId: string, activityId: string): boolean {
    const ownership = activityOwnership.get(activityId);
    return ownership?.lessonId === lessonId && ownership.stageId === stageId;
  },
});

export function reviewTemplateForId(id: string): ReviewTemplateRecord | null {
  return REVIEW_TEMPLATES_BY_ID[id as ReviewTemplateId] ?? null;
}

export function reviewTemplateForGame(id: string): ReviewTemplateRecord | null {
  return REVIEW_TEMPLATES_BY_GAME[id as ReviewGameId] ?? null;
}

export function reviewTemplatesForConcept(
  conceptId: string,
): readonly ReviewTemplateRecord[] {
  return Object.freeze(REVIEW_TEMPLATES.filter((row) => row.conceptId === conceptId));
}

export function conceptReviewMetadata(conceptId: string): Readonly<{
  displayLabel: string;
  lessonIds: readonly string[];
  sourcePriority: number;
}> | null {
  return conceptMetadata.get(conceptId) ?? null;
}

export function stableCardIdForTemplate(templateId: ReviewTemplateId): string {
  if (reviewTemplateForId(templateId) === null) failRegistry();
  return `card:${templateId.slice("template:".length)}`;
}

export function learnerStateRegistrySnapshot(): Readonly<{
  lessonIds: readonly string[];
  activityIds: readonly string[];
  conceptIds: readonly string[];
  templateIds: readonly string[];
  allEntityIds: readonly string[];
}> {
  return Object.freeze({
    lessonIds: Object.freeze(
      [...entityKinds.entries()].filter(([, kind]) => kind === "Lesson").map(([id]) => id).sort(),
    ),
    activityIds: Object.freeze(
      [...entityKinds.entries()]
        .filter(([, kind]) => kind === "LearningActivity")
        .map(([id]) => id)
        .sort(),
    ),
    conceptIds: Object.freeze(
      [...entityKinds.entries()].filter(([, kind]) => kind === "Concept").map(([id]) => id).sort(),
    ),
    templateIds: Object.freeze([...REVIEW_TEMPLATE_IDS].sort()),
    allEntityIds: EXPECTED_ENTITY_IDS,
  });
}
