/**
 * Stable review/scheduler/mission error codes. Fail closed.
 */

export type ReviewErrorCode =
  | "INVALID_TYPE"
  | "REQUIRED_FIELD"
  | "INVALID_DATE"
  | "INVALID_SCHEDULER_VERSION"
  | "INVALID_CARD_STATE"
  | "INVALID_COUNTER"
  | "INCONSISTENT_COUNTERS"
  | "HTML_CONTENT"
  | "DUPLICATE_ID"
  | "CLOCK_REGRESSION"
  | "UNKNOWN_RATING"
  | "UNKNOWN_FILTER"
  | "UNKNOWN_LESSON_ID"
  | "INVALID_LIMIT"
  | "INVALID_CANDIDATE"
  | "INELIGIBLE_CANDIDATE"
  | "UNKNOWN_FIELD"
  | "REWARD_FIELD_FORBIDDEN";

export class ReviewError extends Error {
  readonly code: ReviewErrorCode;
  readonly field?: string;

  constructor(code: ReviewErrorCode, message: string, field?: string) {
    super(message);
    this.name = "ReviewError";
    this.code = code;
    if (field !== undefined) this.field = field;
  }
}

export function reviewError(
  code: ReviewErrorCode,
  message: string,
  field?: string,
): ReviewError {
  return new ReviewError(code, message, field);
}
