/**
 * Mastery threshold policy — validate and default (P2-03 / LRN-004 / C2BR1).
 */

import { isMasteryDimension, type MasteryDimension } from "./dimensions.js";
import { masteryError } from "./errors.js";
import type { MasteryPolicy, TaskFamily } from "./types.js";

/** Recognition-only families — cannot measure recall/form/production. */
export const RECOGNITION_ONLY_FAMILIES = [
  "multipleChoice",
  "pictureRecognition",
] as const;

export type RecognitionOnlyFamily = (typeof RECOGNITION_ONLY_FAMILIES)[number];

export function isRecognitionOnlyFamily(family: string): family is RecognitionOnlyFamily {
  return (RECOGNITION_ONLY_FAMILIES as readonly string[]).includes(family);
}

/** Dimensions forbidden on recognition-only tasks. */
export const RECOGNITION_FORBIDDEN_DIMENSIONS: readonly MasteryDimension[] = [
  "recall",
  "form",
  "production",
];

/**
 * Exact task-family → measured dimension table (C2BR1).
 * No dimension laundering: each objective/self-rated family measures exactly one dimension.
 * Exposure is recorded only via exposure / audio-without-task events.
 */
export const TASK_FAMILY_DIMENSION = Object.freeze({
  multipleChoice: "recognition",
  pictureRecognition: "recognition",
  typedRecall: "recall",
  flashcard: "recall",
  formManipulation: "form",
  sentenceOrder: "form",
  listeningTask: "listening",
  productionTask: "production",
} as const satisfies Record<TaskFamily, MasteryDimension>);

export type TaskFamilyMeasuredDimension =
  (typeof TASK_FAMILY_DIMENSION)[keyof typeof TASK_FAMILY_DIMENSION];

export function expectedDimensionForTaskFamily(family: TaskFamily): MasteryDimension {
  return TASK_FAMILY_DIMENSION[family];
}

export const DEFAULT_MASTERY_POLICY: MasteryPolicy = Object.freeze({
  requiredDimensions: Object.freeze([
    "recognition",
    "recall",
    "listening",
    "form",
    "production",
  ] as const satisfies readonly MasteryDimension[]),
  minSuccessesPerDimension: 2,
  minStrongEvidencePerDimension: 2,
  minDimensionsMetForStrong: 3,
  minRetrievalSuccessesForStrong: 2,
  minDelayedCheckpoints: 2,
  minCheckpointIntervalDays: 1,
  minValidLatencyMs: 250,
  maxHintsForStrongEvidence: 0,
  recentEvidenceLimit: 20,
});

const POLICY_KEYS = [
  "requiredDimensions",
  "minSuccessesPerDimension",
  "minStrongEvidencePerDimension",
  "minDimensionsMetForStrong",
  "minRetrievalSuccessesForStrong",
  "minDelayedCheckpoints",
  "minCheckpointIntervalDays",
  "minValidLatencyMs",
  "maxHintsForStrongEvidence",
  "recentEvidenceLimit",
] as const;

const POSITIVE_INT_KEYS: (keyof MasteryPolicy)[] = [
  "minSuccessesPerDimension",
  "minStrongEvidencePerDimension",
  "minDimensionsMetForStrong",
  "minRetrievalSuccessesForStrong",
  "minDelayedCheckpoints",
  "minCheckpointIntervalDays",
  "minValidLatencyMs",
  "recentEvidenceLimit",
];

export function validateMasteryPolicy(policy: unknown): MasteryPolicy {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    throw masteryError("INVALID_POLICY", "Policy must be an object");
  }
  const p = policy as Record<string, unknown>;

  for (const key of Object.keys(p)) {
    if (!(POLICY_KEYS as readonly string[]).includes(key)) {
      throw masteryError("INVALID_POLICY", `Unknown mastery-policy key: ${key}`, key);
    }
  }

  if (!Array.isArray(p.requiredDimensions) || p.requiredDimensions.length === 0) {
    throw masteryError(
      "INVALID_POLICY",
      "requiredDimensions must be a non-empty array",
      "requiredDimensions",
    );
  }

  const required: MasteryDimension[] = [];
  for (const d of p.requiredDimensions) {
    if (!isMasteryDimension(d)) {
      throw masteryError(
        "INVALID_DIMENSION",
        `Unknown or impossible required dimension: ${String(d)}`,
        "requiredDimensions",
      );
    }
    if (d === "exposure") {
      throw masteryError(
        "INVALID_POLICY",
        "exposure cannot be a required mastery dimension",
        "requiredDimensions",
      );
    }
    if (required.includes(d)) {
      throw masteryError(
        "INVALID_POLICY",
        `Duplicate required dimension: ${d}`,
        "requiredDimensions",
      );
    }
    required.push(d);
  }

  const nums: Record<string, number> = {};
  for (const key of POSITIVE_INT_KEYS) {
    const v = p[key];
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < 1) {
      throw masteryError(
        "INVALID_POLICY",
        `${key} must be a positive integer`,
        key,
      );
    }
    nums[key] = v;
  }

  const maxHints = p.maxHintsForStrongEvidence;
  if (
    typeof maxHints !== "number" ||
    !Number.isFinite(maxHints) ||
    !Number.isInteger(maxHints) ||
    maxHints < 0
  ) {
    throw masteryError(
      "INVALID_POLICY",
      "maxHintsForStrongEvidence must be a non-negative integer",
      "maxHintsForStrongEvidence",
    );
  }

  if ((nums.minDimensionsMetForStrong as number) > required.length) {
    throw masteryError(
      "INVALID_POLICY",
      "minDimensionsMetForStrong cannot exceed requiredDimensions length",
      "minDimensionsMetForStrong",
    );
  }

  // Strong evidence is a subset of successes — requiring more strong than successes is contradictory.
  if (
    (nums.minStrongEvidencePerDimension as number) >
    (nums.minSuccessesPerDimension as number)
  ) {
    throw masteryError(
      "INVALID_POLICY",
      "minStrongEvidencePerDimension cannot exceed minSuccessesPerDimension",
      "minStrongEvidencePerDimension",
    );
  }

  // Interval semantics require at least two checkpoints.
  if ((nums.minDelayedCheckpoints as number) < 2) {
    throw masteryError(
      "INVALID_POLICY",
      "minDelayedCheckpoints must be at least 2 (successive-interval readiness)",
      "minDelayedCheckpoints",
    );
  }

  return Object.freeze({
    requiredDimensions: Object.freeze([...required]),
    minSuccessesPerDimension: nums.minSuccessesPerDimension as number,
    minStrongEvidencePerDimension: nums.minStrongEvidencePerDimension as number,
    minDimensionsMetForStrong: nums.minDimensionsMetForStrong as number,
    minRetrievalSuccessesForStrong: nums.minRetrievalSuccessesForStrong as number,
    minDelayedCheckpoints: nums.minDelayedCheckpoints as number,
    minCheckpointIntervalDays: nums.minCheckpointIntervalDays as number,
    minValidLatencyMs: nums.minValidLatencyMs as number,
    maxHintsForStrongEvidence: maxHints,
    recentEvidenceLimit: nums.recentEvidenceLimit as number,
  });
}

export function resolvePolicy(policy?: MasteryPolicy): MasteryPolicy {
  if (policy === undefined) return DEFAULT_MASTERY_POLICY;
  return validateMasteryPolicy(policy);
}
