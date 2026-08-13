export type RewardsErrorCode =
  | "INVALID_EVENTS"
  | "INVALID_NOW"
  | "INVALID_TIMEZONE"
  | "CONFLICTING_EVENT_ID";

/** Stable fail-closed errors for derived rewards. */
export class RewardsError extends Error {
  readonly code: RewardsErrorCode;
  readonly field?: string;

  constructor(code: RewardsErrorCode, message: string, field?: string) {
    super(message);
    this.name = "RewardsError";
    this.code = code;
    if (field !== undefined) this.field = field;
  }
}

export function rewardsError(
  code: RewardsErrorCode,
  message: string,
  field?: string,
): RewardsError {
  return new RewardsError(code, message, field);
}
