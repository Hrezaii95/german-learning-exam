import type {
  ContentBundle,
  LearningActivity,
  Lesson,
  StructuredPrompt,
  TextToken,
} from "@german-learning/content";
import { loadAndValidatePublication } from "@german-learning/content";
import {
  EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
  LEARNER_REVIEW_ONLY_ACTIVITY_IDS,
  isLearnerReviewOnlyActivityId,
} from "./learner-publication-policy";
import {
  activityCanonicalPath,
  lessonRouteSegment,
} from "./path-utils";
import type {
  ActivityOwnership,
  LearnerActivity,
  LearnerLesson,
  LearnerPrompt,
  LearnerStage,
  LearnerWebProjection,
} from "./types";

export {
  activityCanonicalPath,
  decodeActivityRouteSegment,
  encodeActivityRouteSegment,
  lessonRouteSegment,
  tryDecodeActivityRouteSegment,
} from "./path-utils";

export {
  EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
  LEARNER_REVIEW_ONLY_ACTIVITY_IDS,
  VALIDATED_PUBLICATION_ACTIVITY_COUNT,
  isLearnerReviewOnlyActivityId,
} from "./learner-publication-policy";

const EXPECTED_LESSON_IDS = ["lesson:01", "lesson:02"] as const;
const EXPECTED_LESSON_COUNT = 2;

export class ContentProjectionError extends Error {
  readonly code = "CONTENT_PROJECTION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "ContentProjectionError";
  }
}

function freezeTokens(tokens: readonly TextToken[]): TextToken[] {
  return tokens.map((token) => Object.freeze({ ...token })) as TextToken[];
}

function projectPrompt(prompt: StructuredPrompt): LearnerPrompt {
  const instruction = Object.freeze({
    tokens: freezeTokens(prompt.instruction.tokens),
  });
  const projected: LearnerPrompt = { instruction };
  if (prompt.stem != null) {
    projected.stem = Object.freeze({
      tokens: freezeTokens(prompt.stem.tokens),
    });
  }
  if (prompt.choices != null) {
    projected.choices = prompt.choices.map((choice) =>
      Object.freeze({
        id: choice.id,
        label: Object.freeze({ tokens: freezeTokens(choice.label.tokens) }),
      }),
    );
  }
  return Object.freeze(projected);
}

function plainTextFromTokens(tokens: readonly TextToken[]): string {
  return tokens
    .map((token) => {
      if (token.type === "gap") return token.label;
      return token.text;
    })
    .join("");
}

function assertPublishedLesson(lesson: Lesson): void {
  if (lesson.publication.status !== "published") {
    throw new ContentProjectionError(
      `Lesson ${lesson.id} is not published (status=${lesson.publication.status})`,
    );
  }
}

function assertPublishedActivity(activity: LearningActivity): void {
  if (activity.publication.status !== "published") {
    throw new ContentProjectionError(
      `Activity ${activity.id} is not published (status=${activity.publication.status})`,
    );
  }
}

/** Keep structural overview even when empty; drop other zero-activity stages. */
function retainLearnerStage(stage: LearnerStage): boolean {
  if (stage.kind === "overview") return true;
  return stage.activityIds.length > 0;
}

function projectLesson(
  lesson: Lesson,
  activitiesById: Map<string, LearningActivity>,
): {
  lesson: LearnerLesson;
  activities: LearnerActivity[];
  ownership: ActivityOwnership[];
} {
  assertPublishedLesson(lesson);
  const routeSegment = lessonRouteSegment(lesson.number);
  const ownership: ActivityOwnership[] = [];
  const projectedActivities: LearnerActivity[] = [];
  const seen = new Set<string>();

  const mappedStages: LearnerStage[] = lesson.stages.map((stage) => {
    const publishedStageActivityIds = stage.activityIds.filter((activityId) =>
      activitiesById.has(activityId),
    );
    for (const activityId of publishedStageActivityIds) {
      if (seen.has(activityId)) {
        throw new ContentProjectionError(
          `Activity ${activityId} is owned by more than one stage`,
        );
      }
      seen.add(activityId);
      const activity = activitiesById.get(activityId);
      if (!activity) {
        throw new ContentProjectionError(
          `Stage ${stage.id} references missing activity ${activityId}`,
        );
      }
      assertPublishedActivity(activity);
      if (activity.lessonId !== lesson.id) {
        throw new ContentProjectionError(
          `Activity ${activity.id} lessonId ${activity.lessonId ?? "missing"} does not match lesson ${lesson.id}`,
        );
      }
      const canonicalPath = activityCanonicalPath(lesson.number, activity.id);
      ownership.push(
        Object.freeze({
          activityId: activity.id,
          lessonId: lesson.id,
          lessonNumber: lesson.number,
          lessonRouteSegment: routeSegment,
          stageId: stage.id,
          canonicalPath,
        }),
      );
      projectedActivities.push(
        Object.freeze({
          id: activity.id,
          lessonId: lesson.id,
          lessonNumber: lesson.number,
          lessonRouteSegment: routeSegment,
          stageId: stage.id,
          stageTitleEn: stage.titleEn,
          mode: activity.mode,
          renderer: activity.renderer,
          prompt: projectPrompt(activity.prompt),
          promptPlainText: plainTextFromTokens(activity.prompt.instruction.tokens),
          skillDimensions: Object.freeze([...activity.skillDimensions]),
          evidence: Object.freeze({
            publicationStatus: "published" as const,
            promptPublished: true as const,
            interactionReady: false as const,
          }),
          canonicalPath,
        }),
      );
    }
    return Object.freeze({
      id: stage.id,
      kind: stage.kind,
      titleEn: stage.titleEn,
      estimatedMinutes: stage.estimatedMinutes,
      skillTargets: Object.freeze([...stage.skillTargets]),
      required: stage.required,
      activityIds: Object.freeze([...publishedStageActivityIds]),
    });
  });

  const stages = mappedStages.filter(retainLearnerStage);
  const estimatedMinutesTotal = stages.reduce(
    (sum, stage) => sum + stage.estimatedMinutes,
    0,
  );

  return {
    lesson: Object.freeze({
      id: lesson.id,
      number: lesson.number,
      routeSegment,
      titleDe: lesson.titleDe,
      titleEn: lesson.titleEn,
      communicativeGoals: Object.freeze([...lesson.communicativeGoals]),
      stages: Object.freeze(stages),
      estimatedMinutesTotal,
      activityCount: projectedActivities.length,
      canonicalPath: `/lessons/${routeSegment}`,
    }),
    activities: projectedActivities,
    ownership,
  };
}

/**
 * Build a deterministic learner-safe web projection from a validated ContentBundle.
 * Fails closed if published lesson/activity ownership or counts are wrong.
 */
export function projectLearnerWebProjection(
  bundle: ContentBundle,
): LearnerWebProjection {
  const publishedLessons = bundle.lessons
    .filter((lesson) => EXPECTED_LESSON_IDS.includes(lesson.id as (typeof EXPECTED_LESSON_IDS)[number]))
    .sort((a, b) => a.number - b.number);

  if (publishedLessons.length !== EXPECTED_LESSON_COUNT) {
    throw new ContentProjectionError(
      `Expected ${EXPECTED_LESSON_COUNT} lessons, found ${publishedLessons.length}`,
    );
  }

  for (const expectedId of EXPECTED_LESSON_IDS) {
    if (!publishedLessons.some((lesson) => lesson.id === expectedId)) {
      throw new ContentProjectionError(`Missing required lesson ${expectedId}`);
    }
  }

  const activitiesById = new Map<string, LearningActivity>();
  for (const activity of bundle.learningActivities) {
    if (activity.publication.status !== "published") continue;
    if (activity.lessonId !== "lesson:01" && activity.lessonId !== "lesson:02") {
      continue;
    }
    if (isLearnerReviewOnlyActivityId(activity.id)) {
      throw new ContentProjectionError(
        `Review-only activity ${activity.id} must not enter learner projection`,
      );
    }
    if (activitiesById.has(activity.id)) {
      throw new ContentProjectionError(`Duplicate activity id ${activity.id}`);
    }
    activitiesById.set(activity.id, activity);
  }

  if (activitiesById.size !== EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT) {
    throw new ContentProjectionError(
      `Expected ${EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT} published lesson activities, found ${activitiesById.size}`,
    );
  }

  for (const reviewOnlyId of LEARNER_REVIEW_ONLY_ACTIVITY_IDS) {
    if (activitiesById.has(reviewOnlyId)) {
      throw new ContentProjectionError(
        `Review-only activity ${reviewOnlyId} must not enter learner projection`,
      );
    }
  }

  const lessons: LearnerLesson[] = [];
  const activities: LearnerActivity[] = [];
  const ownershipByActivityId: Record<string, ActivityOwnership> = {};

  for (const lesson of publishedLessons) {
    const projected = projectLesson(lesson, activitiesById);
    lessons.push(projected.lesson);
    activities.push(...projected.activities);
    for (const entry of projected.ownership) {
      if (ownershipByActivityId[entry.activityId]) {
        throw new ContentProjectionError(
          `Activity ${entry.activityId} owned by more than one lesson`,
        );
      }
      ownershipByActivityId[entry.activityId] = entry;
    }
  }

  if (activities.length !== EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT) {
    throw new ContentProjectionError(
      `Projected activity count ${activities.length} !== ${EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT}`,
    );
  }

  if (
    Object.keys(ownershipByActivityId).length !==
    EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT
  ) {
    throw new ContentProjectionError(`Ownership map size mismatch`);
  }

  // Every published activity must appear in exactly one stage ownership entry.
  for (const activityId of activitiesById.keys()) {
    if (!ownershipByActivityId[activityId]) {
      throw new ContentProjectionError(
        `Published activity ${activityId} is not owned by any stage`,
      );
    }
  }

  const firstLesson = lessons[0];
  if (!firstLesson) {
    throw new ContentProjectionError("Zero-state continuation could not be derived");
  }
  const firstOwnedActivityId = firstLesson.stages
    .flatMap((stage) => stage.activityIds)[0];
  const firstActivity = activities.find(
    (activity) => activity.id === firstOwnedActivityId,
  );
  if (!firstActivity) {
    throw new ContentProjectionError(
      "Zero-state continuation activity missing from projection",
    );
  }

  const projection: LearnerWebProjection = {
    schemaVersion: "1.0.0",
    projectionKind: "learner-web",
    lessonCount: EXPECTED_LESSON_COUNT,
    activityCount: EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
    lessons: Object.freeze(lessons),
    activities: Object.freeze(
      [...activities].sort((a, b) => a.id.localeCompare(b.id)),
    ),
    ownershipByActivityId: Object.freeze(ownershipByActivityId),
    zeroState: Object.freeze({
      continuePath: firstActivity.canonicalPath,
      continueActivityId: firstActivity.id,
      continueLessonId: firstLesson.id,
      continueLessonTitleDe: firstLesson.titleDe,
    }),
  };

  return Object.freeze(projection);
}

export function loadValidatedBundleOrThrow(publishedDir: string): ContentBundle {
  const result = loadAndValidatePublication({ publishedDir });
  if (!result.ok || !result.bundle) {
    const summary = result.issues
      .map((issue) => `${issue.code}@${issue.objectId ?? ""}:${issue.field ?? ""}`)
      .join("; ");
    throw new ContentProjectionError(
      `Publication validation failed: ${summary || "unknown"}`,
    );
  }
  return result.bundle;
}

export function projectPublishedLearnerWeb(
  publishedDir: string,
): LearnerWebProjection {
  const bundle = loadValidatedBundleOrThrow(publishedDir);
  return projectLearnerWebProjection(bundle);
}

/** Stable JSON for generated artifacts (sorted object keys recursively). */
export function serializeProjectionDeterministic(
  projection: LearnerWebProjection,
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
