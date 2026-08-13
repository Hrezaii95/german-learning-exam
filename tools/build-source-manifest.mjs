import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "resources", "original");
const outputPath = path.join(repoRoot, "content", "source-index", "source-manifest.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function slash(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function classify(relativePath) {
  const normalized = relativePath.toLowerCase();
  const first = normalized.split("/")[0];
  const category = {
    "answer-keys": "answer-key",
    audio: "publisher-audio",
    coursebook: "coursebook",
    glossaries: "glossary",
    "learner-notes": "learner-note",
    "teacher-materials": "teacher-material",
    transcripts: "transcript",
    "visual-reference": "visual-reference",
    workbook: "workbook",
  }[first] ?? "other";

  let language = "de";
  if (normalized.includes("englisch")) language = "de-en";
  else if (normalized.includes("spanisch")) language = "de-es";
  else if (normalized.includes("_cz_")) language = "cs/de";
  else if (normalized.includes("_sk_")) language = "sk/de";
  else if (category === "learner-note") language = "en/de";

  let scope = "reference-only";
  if (["coursebook", "workbook", "glossary", "answer-key", "transcript"].includes(category)) {
    scope = "whole-a1.1-source; lessons-01-02 extraction required";
  } else if (["learner-note", "teacher-material"].includes(category)) {
    scope = "approved lessons-01-02 enrichment candidate";
  } else if (category === "publisher-audio") {
    if (normalized.includes("momente_a1_1_ab_cd1")) scope = "a1.1 lessons-01-06 candidate; transcript alignment required";
    else if (normalized.includes("momente_a1_1_ab_cd2")) scope = "a1.1 lessons-07-12; excluded from Alpha unless evidence says otherwise";
    else if (normalized.includes("kb_cd2")) scope = "coursebook lessons-07-12; excluded from Alpha";
    else if (normalized.includes("kursbuch") && normalized.includes("cd1")) scope = "coursebook audio CD1; tracks 1_01-1_17 named lessons-01-02 candidate; transcript alignment required";
    else if (normalized.includes("kursbuch") && normalized.includes("cd2")) scope = "coursebook lessons-07-12; excluded from Alpha";
    else if (normalized.includes("_cz_") || normalized.includes("_sk_")) scope = "localized pack; quarantined pending language/deduplication review";
    else scope = "publisher audio; scope unknown until transcript alignment";
  }

  return {
    category,
    language,
    scope,
    publication: category === "publisher-audio" ? "private-rights-gated" : "immutable-source-only",
  };
}

const sourceFiles = await walk(sourceRoot);
const records = [];

for (const absolute of sourceFiles) {
  const relativePath = slash(path.relative(sourceRoot, absolute));
  const bytes = await readFile(absolute);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const classification = classify(relativePath);
  records.push({
    id: `src:${classification.category}:${sha256.slice(0, 16)}`,
    path: relativePath,
    extension: path.extname(relativePath).toLowerCase(),
    bytes: bytes.length,
    sha256,
    ...classification,
  });
}

function countsFor(key) {
  return Object.fromEntries(
    [...new Set(records.map((record) => record[key]))]
      .sort()
      .map((value) => [value || "(none)", records.filter((record) => record[key] === value).length]),
  );
}

const manifest = {
  schemaVersion: 1,
  sourceRoot: "resources/original",
  snapshotId: `sha256:${createHash("sha256").update(JSON.stringify(records)).digest("hex")}`,
  immutable: true,
  files: records,
  summary: {
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    unhashedFiles: records.filter((record) => !record.sha256).length,
    extensionCounts: countsFor("extension"),
    categoryCounts: countsFor("category"),
    publicationCounts: countsFor("publication"),
  },
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest.summary, null, 2));
