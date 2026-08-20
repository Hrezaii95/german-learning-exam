/**
 * Vocabulary media gap scan.
 *
 * Step 1 of the media pipeline: list every vocabulary lexeme and report which
 * pieces of its card are missing. A pure join over data already on disk —
 * the learner detail projection, the illustration map and the TTS manifest —
 * so it is re-runnable at any time and never goes stale.
 *
 *   node tools/media-gap-scan.mjs            # human summary
 *   node tools/media-gap-scan.mjs --json     # machine-readable, for the pipeline
 *
 * Writes research/media-gap-scan.json. Exit code is always 0: this reports a
 * backlog, it does not gate a release.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(repoRoot, "platform", "apps", "web");
const LIVE = "https://hrezaii95.github.io/german-learning-exam";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const details = (() => {
  const raw = read(path.join(web, "generated", "learner-details.json"));
  if (Array.isArray(raw)) return raw;
  return raw.details ?? raw.records ?? Object.values(raw).find(Array.isArray) ?? [];
})();

// The illustration map is source, not data: read the ids it mentions.
const illustrationSource = readFileSync(path.join(web, "lib", "content", "illustrations.ts"), "utf8");
const illustrated = new Set(illustrationSource.match(/lex:[a-z0-9-]+/g) ?? []);

const tts = read(path.join(web, "public", "audio", "tts-de-de-v1", "manifest.json"));
const spokenTexts = new Set(tts.assets.map((a) => a.spokenText));

const vocab = details
  .filter((r) => typeof r.id === "string" && r.id.startsWith("lex:"))
  .sort((a, b) => a.id.localeCompare(b.id, "en"));

const rows = vocab.map((r) => {
  const plurals = r.plurals ?? [];
  // A plural is "spoken" only if some clip says that exact plural form.
  const pluralSpoken = plurals.length > 0 && plurals.every((p) => spokenTexts.has(p));
  return {
    id: r.id,
    lemma: r.lemma ?? "",
    display: r.displayText ?? "",
    gender: r.gender ?? null,
    meaningEn: r.meaningEn ?? "",
    plurals,
    lessonIds: r.lessonIds ?? [],
    cardUrl: `${LIVE}${r.canonicalPath ?? ""}`,
    has: {
      image: illustrated.has(r.id),
      lemmaAudio: Boolean(r.media?.publicPath),
      pluralAudio: pluralSpoken,
      example: Boolean(r.exampleDe ?? r.example?.de ?? r.example),
    },
  };
});

const missing = {
  image: rows.filter((r) => !r.has.image).map((r) => r.id),
  lemmaAudio: rows.filter((r) => !r.has.lemmaAudio).map((r) => r.id),
  pluralAudio: rows.filter((r) => r.plurals.length > 0 && !r.has.pluralAudio).map((r) => r.id),
  example: rows.filter((r) => !r.has.example).map((r) => r.id),
};

const report = {
  schemaVersion: 1,
  total: rows.length,
  complete: {
    image: rows.length - missing.image.length,
    lemmaAudio: rows.length - missing.lemmaAudio.length,
    pluralAudio: rows.filter((r) => r.plurals.length > 0).length - missing.pluralAudio.length,
    example: rows.length - missing.example.length,
  },
  missingCounts: Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, v.length])),
  missing,
  rows,
};

const outPath = path.join(repoRoot, "research", "media-gap-scan.json");
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report.missing, null, 2));
} else {
  console.log(`vocabulary lexemes: ${report.total}`);
  for (const key of ["image", "lemmaAudio", "pluralAudio", "example"]) {
    console.log(`  ${key.padEnd(12)} have ${String(report.complete[key]).padStart(3)}   missing ${report.missingCounts[key]}`);
  }
  console.log(`\nwritten ${path.relative(repoRoot, outPath)}`);
}
