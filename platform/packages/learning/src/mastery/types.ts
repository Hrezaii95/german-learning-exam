/**
 * Mastery engine types — events, snapshots, policy, selectors.
 * No XP / streak / badge fields (REV-004 boundary).
 */

import type { MasteryDimension } from "./dimensions.js";

export const LEARNER_EVENT_SCHEMA_VERSION = "1.0.0" as const;
export type LearnerEventSchemaVersion = typeof LEARNER_EVENT_SCHEMA_VERSION;

export type AttemptOutcome = "correct" | "partial" | "incorrect";

export type SelfRating = "again" | "hard" | "good" | "easy";

export type ExposureKind = "page" | "card" | "visual";

/**
 * Task family drives anti-luck dimension gating via TASK_FAMILY_DIMENSION.
 * Recognition-only families cannot measure recall/form/production.
 * `flashcard` is reserved exclusively for `selfRatedAttempt` (never objectiveAttempt).
 */
export type TaskFamily =
  | "multipleChoice"
  | "pictureRecognition"
  | "typedRecall"
  | "formManipulation"
  | "listeningTask"
  | "productionTask"
  | "flashcard"
  | "sentenceOrder";

/** Objective/grader task families — excludes flashcard (self-rated practice only). */
export type ObjectiveTaskFamily = Exclude<TaskFamily, "flashcard">;

export type SourceActivityMode =
  | "see"
  | "hear"
  | "notice"
  | "repeat"
  | "recall"
  | "use"
  | "check"
  | "review"
  | "hub"
  | "mission";

export type LearnerEventBase = {
  schemaVersion: LearnerEventSchemaVersion;
  eventId: string;
  sessionId: string;
  timestamp: string;
  conceptId: string;
  activityId?: string;
  cardId?: string;
  sourceActivityMode: SourceActivityMode;
  measuredDimensions: readonly MasteryDimension[];
};

export type ExposureEvent = LearnerEventBase & {
  kind: "exposure";
  exposureKind: ExposureKind;
};

export type ObjectiveAttemptEvent = LearnerEventBase & {
  kind: "objectiveAttempt";
  /** Graded families only — flashcard is rejected at parse (use typedRecall). */
  taskFamily: ObjectiveTaskFamily;
  /** Grader-supplied normalized outcome — never client mastery points. */
  graderOutcome: AttemptOutcome;
  latencyMs: number;
  hintsUsed: number;
  normalizedAnswer?: string;
};

/** Learner-rated flashcard practice only — never strong evidence or checkpoints. */
export type SelfRatedAttemptEvent = LearnerEventBase & {
  kind: "selfRatedAttempt";
  taskFamily: "flashcard";
  rating: SelfRating;
  latencyMs: number;
  hintsUsed: number;
};

export type AudioInteractionEvent =
  | (LearnerEventBase & {
      kind: "audioInteraction";
      hasLinkedTask: false;
      audioSpeed: number;
      latencyMs?: number;
      hintsUsed?: number;
    })
  | (LearnerEventBase & {
      kind: "audioInteraction";
      hasLinkedTask: true;
      audioSpeed: number;
      latencyMs: number;
      hintsUsed: number;
      graderOutcome: AttemptOutcome;
    });

export type RecordingCycleEvent = LearnerEventBase & {
  kind: "recordingCycle";
  listenCompleted: boolean;
  recordCompleted: boolean;
  playbackCompleted: boolean;
  selfCheckCompleted: boolean;
  selfRating?: SelfRating;
  latencyMs?: number;
  hintsUsed?: number;
};

export type LearnerEvent =
  | ExposureEvent
  | ObjectiveAttemptEvent
  | SelfRatedAttemptEvent
  | AudioInteractionEvent
  | RecordingCycleEvent;

export type LearnerEventKind = LearnerEvent["kind"];

export type MasteryStatus =
  | "new"
  | "exploring"
  | "learning"
  | "practising"
  | "strong"
  | "mastered";

export type DimensionEvidence = {
  readonly attempts: number;
  readonly successes: number;
  readonly partials: number;
  readonly failures: number;
  /** Exposure-only updates (page/audio-without-task) — not success evidence. */
  readonly exposureTouches: number;
  readonly strongEvidenceCount: number;
  readonly latestTimestamp: string | null;
  readonly latencySumMs: number;
  readonly latencySamples: number;
  readonly hintsSum: number;
};

/**
 * Per-dimension lapse recovery (C2BR3).
 * Cumulative audit counts stay on DimensionEvidence; this tracks strong evidence
 * earned after the latest incorrect/partial lapse (deterministic timestamp,eventId order).
 * Not a seventh mastery dimension and not a single percentage.
 */
export type DimensionRecoveryEvidence = {
  readonly latestLapseTimestamp: string | null;
  readonly latestLapseEventId: string | null;
  readonly strongEvidenceSinceLapse: number;
  /** True when never lapsed, or strongEvidenceSinceLapse ≥ policy minStrongEvidencePerDimension. */
  readonly recovered: boolean;
};

export type EvidenceRecord = {
  readonly eventId: string;
  readonly timestamp: string;
  readonly dimension: MasteryDimension;
  readonly outcome: AttemptOutcome | "exposure";
  readonly strong: boolean;
  readonly hintsUsed: number;
  readonly latencyMs: number | null;
  readonly taskFamily: TaskFamily | ExposureKind | "audioPlay" | "recording" | null;
};

export type DelayedCheckpoint = {
  readonly eventId: string;
  readonly timestamp: string;
  /** UTC calendar date YYYY-MM-DD (`toISOString()` date semantics). */
  readonly utcDate: string;
  readonly dimension: MasteryDimension;
};

export type StabilityEvidence = {
  readonly kind: "stability";
  readonly delayedCheckpoints: readonly DelayedCheckpoint[];
  readonly distinctUtcDates: number;
  /** Max successive-day gap among sorted unique checkpoint UTC dates. */
  readonly maxGapDays: number;
  readonly readyForMastery: boolean;
};

export type ConceptMasterySnapshot = {
  readonly conceptId: string;
  readonly reducerVersion: string;
  readonly dimensions: Readonly<Record<MasteryDimension, DimensionEvidence>>;
  /** Inspectable per-dimension recovery — same six keys as dimensions, not a seventh slot. */
  readonly dimensionRecovery: Readonly<Record<MasteryDimension, DimensionRecoveryEvidence>>;
  readonly recentEvidence: readonly EvidenceRecord[];
  readonly stability: StabilityEvidence;
  readonly status: MasteryStatus;
  /** Alpha: always null until validated pronunciation assessment exists. */
  readonly pronunciationAccuracy: null;
  readonly appliedEventIds: readonly string[];
};

export type MasteryPolicy = {
  readonly requiredDimensions: readonly MasteryDimension[];
  /** Minimum successful evidences for a required dimension to count as met. */
  readonly minSuccessesPerDimension: number;
  /** Minimum strong (valid latency, low-hint) successes before dimension supports Strong. */
  readonly minStrongEvidencePerDimension: number;
  /** Minimum dimensions (from required set) that must be met for Strong (excl. mastered path). */
  readonly minDimensionsMetForStrong: number;
  /** Absolute floor: one lucky retrieval cannot create Strong/Mastered. */
  readonly minRetrievalSuccessesForStrong: number;
  readonly minDelayedCheckpoints: number;
  /** Minimum whole UTC days between successive selected checkpoint dates. */
  readonly minCheckpointIntervalDays: number;
  /** Latency below this is invalid for strong evidence (0 / rapid guess). */
  readonly minValidLatencyMs: number;
  /**
   * Maximum hints allowed for an attempt to count as strong evidence.
   * `hintsUsed > maxHintsForStrongEvidence` blocks strong evidence (default 0 ⇒ zero hints required).
   */
  readonly maxHintsForStrongEvidence: number;
  readonly recentEvidenceLimit: number;
};

export type AggregateMasteryView = {
  readonly conceptIds: readonly string[];
  /** Labelled per-dimension totals — never a single mastery percentage. */
  readonly dimensionTotals: Readonly<
    Record<
      MasteryDimension,
      {
        readonly conceptsWithAttempts: number;
        readonly conceptsMet: number;
        readonly totalSuccesses: number;
        readonly totalFailures: number;
      }
    >
  >;
  readonly statusCounts: Readonly<Record<MasteryStatus, number>>;
};

export const MASTERY_REDUCER_VERSION = "1.0.0" as const;
