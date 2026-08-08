import { issue, resultFromIssues, type ValidationIssue, type ValidationResult } from "../validation/errors.js";
import { validateContentBundle } from "../validation/validate-bundle.js";
import type { ContentBundle } from "../types/bundle.js";
import { CONTENT_SCHEMA_VERSION } from "../types/common.js";
import {
  BUNDLE_ARRAY_KEYS,
  emptyBundleSkeleton,
  PUBLICATION_FRAGMENT_IDS,
  type ContentFragment,
  type PublicationFragmentId,
} from "./fragment.js";

export type MergePublicationResult = {
  ok: boolean;
  bundle: ContentBundle | null;
  issues: ValidationIssue[];
};

/**
 * Deterministically merge publication fragments into one ContentBundle.
 * Requires matching schemaVersion; rejects duplicate entity IDs across fragments
 * before any ContentBundle validation. Does not copy fragment meta envelopes
 * into the bundle (metadata stays fragment-scoped).
 */
export function mergePublicationFragments(
  fragments: ContentFragment[],
): MergePublicationResult {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(fragments) || fragments.length === 0) {
    issues.push(issue("REQUIRED_FIELD", `At least one publication fragment is required`));
    return { ok: false, bundle: null, issues };
  }

  const seenFragmentIds = new Set<string>();
  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    if (!fragment || typeof fragment !== "object") {
      issues.push(
        issue("INVALID_TYPE", `Fragment must be an object`, {
          field: `fragments[${i}]`,
        }),
      );
      continue;
    }
    const fid = fragment.fragmentId;
    if (typeof fid !== "string" || !(PUBLICATION_FRAGMENT_IDS as readonly string[]).includes(fid)) {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Unknown or missing fragmentId`, {
          field: `fragments[${i}].fragmentId`,
        }),
      );
      continue;
    }
    if (seenFragmentIds.has(fid)) {
      issues.push(
        issue("DUPLICATE_ID", `Duplicate fragmentId`, {
          objectId: fid,
          field: "fragmentId",
        }),
      );
    }
    seenFragmentIds.add(fid);

    if (fragment.schemaVersion !== CONTENT_SCHEMA_VERSION) {
      issues.push(
        issue("SCHEMA_VERSION", `Fragment schemaVersion must be ${CONTENT_SCHEMA_VERSION}`, {
          objectId: fid,
          field: "schemaVersion",
        }),
      );
    }
  }

  if (issues.some((i) => i.severity === "error")) {
    return { ok: false, bundle: null, issues };
  }

  const ordered = PUBLICATION_FRAGMENT_IDS.map((id) =>
    fragments.find((f) => f.fragmentId === id),
  ).filter((f): f is ContentFragment => f != null);

  if (ordered.length !== PUBLICATION_FRAGMENT_IDS.length) {
    const missing = PUBLICATION_FRAGMENT_IDS.filter(
      (id) => !fragments.some((f) => f.fragmentId === id),
    );
    for (const id of missing) {
      issues.push(
        issue("MISSING_FRAGMENT", `Missing required publication fragment`, {
          objectId: id,
          field: "fragmentId",
        }),
      );
    }
    return { ok: false, bundle: null, issues };
  }

  const bundle = emptyBundleSkeleton();
  const idOwners = new Map<string, PublicationFragmentId>();

  for (const fragment of ordered) {
    const owner = fragment.fragmentId;
    for (const key of BUNDLE_ARRAY_KEYS) {
      const arr = fragment[key];
      if (arr == null) continue;
      if (!Array.isArray(arr)) {
        issues.push(
          issue("INVALID_TYPE", `Fragment array field must be an array`, {
            objectId: owner,
            field: key,
          }),
        );
        continue;
      }
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i] as { id?: unknown } | null;
        if (item != null && typeof item === "object" && typeof item.id === "string") {
          const prior = idOwners.get(item.id);
          if (prior != null) {
            issues.push(
              issue(
                "DUPLICATE_ID",
                `Duplicate entity ID across fragments ${prior} and ${owner}`,
                {
                  objectId: item.id,
                  field: `${key}[${i}].id`,
                },
              ),
            );
          } else {
            idOwners.set(item.id, owner);
          }
        }
        (bundle[key] as unknown[]).push(item);
      }
    }
  }

  if (issues.some((i) => i.severity === "error")) {
    return { ok: false, bundle: null, issues };
  }

  return { ok: true, bundle, issues };
}

/**
 * Merge fragments then run the full C0 content-bundle validator.
 * Duplicate cross-fragment IDs are rejected in merge before schema validation.
 */
export function validatePublicationFragments(
  fragments: ContentFragment[],
): ValidationResult & { bundle: ContentBundle | null } {
  const merged = mergePublicationFragments(fragments);
  if (!merged.ok || !merged.bundle) {
    return { ...resultFromIssues(merged.issues), bundle: null };
  }
  const validated = validateContentBundle(merged.bundle);
  const issues = [...merged.issues, ...validated.issues];
  const result = resultFromIssues(issues);
  return { ...result, bundle: merged.bundle };
}
