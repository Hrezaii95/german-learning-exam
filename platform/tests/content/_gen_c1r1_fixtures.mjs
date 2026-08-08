/**
 * Regenerates positive publication-package fixtures for C1R1 bijection envelopes.
 * Run: node tests/content/_gen_c1r1_fixtures.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "fixtures/publication-package/positive");

const teacherRows = Array.from({ length: 48 }, (_, i) => ({
  sourceRow: i + 1,
  subjectId: "lex:fixture-shared",
}));

const teacherAssertions = teacherRows.map((r) => ({
  kind: "SourceAssertion",
  id: `assert:fixture-teacher-row-${String(r.sourceRow).padStart(2, "0")}`,
  sourceId: "source:c1a-fixture",
  location: { noteRow: r.sourceRow },
  subjectId: r.subjectId,
  field: "sourceRow",
  value: { sourceRow: r.sourceRow },
  extraction: "manual",
  confidence: 1,
  status: "candidate",
}));

writeFileSync(
  join(FIX, "teacher-professions.json"),
  `${JSON.stringify(
    {
      schemaVersion: "1.0.0",
      fragmentId: "teacher-professions",
      meta: {
        label: "C1A fixture teacher rows envelope",
        generatedFor: "fixture",
        teacherSourceRows: teacherRows,
      },
      sourceAssertions: teacherAssertions,
      collections: [
        {
          kind: "Collection",
          id: "collection:teacher-professions",
          titleEn: "Teacher professions fixture",
          membership: { mode: "static", memberIds: ["lex:fixture-shared"] },
          lessonLinks: [{ lessonId: "lesson:02", sourcePriority: 3, required: false }],
          sourcePriority: 3,
          relationIds: [],
          sourceAssertionIds: [],
          publication: { status: "review", publishedFields: [] },
        },
      ],
      lexemes: [],
    },
    null,
    2,
  )}\n`,
);

const mappings = Array.from({ length: 15 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `workbook-map:fixture-${n}`,
    sourceAudioId: `src-audio:fixture:${n}`,
    filename: `fixture_track_${n}.blocked`,
    exerciseRef: `AB fixture ${i + 1}`,
  };
});

const mediaAssets = [
  {
    kind: "MediaAsset",
    id: "media:fixture-generated-placeholder",
    mediaKind: "audio",
    origin: "generated",
    locale: "de-DE",
    variants: [{ path: "media/generated/fixture/placeholder.wav", role: "master" }],
    reviewStatus: "candidate",
    linkedConceptIds: [],
    sourceAssertionIds: [],
    publication: { status: "draft", publishedFields: [] },
  },
];
const listeningAssets = [];
const listeningAssertions = [];

for (const m of mappings) {
  const slug = m.id.replace("workbook-map:", "");
  const mediaId = `media:workbook-map-${slug}`;
  const listenId = `listen:workbook-${slug}`;
  const rights = `rights-gated://${m.sourceAudioId}`;
  const assertId = `assert:${mediaId.replace(":", "-")}-variants`;
  listeningAssertions.push({
    kind: "SourceAssertion",
    id: assertId,
    sourceId: "source:c1a-fixture",
    location: { exercise: m.exerciseRef },
    subjectId: mediaId,
    field: "variants",
    value: {
      rightsReference: rights,
      filename: m.filename,
      sourceAudioId: m.sourceAudioId,
    },
    extraction: "manual",
    confidence: 1,
    status: "candidate",
  });
  mediaAssets.push({
    kind: "MediaAsset",
    id: mediaId,
    mediaKind: "audio",
    origin: "publisher",
    locale: "de-DE",
    variants: [{ path: rights, role: "master" }],
    reviewStatus: "candidate",
    linkedConceptIds: [],
    sourceAssertionIds: [assertId],
    publication: { status: "review", publishedFields: [] },
  });
  listeningAssets.push({
    kind: "ListeningAsset",
    id: listenId,
    mediaId,
    transcriptSegments: [],
    exerciseRef: m.exerciseRef,
    relationIds: [],
    sourceAssertionIds: [],
    publication: { status: "review", publishedFields: [] },
  });
}

writeFileSync(
  join(FIX, "listening-assets.json"),
  `${JSON.stringify(
    {
      schemaVersion: "1.0.0",
      fragmentId: "listening-assets",
      meta: {
        label: "C1A fixture workbook mappings envelope",
        generatedFor: "fixture",
        workbookMappings: mappings,
      },
      sources: [],
      sourceAssertions: listeningAssertions,
      mediaAssets,
      listeningAssets,
    },
    null,
    2,
  )}\n`,
);

console.log("C1R1 positive fixtures updated");
