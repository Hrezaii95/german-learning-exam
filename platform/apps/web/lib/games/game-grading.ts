/**
 * Deterministic grading for P4A practice games.
 *
 * Hint / reveal rule (documented):
 * - Normalize only for grading (NFC + trim + collapse internal whitespace).
 * - Reveal and hint are never correctness and never strong evidence.
 * - If the learner revealed the answer OR hintsUsed > 0 before submit:
 *   - matching answer → `partial`
 *   - non-matching → `incorrect`
 * - Never emit `correct` after reveal/hint.
 * - HTML-shaped or path-shaped answers are treated as incorrect without
 *   injecting the raw value into feedback/DOM error text.
 */

import type { AttemptOutcome } from "@german-learning/learning";
import {
  PRACTICE_ANSWER_MAX_LENGTH,
  type GameFeedbackKind,
  type GradeResult,
} from "./game-types";

const HTML_RE = /<\/?[a-z][\s\S]*>/i;
const PATHISH_RE = /(?:\.\.|[\\/]|:\/\/|[a-zA-Z]:\\)/;

export function normalizePracticeAnswer(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function isUnsafePracticeAnswer(raw: string): boolean {
  if (typeof raw !== "string") return true;
  if (raw.length > PRACTICE_ANSWER_MAX_LENGTH) return true;
  if (HTML_RE.test(raw)) return true;
  if (PATHISH_RE.test(raw)) return true;
  if (raw.includes("<") || raw.includes(">")) return true;
  return false;
}

/**
 * Grade a normalized objective attempt under the hint/reveal policy.
 */
export function gradeObjectiveAttempt(args: {
  readonly rawAnswer: string;
  readonly expectedNormalized: string;
  readonly revealed: boolean;
  readonly hintsUsed: number;
}): GradeResult {
  if (isUnsafePracticeAnswer(args.rawAnswer)) {
    return Object.freeze({
      outcome: "incorrect" as const satisfies AttemptOutcome,
      matched: false,
      usedRevealOrHint: args.revealed || args.hintsUsed > 0,
      feedbackKind: "incorrect" as const satisfies GameFeedbackKind,
      feedbackMessage:
        "That answer could not be checked safely. Try a short published form.",
    });
  }

  const got = normalizePracticeAnswer(args.rawAnswer);
  if (got.length === 0) {
    return Object.freeze({
      outcome: "incorrect" as const,
      matched: false,
      usedRevealOrHint: args.revealed || args.hintsUsed > 0,
      feedbackKind: "empty" as const,
      feedbackMessage: "Enter or select an answer before submitting.",
    });
  }

  const expected = normalizePracticeAnswer(args.expectedNormalized);
  const matched = got === expected;
  const usedRevealOrHint = args.revealed || args.hintsUsed > 0;

  if (matched && !usedRevealOrHint) {
    return Object.freeze({
      outcome: "correct" as const,
      matched: true,
      usedRevealOrHint: false,
      feedbackKind: "correct" as const,
      feedbackMessage:
        "Matches the published form. Local feedback only — mastery is not claimed.",
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
      "Does not match the published form. You can retry or reveal.",
  });
}

export function tokensEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (normalizePracticeAnswer(a[i]!) !== normalizePracticeAnswer(b[i]!)) {
      return false;
    }
  }
  return true;
}

export function joinTokens(tokens: readonly string[]): string {
  return tokens.map((t) => normalizePracticeAnswer(t)).join(" ");
}

/** Deterministic shuffle using a seeded Fisher–Yates (stable for tests). */
export function shuffleTokensDeterministic(
  tokens: readonly string[],
  seed: number,
): string[] {
  const out = [...tokens];
  let state = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  // Guarantee a non-identity permutation when length > 1.
  if (out.length > 1 && tokensEqual(out, tokens)) {
    const last = out[out.length - 1]!;
    out[out.length - 1] = out[0]!;
    out[0] = last;
  }
  return out;
}
