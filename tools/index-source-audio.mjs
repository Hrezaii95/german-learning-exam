import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = resolve("resources/original/audio/Audio-20260730T043413Z-1-001");
const output = resolve("content/source-index/audio-inventory.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")) files.push(path);
  }
  return files;
}

function classify(pack, filename) {
  const isGermanWorkbook = pack === "Momente_A1_1_AB_CD1" || pack === "Momente_A1_1_AB_CD2";
  const isCoursebook = pack.includes("KB_");
  const locale = pack.includes("_CZ_") ? "cs-CZ/de-DE-mixed-or-localized" : pack.includes("_SK_") ? "sk-SK/de-DE-mixed-or-localized" : "de-DE";
  const lessonMatch = filename.match(/(?:_L|A11_)(\d{1,2})(?:_|\b)/i);
  const alphaCandidate = pack === "Momente_A1_1_AB_CD1" && /_A11_[12]_/.test(filename);
  return {
    locale,
    sourceType: isCoursebook ? "coursebook-audio" : "workbook-audio",
    inferredLesson: lessonMatch ? Number(lessonMatch[1]) : null,
    alphaStatus: alphaCandidate ? "candidate-needs-transcript-alignment" : isGermanWorkbook ? "indexed-outside-current-lesson-or-unresolved" : "quarantined-localized-or-out-of-scope",
  };
}

const files = (await walk(root)).sort((a, b) => a.localeCompare(b));
const tracks = [];
for (const path of files) {
  const bytes = await readFile(path);
  const pathFromRoot = relative(resolve("resources/original"), path).replaceAll("\\", "/");
  const pack = basename(dirname(path));
  const filename = basename(path);
  let durationSeconds = null;
  try {
    durationSeconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], { encoding: "utf8" }).trim());
    durationSeconds = Math.round(durationSeconds * 1000) / 1000;
  } catch {}
  tracks.push({
    id: `src-audio:${pack.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}:${filename.replace(/\.mp3$/i, "").toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
    originalPath: pathFromRoot,
    filename,
    pack,
    bytes: bytes.length,
    durationSeconds,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...classify(pack, filename),
    mapping: { status: "unmapped", transcriptSourceId: null, lessonId: null, exercise: null, segmentIds: [] },
  });
}

const packs = Object.values(Object.groupBy(tracks, (track) => track.pack)).map((items) => ({
  pack: items[0].pack,
  trackCount: items.length,
  bytes: items.reduce((total, item) => total + item.bytes, 0),
  locale: items[0].locale,
  sourceType: items[0].sourceType,
})).sort((a, b) => a.pack.localeCompare(b.pack));

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), immutableRoot: "resources/original/audio/Audio-20260730T043413Z-1-001", trackCount: tracks.length, totalBytes: tracks.reduce((sum, item) => sum + item.bytes, 0), packs, tracks }, null, 2)}\n`);
console.log(`Indexed ${tracks.length} tracks into ${relative(process.cwd(), output)}.`);
