/**
 * P4A game / attempt types. Local UI feedback is not mastery —
 * emitted events are evidence for later reducer/persistence integration.
 */

import type {
  AttemptOutcome,
  LearnerEvent,
  ObjectiveTaskFamily,
  SelfRating,
  TaskFamily,
} from "@german-learning/learning";
import type { DetailRepresentativeId } from "../content/detail-types";
import type { PracticeGameId } from "./game-ids";

export type GameAvailability = "enabled" | "unavailable";

export type GameFeedbackKind =
  | "empty"
  | "correct"
  | "partial"
  | "incorrect"
  | "revealed"
  | "retry"
  | "unavailable"
  | "self-rated";

export type PracticeGameMeta = {
  readonly id: PracticeGameId;
  readonly title: string;
  readonly description: string;
  readonly availability: GameAvailability;
  readonly unavailableReason: string | null;
  /** Primary representative concept this representative prompt trains. */
  readonly conceptId: DetailRepresentativeId;
  readonly taskFamily: TaskFamily | null;
  readonly measuredDimension: "recognition" | "recall" | "form" | "listening" | null;
};

export type GradedAttemptInput = {
  readonly gameId: Exclude<PracticeGameId, "audio-match">;
  readonly rawAnswer: string;
  readonly expectedNormalized: string;
  readonly revealed: boolean;
  readonly hintsUsed: number;
  readonly latencyMs: number;
  readonly conceptId: DetailRepresentativeId;
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
  readonly taskFamily: ObjectiveTaskFamily;
  readonly measuredDimension: "recognition" | "recall" | "form";
  readonly activityId: string;
};

export type SelfRatedAttemptInput = {
  readonly rating: SelfRating;
  readonly hintsUsed: number;
  readonly latencyMs: number;
  readonly conceptId: DetailRepresentativeId;
  readonly sessionId: string;
  readonly eventId: string;
  readonly timestamp: string;
  readonly activityId: string;
};

export type GradeResult = {
  readonly outcome: AttemptOutcome;
  readonly matched: boolean;
  readonly usedRevealOrHint: boolean;
  /** Safe learner-facing feedback — never echoes unsafe raw answers. */
  readonly feedbackKind: GameFeedbackKind;
  readonly feedbackMessage: string;
};

export type EmitResult =
  | {
      readonly emitted: true;
      readonly event: LearnerEvent;
      readonly grade: GradeResult | null;
    }
  | {
      readonly emitted: false;
      readonly reason: "unavailable" | "unsafe-input" | "empty";
      readonly grade: GradeResult | null;
    };

export const AUDIO_MATCH_UNAVAILABLE_REASON =
  "Matching audio is unavailable until listening-approved public media exists. This mode does not emit graded attempts." as const;

export const PRACTICE_SOURCE_ACTIVITY_MODE = "review" as const;

export const PRACTICE_ANSWER_MAX_LENGTH = 120 as const;
