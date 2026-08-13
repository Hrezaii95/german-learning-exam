/**
 * Deterministic conversation grading.
 * Reuses P3D ellipsis-safe Q&A normalizer; hint/reveal never yields `correct`.
 */

import type { AttemptOutcome } from "@german-learning/learning";
import {
  matchPublishedQaPattern,
  normalizeQaConstructionInput,
} from "../content/qa-normalize";
import {
  CONVERSATION_ANSWER_MAX_LENGTH,
  type ConversationFeedbackKind,
  type ConversationGradeResult,
} from "./conversation-types";

const HTML_RE = /<\/?[a-z][\s\S]*>/i;
const PATHISH_RE = /(?:\.\.|[\\/]|:\/\/|[a-zA-Z]:\\)/;

export function isUnsafeConversationAnswer(raw: string): boolean {
  if (typeof raw !== "string") return true;
  if (raw.length > CONVERSATION_ANSWER_MAX_LENGTH) return true;
  if (HTML_RE.test(raw)) return true;
  if (PATHISH_RE.test(raw)) return true;
  if (raw.includes("<") || raw.includes(">")) return true;
  return false;
}

export function gradePublishedAnswerAttempt(args: {
  readonly rawAnswer: string;
  readonly accepted: readonly string[];
  readonly revealed: boolean;
  readonly hintsUsed: number;
}): ConversationGradeResult {
  if (isUnsafeConversationAnswer(args.rawAnswer)) {
    return Object.freeze({
      outcome: "incorrect" as const satisfies AttemptOutcome,
      matched: false,
      usedRevealOrHint: args.revealed || args.hintsUsed > 0,
      feedbackKind: "incorrect" as const satisfies ConversationFeedbackKind,
      feedbackMessage:
        "That answer could not be checked safely. Try a published pattern.",
    });
  }

  const normalized = normalizeQaConstructionInput(args.rawAnswer);
  if (normalized.length === 0) {
    return Object.freeze({
      outcome: "incorrect" as const,
      matched: false,
      usedRevealOrHint: args.revealed || args.hintsUsed > 0,
      feedbackKind: "empty" as const,
      feedbackMessage: "Enter or select a published answer before submitting.",
    });
  }

  const matched = matchPublishedQaPattern(args.rawAnswer, args.accepted);
  const usedRevealOrHint = args.revealed || args.hintsUsed > 0;

  if (matched && !usedRevealOrHint) {
    return Object.freeze({
      outcome: "correct" as const,
      matched: true,
      usedRevealOrHint: false,
      feedbackKind: "correct" as const,
      feedbackMessage:
        "Matches a published answer pattern. Local feedback only — mastery is not claimed.",
    });
  }

  if (matched && usedRevealOrHint) {
    return Object.freeze({
      outcome: "partial" as const,
      matched: true,
      usedRevealOrHint: true,
      feedbackKind: "partial" as const,
      feedbackMessage:
        "Matches after hint or reveal. Recorded as partial evidence only — not strong.",
    });
  }

  return Object.freeze({
    outcome: "incorrect" as const,
    matched: false,
    usedRevealOrHint,
    feedbackKind: "incorrect" as const,
    feedbackMessage:
      "Does not match a published fixed pattern. Filled profession sentences are not accepted unless published.",
  });
}

export function joinConversationTokens(tokens: readonly string[]): string {
  return tokens.map((t) => normalizeQaConstructionInput(t)).join(" ");
}
