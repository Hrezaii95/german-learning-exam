/**
 * Stable validation error codes and locations.
 * Errors never include source assertion value bodies.
 */

export type ValidationSeverity = "error" | "warning";

export type ValidationErrorCode =
  | "SCHEMA_VERSION"
  | "REQUIRED_FIELD"
  | "INVALID_DISCRIMINANT"
  | "INVALID_ID"
  | "DUPLICATE_ID"
  | "UNRESOLVED_REFERENCE"
  | "REFERENCE_KIND_MISMATCH"
  | "RELATIONSHIP_ENDPOINT"
  | "RELATIONSHIP_TYPE"
  | "PUBLISHED_ASSERTION_MISSING"
  | "PUBLISHED_ASSERTION_UNVERIFIED"
  | "PUBLISHED_ASSERTION_MISMATCH"
  | "SCOPE_LESSON"
  | "SCOPE_A12"
  | "SCOPE_LOCALIZED_AUDIO"
  | "SCOPE_ENRICHMENT"
  | "BLOCKING_GAP"
  | "SLASH_LEMMA"
  | "HTML_CONTENT"
  | "INVALID_TYPE"
  | "MISSING_FRAGMENT"
  | "INVALID_JSON"
  | "PUBLICATION_GATE"
  | "PUBLICATION_AUTHORITY";

export type ValidationIssue = {
  code: ValidationErrorCode;
  severity: ValidationSeverity;
  objectId?: string;
  field?: string;
  /** Assertion ID location only — never assertion value bodies. */
  assertionId?: string;
  /** Gap ID location when a blocking gap is cited. */
  gapId?: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export function issue(
  code: ValidationErrorCode,
  message: string,
  loc?: {
    objectId?: string;
    field?: string;
    assertionId?: string;
    gapId?: string;
    severity?: ValidationSeverity;
  },
): ValidationIssue {
  return {
    code,
    severity: loc?.severity ?? "error",
    ...(loc?.objectId !== undefined ? { objectId: loc.objectId } : {}),
    ...(loc?.field !== undefined ? { field: loc.field } : {}),
    ...(loc?.assertionId !== undefined ? { assertionId: loc.assertionId } : {}),
    ...(loc?.gapId !== undefined ? { gapId: loc.gapId } : {}),
    message,
  };
}

export function resultFromIssues(issues: ValidationIssue[]): ValidationResult {
  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
  };
}
