import path from "node:path";
import type { ContentBundle } from "../types/bundle.js";
import {
  issue,
  resultFromIssues,
  type ValidationIssue,
  type ValidationResult,
} from "../validation/errors.js";
import type { ContentFragment } from "./fragment.js";
import {
  collectForbiddenMp3PathStrings,
  compareWorkbookMappingsToAuthority,
  isForbiddenMp3PathString,
  type WorkbookAuthorityProjection,
} from "./authority.js";
import {
  aggregatePublicationMetadata,
  type AggregatedPublicationMetadata,
  type PublicationTeacherSourceRow,
  type PublicationWorkbookMapping,
} from "./metadata.js";

const ACTIVITY_ID_PATTERN = /^activity:lesson-0[12]-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const REQUIRED_LESSON_IDS = ["lesson:01", "lesson:02"] as const;

/** Ordered Lesson 1–2 activity contract IDs (docs/11); infrastructure fixtures may reuse these IDs. */
export function requiredLessonActivityIds(): string[] {
  return [
    "activity:lesson-01-greetings-by-context",
    "activity:lesson-01-greeting-farewell-match",
    "activity:lesson-01-name-model-dialogue",
    "activity:lesson-01-alphabet-listen-spell",
    "activity:lesson-01-heissen-sein-notice",
    "activity:lesson-01-wellbeing-scale",
    "activity:lesson-01-origin-aus-contrast",
    "activity:lesson-01-pronoun-verb-builder",
    "activity:lesson-01-register-qa-builder",
    "activity:lesson-01-workbook-listening",
    "activity:lesson-01-guided-intro-recording",
    "activity:lesson-01-checkpoint-summary",
    "activity:lesson-02-personal-profile",
    "activity:lesson-02-full-person-conjugation",
    "activity:lesson-02-numbers-0-100",
    "activity:lesson-02-relationship-status",
    "activity:lesson-02-core-professions",
    "activity:lesson-02-person-form-morphology",
    "activity:lesson-02-profession-qa-builder",
    "activity:lesson-02-sein-arbeiten-contrast",
    "activity:lesson-02-workbook-listening",
    "activity:lesson-02-profile-reading-writing",
    "activity:lesson-02-teacher-professions-deck",
    "activity:lesson-02-checkpoint-summary",
  ];
}

export function assertActivityIdShape(id: string): boolean {
  return ACTIVITY_ID_PATTERN.test(id);
}

export type PublicationIntegrityCounts = {
  fragmentFiles: number;
  lessons: number;
  lessonIds: string[];
  learningActivities: number;
  activityIds: string[];
  lesson01ActivityCount: number;
  lesson02ActivityCount: number;
  activityOwnershipMismatches: string[];
  teacherSourceRows: number[];
  teacherRowRecords: PublicationTeacherSourceRow[];
  unresolvedTeacherSourceRows: number[];
  workbookMappings: number;
  workbookMappingIds: string[];
  publisherMediaCount: number;
  listeningAssetCount: number;
  publicSourceMp3Paths: string[];
  /** Nested forbidden MP3 path/URL strings anywhere in fragment JSON (assertions/meta/etc.). */
  forbiddenEmbeddedMp3Paths: string[];
  slashLemmas: string[];
  portablePathViolations: string[];
};

export function findUnresolvedTeacherSourceRows(
  rows: number[],
  expected = 48,
): number[] {
  const have = new Set(rows);
  const missing: number[] = [];
  for (let i = 1; i <= expected; i++) {
    if (!have.has(i)) missing.push(i);
  }
  return missing;
}

/**
 * True when the variant reference is an explicit non-file rights-gated URI.
 * Only the exact `rights-gated:` scheme is exempt from the public-source MP3 gate.
 */
export function isRightsGatedUri(ref: string): boolean {
  return /^rights-gated:/i.test(ref.trim());
}

/** Strip query/fragment and normalize separators for MP3 path-component checks. */
export function stripQueryAndFragment(ref: string): string {
  const normalized = ref.replace(/\\/g, "/");
  return normalized.split(/[?#]/, 1)[0] ?? normalized;
}

/**
 * True when the path component (query/fragment stripped) ends in `.mp3`.
 */
export function pathComponentEndsWithMp3(ref: string): boolean {
  return stripQueryAndFragment(ref).toLowerCase().endsWith(".mp3");
}

/**
 * Media variants that expose a public/deployable .mp3 path (all origins).
 * Exempt: exact `rights-gated:` scheme references only.
 * Fail: any relative/absolute/http(s)/file path whose path component ends in `.mp3`.
 */
export function collectPublicSourceMp3Paths(bundle: ContentBundle): string[] {
  const paths: string[] = [];
  for (const media of bundle.mediaAssets ?? []) {
    if (!media) continue;
    for (const variant of media.variants ?? []) {
      if (!variant || typeof variant.path !== "string") continue;
      const ref = variant.path;
      if (isRightsGatedUri(ref)) continue;
      if (pathComponentEndsWithMp3(ref)) {
        paths.push(ref);
      }
    }
  }
  return paths;
}

export function collectSlashLemmas(bundle: ContentBundle): string[] {
  const hits: string[] = [];
  for (const lex of bundle.lexemes ?? []) {
    if (lex && typeof lex.lemma === "string" && lex.lemma.includes("/")) {
      hits.push(lex.id);
    }
  }
  for (const verb of bundle.verbs ?? []) {
    if (verb && typeof verb.infinitive === "string" && verb.infinitive.includes("/")) {
      hits.push(verb.id);
    }
  }
  return hits;
}

/** True when the string is an explicit URI (scheme present), not a bare filesystem path. */
export function isExplicitUri(ref: string): boolean {
  // Windows drive paths look like `C:/...` — do not treat the drive letter as a URI scheme.
  if (/^[A-Za-z]:[\\/]/.test(ref)) return false;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(ref);
}

/**
 * Non-portable filesystem path: Windows drive, UNC, or any POSIX/Win absolute path.
 * Explicit URIs are classified separately (file: is non-portable; rights-gated/http are not FS paths).
 */
export function isNonPortableFilesystemPath(ref: string): boolean {
  if (isExplicitUri(ref)) {
    return /^file:/i.test(ref);
  }
  if (/^[A-Za-z]:[\\/]/.test(ref)) return true;
  if (/^\\\\[^\\]/.test(ref) || /^\/\/[^/]/.test(ref)) return true;
  if (ref.startsWith("/")) return true;
  if (path.win32.isAbsolute(ref) || path.posix.isAbsolute(ref)) return true;
  return false;
}

/** Reject Windows drive paths, UNC paths, and any POSIX absolute path; distinguish URIs. */
export function collectPortablePathViolations(bundle: ContentBundle): string[] {
  const violations: string[] = [];
  const check = (ref: string, loc: string) => {
    if (isRightsGatedUri(ref)) return;
    if (isNonPortableFilesystemPath(ref)) {
      violations.push(`${loc}:${ref}`);
    }
  };

  for (const source of bundle.sources ?? []) {
    if (source?.originalPath) check(source.originalPath, source.id);
  }
  for (const media of bundle.mediaAssets ?? []) {
    if (!media) continue;
    for (const variant of media.variants ?? []) {
      if (variant?.path) check(variant.path, media.id);
    }
  }
  return violations;
}

function expectedLessonIdFromActivityId(activityId: string): "lesson:01" | "lesson:02" | null {
  if (activityId.startsWith("activity:lesson-01-")) return "lesson:01";
  if (activityId.startsWith("activity:lesson-02-")) return "lesson:02";
  return null;
}

export function collectActivityOwnershipMismatches(
  bundle: ContentBundle,
): string[] {
  const mismatches: string[] = [];
  for (const activity of bundle.learningActivities ?? []) {
    if (!activity) continue;
    const expected = expectedLessonIdFromActivityId(activity.id);
    if (expected && activity.lessonId !== expected) {
      mismatches.push(activity.id);
    }
  }
  return mismatches;
}

function countActivitiesByLessonId(bundle: ContentBundle): {
  lesson01: number;
  lesson02: number;
} {
  let lesson01 = 0;
  let lesson02 = 0;
  for (const activity of bundle.learningActivities ?? []) {
    if (!activity) continue;
    if (activity.lessonId === "lesson:01") lesson01 += 1;
    else if (activity.lessonId === "lesson:02") lesson02 += 1;
  }
  return { lesson01, lesson02 };
}

function collectTeacherSourceRowAssertions(bundle: ContentBundle): Array<{
  assertionId: string;
  sourceRow: number;
  subjectId: string;
}> {
  const out: Array<{ assertionId: string; sourceRow: number; subjectId: string }> = [];
  for (const assertion of bundle.sourceAssertions ?? []) {
    if (!assertion || assertion.field !== "sourceRow") continue;
    const noteRow = assertion.location?.noteRow;
    const sourceRow =
      typeof noteRow === "number" && Number.isInteger(noteRow)
        ? noteRow
        : typeof (assertion.value as { sourceRow?: unknown } | null)?.sourceRow === "number"
          ? ((assertion.value as { sourceRow: number }).sourceRow)
          : null;
    if (sourceRow == null) continue;
    out.push({
      assertionId: assertion.id,
      sourceRow,
      subjectId: assertion.subjectId,
    });
  }
  return out;
}

function validateTeacherBijection(
  bundle: ContentBundle,
  teacherRows: PublicationTeacherSourceRow[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const assertions = collectTeacherSourceRowAssertions(bundle);
  const lexemeIds = new Set((bundle.lexemes ?? []).map((l) => l?.id).filter(Boolean));

  const metaRows = teacherRows.map((r) => r.sourceRow).sort((a, b) => a - b);
  const assertRows = assertions.map((a) => a.sourceRow).sort((a, b) => a - b);
  const unresolvedMeta = findUnresolvedTeacherSourceRows(metaRows);
  const unresolvedAssert = findUnresolvedTeacherSourceRows(assertRows);

  if (
    teacherRows.length !== 48 ||
    unresolvedMeta.length !== 0 ||
    assertions.length !== 48 ||
    unresolvedAssert.length !== 0 ||
    metaRows.join(",") !== assertRows.join(",")
  ) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Teacher bijection failed: expected 48 metadata rows and 48 sourceRow assertions covering 1–48`,
        { field: "meta.teacherSourceRows" },
      ),
    );
  }

  const assertByRow = new Map<number, (typeof assertions)[number]>();
  for (const a of assertions) {
    if (assertByRow.has(a.sourceRow)) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Duplicate canonical sourceRow assertion`,
          { assertionId: a.assertionId, field: "sourceRow" },
        ),
      );
    } else {
      assertByRow.set(a.sourceRow, a);
    }
  }

  for (const row of teacherRows) {
    if (!lexemeIds.has(row.subjectId as `lex:${string}`)) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Teacher metadata subjectId does not resolve to a Lexeme`,
          { objectId: row.subjectId, field: "meta.teacherSourceRows.subjectId" },
        ),
      );
    }
    const assertion = assertByRow.get(row.sourceRow);
    if (!assertion) continue;
    if (assertion.subjectId !== row.subjectId) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Teacher metadata subjectId disagrees with sourceRow assertion subjectId`,
          {
            objectId: row.subjectId,
            field: "meta.teacherSourceRows",
            assertionId: assertion.assertionId,
          },
        ),
      );
    }
    if (!lexemeIds.has(assertion.subjectId as `lex:${string}`)) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Teacher sourceRow assertion subjectId does not resolve to a Lexeme`,
          {
            objectId: assertion.subjectId,
            field: "sourceRow",
            assertionId: assertion.assertionId,
          },
        ),
      );
    }
  }

  return issues;
}

function validateWorkbookBijection(
  bundle: ContentBundle,
  mappings: PublicationWorkbookMapping[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const publisherMedia = (bundle.mediaAssets ?? []).filter(
    (m) => m && m.origin === "publisher",
  );
  const listeningAssets = (bundle.listeningAssets ?? []).filter(Boolean);

  if (
    mappings.length !== 15 ||
    publisherMedia.length !== 15 ||
    listeningAssets.length !== 15
  ) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Workbook bijection failed: expected 15 metadata mappings, 15 ListeningAssets, and 15 publisher MediaAssets`,
        { field: "meta.workbookMappings" },
      ),
    );
  }

  const mediaByRightsUri = new Map<string, (typeof publisherMedia)[number]>();
  for (const media of publisherMedia) {
    for (const variant of media.variants ?? []) {
      if (variant?.path && isRightsGatedUri(variant.path)) {
        mediaByRightsUri.set(variant.path, media);
      }
    }
  }

  const listeningByMediaId = new Map(
    listeningAssets.map((l) => [l.mediaId, l] as const),
  );

  for (const mapping of mappings) {
    const rightsUri = `rights-gated://${mapping.sourceAudioId}`;
    const media = mediaByRightsUri.get(rightsUri);
    if (!media) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Workbook mapping has no matching publisher MediaAsset rights-gated URI`,
          { objectId: mapping.id, field: "meta.workbookMappings" },
        ),
      );
      continue;
    }
    const listening = listeningByMediaId.get(media.id);
    if (!listening) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Workbook publisher MediaAsset has no ListeningAsset`,
          { objectId: media.id, field: "listeningAssets" },
        ),
      );
      continue;
    }
    if ((listening.exerciseRef ?? "") !== (mapping.exerciseRef ?? "")) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Workbook mapping exerciseRef disagrees with ListeningAsset`,
          { objectId: mapping.id, field: "exerciseRef" },
        ),
      );
    }

    const variantAssert = (bundle.sourceAssertions ?? []).find(
      (a) =>
        a &&
        a.subjectId === media.id &&
        a.field === "variants" &&
        a.value &&
        typeof a.value === "object",
    );
    if (variantAssert) {
      const value = variantAssert.value as Record<string, unknown>;
      if (value.filename !== mapping.filename) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Workbook mapping filename disagrees with media variants assertion`,
            {
              objectId: mapping.id,
              field: "filename",
              assertionId: variantAssert.id,
            },
          ),
        );
      }
      if (value.sourceAudioId !== mapping.sourceAudioId) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Workbook mapping sourceAudioId disagrees with media variants assertion`,
            {
              objectId: mapping.id,
              field: "sourceAudioId",
              assertionId: variantAssert.id,
            },
          ),
        );
      }
      if (typeof value.originalPathPrivateOnly === "string") {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Publisher media assertion must not embed originalPathPrivateOnly`,
            {
              objectId: media.id,
              field: "variants",
              assertionId: variantAssert.id,
            },
          ),
        );
      }
    }
  }

  return issues;
}

/**
 * Published activities must not imply publication of unpublished collections/members
 * referenced via conceptIds.
 */
export function validatePublishedActivityCollectionContract(
  bundle: ContentBundle,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const collections = new Map(
    (bundle.collections ?? []).filter(Boolean).map((c) => [c.id, c] as const),
  );
  const lexemes = new Map(
    (bundle.lexemes ?? []).filter(Boolean).map((l) => [l.id, l] as const),
  );

  for (const activity of bundle.learningActivities ?? []) {
    if (!activity || activity.publication?.status !== "published") continue;
    for (const conceptId of activity.conceptIds ?? []) {
      const collection = collections.get(conceptId as `collection:${string}`);
      if (collection) {
        if (collection.publication?.status !== "published") {
          issues.push(
            issue(
              "PUBLICATION_GATE",
              `Published activity must not imply publication of unpublished collection`,
              { objectId: activity.id, field: "conceptIds" },
            ),
          );
        }
        for (const memberId of
          collection.membership?.mode === "static"
            ? (collection.membership.memberIds ?? [])
            : []) {
          const member = lexemes.get(memberId as `lex:${string}`);
          if (member && member.publication?.status !== "published") {
            issues.push(
              issue(
                "PUBLICATION_GATE",
                `Published activity must not imply publication of unpublished collection member`,
                { objectId: activity.id, field: "conceptIds" },
              ),
            );
            break;
          }
        }
        continue;
      }
      const lexeme = lexemes.get(conceptId as `lex:${string}`);
      if (lexeme && lexeme.publication?.status !== "published") {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Published activity must not imply publication of unpublished member`,
            { objectId: activity.id, field: "conceptIds" },
          ),
        );
      }
    }
  }
  return issues;
}

export function computePublicationIntegrity(
  bundle: ContentBundle,
  meta: AggregatedPublicationMetadata,
  fragmentCount = 5,
  fragments: ContentFragment[] = [],
): PublicationIntegrityCounts {
  const activities = bundle.learningActivities ?? [];
  const activityIds = activities.map((a) => a.id).sort();
  const byLesson = countActivitiesByLessonId(bundle);
  const teacherRowNumbers = meta.teacherSourceRows.map((r) => r.sourceRow);

  return {
    fragmentFiles: fragmentCount,
    lessons: (bundle.lessons ?? []).length,
    lessonIds: (bundle.lessons ?? []).map((l) => l.id).sort(),
    learningActivities: activities.length,
    activityIds,
    lesson01ActivityCount: byLesson.lesson01,
    lesson02ActivityCount: byLesson.lesson02,
    activityOwnershipMismatches: collectActivityOwnershipMismatches(bundle),
    teacherSourceRows: [...teacherRowNumbers].sort((a, b) => a - b),
    teacherRowRecords: meta.teacherSourceRows,
    unresolvedTeacherSourceRows: findUnresolvedTeacherSourceRows(teacherRowNumbers),
    workbookMappings: meta.workbookMappings.length,
    workbookMappingIds: meta.workbookMappings.map((m) => m.id).sort(),
    publisherMediaCount: (bundle.mediaAssets ?? []).filter((m) => m?.origin === "publisher")
      .length,
    listeningAssetCount: (bundle.listeningAssets ?? []).filter(Boolean).length,
    publicSourceMp3Paths: collectPublicSourceMp3Paths(bundle),
    forbiddenEmbeddedMp3Paths: collectForbiddenEmbeddedMp3Paths(fragments),
    slashLemmas: collectSlashLemmas(bundle),
    portablePathViolations: collectPortablePathViolations(bundle),
  };
}

/**
 * Recursive scan of every publication fragment (source assertion values, metadata,
 * and all nested fields). Bare filenames and exact `rights-gated:` refs are allowed.
 */
export function collectForbiddenEmbeddedMp3Paths(
  fragments: ContentFragment[],
): string[] {
  const hits: string[] = [];
  for (const fragment of fragments) {
    hits.push(
      ...collectForbiddenMp3PathStrings(fragment, fragment.fragmentId ?? "fragment"),
    );
  }
  return hits;
}

export type ValidatePublicationCountGatesOptions = {
  authority?: WorkbookAuthorityProjection | null;
  /**
   * When true (default for loadAndValidatePublication), missing authority is a
   * PUBLICATION_AUTHORITY failure rather than a silent skip.
   */
  requireAuthority?: boolean;
};

/**
 * Reusable count-gate validation for the Lessons 1–2 publication package.
 * Uses ContentBundle entities plus aggregated fragment metadata envelopes.
 */
export function validatePublicationCountGates(
  bundle: ContentBundle,
  fragments: ContentFragment[],
  options: ValidatePublicationCountGatesOptions = {},
): ValidationResult & { counts: PublicationIntegrityCounts; meta: AggregatedPublicationMetadata } {
  const meta = aggregatePublicationMetadata(fragments.map((f) => f.meta));
  const counts = computePublicationIntegrity(bundle, meta, fragments.length, fragments);
  const issues: ValidationIssue[] = [...meta.issues];
  const requiredActivities = requiredLessonActivityIds();
  const activitySet = new Set(counts.activityIds);
  const missingActivities = requiredActivities.filter((id) => !activitySet.has(id));

  if (counts.lessons !== 2 || counts.lessonIds.join(",") !== REQUIRED_LESSON_IDS.join(",")) {
    issues.push(
      issue("PUBLICATION_GATE", `Expected lessons lesson:01 and lesson:02`, {
        field: "lessons",
      }),
    );
  }

  if (
    counts.learningActivities !== 24 ||
    counts.lesson01ActivityCount !== 12 ||
    counts.lesson02ActivityCount !== 12 ||
    missingActivities.length > 0
  ) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Expected 24 unique activities split 12/12 for lessons 01 and 02`,
        { field: "learningActivities" },
      ),
    );
  }

  if (counts.activityOwnershipMismatches.length > 0) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Activity ID prefix must agree with lessonId`,
        { field: "learningActivities.lessonId" },
      ),
    );
  }

  issues.push(...validateTeacherBijection(bundle, meta.teacherSourceRows));
  issues.push(...validateWorkbookBijection(bundle, meta.workbookMappings));

  if (options.requireAuthority === true && options.authority == null) {
    issues.push(
      issue(
        "PUBLICATION_AUTHORITY",
        `Workbook authority projection is required for publication validation`,
        { field: "authority" },
      ),
    );
  } else if (options.authority) {
    issues.push(
      ...compareWorkbookMappingsToAuthority(meta.workbookMappings, options.authority),
    );
  }

  issues.push(...validatePublishedActivityCollectionContract(bundle));

  if (counts.publicSourceMp3Paths.length !== 0) {
    issues.push(
      issue("PUBLICATION_GATE", `Public source MP3 paths must be zero`, {
        field: "mediaAssets.variants.path",
      }),
    );
  }

  if (counts.forbiddenEmbeddedMp3Paths.length !== 0) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Forbidden MP3 path/URL strings must not appear in source assertions or fragment metadata`,
        { field: "fragments" },
      ),
    );
  }

  if (counts.portablePathViolations.length !== 0) {
    issues.push(
      issue("PUBLICATION_GATE", `Absolute developer paths are not allowed`, {
        field: "paths",
      }),
    );
  }

  if (counts.slashLemmas.length !== 0) {
    issues.push(
      issue("PUBLICATION_GATE", `Slash lemmas/infinitives are not allowed`, {
        field: "lemma",
      }),
    );
  }

  return { ...resultFromIssues(issues), counts, meta };
}

/** @deprecated Prefer metadata envelope; retained for assertion-based diagnostics. */
export function collectTeacherSourceRowsFromAssertions(bundle: ContentBundle): number[] {
  const rows = new Set<number>();
  for (const assertion of collectTeacherSourceRowAssertions(bundle)) {
    rows.add(assertion.sourceRow);
  }
  return [...rows].sort((a, b) => a - b);
}

export function deepCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Clone fragments and inject a colliding ID into the activities fragment for negative tests. */
export function withDuplicateCrossFragmentId(
  fragments: ContentFragment[],
  duplicateId = "lex:fixture-shared",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const activities = clone.find((f) => f.fragmentId === "activities");
  if (!activities) throw new Error("activities fragment missing");
  activities.lexemes = [
    {
      kind: "Lexeme",
      id: duplicateId as `lex:${string}`,
      lemma: "duplicate",
      partOfSpeech: "interjection",
      meanings: [{ id: "meaning:dup", glossEn: "duplicate negative fixture" }],
      pronunciation: {},
      exampleIds: [],
      relationIds: [],
      sourceAssertionIds: [],
      mediaIds: [],
      cardTemplateIds: [],
      publication: { status: "draft", publishedFields: [] },
    },
  ];
  return clone;
}

export function withMissingActivity(
  fragments: ContentFragment[],
  removeId = "activity:lesson-01-checkpoint-summary",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const activities = clone.find((f) => f.fragmentId === "activities");
  if (!activities?.learningActivities) throw new Error("activities missing");
  activities.learningActivities = activities.learningActivities.filter((a) => a.id !== removeId);
  const lesson01 = clone.find((f) => f.fragmentId === "lesson-01");
  if (lesson01?.lessons?.[0]) {
    for (const stage of lesson01.lessons[0].stages) {
      stage.activityIds = stage.activityIds.filter((id) => id !== removeId);
    }
  }
  return clone;
}

export function withMissingTeacherRow(
  fragments: ContentFragment[],
  removeRow = 48,
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const teacher = clone.find((f) => f.fragmentId === "teacher-professions");
  if (!teacher?.meta?.teacherSourceRows) {
    throw new Error("teacher fragment metadata missing");
  }
  teacher.meta.teacherSourceRows = teacher.meta.teacherSourceRows.filter(
    (r) => r.sourceRow !== removeRow,
  );
  if (teacher.sourceAssertions) {
    teacher.sourceAssertions = teacher.sourceAssertions.filter(
      (a) => !(a.field === "sourceRow" && a.location?.noteRow === removeRow),
    );
  }
  return clone;
}

export function withDuplicateTeacherRow(
  fragments: ContentFragment[],
  duplicateRow = 1,
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const teacher = clone.find((f) => f.fragmentId === "teacher-professions");
  if (!teacher?.meta?.teacherSourceRows?.[0]) {
    throw new Error("teacher fragment metadata missing");
  }
  const template = teacher.meta.teacherSourceRows.find((r) => r.sourceRow === duplicateRow);
  if (!template) throw new Error(`row ${duplicateRow} missing`);
  teacher.meta.teacherSourceRows.push({ ...template });
  return clone;
}

export function withFabricatedTeacherRow(
  fragments: ContentFragment[],
  fabricated: PublicationTeacherSourceRow = {
    sourceRow: 99,
    subjectId: "lex:fixture-shared",
  },
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const teacher = clone.find((f) => f.fragmentId === "teacher-professions");
  if (!teacher?.meta?.teacherSourceRows) {
    throw new Error("teacher fragment metadata missing");
  }
  teacher.meta.teacherSourceRows.push(fabricated);
  return clone;
}

export function withAttemptedPublicSourceMp3(
  fragments: ContentFragment[],
  pathRef = "resources/original/audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const listening = clone.find((f) => f.fragmentId === "listening-assets");
  if (!listening) throw new Error("listening fragment missing");
  listening.mediaAssets = [
    ...(listening.mediaAssets ?? []),
    {
      kind: "MediaAsset",
      id: "media:fixture-public-mp3",
      mediaKind: "audio",
      origin: "publisher",
      locale: "de-DE",
      variants: [
        {
          path: pathRef,
          role: "master",
        },
      ],
      reviewStatus: "candidate",
      linkedConceptIds: [],
      sourceAssertionIds: [],
      publication: { status: "draft", publishedFields: [] },
    },
  ];
  return clone;
}

/** Positive control: publisher origin with explicit rights-gated URI (may end in .mp3). */
export function withRightsGatedPublisherUri(
  fragments: ContentFragment[],
  pathRef = "rights-gated://src-audio:fixture:01.mp3",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const listening = clone.find((f) => f.fragmentId === "listening-assets");
  if (!listening) throw new Error("listening fragment missing");
  // Replace one publisher media path rather than changing mapping cardinality unexpectedly.
  const publisher = (listening.mediaAssets ?? []).find((m) => m.origin === "publisher");
  if (publisher?.variants?.[0]) {
    publisher.variants[0].path = pathRef;
  } else {
    listening.mediaAssets = [
      ...(listening.mediaAssets ?? []),
      {
        kind: "MediaAsset",
        id: "media:fixture-rights-gated",
        mediaKind: "audio",
        origin: "publisher",
        locale: "de-DE",
        variants: [{ path: pathRef, role: "master" }],
        reviewStatus: "candidate",
        linkedConceptIds: [],
        sourceAssertionIds: [],
        publication: { status: "draft", publishedFields: [] },
      },
    ];
  }
  return clone;
}

export function withContradictoryActivityOwnership(
  fragments: ContentFragment[],
  activityId = "activity:lesson-01-checkpoint-summary",
  wrongLessonId: "lesson:01" | "lesson:02" = "lesson:02",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const activities = clone.find((f) => f.fragmentId === "activities");
  const activity = activities?.learningActivities?.find((a) => a.id === activityId);
  if (!activity) throw new Error(`activity ${activityId} missing`);
  activity.lessonId = wrongLessonId;
  return clone;
}

export function withPublishedActivityUnpublishedCollection(
  fragments: ContentFragment[],
  activityId = "activity:lesson-02-teacher-professions-deck",
  collectionId = "collection:teacher-professions",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const activities = clone.find((f) => f.fragmentId === "activities");
  const activity = activities?.learningActivities?.find((a) => a.id === activityId);
  if (!activity) throw new Error(`activity ${activityId} missing`);
  activity.publication = {
    status: "published",
    publishedFields: activity.publication?.publishedFields?.length
      ? activity.publication.publishedFields
      : [{ field: "prompt", assertionId: activity.sourceAssertionIds[0]! as `assert:${string}` }],
  };
  activity.conceptIds = [collectionId];

  let teacher = clone.find((f) => f.fragmentId === "teacher-professions");
  if (!teacher) {
    teacher = {
      schemaVersion: clone[0]!.schemaVersion,
      fragmentId: "teacher-professions",
      collections: [],
      lexemes: [],
    };
    clone.push(teacher);
  }
  if (!teacher.collections?.some((c) => c.id === collectionId)) {
    teacher.collections = [
      ...(teacher.collections ?? []),
      {
        kind: "Collection",
        id: collectionId as `collection:${string}`,
        titleEn: "Teacher professions",
        membership: { mode: "static", memberIds: ["lex:fixture-shared"] },
        lessonLinks: [],
        sourcePriority: 3,
        relationIds: [],
        sourceAssertionIds: [],
        publication: { status: "review", publishedFields: [] },
      },
    ];
  } else {
    const coll = teacher.collections.find((c) => c.id === collectionId)!;
    coll.publication = { status: "review", publishedFields: [] };
  }
  return clone;
}

export function withNonPortablePath(
  fragments: ContentFragment[],
  pathRef: string,
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  const lesson01 = clone.find((f) => f.fragmentId === "lesson-01");
  if (!lesson01?.sources?.[0]) throw new Error("lesson-01 sources missing");
  lesson01.sources[0].originalPath = pathRef;
  return clone;
}

/**
 * Reviewer probe: nest a forbidden MP3 path inside a sourceAssertion value object.
 * Exact contract path used by C1R2 regression coverage.
 */
export function withLeakedMp3InSourceAssertionValue(
  fragments: ContentFragment[],
  leakedPath = "resources/original/audio/private-source.mp3",
): ContentFragment[] {
  const clone = deepCloneJson(fragments);
  for (const fragment of clone) {
    const assertion = fragment.sourceAssertions?.[0];
    if (!assertion) continue;
    const value =
      assertion.value != null &&
      typeof assertion.value === "object" &&
      !Array.isArray(assertion.value)
        ? { ...(assertion.value as Record<string, unknown>) }
        : {};
    (value as Record<string, unknown>).leakedPath = leakedPath;
    assertion.value = value;
    return clone;
  }
  throw new Error("no sourceAssertions available to inject leaked MP3 path");
}

export type { AggregatedPublicationMetadata, PublicationWorkbookMapping };
export { isForbiddenMp3PathString };
