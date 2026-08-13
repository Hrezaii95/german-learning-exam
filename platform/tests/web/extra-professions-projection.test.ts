import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GENERATED_EXTRA_PROFESSIONS_PATH,
  projectExtraProfessionsFragment,
  projectPublishedExtraProfessions,
  serializeExtraProfessionsProjection,
} from "../../apps/web/lib/content/extra-professions.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const teacherPath = join(publishedDir, "teacher-professions.json");
const learnerNotePath = join(
  platformRoot,
  "..",
  "resources",
  "original",
  "learner-notes",
  "Notes_260730_040559.txt",
);

describe("extra professions source-backed projection", () => {
  it("preserves all 48 source rows and all singular/plural alternatives exactly", () => {
    const fragment = JSON.parse(readFileSync(teacherPath, "utf8"));
    const projection = projectExtraProfessionsFragment(fragment);
    const sourceRows = fragment.sourceAssertions
      .filter((assertion: { field: string }) => assertion.field === "sourceRow")
      .sort(
        (a: { value: { sourceRow: number } }, b: { value: { sourceRow: number } }) =>
          a.value.sourceRow - b.value.sourceRow,
      );

    expect(projection.rows).toHaveLength(48);
    expect(projection.collection.sourceRowCount).toBe(48);
    expect(projection.collection.sourceFormLexemeCount).toBe(102);
    expect(projection.collection.fragmentLexemeRecordCount).toBe(86);
    expect(sourceRows).toHaveLength(48);

    for (const [index, row] of projection.rows.entries()) {
      const source = sourceRows[index]!.value;
      expect(row.sourceRow).toBe(index + 1);
      expect(row.meaningEn).toBe(source.meaningEn);
      expect(row.masculine.map((form) => form.singular).join(" / ")).toBe(
        source.masculineSingularSource,
      );
      expect(row.masculine.map((form) => form.plural).join(" / ")).toBe(
        source.masculinePluralSource,
      );
      expect(row.feminine.map((form) => form.singular).join(" / ")).toBe(
        source.feminineSingularSource,
      );
      expect(row.feminine.map((form) => form.plural).join(" / ")).toBe(
        source.femininePluralSource,
      );
      expect(row.validationStatus).toBe("candidate-needs-german-review");
      expect(row.detailPath).toBe(
        `/collections/professions/${String(index + 1).padStart(2, "0")}`,
      );
    }
  });

  it("matches the original learner note independently, row for row", () => {
    const projection = projectPublishedExtraProfessions(publishedDir);
    const lines = readFileSync(learnerNotePath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim().normalize("NFC"))
      .filter(Boolean);
    const firstRow = lines.indexOf("Feminine Plural") + 1;
    const noteEnd = lines.findIndex(
      (line, index) => index > firstRow && line.startsWith("Would you like"),
    );
    const sourceCells = lines.slice(firstRow, noteEnd);
    expect(sourceCells).toHaveLength(48 * 5);

    projection.rows.forEach((row, index) => {
      const sourceRow = sourceCells.slice(index * 5, index * 5 + 5);
      expect([
        row.meaningEn,
        row.masculine.map((form) => form.singular).join(" / "),
        row.masculine.map((form) => form.plural).join(" / "),
        row.feminine.map((form) => form.singular).join(" / "),
        row.feminine.map((form) => form.plural).join(" / "),
      ]).toEqual(sourceRow);
    });
  });

  it("keeps the collection optional, review-only, and honest about absent media", () => {
    const projection = projectPublishedExtraProfessions(publishedDir);
    expect(projection.collection).toMatchObject({
      inclusion: "optional",
      coreLessonCompletion: false,
      lessonId: "lesson:02",
      sourceStatus: "candidate",
      humanLanguageReviewRequired: true,
      detailRouteCount: 48,
      media: {
        audioAvailable: false,
        imagesAvailable: false,
      },
    });
    expect(new Set(projection.rows.map((row) => row.routeSegment)).size).toBe(48);
    expect(projection.rows.filter((row) => row.hasAlternatives).map((row) => row.sourceRow)).toEqual([
      9,
      31,
      39,
    ]);
  });

  it("matches the deterministic generated learner artifact without leaking source paths", () => {
    const projection = projectPublishedExtraProfessions(publishedDir);
    const disk = readFileSync(GENERATED_EXTRA_PROFESSIONS_PATH, "utf8");
    expect(disk).toBe(serializeExtraProfessionsProjection(projection));
    expect(disk).not.toMatch(/resources[\\/]original|assert:|originalPath|\.mp3\b|audioUrl/i);
  });

  it("fails closed if a row is promoted or removed without an explicit policy change", () => {
    const fragment = JSON.parse(readFileSync(teacherPath, "utf8"));
    const promoted = structuredClone(fragment);
    promoted.sourceAssertions.find(
      (assertion: { field: string }) => assertion.field === "sourceRow",
    ).status = "verified";
    expect(() => projectExtraProfessionsFragment(promoted)).toThrow(/must remain candidate/);

    const incomplete = structuredClone(fragment);
    incomplete.sourceAssertions = incomplete.sourceAssertions.filter(
      (assertion: { field: string; value?: { sourceRow?: number } }) =>
        assertion.field !== "sourceRow" || assertion.value?.sourceRow !== 48,
    );
    expect(() => projectExtraProfessionsFragment(incomplete)).toThrow(
      /expected 48 source rows/,
    );
  });
});
