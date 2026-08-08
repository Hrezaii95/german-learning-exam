/**
 * Stable persistence / export / import error codes.
 * Fail closed; never echo note text, event answers, or secrets.
 */

export type PersistenceErrorCode =
  | "INVALID_TYPE"
  | "REQUIRED_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_SCHEMA_VERSION"
  | "UNSUPPORTED_VERSION"
  | "OVERSIZE_JSON"
  | "OVERSIZE_ARRAY"
  | "OVERSIZE_STRING"
  | "DUPLICATE_ID"
  | "PROTOTYPE_POLLUTION"
  | "INVALID_TAG"
  | "INVALID_DATE"
  | "HTML_CONTENT"
  | "MALFORMED_EVENT"
  | "MALFORMED_CARD"
  | "UNPUBLISHED_ID"
  | "CROSS_REFERENCE"
  | "DERIVED_STATE_FORBIDDEN"
  | "REWARD_FIELD_FORBIDDEN"
  | "INVALID_RECORDING"
  | "INVALID_SETTINGS"
  | "INVALID_RESUME"
  | "MIGRATION_FAILED"
  | "STORAGE_FAILURE"
  | "NAN_OR_INFINITY"
  | "SECRET_OR_BLOB_FORBIDDEN"
  | "ABSOLUTE_PATH_FORBIDDEN"
  | "INVALID_JSON";

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly field?: string;

  constructor(code: PersistenceErrorCode, message: string, field?: string) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
    if (field !== undefined) this.field = field;
  }
}

export function persistenceError(
  code: PersistenceErrorCode,
  message: string,
  field?: string,
): PersistenceError {
  return new PersistenceError(code, message, field);
}
