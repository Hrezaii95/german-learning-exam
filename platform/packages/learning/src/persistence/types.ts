/**
 * Versioned learner-state envelope types (C2D / C2DR1 / C2DR2).
 * Derived mastery is never authority — raw events are replayed after load/import.
 */

import type { LearnerEvent } from "../mastery/types.js";
import {
  LEARNER_EVENT_SCHEMA_VERSION,
  MASTERY_REDUCER_VERSION,
} from "../mastery/types.js";
import type { ReviewCardState } from "../review/types.js";
import {
  REVIEW_SCHEDULER_VERSION,
} from "../review/types.js";

/** Current learner-state envelope identity. Unknown/future versions fail closed. */
export const LEARNER_STATE_SCHEMA_VERSION = "1.1.0" as const;
export type LearnerStateSchemaVersion = typeof LEARNER_STATE_SCHEMA_VERSION;

/** Expected content-bundle schema pin for Alpha (injected resolver still required). */
export const EXPECTED_CONTENT_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;

export const LEARNER_BUILT_IN_TAGS = [
  "Favorite",
  "Difficult",
  "Confusing",
  "Exam",
  "Teacher",
] as const;

export type LearnerBuiltInTag = (typeof LEARNER_BUILT_IN_TAGS)[number];

export type ContentBundleIdentity = {
  readonly schemaVersion: string;
  readonly bundleId: string;
};

/**
 * Local learner preferences. Closed allowlist — no XP/streak fields.
 */
export type LearnerSettings = {
  readonly preferredAudioSpeed: number;
  readonly timezone: string;
};

/**
 * Resume pointer only — does not mark skipped work complete.
 * Requires published Lesson + LearningActivity with relational stage ownership.
 */
export type ResumeState = {
  readonly lessonId: string;
  readonly activityId: string;
  readonly stageId: string;
  /** Non-negative integer progress index within the activity/stage. */
  readonly position: number;
};

export type ActivityProgressStatus = "inProgress" | "completed";

/** Explicit journey progress. It is navigation state, never mastery evidence. */
export type ActivityProgressRecord = {
  readonly lessonId: string;
  readonly stageId: string;
  readonly activityId: string;
  readonly progressState: ActivityProgressStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
};

export type LearnerTagRecord = {
  readonly contentId: string;
  readonly tag: LearnerBuiltInTag;
};

export type LearnerNoteRecord = {
  readonly noteId: string;
  readonly contentId: string;
  readonly text: string;
  readonly updatedAt: string;
};

/**
 * Local/private recording metadata. Raw audio bytes are never part of JSON export.
 * pronunciationAccuracy is always null (ADR-006 / Alpha unscored).
 */
export type RecordingMetadata = {
  readonly recordingId: string;
  readonly conceptId: string;
  readonly activityId?: string;
  readonly createdAt: string;
  readonly mimeType: string;
  /** Declared local blob size; bytes themselves are not stored in the envelope. */
  readonly byteLength: number;
  readonly gestureProduced: true;
  readonly pronunciationAccuracy: null;
};

export type LearnerExportMetadata = {
  readonly exportedAt: string;
  /** JSON export excludes raw audio bytes by default. */
  readonly includesRawAudioBytes: false;
  readonly schemaVersion: LearnerStateSchemaVersion;
};

/**
 * Strict current LearnerStateEnvelope.
 * Do not persist derived mastery snapshots as authority.
 */
export type LearnerStateEnvelope = {
  readonly schemaVersion: LearnerStateSchemaVersion;
  readonly masteryReducerVersion: typeof MASTERY_REDUCER_VERSION;
  readonly reviewSchedulerVersion: typeof REVIEW_SCHEDULER_VERSION;
  readonly learnerEventSchemaVersion: typeof LEARNER_EVENT_SCHEMA_VERSION;
  readonly contentBundle: ContentBundleIdentity;
  readonly settings: LearnerSettings;
  readonly resume: ResumeState | null;
  readonly activityProgress: readonly ActivityProgressRecord[];
  readonly tags: readonly LearnerTagRecord[];
  readonly notes: readonly LearnerNoteRecord[];
  readonly events: readonly LearnerEvent[];
  readonly reviewCards: readonly ReviewCardState[];
  readonly recordings: readonly RecordingMetadata[];
  readonly exportMeta?: LearnerExportMetadata;
};

/**
 * Explicit published-content entity kinds for relational validation.
 * Resolvers must prove kind explicitly — never infer from id prefixes.
 */
export type PublishedContentEntityKind =
  | "Lesson"
  | "LearningActivity"
  | "Concept"
  | "Template";

/**
 * Typed/relational published-content contract.
 * Boolean publication alone is insufficient for resume ownership.
 */
export type PublishedContentResolver = {
  /** True only for published content IDs; review/draft/blocked/unknown → false. */
  isPublished(id: string): boolean;
  /**
   * Explicit entity kind for a published id.
   * Returns null when unknown/unpublished. Never infer from prefixes.
   */
  entityKind(id: string): PublishedContentEntityKind | null;
  /** True iff stageId is a known stage belonging to the given published lesson. */
  lessonOwnsStage(lessonId: string, stageId: string): boolean;
  /**
   * True iff activityId belongs to stageId under lessonId
   * (lesson→stage→activity ownership).
   */
  stageOwnsActivity(
    lessonId: string,
    stageId: string,
    activityId: string,
  ): boolean;
};

/** Alias retained for call-site continuity; same relational contract. */
export type PublishedIdResolver = PublishedContentResolver;

export type LearnerStateHydration = {
  readonly state: LearnerStateEnvelope;
  readonly masteryByConcept: ReadonlyMap<
    string,
    import("../mastery/types.js").ConceptMasterySnapshot
  >;
  /** Cards with due <= now (ISO compare via Date). */
  readonly dueCards: readonly ReviewCardState[];
};

export type CreateEmptyLearnerStateInput = {
  readonly contentBundle: ContentBundleIdentity;
  readonly settings?: LearnerSettings;
};

export const DEFAULT_LEARNER_SETTINGS: LearnerSettings = Object.freeze({
  preferredAudioSpeed: 1,
  timezone: "UTC",
});
