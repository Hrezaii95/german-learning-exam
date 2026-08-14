/**
 * Build learner events accepted by `parseLearnerEvent` from `@german-learning/learning`.
 * Never invent a UI-local mastery schema.
 */

import {
  LEARNER_EVENT_SCHEMA_VERSION,
  parseLearnerEvent,
  type LearnerEvent,
  type ObjectiveTaskFamily,
  type SelfRatedAttemptEvent,
} from "@german-learning/learning";
import { practiceActivityId } from "./game-prompts";
import { gradeObjectiveAttempt } from "./game-grading";
import type { PracticeGameId } from "./game-ids";
import {
  AUDIO_MATCH_UNAVAILABLE_REASON,
  PRACTICE_SOURCE_ACTIVITY_MODE,
  type EmitResult,
  type GradedAttemptInput,
  type SelfRatedAttemptInput,
} from "./game-types";

export function createPracticeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Deterministic-enough fallback for non-crypto test hosts (still UUID-shaped).
  const hex = Array.from({ length: 32 }, (_, i) =>
    ((i * 7 + 3) % 16).toString(16),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function createPracticeTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function buildSelfRatedFlashcardEvent(
  input: SelfRatedAttemptInput,
): SelfRatedAttemptEvent {
  const raw = {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "selfRatedAttempt",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: input.conceptId,
    activityId: input.activityId,
    sourceActivityMode: PRACTICE_SOURCE_ACTIVITY_MODE,
    measuredDimensions: ["recall"],
    taskFamily: "flashcard",
    rating: input.rating,
    latencyMs: input.latencyMs,
    hintsUsed: input.hintsUsed,
  };
  const event = parseLearnerEvent(raw);
  if (event.kind !== "selfRatedAttempt") {
    throw new Error("flashcards must emit selfRatedAttempt only");
  }
  return event;
}

export function emitSelfRatedFlashcard(
  input: SelfRatedAttemptInput,
): EmitResult {
  const event = buildSelfRatedFlashcardEvent(input);
  return {
    emitted: true,
    event,
    grade: {
      outcome: "partial",
      matched: false,
      usedRevealOrHint: input.hintsUsed > 0,
      feedbackKind: "self-rated",
      feedbackMessage: `Self-rated “${input.rating}”. Flashcards never claim objective correctness or mastery.`,
    },
  };
}

export function emitObjectiveGameAttempt(
  input: GradedAttemptInput,
): EmitResult {
  const grade = gradeObjectiveAttempt({
    rawAnswer: input.rawAnswer,
    expectedNormalized: input.expectedNormalized,
    revealed: input.revealed,
    hintsUsed: input.hintsUsed,
  });

  if (grade.feedbackKind === "empty") {
    return { emitted: false, reason: "empty", grade };
  }

  const raw = {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "objectiveAttempt",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: input.conceptId,
    activityId: input.activityId,
    sourceActivityMode: PRACTICE_SOURCE_ACTIVITY_MODE,
    measuredDimensions: [input.measuredDimension],
    taskFamily: input.taskFamily,
    graderOutcome: grade.outcome,
    latencyMs: input.latencyMs,
    hintsUsed: input.hintsUsed,
    normalizedAnswer: grade.matched
      ? input.expectedNormalized
      : undefined,
  };

  // Strip undefined normalizedAnswer for exactOptionalPropertyTypes / parser.
  if (raw.normalizedAnswer === undefined) {
    delete (raw as { normalizedAnswer?: string }).normalizedAnswer;
  }

  const event = parseLearnerEvent(raw);
  return { emitted: true, event, grade };
}

/** audio-match must never emit a graded event while unavailable. */
export function emitAudioMatchAttempt(): EmitResult {
  return {
    emitted: false,
    reason: "unavailable",
    grade: {
      outcome: "incorrect",
      matched: false,
      usedRevealOrHint: false,
      feedbackKind: "unavailable",
      feedbackMessage: AUDIO_MATCH_UNAVAILABLE_REASON,
    },
  };
}

export function taskFamilyForEnabledGame(
  gameId: Exclude<PracticeGameId, "audio-match" | "flashcards">,
): ObjectiveTaskFamily {
  switch (gameId) {
    case "picture-word-match":
      return "pictureRecognition";
    case "article-choice":
      return "multipleChoice";
    case "word-order":
      return "sentenceOrder";
    case "verb-builder":
    case "morphology-puzzle":
      return "formManipulation";
    default: {
      const _exhaustive: never = gameId;
      return _exhaustive;
    }
  }
}

export function measuredDimensionForEnabledGame(
  gameId: Exclude<PracticeGameId, "audio-match" | "flashcards">,
): "recognition" | "form" {
  switch (gameId) {
    case "picture-word-match":
    case "article-choice":
      return "recognition";
    case "word-order":
    case "verb-builder":
    case "morphology-puzzle":
      return "form";
    default: {
      const _exhaustive: never = gameId;
      return _exhaustive;
    }
  }
}

export function assertEventAccepted(event: LearnerEvent): LearnerEvent {
  return parseLearnerEvent(event);
}

export { practiceActivityId };
