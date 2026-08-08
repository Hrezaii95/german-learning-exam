export {
  MASTERY_DIMENSIONS,
  STABILITY_EVIDENCE_KIND,
  emptyMasteryCounts,
  isMasteryDimension,
} from "./dimensions.js";
export type { MasteryDimension, StabilityEvidenceKind } from "./dimensions.js";

export { MasteryError, masteryError } from "./errors.js";
export type { MasteryErrorCode } from "./errors.js";

export {
  LEARNER_EVENT_SCHEMA_VERSION,
  MASTERY_REDUCER_VERSION,
} from "./types.js";
export type {
  AggregateMasteryView,
  AttemptOutcome,
  AudioInteractionEvent,
  ConceptMasterySnapshot,
  DelayedCheckpoint,
  DimensionEvidence,
  DimensionRecoveryEvidence,
  EvidenceRecord,
  ExposureEvent,
  ExposureKind,
  LearnerEvent,
  LearnerEventBase,
  LearnerEventKind,
  LearnerEventSchemaVersion,
  MasteryPolicy,
  MasteryStatus,
  ObjectiveAttemptEvent,
  ObjectiveTaskFamily,
  RecordingCycleEvent,
  SelfRatedAttemptEvent,
  SelfRating,
  SourceActivityMode,
  StabilityEvidence,
  TaskFamily,
} from "./types.js";

export {
  DEFAULT_MASTERY_POLICY,
  RECOGNITION_FORBIDDEN_DIMENSIONS,
  RECOGNITION_ONLY_FAMILIES,
  TASK_FAMILY_DIMENSION,
  expectedDimensionForTaskFamily,
  isRecognitionOnlyFamily,
  resolvePolicy,
  validateMasteryPolicy,
} from "./policy.js";
export type {
  RecognitionOnlyFamily,
  TaskFamilyMeasuredDimension,
} from "./policy.js";

export {
  eventFingerprint,
  isIsoTimestampWithTimezone,
  isUuid,
  parseLearnerEvent,
  parseLearnerEvents,
  rejectHtmlShaped,
} from "./events.js";

export { reduceAllConceptMastery, reduceConceptMastery } from "./reduce.js";

export {
  aggregateMastery,
  assertNoRewardFieldsOnMastery,
  selectConceptMastery,
} from "./selectors.js";
