import { isPrefixedId } from "../ids/index.js";
import type { ContentBundle } from "../types/bundle.js";
import type { PublicationState } from "../types/common.js";
import { issue, type ValidationIssue } from "./errors.js";

const ALPHA_MAX_LESSON = 2;
const ALPHA_ATTACHED_LESSONS = new Set(["lesson:01", "lesson:02"]);

type PublishableLike = {
  id?: string;
  publication?: PublicationState | null;
};

function safePublication(obj: PublishableLike | null | undefined): PublicationState | null {
  if (!obj || typeof obj !== "object") return null;
  const pub = obj.publication;
  if (pub == null || typeof pub !== "object") return null;
  return pub;
}

function isApprovedEnrichmentOnAlphaLesson(pub: PublicationState | null): boolean {
  const exception = pub?.scopeException;
  if (!exception || typeof exception !== "object") return false;
  if (exception.kind !== "approved-enrichment") return false;
  return ALPHA_ATTACHED_LESSONS.has(exception.attachedLessonId);
}

function validateScopeExceptionShape(
  issues: ValidationIssue[],
  objectId: string,
  pub: PublicationState,
): void {
  const ex = pub.scopeException;
  if (!ex) return;

  if (ex.kind !== "approved-enrichment") {
    issues.push(
      issue("SCOPE_LESSON", `Unsupported scope exception kind`, {
        objectId,
        field: "publication.scopeException.kind",
      }),
    );
    return;
  }

  if (!ALPHA_ATTACHED_LESSONS.has(ex.attachedLessonId)) {
    issues.push(
      issue("SCOPE_LESSON", `Enrichment must attach to lesson:01 or lesson:02`, {
        objectId,
        field: "publication.scopeException.attachedLessonId",
      }),
    );
  }

  // Shape/prefix only. Resolution against a future approval registry is a later package concern.
  if (!isPrefixedId(ex.approvalId, "approval")) {
    issues.push(
      issue("INVALID_ID", `Expected approval:<slug>`, {
        objectId,
        field: "publication.scopeException.approvalId",
      }),
    );
  }
}

/**
 * DAT-004 scope firewall:
 * - Lesson number > 2 is never allowed in an Alpha bundle (draft or published)
 * - Picture-dictionary / priority-4 published assertions require approved-enrichment
 * - A1.2 audio pack publication fails
 * - Czech/Slovak localized tracks without verified review fail
 *
 * Enrichment belongs on content attached to Lesson 1 or 2, not as a later Lesson entity.
 * Scope-exception approval IDs are validated for prefix/shape only; registry lookup is later.
 */
export function validateScopeFirewall(bundle: ContentBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const lesson of bundle.lessons ?? []) {
    if (!lesson || typeof lesson !== "object") continue;
    const objectId = typeof lesson.id === "string" ? lesson.id : "unknown";
    const pub = safePublication(lesson);
    if (pub) validateScopeExceptionShape(issues, objectId, pub);

    if (typeof lesson.number === "number" && lesson.number > ALPHA_MAX_LESSON) {
      issues.push(
        issue(
          "SCOPE_LESSON",
          `Lesson number ${lesson.number} exceeds Alpha Lessons 1–2 scope`,
          { objectId, field: "number" },
        ),
      );
    }
  }

  // Non-lesson objects marked published that claim introduction in lesson > 2
  for (const rel of bundle.relationships ?? []) {
    if (!rel || typeof rel !== "object") continue;
    if (rel.type !== "introduced-in") continue;
    const lesson = (bundle.lessons ?? []).find((l) => l && l.id === rel.toId);
    if (!lesson || typeof lesson.number !== "number") continue;
    if (lesson.number <= ALPHA_MAX_LESSON) continue;

    const from =
      (bundle.lexemes ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.verbs ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.grammarConcepts ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.phrasePatterns ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.qaPairs ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.dialogues ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.listeningAssets ?? []).find((x) => x && x.id === rel.fromId) ??
      (bundle.collections ?? []).find((x) => x && x.id === rel.fromId);

    if (!from) continue;
    const fromPub = safePublication(from);
    if (fromPub?.status !== "published") continue;

    if (!isApprovedEnrichmentOnAlphaLesson(fromPub)) {
      issues.push(
        issue(
          "SCOPE_LESSON",
          `Published object introduced in out-of-scope lesson without approved enrichment`,
          { objectId: from.id, field: "publication.scopeException" },
        ),
      );
    }
  }

  const enrichmentCandidates: PublishableLike[] = [
    ...(bundle.lexemes ?? []),
    ...(bundle.verbs ?? []),
    ...(bundle.grammarConcepts ?? []),
    ...(bundle.phrasePatterns ?? []),
    ...(bundle.qaPairs ?? []),
    ...(bundle.dialogues ?? []),
    ...(bundle.listeningAssets ?? []),
    ...(bundle.collections ?? []),
    ...(bundle.learningActivities ?? []),
    ...(bundle.mediaAssets ?? []),
  ];

  for (const obj of enrichmentCandidates) {
    if (!obj || typeof obj.id !== "string") continue;
    const pub = safePublication(obj);
    if (!pub) continue;
    validateScopeExceptionShape(issues, obj.id, pub);
  }

  // Picture-dictionary / priority-4 firewall: presence alone is not permission to publish.
  // Defense in depth: only a verified enrichment assertion may decide publishability.
  const sources = new Map(
    (bundle.sources ?? [])
      .filter((s) => s && typeof s === "object" && typeof s.id === "string")
      .map((s) => [s.id, s] as const),
  );
  const assertions = new Map(
    (bundle.sourceAssertions ?? [])
      .filter((a) => a && typeof a === "object" && typeof a.id === "string")
      .map((a) => [a.id, a] as const),
  );

  for (const obj of enrichmentCandidates) {
    if (!obj || typeof obj.id !== "string") continue;
    const pub = safePublication(obj);
    if (!pub || pub.status !== "published") continue;
    const publishedFields = Array.isArray(pub.publishedFields) ? pub.publishedFields : [];

    for (const ref of publishedFields) {
      if (!ref || typeof ref.assertionId !== "string") continue;
      const assertion = assertions.get(ref.assertionId);
      if (!assertion) continue;
      const source = sources.get(assertion.sourceId);
      if (!source) continue;

      const needsApproval =
        source.sourceKind === "picture-dictionary" || source.priority === 4;
      if (!needsApproval) continue;

      const field =
        typeof ref.field === "string" ? ref.field : "publication.scopeException";

      if (assertion.status !== "verified") {
        issues.push(
          issue(
            "SCOPE_ENRICHMENT",
            `Unverified picture-dictionary or priority-4 assertion cannot decide publishability`,
            {
              objectId: obj.id,
              field,
              assertionId: ref.assertionId,
            },
          ),
        );
        continue;
      }

      if (!isApprovedEnrichmentOnAlphaLesson(pub)) {
        issues.push(
          issue(
            "SCOPE_ENRICHMENT",
            `Picture-dictionary or priority-4 assertion requires approved-enrichment on lesson:01 or lesson:02`,
            {
              objectId: obj.id,
              field,
              assertionId: ref.assertionId,
            },
          ),
        );
      }
    }
  }

  for (const source of bundle.sources ?? []) {
    if (!source || typeof source !== "object") continue;
    if (source.cefrBand === "A1.2") {
      const linkedMedia = (bundle.mediaAssets ?? []).filter((m) => {
        if (!m || !Array.isArray(m.sourceAssertionIds)) return false;
        return m.sourceAssertionIds.some((aid) => {
          const a = assertions.get(aid);
          return a?.sourceId === source.id;
        });
      });
      for (const media of linkedMedia) {
        const mediaPub = safePublication(media);
        if (mediaPub?.status === "published") {
          issues.push(
            issue("SCOPE_A12", `A1.2 source audio cannot be published in Alpha`, {
              objectId: media.id,
              field: "publication.status",
            }),
          );
        }
      }
    }
  }

  for (const media of bundle.mediaAssets ?? []) {
    if (!media || typeof media !== "object") continue;
    const mediaPub = safePublication(media);
    if (mediaPub?.status !== "published") continue;

    if (media.audioPack === "A1.2") {
      issues.push(
        issue("SCOPE_A12", `A1.2 audio pack flagged on published media`, {
          objectId: media.id,
          field: "audioPack",
        }),
      );
    }

    if (media.localizedPack === "cs" || media.localizedPack === "sk") {
      const reviewed = media.reviewStatus === "verified";
      if (!reviewed) {
        issues.push(
          issue(
            "SCOPE_LOCALIZED_AUDIO",
            `Localized ${media.localizedPack} audio requires verified review before publication`,
            { objectId: media.id, field: "localizedPack" },
          ),
        );
      }
    }
  }

  return issues;
}
