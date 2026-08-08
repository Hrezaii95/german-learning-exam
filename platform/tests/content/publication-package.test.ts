import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PUBLICATION_FRAGMENT_FILES,
  collectForbiddenMp3PathStrings,
  collectPublicSourceMp3Paths,
  isForbiddenMp3PathString,
  isNonPortableFilesystemPath,
  isRightsGatedUri,
  loadAndValidatePublication,
  loadPublicationFragments,
  loadWorkbookAuthorityProjection,
  mergePublicationFragments,
  pathComponentEndsWithMp3,
  resolveAuthorityProjectionPath,
  validatePublicationCountGates,
  validatePublicationFragments,
  withAttemptedPublicSourceMp3,
  withContradictoryActivityOwnership,
  withDuplicateCrossFragmentId,
  withDuplicateTeacherRow,
  withFabricatedTeacherRow,
  withLeakedMp3InSourceAssertionValue,
  withMissingActivity,
  withMissingTeacherRow,
  withNonPortablePath,
  withPublishedActivityUnpublishedCollection,
  withRightsGatedPublisherUri,
} from "@german-learning/content";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(HERE, "fixtures/publication-package");
const POSITIVE_DIR = join(FIXTURE_ROOT, "positive");
const MISSING_FRAGMENT_DIR = join(FIXTURE_ROOT, "missing-fragment");
const REAL_PUBLISHED_DIR = join(HERE, "../../content/published");

describe("C1A publication loader and merge", () => {
  it("positive: five fragments merge into one aggregate bundle", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    expect(loaded.ok).toBe(true);
    expect(loaded.fragments).toHaveLength(5);
    expect(loaded.issues).toEqual([]);

    const merged = mergePublicationFragments(loaded.fragments);
    expect(merged.ok).toBe(true);
    expect(merged.bundle).not.toBeNull();
    expect(merged.bundle!.lessons.map((l) => l.id).sort()).toEqual([
      "lesson:01",
      "lesson:02",
    ]);
    expect(merged.bundle!.learningActivities).toHaveLength(24);
  });

  it("positive: merge then ContentBundle validation passes for fixture package", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const result = validatePublicationFragments(loaded.fragments);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("positive: count gates pass using metadata envelope (not ContentBundle widening)", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const validated = validatePublicationFragments(loaded.fragments);
    expect(validated.bundle).not.toBeNull();
    const gates = validatePublicationCountGates(validated.bundle!, loaded.fragments);
    expect(gates.ok).toBe(true);
    expect(gates.counts.lesson01ActivityCount).toBe(12);
    expect(gates.counts.lesson02ActivityCount).toBe(12);
    expect(gates.counts.teacherSourceRows).toEqual(
      Array.from({ length: 48 }, (_, i) => i + 1),
    );
    expect(gates.meta.teacherSourceRows).toHaveLength(48);
    expect(gates.meta.teacherSourceRows.every((r) => typeof r.subjectId === "string")).toBe(
      true,
    );
    expect(gates.counts.unresolvedTeacherSourceRows).toEqual([]);
    expect(gates.counts.workbookMappings).toBe(15);
    expect(gates.counts.publisherMediaCount).toBe(15);
    expect(gates.counts.listeningAssetCount).toBe(15);
    expect(gates.counts.publicSourceMp3Paths).toEqual([]);
    expect(gates.counts.forbiddenEmbeddedMp3Paths).toEqual([]);
    expect(gates.counts.slashLemmas).toEqual([]);
    expect(gates.counts.portablePathViolations).toEqual([]);
    expect(
      Object.prototype.hasOwnProperty.call(validated.bundle!, "teacherSourceRows"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(validated.bundle!, "workbookMappings"),
    ).toBe(false);
  });

  it("negative: missing fragment yields stable MISSING_FRAGMENT diagnostic", () => {
    const names = readdirSync(MISSING_FRAGMENT_DIR).filter((n) => n.endsWith(".json")).sort();
    expect(names).toEqual(
      [...PUBLICATION_FRAGMENT_FILES].filter((f) => f !== "listening-assets.json").sort(),
    );

    const loaded = loadPublicationFragments({ publishedDir: MISSING_FRAGMENT_DIR });
    expect(loaded.ok).toBe(false);
    const missing = loaded.issues.filter((i) => i.code === "MISSING_FRAGMENT");
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(missing.some((i) => i.objectId === "listening-assets")).toBe(true);
    expect(missing.some((i) => i.field === "listening-assets.json")).toBe(true);
  });

  it("negative: duplicate cross-fragment ID fails merge before normal validation", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withDuplicateCrossFragmentId(loaded.fragments, "lex:fixture-shared");
    const merged = mergePublicationFragments(poisoned);
    expect(merged.ok).toBe(false);
    expect(
      merged.issues.some(
        (i) => i.code === "DUPLICATE_ID" && i.objectId === "lex:fixture-shared",
      ),
    ).toBe(true);
  });

  it("negative: missing activity fails count gate", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withMissingActivity(loaded.fragments);
    const validated = validatePublicationFragments(poisoned);
    expect(validated.bundle).not.toBeNull();
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(gates.counts.learningActivities).toBe(23);
    expect(gates.issues.some((i) => i.code === "PUBLICATION_GATE")).toBe(true);
  });

  it("negative: missing teacher row is unresolved via metadata envelope", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withMissingTeacherRow(loaded.fragments, 48);
    const validated = validatePublicationFragments(poisoned);
    expect(validated.bundle).not.toBeNull();
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(gates.meta.teacherSourceRows.map((r) => r.sourceRow)).not.toContain(48);
    expect(gates.counts.unresolvedTeacherSourceRows).toEqual([48]);
  });

  it("negative: duplicate teacher row metadata is rejected (no silent dedup)", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withDuplicateTeacherRow(loaded.fragments, 1);
    const validated = validatePublicationFragments(poisoned);
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(
      gates.issues.some((i) => i.message.includes("Duplicate teacher sourceRow")),
    ).toBe(true);
  });

  it("negative: fabricated teacher row fails bijection", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withFabricatedTeacherRow(loaded.fragments);
    const validated = validatePublicationFragments(poisoned);
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
  });

  it("negative: attempted public source MP3 is detected by count gate", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withAttemptedPublicSourceMp3(loaded.fragments);
    const validated = validatePublicationFragments(poisoned);
    expect(validated.bundle).not.toBeNull();
    const mp3s = collectPublicSourceMp3Paths(validated.bundle!);
    expect(mp3s.length).toBeGreaterThan(0);
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(gates.counts.publicSourceMp3Paths.length).toBeGreaterThan(0);
  });

  it("loader accepts explicit fragmentPaths array", () => {
    const fragmentPaths = PUBLICATION_FRAGMENT_FILES.map((f) => join(POSITIVE_DIR, f));
    const loaded = loadPublicationFragments({ fragmentPaths });
    expect(loaded.ok).toBe(true);
    expect(loaded.fragments).toHaveLength(5);
  });
});

describe("C1B/C1R1 rights-gated URI vs public .mp3 distinction", () => {
  it("isRightsGatedUri recognizes only the rights-gated scheme", () => {
    expect(isRightsGatedUri("rights-gated://src-audio:fixture:01.mp3")).toBe(true);
    expect(isRightsGatedUri("rights-gated://src-audio:momente-a1-1-ab-cd1:1-01")).toBe(true);
    expect(isRightsGatedUri("resources/original/audio/track.mp3")).toBe(false);
    expect(isRightsGatedUri("http://example.com/track.mp3")).toBe(false);
    expect(isRightsGatedUri("file:///C:/audio/track.mp3")).toBe(false);
    expect(isRightsGatedUri("C:/audio/track.mp3")).toBe(false);
  });

  it("positive: publisher rights-gated:// URI ending .mp3 is exempt from public MP3 gate", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const gated = withRightsGatedPublisherUri(
      loaded.fragments,
      "rights-gated://src-audio:fixture:01.mp3",
    );
    const validated = validatePublicationFragments(gated);
    expect(validated.bundle).not.toBeNull();
    expect(collectPublicSourceMp3Paths(validated.bundle!)).toEqual([]);
    const gates = validatePublicationCountGates(validated.bundle!, gated);
    expect(gates.counts.publicSourceMp3Paths).toEqual([]);
    expect(
      gates.issues.some(
        (i) => i.code === "PUBLICATION_GATE" && i.field === "mediaAssets.variants.path",
      ),
    ).toBe(false);
  });

  it("negative: relative path ending .mp3 remains a publication-gate failure", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withAttemptedPublicSourceMp3(
      loaded.fragments,
      "resources/original/audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3",
    );
    const validated = validatePublicationFragments(poisoned);
    const mp3s = collectPublicSourceMp3Paths(validated.bundle!);
    expect(mp3s).toEqual([
      "resources/original/audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3",
    ]);
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
  });

  it("negative: http and file .mp3 paths remain publication-gate failures", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    for (const pathRef of [
      "http://cdn.example/audio/track.mp3",
      "https://cdn.example/audio/track.mp3",
      "file:///C:/audio/track.mp3",
      "C:/audio/track.mp3",
    ]) {
      const poisoned = withAttemptedPublicSourceMp3(loaded.fragments, pathRef);
      const validated = validatePublicationFragments(poisoned);
      const mp3s = collectPublicSourceMp3Paths(validated.bundle!);
      expect(mp3s.length).toBe(1);
      expect(pathComponentEndsWithMp3(mp3s[0]!)).toBe(true);
      expect(isRightsGatedUri(mp3s[0]!)).toBe(false);
      const gates = validatePublicationCountGates(validated.bundle!, poisoned);
      expect(gates.ok).toBe(false);
    }
  });

  it("negative: query-string .mp3 bypass is rejected after normalize/strip", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    for (const pathRef of [
      "resources/original/audio/track.mp3?token=abc",
      "http://cdn.example/audio/track.mp3?x=1",
      "track.mp3#frag",
      "media/generated/voice.mp3?download=1",
    ]) {
      expect(pathComponentEndsWithMp3(pathRef)).toBe(true);
      const poisoned = withAttemptedPublicSourceMp3(loaded.fragments, pathRef);
      // Force a non-publisher origin on the injected asset for all-origins coverage.
      const listening = poisoned.find((f) => f.fragmentId === "listening-assets");
      const injected = listening?.mediaAssets?.find((m) => m.id === "media:fixture-public-mp3");
      if (injected) injected.origin = "generated";
      const validated = validatePublicationFragments(poisoned);
      const mp3s = collectPublicSourceMp3Paths(validated.bundle!);
      expect(mp3s).toEqual([pathRef]);
      const gates = validatePublicationCountGates(validated.bundle!, poisoned);
      expect(gates.ok).toBe(false);
    }
  });
});

describe("C1R1 activity ownership and portable paths", () => {
  it("negative: contradictory activity ownership fails gate", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withContradictoryActivityOwnership(loaded.fragments);
    const validated = validatePublicationFragments(poisoned);
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(gates.counts.activityOwnershipMismatches).toContain(
      "activity:lesson-01-checkpoint-summary",
    );
    expect(
      gates.issues.some((i) => i.message.includes("Activity ID prefix must agree")),
    ).toBe(true);
  });

  it("negative: published activity cannot imply unpublished collection/member", () => {
    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    const poisoned = withPublishedActivityUnpublishedCollection(loaded.fragments);
    const validated = validatePublicationFragments(poisoned);
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(
      gates.issues.some((i) =>
        i.message.includes("must not imply publication of unpublished"),
      ),
    ).toBe(true);
  });

  it("negative: /tmp POSIX absolute and UNC paths fail portable-path gate", () => {
    expect(isNonPortableFilesystemPath("/tmp/audio/track.wav")).toBe(true);
    expect(isNonPortableFilesystemPath("\\\\server\\share\\track.wav")).toBe(true);
    expect(isNonPortableFilesystemPath("//server/share/track.wav")).toBe(true);
    expect(isNonPortableFilesystemPath("C:/audio/track.wav")).toBe(true);
    expect(isNonPortableFilesystemPath("content/alpha-content.json")).toBe(false);
    expect(isNonPortableFilesystemPath("rights-gated://src-audio:x")).toBe(false);

    const loaded = loadPublicationFragments({ publishedDir: POSITIVE_DIR });
    for (const pathRef of ["/tmp/audio/track.wav", "\\\\server\\share\\track.wav"]) {
      const poisoned = withNonPortablePath(loaded.fragments, pathRef);
      const validated = validatePublicationFragments(poisoned);
      const gates = validatePublicationCountGates(validated.bundle!, poisoned);
      expect(gates.ok).toBe(false);
      expect(gates.counts.portablePathViolations.length).toBeGreaterThan(0);
    }
  });
});

describe("C1R1 real publication package", () => {
  it("loadAndValidatePublication on real published/ is ok", () => {
    const result = loadAndValidatePublication({ publishedDir: REAL_PUBLISHED_DIR });
    expect(result.ok).toBe(true);
    expect(result.bundle).not.toBeNull();
    expect(result.authority).not.toBeNull();
    expect(result.authority!.mappings).toHaveLength(15);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("real published fragments expose 48 teacher rows and 15 workbook mappings", () => {
    const loaded = loadPublicationFragments({ publishedDir: REAL_PUBLISHED_DIR });
    expect(loaded.ok).toBe(true);
    const teacher = loaded.fragments.find((f) => f.fragmentId === "teacher-professions");
    const listening = loaded.fragments.find((f) => f.fragmentId === "listening-assets");
    expect(teacher?.meta?.teacherSourceRows).toHaveLength(48);
    expect(listening?.meta?.workbookMappings).toHaveLength(15);
    const rows = (teacher?.meta?.teacherSourceRows ?? [])
      .map((r) => r.sourceRow)
      .sort((a, b) => a - b);
    expect(rows).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
    for (const media of listening?.mediaAssets ?? []) {
      if (media.origin !== "publisher") continue;
      for (const variant of media.variants ?? []) {
        expect(isRightsGatedUri(variant.path)).toBe(true);
      }
    }
    expect(
      collectPublicSourceMp3Paths(validatePublicationFragments(loaded.fragments).bundle!),
    ).toEqual([]);
  });

  it("recursive real-package scan: no forbidden MP3 path/URL strings", () => {
    for (const file of PUBLICATION_FRAGMENT_FILES) {
      const raw = JSON.parse(readFileSync(join(REAL_PUBLISHED_DIR, file), "utf8"));
      const hits = collectForbiddenMp3PathStrings(raw);
      expect(hits, file).toEqual([]);
    }
    // Bare basename metadata remains allowed.
    expect(isForbiddenMp3PathString("1_01_AB_Momente_A11_1_3.mp3")).toBe(false);
    expect(
      isForbiddenMp3PathString(
        "audio/Audio-20260730T043413Z-1-001/Audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3",
      ),
    ).toBe(true);
  });

  it("authority projection is pinned without original paths and matches mappings", () => {
    const authorityPath = resolveAuthorityProjectionPath(REAL_PUBLISHED_DIR);
    const authority = loadWorkbookAuthorityProjection(authorityPath);
    expect(authority).not.toBeNull();
    expect(authority!.trackCount).toBe(15);
    expect(authority!.mappings).toHaveLength(15);
    const authorityHits = collectForbiddenMp3PathStrings(authority);
    // Bare filenames in authority are allowed; path-like MP3 strings are not.
    expect(authorityHits).toEqual([]);
    for (const mapping of authority!.mappings) {
      expect("originalPath" in mapping).toBe(false);
      expect(typeof mapping.filename).toBe("string");
      expect(typeof mapping.sha256).toBe("string");
    }

    const result = loadAndValidatePublication({ publishedDir: REAL_PUBLISHED_DIR });
    expect(result.ok).toBe(true);
    const listening = result.fragments.find((f) => f.fragmentId === "listening-assets");
    const publishedIds = new Set(
      (listening?.meta?.workbookMappings ?? []).map((m) => m.sourceAudioId),
    );
    for (const mapping of authority!.mappings) {
      expect(publishedIds.has(mapping.sourceAudioId)).toBe(true);
    }
  });

  it("teacher-professions-deck remains review while collection/members are unpublished", () => {
    const result = loadAndValidatePublication({ publishedDir: REAL_PUBLISHED_DIR });
    expect(result.ok).toBe(true);
    const deck = result.bundle!.learningActivities.find(
      (a) => a.id === "activity:lesson-02-teacher-professions-deck",
    );
    expect(deck?.publication.status).toBe("review");
    expect(deck?.conceptIds).toContain("collection:teacher-professions");
    const collection = result.bundle!.collections.find(
      (c) => c.id === "collection:teacher-professions",
    );
    expect(collection?.publication.status).toBe("review");
  });
});

describe("C1R2 fail-closed authority and recursive rights gate", () => {
  it("negative: real fragmentPaths with no authority must fail PUBLICATION_AUTHORITY", () => {
    const fragmentPaths = PUBLICATION_FRAGMENT_FILES.map((f) =>
      join(REAL_PUBLISHED_DIR, f),
    );
    const result = loadAndValidatePublication({ fragmentPaths });
    expect(result.ok).toBe(false);
    expect(result.authority).toBeNull();
    expect(
      result.issues.some(
        (i) =>
          i.code === "PUBLICATION_AUTHORITY" &&
          i.message.includes("not supplied"),
      ),
    ).toBe(true);
  });

  it("negative: injecting leakedPath into sourceAssertions[0].value fails publication gates", () => {
    const loaded = loadPublicationFragments({ publishedDir: REAL_PUBLISHED_DIR });
    expect(loaded.ok).toBe(true);
    const poisoned = withLeakedMp3InSourceAssertionValue(loaded.fragments);
    const first = poisoned
      .map((f) => f.sourceAssertions?.[0])
      .find((a) => a != null);
    expect(
      (first?.value as { leakedPath?: string } | null)?.leakedPath,
    ).toBe("resources/original/audio/private-source.mp3");

    const validated = validatePublicationFragments(poisoned);
    expect(validated.bundle).not.toBeNull();
    const gates = validatePublicationCountGates(validated.bundle!, poisoned);
    expect(gates.ok).toBe(false);
    expect(gates.counts.forbiddenEmbeddedMp3Paths.length).toBeGreaterThan(0);
    expect(
      gates.counts.forbiddenEmbeddedMp3Paths.some((h) =>
        h.includes("resources/original/audio/private-source.mp3"),
      ),
    ).toBe(true);
    expect(
      gates.issues.some(
        (i) =>
          i.code === "PUBLICATION_GATE" &&
          i.message.includes("Forbidden MP3 path/URL strings"),
      ),
    ).toBe(true);
  });

  it("positive: fragmentPaths with explicit authorityPath still validates", () => {
    const fragmentPaths = PUBLICATION_FRAGMENT_FILES.map((f) =>
      join(REAL_PUBLISHED_DIR, f),
    );
    const authorityPath = resolveAuthorityProjectionPath(REAL_PUBLISHED_DIR);
    const result = loadAndValidatePublication({ fragmentPaths, authorityPath });
    expect(result.ok).toBe(true);
    expect(result.authority).not.toBeNull();
    expect(result.authority!.mappings).toHaveLength(15);
  });
});
