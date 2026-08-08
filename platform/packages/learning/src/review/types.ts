/**
 * Review scheduler + mission types (C2C / P2-04 / REV-001 / REV-002).
 * FSRS-compatible state shape; Alpha adapter is NOT personalized FSRS.
 */

import type { MasteryDimension } from "../mastery/dimensions.js";

/** Only this version is accepted at runtime; future versions fail closed. */
export const REVIEW_SCHEDULER_VERSION = "1.0.0" as const;
export type ReviewSchedulerVersion = typeof REVIEW_SCHEDULER_VERSION;

/** Adapter identity — deterministic Alpha defaults, not personalized FSRS. */
export const REVIEW_SCHEDULER_ID = "alpha-deterministic" as const;

export type ReviewRating = "again" | "hard" | "good" | "easy";

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;

export type ReviewCardLifecycle = "new" | "learning" | "review" | "relearning";

export const REVIEW_CARD_LIFECYCLES = [
  "new",
  "learning",
  "review",
  "relearning",
] as const;

/**
 * Skill modalities selectable in missions (five practice modalities).
 * Matches mastery dimensions excluding exposure.
 */
export type ReviewModality =
  | "recognition"
  | "recall"
  | "listening"
  | "form"
  | "production";

export const REVIEW_MODALITIES = [
  "recognition",
  "recall",
  "listening",
  "form",
  "production",
] as const;

export type PublicationEligibility = "published" | "review" | "draft" | "blocked";

export const PUBLICATION_ELIGIBILITIES = [
  "published",
  "review",
  "draft",
  "blocked",
] as const;

/**
 * Immutable per-card scheduler state (FSRS-compatible fields + Alpha metadata).
 * Dates are ISO-8601 with timezone (same discipline as learner events).
 */
export type ReviewCardState = {
  readonly cardId: string;
  readonly conceptId: string;
  readonly templateId: string;
  /** Mastery dimension this card measures (never a collapsed %). */
  readonly measuredDimension: MasteryDimension;
  readonly due: string;
  readonly stability: number;
  readonly difficulty: number;
  readonly elapsedDays: number;
  readonly scheduledDays: number;
  readonly reps: number;
  readonly lapses: number;
  readonly state: ReviewCardLifecycle;
  /** null only when state === "new". */
  readonly lastReview: string | null;
  readonly schedulerId: typeof REVIEW_SCHEDULER_ID;
  readonly schedulerVersion: ReviewSchedulerVersion;
};

export type ReviewResult = {
  readonly card: ReviewCardState;
  readonly rating: ReviewRating;
  /** Effective interval until due, in milliseconds (ordering comparisons). */
  readonly intervalMs: number;
  /** Day-scale scheduled interval mirrored onto the card. */
  readonly scheduledDays: number;
};

export type RatingOptions = Readonly<{
  again: ReviewResult;
  hard: ReviewResult;
  good: ReviewResult;
  easy: ReviewResult;
}>;

export type ReviewScheduler = {
  preview(card: ReviewCardState, now: Date): RatingOptions;
  review(card: ReviewCardState, rating: ReviewRating, now: Date): ReviewResult;
};

/**
 * Objective grader outcome → scheduler rating.
 * Incorrect always maps to Again regardless of confidence/self-rating.
 */
export type ObjectiveGrade = "correct" | "partial" | "incorrect";

/**
 * Validated immutable review candidate for mission selection.
 * Scheduler math ignores tags/XP; selection may use flags/tags.
 * Newness is derived from `card.state === "new"` (no redundant newCard flag).
 */
export type ReviewCandidate = {
  readonly cardId: string;
  readonly conceptId: string;
  readonly templateId: string;
  readonly publicationStatus: PublicationEligibility;
  readonly unlocked: boolean;
  readonly card: ReviewCardState;
  readonly conceptLabel: string;
  readonly measuredDimension: MasteryDimension;
  readonly modality: ReviewModality;
  /** Lower number = higher priority (stable tie-break). */
  readonly sourcePriority: number;
  readonly lessonId: string;
  readonly tags: readonly string[];
  readonly recentFailureOrDifficult: boolean;
  readonly stageBlocking: boolean;
  readonly olderMaintenance: boolean;
  /** Teacher-assignment deck membership. */
  readonly teacherAssignment: boolean;
};

export type MissionFilterKey = "onlyDifficult" | "teacherAssignment" | "lessonId";

export type MissionFilters = {
  readonly onlyDifficult?: boolean;
  readonly teacherAssignment?: boolean;
  readonly lessonId?: string;
};

export type MissionReasonCounts = {
  readonly due: number;
  readonly difficult: number;
  readonly listening: number;
  readonly production: number;
  readonly stageBlocking: number;
  readonly older: number;
  readonly new: number;
};

export type MissionCategory =
  | "dueRecall"
  | "listening"
  | "form"
  | "difficult"
  | "production"
  | "older"
  | "backfill";

export type SelectedMissionCard = {
  readonly candidate: ReviewCandidate;
  /**
   * Exclusive selection category for mix accounting (`categoryCounts`).
   * After due-recall, difficult precedes modality categorization.
   * Distinct from `reason.*`, which may count overlapping attributes.
   */
  readonly category: MissionCategory;
  readonly selectionRank: number;
};

export type DailyMission = {
  readonly selected: readonly SelectedMissionCard[];
  /**
   * Attribute counts (overlapping allowed): a difficult listening card
   * increments both `difficult` and `listening`.
   */
  readonly reason: MissionReasonCounts;
  readonly reasonText: string;
  /**
   * Exclusive selection-category counts (one category per card).
   * `categoryCounts.difficult` matches cards whose exclusive category is
   * difficult; it may be lower than `reason.difficult` when difficult cards
   * were categorized as dueRecall first.
   */
  readonly categoryCounts: Readonly<Record<MissionCategory, number>>;
  readonly dailyCardLimit: number;
  readonly newCardLimit: number;
  /** Count of selected cards with `card.state === "new"`. */
  readonly newCardsSelected: number;
};

export type GenerateMissionInput = {
  readonly candidates: readonly ReviewCandidate[];
  readonly now: Date;
  readonly dailyCardLimit: number;
  readonly newCardLimit: number;
  readonly filters?: MissionFilters;
  /**
   * When shortening/resuming: keep only these card IDs (order preserved from prior mission).
   * Must be a subset of a freshly generated selection for stability.
   */
  readonly resumeCardIds?: readonly string[];
  /** Optional hard target size; defaults to dailyCardLimit. */
  readonly targetCount?: number;
};

/** Documented default mission mix targets (ratios only — never invent cards). */
export const DEFAULT_MISSION_MIX = Object.freeze({
  dueRecall: 0.35,
  listening: 0.2,
  form: 0.15,
  difficult: 0.15,
  production: 0.1,
  older: 0.05,
} as const);
