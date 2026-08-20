import type { ContentBundle } from "../types/bundle.js";
import type { PublicationState } from "../types/common.js";
import { issue, type ValidationIssue } from "./errors.js";
import {
  forbiddenPublishedFieldsFor,
  isPublishableKind,
  requiredPublishedFieldsFor,
  type PublishableKind,
} from "./published-fields.js";

type Publishable = {
  kind: string;
  id: string;
  publication?: PublicationState | null;
  sourceAssertionIds?: string[];
  answerSpec?: unknown;
  spokenText?: unknown;
};

function publishables(bundle: ContentBundle): Publishable[] {
  return [
    ...bundle.lessons,
    ...bundle.lexemes,
    ...bundle.verbs,
    ...bundle.grammarConcepts,
    ...bundle.phrasePatterns,
    ...bundle.qaPairs,
    ...bundle.dialogues,
    ...bundle.listeningAssets,
    ...bundle.collections,
    ...bundle.learningActivities,
    ...bundle.mediaAssets,
  ];
}

function publicationStatus(obj: Publishable): string | undefined {
  const pub = obj.publication;
  if (pub == null || typeof pub !== "object") return undefined;
  return typeof pub.status === "string" ? pub.status : undefined;
}

/**
 * DAT-002: every published field must retain a verified source assertion.
 * Errors cite object/field/assertion IDs only — never assertion value bodies.
 * Also enforces the minimum published-field policy per entity kind.
 */
export function validatePublishedAssertions(bundle: ContentBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const assertions = new Map(
    (bundle.sourceAssertions ?? []).map((a) => [a.id, a] as const),
  );

  for (const obj of publishables(bundle)) {
    if (!obj || typeof obj !== "object" || typeof obj.id !== "string") continue;

    const pub = obj.publication;
    if (pub == null || typeof pub !== "object") continue;
    if (publicationStatus(obj) !== "published") continue;

    const publishedFields = Array.isArray(pub.publishedFields) ? pub.publishedFields : [];
    if (publishedFields.length === 0) {
      issues.push(
        issue("PUBLISHED_ASSERTION_MISSING", `Published object has no publishedFields`, {
          objectId: obj.id,
          field: "publication.publishedFields",
        }),
      );
      continue;
    }

    const declared = new Map<string, string>();
    for (const ref of publishedFields) {
      if (!ref || typeof ref !== "object") continue;
      const field = typeof ref.field === "string" ? ref.field : undefined;
      const assertionId = typeof ref.assertionId === "string" ? ref.assertionId : undefined;
      if (!field || !assertionId) {
        issues.push(
          issue("PUBLISHED_ASSERTION_MISSING", `Published field ref incomplete`, {
            objectId: obj.id,
            field: field ?? "publication.publishedFields",
            ...(assertionId !== undefined ? { assertionId } : {}),
          }),
        );
        continue;
      }
      declared.set(field, assertionId);

      const assertion = assertions.get(assertionId);
      if (!assertion) {
        issues.push(
          issue("PUBLISHED_ASSERTION_MISSING", `Published field assertion not found`, {
            objectId: obj.id,
            field,
            assertionId,
          }),
        );
        continue;
      }
      if (assertion.status !== "verified") {
        issues.push(
          issue(
            "PUBLISHED_ASSERTION_UNVERIFIED",
            `Published field requires verified assertion (status=${assertion.status})`,
            { objectId: obj.id, field, assertionId },
          ),
        );
      }
      if (assertion.subjectId !== obj.id) {
        issues.push(
          issue("PUBLISHED_ASSERTION_MISMATCH", `Assertion subjectId does not match object`, {
            objectId: obj.id,
            field,
            assertionId,
          }),
        );
      }
      if (assertion.field !== field) {
        issues.push(
          issue(
            "PUBLISHED_ASSERTION_MISMATCH",
            `Assertion field does not match publishedFields.field`,
            { objectId: obj.id, field, assertionId },
          ),
        );
      }
    }

    if (isPublishableKind(obj.kind)) {
      const entity = obj as unknown as Record<string, unknown>;
      const required = requiredPublishedFieldsFor(obj.kind as PublishableKind, entity);
      for (const field of required) {
        if (!declared.has(field)) {
          issues.push(
            issue(
              "PUBLISHED_ASSERTION_MISSING",
              `Published object missing required published field mapping`,
              { objectId: obj.id, field },
            ),
          );
        }
      }
      // The other direction matters just as much: a field with no source must
      // never be declared as source-backed, or unreviewed app wording inherits
      // the authority of a verified quotation.
      for (const field of forbiddenPublishedFieldsFor(obj.kind as PublishableKind, entity)) {
        const assertionId = declared.get(field);
        if (assertionId !== undefined) {
          issues.push(
            issue(
              "PUBLISHED_ASSERTION_MISMATCH",
              `Field has no source and must not be declared as a published field`,
              { objectId: obj.id, field, assertionId },
            ),
          );
        }
      }
    }
  }

  return issues;
}

/**
 * Publication rejection when a blocking gap exists for a published object.
 */
export function validateBlockingGaps(bundle: ContentBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const publishedIds = new Set<string>();

  for (const o of publishables(bundle)) {
    if (!o || typeof o !== "object" || typeof o.id !== "string") continue;
    if (publicationStatus(o) === "published") {
      publishedIds.add(o.id);
    }
  }

  for (const gap of bundle.contentGaps ?? []) {
    if (!gap || typeof gap !== "object") continue;
    if (!gap.blocksPublication) continue;
    if (typeof gap.objectId !== "string") continue;
    if (publishedIds.has(gap.objectId)) {
      issues.push(
        issue("BLOCKING_GAP", `Blocking gap prevents publication`, {
          objectId: gap.objectId,
          ...(typeof gap.field === "string" ? { field: gap.field } : {}),
          ...(typeof gap.id === "string" ? { gapId: gap.id } : {}),
        }),
      );
    }
  }

  return issues;
}
