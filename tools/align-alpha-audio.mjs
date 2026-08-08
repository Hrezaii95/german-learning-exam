import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const inventory = JSON.parse(await readFile(resolve("content/source-index/audio-inventory.json"), "utf8"));
const output = resolve("content/source-index/alpha-workbook-audio-map.json");
const mappings = [
  [[1, 4], "lesson:01", "AB 3", "names and spelling"],
  [[5, 5], "lesson:01", "AB 9a", "sentence melody model"],
  [[6, 6], "lesson:01", "AB 9b", "sentence melody comparison"],
  [[7, 10], "lesson:02", "AB 6a", "telephone number discrimination"],
  [[11, 14], "lesson:02", "AB 6b", "telephone number transcription"],
  [[15, 15], "lesson:02", "AB 12", "profession word stress and repetition"],
];
const candidates = inventory.tracks.filter((track) => track.pack === "Momente_A1_1_AB_CD1");
const tracks = [];
for (const [[start, end], lessonId, exercise, purpose] of mappings) {
  for (let trackNumber = start; trackNumber <= end; trackNumber += 1) {
    const prefix = `${String(trackNumber).padStart(1, "0")}_`;
    const paddedPrefix = `1_${String(trackNumber).padStart(2, "0")}_`;
    const track = candidates.find((item) => item.filename.startsWith(paddedPrefix));
    if (!track) throw new Error(`Missing German workbook track ${paddedPrefix} (${prefix})`);
    tracks.push({ sourceAudioId: track.id, originalPath: track.originalPath, filename: track.filename, durationSeconds: track.durationSeconds, sha256: track.sha256, lessonId, exercise, purpose, evidence: ["filename", "official workbook transcript heading", "workbook exercise reference"], status: "mapped-needs-listening-review" });
  }
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, sourcePack: "Momente_A1_1_AB_CD1", transcriptSource: "resources/original/transcripts/Momente_AB_A1_1_Transskriptionen_2.pdf", redistributionBasis: null, publicBundleStatus: "blocked-pending-recorded-rights", trackCount: tracks.length, tracks }, null, 2)}\n`);
console.log(`Mapped ${tracks.length} Lesson 1–2 German workbook tracks.`);
