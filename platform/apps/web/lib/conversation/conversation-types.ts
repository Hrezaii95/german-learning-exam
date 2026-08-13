/**
 * P4B conversation / recorder types. Local UI feedback is not mastery —
 * emitted events are in-session evidence only (persistence is P4C/P4D).
 */

import type {
  AttemptOutcome,
  LearnerEvent,
  ObjectiveTaskFamily,
  SelfRating,
} from "@german-learning/learning";
import type { ConversationLevelId } from "./level-ids";

export type ConversationFeedbackKind =
  | "empty"
  | "correct"
  | "partial"
  | "incorrect"
  | "revealed"
  | "retry"
  | "studied"
  | "recording-incomplete"
  | "recording-complete";

export type ConversationGradeResult = {
  readonly outcome: AttemptOutcome;
  readonly matched: boolean;
  readonly usedRevealOrHint: boolean;
  readonly feedbackKind: ConversationFeedbackKind;
  readonly feedbackMessage: string;
};

export type ConversationEmitResult =
  | {
      readonly emitted: true;
      readonly event: LearnerEvent;
      readonly grade: ConversationGradeResult | null;
    }
  | {
      readonly emitted: false;
      readonly reason:
        | "empty"
        | "unsafe-input"
        | "incomplete-cycle"
        | "duplicate";
      readonly grade: ConversationGradeResult | null;
    };

export type ConversationLevelMeta = {
  readonly id: ConversationLevelId;
  readonly index: number;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly progressLabel: string;
};

export type ConversationSessionProgress = {
  readonly highestCompletedIndex: number;
  readonly currentLevelId: ConversationLevelId;
  readonly completedLevelIds: readonly ConversationLevelId[];
};

export const CONVERSATION_SOURCE_ACTIVITY_MODE = "use" as const;
export const CONVERSATION_RECORDING_SOURCE_ACTIVITY_MODE = "repeat" as const;
export const CONVERSATION_ANSWER_MAX_LENGTH = 120 as const;

export type ConversationSelfRating = SelfRating;
export type ConversationObjectiveFamily = ObjectiveTaskFamily;
