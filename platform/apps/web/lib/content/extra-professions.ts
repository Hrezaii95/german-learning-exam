import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePublishedPronunciationExact } from "./media-availability";

export type ExtraProfessionForm = {
  singular: string;
  plural: string;
};

export type ExtraProfessionRow = {
  id: string;
  sourceRow: number;
  routeSegment: string;
  meaningEn: string;
  masculine: readonly ExtraProfessionForm[];
  feminine: readonly ExtraProfessionForm[];
  hasAlternatives: boolean;
  validationStatus: "candidate-needs-german-review";
  detailPath: string;
  searchText: string;
};

export type ExtraProfessionsProjection = {
  schemaVersion: "1.0.0";
  projectionKind: "learner-extra-professions";
  collection: {
    id: "collection:teacher-professions";
    slug: "professions";
    titleDe: string;
    titleEn: string;
    canonicalPath: "/collections/professions";
    inclusion: "optional";
    coreLessonCompletion: false;
    lessonId: "lesson:02";
    sourcePriority: 3;
    sourceStatus: "candidate";
    humanLanguageReviewRequired: true;
    sourceRowCount: 48;
    sourceFormLexemeCount: number;
    fragmentLexemeRecordCount: number;
    detailRouteCount: 48;
    media: {
      /** Original/source audio supplied with this optional collection. */
      audioAvailable: false;
      synthesizedPreviewAvailable: boolean;
      synthesizedPreviewAssetCount: number;
      synthesizedPreviewRowCount: number;
      imagesAvailable: false;
      message: string;
    };
  };
  rows: readonly ExtraProfessionRow[];
  rowsBySegment: Readonly<Record<string, ExtraProfessionRow>>;
};

type SourceRowValue = {
  sourceRow: number;
  teacherJobId: string;
  meaningEn: string;
  masculineSingularSource: string;
  masculinePluralSource: string;
  feminineSingularSource: string;
  femininePluralSource: string;
  alternatives: {
    masculine: string[];
    feminine: string[];
  };
  validationStatus: string;
};

type TeacherFragment = {
  fragmentId: string;
  meta?: { teacherSourceRows?: Array<{ sourceRow: number; subjectId: string }> };
  sourceAssertions?: Array<{
    id: string;
    sourceId: string;
    field: string;
    status: string;
    value: unknown;
  }>;
  mediaAssets?: unknown[];
  lexemes?: unknown[];
  collections?: Array<{
    id: string;
    titleDe?: string;
    titleEn: string;
    sourcePriority: number;
    lessonLinks: Array<{ lessonId: string; required: boolean }>;
    publication: { status: string };
  }>;
};

const here = dirname(fileURLToPath(import.meta.url));
export const GENERATED_EXTRA_PROFESSIONS_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-extra-professions.json",
);

function fail(message: string): never {
  throw new Error(`EXTRA_PROFESSIONS_PROJECTION_FAILED: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`Missing ${field}`);
  }
  return value.normalize("NFC");
}

function parseSourceRow(value: unknown): SourceRowValue {
  if (!isRecord(value)) fail("sourceRow assertion value is not an object");
  if (!Number.isInteger(value.sourceRow)) fail("sourceRow must be an integer");
  if (!isRecord(value.alternatives)) fail(`row ${String(value.sourceRow)} alternatives missing`);
  const masculineAlternatives = value.alternatives.masculine;
  const feminineAlternatives = value.alternatives.feminine;
  if (!Array.isArray(masculineAlternatives) || !Array.isArray(feminineAlternatives)) {
    fail(`row ${String(value.sourceRow)} alternatives must be arrays`);
  }
  return {
    sourceRow: value.sourceRow as number,
    teacherJobId: requireString(value.teacherJobId, "teacherJobId"),
    meaningEn: requireString(value.meaningEn, "meaningEn"),
    masculineSingularSource: requireString(value.masculineSingularSource, "masculine singular"),
    masculinePluralSource: requireString(value.masculinePluralSource, "masculine plural"),
    feminineSingularSource: requireString(value.feminineSingularSource, "feminine singular"),
    femininePluralSource: requireString(value.femininePluralSource, "feminine plural"),
    alternatives: {
      masculine: masculineAlternatives.map((item) => requireString(item, "masculine alternative")),
      feminine: feminineAlternatives.map((item) => requireString(item, "feminine alternative")),
    },
    validationStatus: requireString(value.validationStatus, "validationStatus"),
  };
}

function splitForms(value: string): string[] {
  return value.split(/\s+\/\s+/u).map((part) => part.trim().normalize("NFC"));
}

function stripArticle(value: string): string {
  return value.replace(/^(?:der|die|das)\s+/u, "");
}

function pairForms(
  singularSource: string,
  pluralSource: string,
  gender: "masculine" | "feminine",
): ExtraProfessionForm[] {
  const singular = splitForms(singularSource);
  const plural = splitForms(pluralSource);
  if (singular.length !== plural.length) {
    fail(`${gender} singular/plural alternative count mismatch`);
  }
  const singularArticle = gender === "masculine" ? "der " : "die ";
  if (singular.some((form) => !form.startsWith(singularArticle))) {
    fail(`${gender} singular article mismatch`);
  }
  if (plural.some((form) => !form.startsWith("die "))) {
    fail(`${gender} plural article mismatch`);
  }
  return singular.map((form, index) =>
    Object.freeze({ singular: form, plural: plural[index]! }),
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  return value;
}

export function projectExtraProfessionsFragment(
  fragment: TeacherFragment,
): ExtraProfessionsProjection {
  if (fragment.fragmentId !== "teacher-professions") fail("wrong fragment");
  const collection = fragment.collections?.find(
    (item) => item.id === "collection:teacher-professions",
  );
  if (!collection) fail("collection record missing");
  if (collection.publication.status !== "review") fail("collection must remain review-only");
  if (collection.sourcePriority !== 3) fail("collection source priority must be 3");
  const lessonLink = collection.lessonLinks.find((link) => link.lessonId === "lesson:02");
  if (!lessonLink || lessonLink.required !== false) {
    fail("collection must be optional for Lesson 2");
  }
  if ((fragment.mediaAssets?.length ?? 0) !== 0) fail("unexpected professions media assets");

  const assertions = (fragment.sourceAssertions ?? []).filter(
    (assertion) =>
      assertion.sourceId === "source:teacher-professions-note" &&
      assertion.field === "sourceRow",
  );
  if (assertions.length !== 48) fail(`expected 48 source rows, found ${assertions.length}`);

  const rows = assertions
    .map((assertion) => {
      if (assertion.status !== "candidate") fail(`${assertion.id} must remain candidate`);
      const source = parseSourceRow(assertion.value);
      if (source.validationStatus !== "candidate-needs-german-review") {
        fail(`row ${source.sourceRow} has unsupported validation status`);
      }
      const masculine = pairForms(
        source.masculineSingularSource,
        source.masculinePluralSource,
        "masculine",
      );
      const feminine = pairForms(
        source.feminineSingularSource,
        source.femininePluralSource,
        "feminine",
      );
      const expectedMasculine = masculine.map((form) => stripArticle(form.singular));
      const expectedFeminine = feminine.map((form) => stripArticle(form.singular));
      const declaredMasculine = source.alternatives.masculine.map(stripArticle);
      const declaredFeminine = source.alternatives.feminine.map(stripArticle);
      if (JSON.stringify(expectedMasculine) !== JSON.stringify(declaredMasculine)) {
        fail(`row ${source.sourceRow} masculine alternatives drifted from source`);
      }
      if (JSON.stringify(expectedFeminine) !== JSON.stringify(declaredFeminine)) {
        fail(`row ${source.sourceRow} feminine alternatives drifted from source`);
      }
      const routeSegment = String(source.sourceRow).padStart(2, "0");
      const searchText = [
        source.meaningEn,
        ...masculine.flatMap((form) => [form.singular, form.plural]),
        ...feminine.flatMap((form) => [form.singular, form.plural]),
      ]
        .join(" ")
        .normalize("NFC");
      return Object.freeze({
        id: source.teacherJobId,
        sourceRow: source.sourceRow,
        routeSegment,
        meaningEn: source.meaningEn,
        masculine: Object.freeze(masculine),
        feminine: Object.freeze(feminine),
        hasAlternatives: masculine.length > 1 || feminine.length > 1,
        validationStatus: "candidate-needs-german-review" as const,
        detailPath: `/collections/professions/${routeSegment}`,
        searchText,
      });
    })
    .sort((a, b) => a.sourceRow - b.sourceRow);

  rows.forEach((row, index) => {
    if (row.sourceRow !== index + 1) fail(`missing or duplicate source row ${index + 1}`);
  });
  if (new Set(rows.map((row) => row.id)).size !== 48) fail("duplicate teacher job id");
  const metadataRows = fragment.meta?.teacherSourceRows ?? [];
  if (metadataRows.length !== 48) fail("teacherSourceRows metadata count mismatch");
  rows.forEach((row, index) => {
    if (metadataRows[index]?.sourceRow !== row.sourceRow) {
      fail(`teacherSourceRows metadata ordering mismatch at row ${row.sourceRow}`);
    }
  });

  const sourceFormLexemeCount = rows.reduce(
    (count, row) => count + row.masculine.length + row.feminine.length,
    0,
  );
  const synthesizedPreviewCounts = rows.map((row) =>
    [...row.masculine, ...row.feminine].reduce(
      (count, form) =>
        count +
        (resolvePublishedPronunciationExact(form.singular).state === "preview" ? 1 : 0) +
        (resolvePublishedPronunciationExact(form.plural).state === "preview" ? 1 : 0),
      0,
    ),
  );
  const synthesizedPreviewAssetCount = synthesizedPreviewCounts.reduce((sum, count) => sum + count, 0);
  const synthesizedPreviewRowCount = synthesizedPreviewCounts.filter((count) => count > 0).length;
  const rowsBySegment = Object.freeze(
    Object.fromEntries(rows.map((row) => [row.routeSegment, row])),
  );
  return Object.freeze({
    schemaVersion: "1.0.0",
    projectionKind: "learner-extra-professions",
    collection: Object.freeze({
      id: "collection:teacher-professions",
      slug: "professions",
      titleDe: collection.titleDe ?? "Berufe — Lehrermaterial",
      titleEn: collection.titleEn,
      canonicalPath: "/collections/professions",
      inclusion: "optional",
      coreLessonCompletion: false,
      lessonId: "lesson:02",
      sourcePriority: 3,
      sourceStatus: "candidate",
      humanLanguageReviewRequired: true,
      sourceRowCount: 48,
      sourceFormLexemeCount,
      fragmentLexemeRecordCount: fragment.lexemes?.length ?? 0,
      detailRouteCount: 48,
      media: Object.freeze({
        audioAvailable: false,
        synthesizedPreviewAvailable: synthesizedPreviewAssetCount > 0,
        synthesizedPreviewAssetCount,
        synthesizedPreviewRowCount,
        imagesAvailable: false,
        message: `${synthesizedPreviewAssetCount} exact owner-authorized synthesized previews are playable across ${synthesizedPreviewRowCount} rows; source audio and profession images are not published. Independent German listening review remains pending.`,
      }),
    }),
    rows: Object.freeze(rows),
    rowsBySegment,
  });
}

export function projectPublishedExtraProfessions(
  publishedDir: string,
): ExtraProfessionsProjection {
  const fragment = JSON.parse(
    readFileSync(join(publishedDir, "teacher-professions.json"), "utf8"),
  ) as TeacherFragment;
  return projectExtraProfessionsFragment(fragment);
}

export function serializeExtraProfessionsProjection(
  projection: ExtraProfessionsProjection,
): string {
  return `${stableStringify(projection)}\n`;
}

let cached: ExtraProfessionsProjection | null = null;

export function loadExtraProfessionsProjection(): ExtraProfessionsProjection {
  if (cached) return cached;
  const parsed = JSON.parse(
    readFileSync(GENERATED_EXTRA_PROFESSIONS_PATH, "utf8"),
  ) as ExtraProfessionsProjection;
  if (
    parsed.projectionKind !== "learner-extra-professions" ||
    parsed.collection.sourceRowCount !== 48 ||
    parsed.collection.coreLessonCompletion !== false ||
    parsed.rows.length !== 48 ||
    Object.keys(parsed.rowsBySegment).length !== 48
  ) {
    fail("generated projection is invalid or incomplete");
  }
  cached = Object.freeze(parsed);
  return cached;
}
