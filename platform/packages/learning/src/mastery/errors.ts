/**
 * Stable mastery/event error codes. Fail closed; never echo free-text bodies.
 */

export type MasteryErrorCode =
  | "INVALID_DISCRIMINANT"
  | "INVALID_UUID"
  | "INVALID_TIMESTAMP"
  | "INVALID_SCHEMA_VERSION"
  | "INVALID_TYPE"
  | "REQUIRED_FIELD"
  | "INVALID_LATENCY"
  | "INVALID_AUDIO_SPEED"
  | "INVALID_DIMENSION"
  | "DIMENSION_EVENT_MISMATCH"
  | "HTML_CONTENT"
  | "DUPLICATE_EVENT_ID"
  | "CONFLICTING_EVENT_ID"
  | "INVALID_POLICY"
  | "UNKNOWN_FIELD"
  | "REWARD_FIELD_FORBIDDEN";

export class MasteryError extends Error {
  readonly code: MasteryErrorCode;
  readonly field?: string;

  constructor(code: MasteryErrorCode, message: string, field?: string) {
    super(message);
    this.name = "MasteryError";
    this.code = code;
    if (field !== undefined) this.field = field;
  }
}

export function masteryError(
  code: MasteryErrorCode,
  message: string,
  field?: string,
): MasteryError {
  return new MasteryError(code, message, field);
}
