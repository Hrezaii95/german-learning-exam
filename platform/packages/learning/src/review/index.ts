/**
 * Review scheduler + deterministic mission generator (C2C / P2-04).
 */

export { ReviewError, reviewError } from "./errors.js";
export type { ReviewErrorCode } from "./errors.js";

export {
  ALPHA_DESIRED_RETENTION,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_DELTA,
  GRADUATE_EASY_DAYS,
  GRADUATE_GOOD_DAYS,
  INITIAL_STABILITY_EASY,
  INITIAL_STABILITY_GOOD,
  LEARNING_AGAIN_MS,
  LEARNING_GOOD_MS,
  LEARNING_HARD_MS,
  MAX_DIFFICULTY,
  MAX_STABILITY_DAYS,
  MIN_DIFFICULTY,
  MIN_STABILITY_DAYS,
  MS_PER_DAY,
  RELEARNING_AGAIN_MS,
  REVIEW_EASY_FACTOR,
  REVIEW_GOOD_FACTOR,
  REVIEW_HARD_FACTOR,
  STABILITY_ADD,
  STABILITY_MULT,
  clampDifficulty,
  clampStability,
  daysToMs,
  msToScheduledDays,
} from "./constants.js";

export {
  DEFAULT_MISSION_MIX,
  PUBLICATION_ELIGIBILITIES,
  REVIEW_CARD_LIFECYCLES,
  REVIEW_MODALITIES,
  REVIEW_RATINGS,
  REVIEW_SCHEDULER_ID,
  REVIEW_SCHEDULER_VERSION,
} from "./types.js";
export type {
  DailyMission,
  GenerateMissionInput,
  MissionCategory,
  MissionFilterKey,
  MissionFilters,
  MissionReasonCounts,
  ObjectiveGrade,
  PublicationEligibility,
  RatingOptions,
  ReviewCardLifecycle,
  ReviewCardState,
  ReviewCandidate,
  ReviewModality,
  ReviewRating,
  ReviewResult,
  ReviewScheduler,
  ReviewSchedulerVersion,
  SelectedMissionCard,
} from "./types.js";

export {
  assertNowNotBeforeLastReview,
  assertValidNow,
  createNewReviewCard,
  isLearnerMissionEligible,
  parseReviewCandidate,
  parseReviewCandidates,
  parseReviewCardState,
} from "./validate.js";

export {
  isReviewRating,
  mapObjectiveGradeToRating,
  mapSelfRatingToReviewRating,
  parseReviewRating,
  ratingFromRecordingSelfCheck,
} from "./grading.js";

export {
  createAlphaReviewScheduler,
  previewEqualsIndependentReviews,
} from "./alpha-scheduler.js";

export {
  compareReviewCandidates,
  exclusiveSelectionCategory,
  formatMissionReasonText,
  generateDailyMission,
  resumeMissionFromCardIds,
  shortenMissionAt,
} from "./mission.js";

export {
  DIFFICULT_LEARNER_TAGS,
  hasDifficultLearnerTag,
  isDifficultCandidate,
  isNewReviewCard,
} from "./difficult.js";

export {
  deriveMasteryDimensionReviewState,
} from "./mastery-bridge.js";
export type { MasteryDimensionReviewState } from "./mastery-bridge.js";
