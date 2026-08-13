/**
 * Build learner events accepted by `parseLearnerEvent` from `@german-learning/learning`.
 * In-session only — persistence/resume is P4C/P4D.
 */

import {
  LEARNER_EVENT_SCHEMA_VERSION,
  parseLearnerEvent,
  type LearnerEvent,
  type RecordingCycleEvent,
  type SelfRating,
} from "@german-learning/learning";
import {
  CONVERSATION_ANSWER_REALIZATIONS,
  CONVERSATION_CONCEPT_ID,
  conversationActivityId,
} from "./conversation-content";
import { gradePublishedAnswerAttempt } from "./conversation-grading";
import type { ConversationLevelId } from "./level-ids";
import {
  CONVERSATION_RECORDING_SOURCE_ACTIVITY_MODE,
  CONVERSATION_SOURCE_ACTIVITY_MODE,
  type ConversationEmitResult,
  type ConversationGradeResult,
} from "./conversation-types";

export function createConversationUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = Array.from({ length: 32 }, (_, i) =>
    ((i * 7 + 5) % 16).toString(16),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function createConversationTimestamp(date = new Date()): string {
  return date.toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(raw: T): T {
  for (const key of Object.keys(raw)) {
    if (raw[key] === undefined) {
      delete raw[key];
    }
  }
  return raw;
}

export function emitModelStudied(input: {
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
}): ConversationEmitResult {
  const raw = {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "exposure",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: CONVERSATION_CONCEPT_ID,
    activityId: conversationActivityId("model"),
    sourceActivityMode: CONVERSATION_SOURCE_ACTIVITY_MODE,
    measuredDimensions: ["exposure"],
    exposureKind: "page",
  };
  const event = parseLearnerEvent(raw);
  const grade: ConversationGradeResult = Object.freeze({
    outcome: "partial",
    matched: true,
    usedRevealOrHint: false,
    feedbackKind: "studied",
    feedbackMessage:
      "Model exchange studied. Pronunciation remains unavailable until listening approval.",
  });
  return { emitted: true, event, grade };
}

export function emitGuidedRecognitionAttempt(input: {
  readonly selectedRealization: string;
  readonly revealed: boolean;
  readonly hintsUsed: number;
  readonly latencyMs: number;
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
}): ConversationEmitResult {
  const grade = gradePublishedAnswerAttempt({
    rawAnswer: input.selectedRealization,
    accepted: CONVERSATION_ANSWER_REALIZATIONS,
    revealed: input.revealed,
    hintsUsed: input.hintsUsed,
  });
  if (grade.feedbackKind === "empty") {
    return { emitted: false, reason: "empty", grade };
  }

  const matchedRealization = CONVERSATION_ANSWER_REALIZATIONS.find(
    (a) => a === input.selectedRealization,
  );
  const raw = stripUndefined({
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "objectiveAttempt",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: CONVERSATION_CONCEPT_ID,
    activityId: conversationActivityId("guided-recognition"),
    sourceActivityMode: CONVERSATION_SOURCE_ACTIVITY_MODE,
    measuredDimensions: ["recognition"],
    taskFamily: "multipleChoice",
    graderOutcome: grade.outcome,
    latencyMs: input.latencyMs,
    hintsUsed: input.hintsUsed,
    normalizedAnswer: matchedRealization,
  });
  const event = parseLearnerEvent(raw);
  return { emitted: true, event, grade };
}

export function emitSubstitutionAttempt(input: {
  readonly assembled: string;
  readonly revealed: boolean;
  readonly hintsUsed: number;
  readonly latencyMs: number;
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
}): ConversationEmitResult {
  const grade = gradePublishedAnswerAttempt({
    rawAnswer: input.assembled,
    accepted: CONVERSATION_ANSWER_REALIZATIONS,
    revealed: input.revealed,
    hintsUsed: input.hintsUsed,
  });
  if (grade.feedbackKind === "empty") {
    return { emitted: false, reason: "empty", grade };
  }

  const matched = CONVERSATION_ANSWER_REALIZATIONS.find((a) => {
    const g = gradePublishedAnswerAttempt({
      rawAnswer: input.assembled,
      accepted: [a],
      revealed: false,
      hintsUsed: 0,
    });
    return g.matched;
  });

  const raw = stripUndefined({
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "objectiveAttempt",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: CONVERSATION_CONCEPT_ID,
    activityId: conversationActivityId("substitution"),
    sourceActivityMode: CONVERSATION_SOURCE_ACTIVITY_MODE,
    measuredDimensions: ["form"],
    taskFamily: "formManipulation",
    graderOutcome: grade.outcome,
    latencyMs: input.latencyMs,
    hintsUsed: input.hintsUsed,
    normalizedAnswer: matched,
  });
  const event = parseLearnerEvent(raw);
  return { emitted: true, event, grade };
}

export function emitIndependentConstructionAttempt(input: {
  readonly rawAnswer: string;
  readonly revealed: boolean;
  readonly hintsUsed: number;
  readonly latencyMs: number;
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
}): ConversationEmitResult {
  const grade = gradePublishedAnswerAttempt({
    rawAnswer: input.rawAnswer,
    accepted: CONVERSATION_ANSWER_REALIZATIONS,
    revealed: input.revealed,
    hintsUsed: input.hintsUsed,
  });
  if (grade.feedbackKind === "empty") {
    return { emitted: false, reason: "empty", grade };
  }
  if (grade.feedbackKind === "incorrect" && !grade.matched) {
    // Still emit incorrect attempts (objective evidence) unless unsafe.
    if (grade.feedbackMessage.includes("could not be checked safely")) {
      return { emitted: false, reason: "unsafe-input", grade };
    }
  }

  const matched = CONVERSATION_ANSWER_REALIZATIONS.find((a) => {
    const g = gradePublishedAnswerAttempt({
      rawAnswer: input.rawAnswer,
      accepted: [a],
      revealed: false,
      hintsUsed: 0,
    });
    return g.matched;
  });

  const raw = stripUndefined({
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "objectiveAttempt",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: CONVERSATION_CONCEPT_ID,
    activityId: conversationActivityId("independent-construction"),
    sourceActivityMode: CONVERSATION_SOURCE_ACTIVITY_MODE,
    measuredDimensions: ["production"],
    taskFamily: "productionTask",
    graderOutcome: grade.outcome,
    latencyMs: input.latencyMs,
    hintsUsed: input.hintsUsed,
    normalizedAnswer: matched,
  });
  const event = parseLearnerEvent(raw);
  return { emitted: true, event, grade };
}

export type RecordingCycleInput = {
  readonly listenCompleted: boolean;
  readonly recordCompleted: boolean;
  readonly playbackCompleted: boolean;
  readonly selfCheckCompleted: boolean;
  readonly selfRating?: SelfRating;
  readonly latencyMs?: number;
  readonly hintsUsed?: number;
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
  readonly levelId?: ConversationLevelId;
};

/**
 * Emit recordingCycle only when record + playback + self-check are complete.
 * listenCompleted may be true via explicit published-prompt review (TTS unavailable).
 * Never includes pronunciation score fields.
 */
export function emitRecordingCycle(
  input: RecordingCycleInput,
): ConversationEmitResult {
  if (
    !input.recordCompleted ||
    !input.playbackCompleted ||
    !input.selfCheckCompleted
  ) {
    return {
      emitted: false,
      reason: "incomplete-cycle",
      grade: Object.freeze({
        outcome: "partial" as const,
        matched: false,
        usedRevealOrHint: false,
        feedbackKind: "recording-incomplete" as const,
        feedbackMessage:
          "Complete record, playback, and self-check before finishing this level.",
      }),
    };
  }

  const raw = stripUndefined({
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    kind: "recordingCycle",
    eventId: input.eventId,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    conceptId: CONVERSATION_CONCEPT_ID,
    activityId: conversationActivityId("spoken-role-play"),
    sourceActivityMode: CONVERSATION_RECORDING_SOURCE_ACTIVITY_MODE,
    measuredDimensions: ["production"],
    listenCompleted: input.listenCompleted,
    recordCompleted: true,
    playbackCompleted: true,
    selfCheckCompleted: true,
    selfRating: input.selfRating,
    latencyMs: input.latencyMs,
    hintsUsed: input.hintsUsed,
  });

  const event = parseLearnerEvent(raw) as RecordingCycleEvent;
  if (
    "pronunciationAccuracy" in event ||
    "pronunciationScore" in (event as object)
  ) {
    throw new Error("pronunciation scoring fields are forbidden");
  }

  return {
    emitted: true,
    event,
    grade: Object.freeze({
      outcome: "partial" as const,
      matched: true,
      usedRevealOrHint: false,
      feedbackKind: "recording-complete" as const,
      feedbackMessage:
        "Recording cycle complete. Self-rating is learner reflection only — not pronunciation accuracy or mastery.",
    }),
  };
}

export function assertEventAccepted(event: LearnerEvent): LearnerEvent {
  return parseLearnerEvent(event);
}
