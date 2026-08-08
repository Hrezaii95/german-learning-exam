import type { ContentBundle } from "../types/bundle.js";
import { issue, resultFromIssues, type ValidationResult } from "./errors.js";
import { validatePublishedAssertions, validateBlockingGaps } from "./provenance.js";
import {
  validateUniqueIds,
  validateReferences,
  validateRelationshipEndpoints,
} from "./references.js";
import { validateSchemaShape } from "./schema.js";
import { validateScopeFirewall } from "./scope.js";

/**
 * Deterministic content-bundle validator (DAT-001..005, LRN-006 schema portion).
 * Always returns a structured ValidationResult — never throws on malformed shapes.
 */
export function validateContentBundle(input: unknown): ValidationResult {
  try {
    const shape = validateSchemaShape(input);
    if (!shape.bundle) {
      return resultFromIssues(shape.issues);
    }

    const bundle: ContentBundle = shape.bundle;
    const issues = [
      ...shape.issues,
      ...validateUniqueIds(bundle),
      ...validateReferences(bundle),
      ...validateRelationshipEndpoints(bundle),
      ...validatePublishedAssertions(bundle),
      ...validateBlockingGaps(bundle),
      ...validateScopeFirewall(bundle),
    ];

    return resultFromIssues(issues);
  } catch {
    // Safety net only — null/non-object array elements are handled element-level above.
    return resultFromIssues([
      issue("INVALID_TYPE", `Bundle validation aborted on malformed input`),
    ]);
  }
}

export function validateContentBundleOrThrow(input: unknown): ContentBundle {
  const result = validateContentBundle(input);
  if (!result.ok) {
    const summary = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `${i.code}@${i.objectId ?? ""}:${i.field ?? ""}`)
      .join("; ");
    throw new Error(`Content bundle validation failed: ${summary}`);
  }
  return input as ContentBundle;
}
