import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const outputDir = join(root, "media", "generated", "tts-de-de-v1");
const manifestPath = join(
  root,
  "media",
  "manifests",
  "exact-tts-gap-supplement-v1.json",
);
const auditPath = join(
  root,
  "media",
  "qa",
  "exact-tts-gap-supplement-v1-technical-audit.json",
);

const voice = "de-DE-KatjaNeural";
const rate = "+4%";

// Exact Unicode strings missing from the published Lesson 1 and 2 detail and
// activity projections on 2026-08-13. Keep this list explicit: the generated
// byte corpus remains reproducible even after the published gap report becomes
// empty. These are owner-authorized synthesized PREVIEWS, not pronunciation
// assets that have passed an independent German listening review.
const sourceTexts = Object.freeze([
  "Ä Ö Ü ß",
  "M I R I A M",
  "achtundachtzig",
  "Beruf ausdrücken",
  "die Schweiz",
  "die Türkei",
  "die USA",
  "du und Sie",
  "einundzwanzig",
  "hundert",
  "Herkunft mit aus",
  "neunundneunzig",
  "Personalpronomen",
  "Präsens: alle Personen",
  "Präsensformen",
  "Satzstellung im Aussagesatz",
  "sechsundvierzig",
  "siebenunddreißig",
  "Verneinung mit nicht",
  "vierundsechzig",
  "Weibliche Berufsformen",
  "Wie alt bist du?",
  "Wie alt sind Sie?",
  "Wo wohnen Sie?",
  "Wo wohnst du?",
  "W-Fragen",
  "zweiundsiebzig",
]);

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function toPosix(path) {
  return path.split("\\").join("/");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status ?? "no status"}): ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

function probe(path) {
  const raw = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name,sample_rate,channels",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    path,
  ]);
  const data = JSON.parse(raw);
  const stream = data.streams?.[0];
  const duration = Number(data.format?.duration);
  if (!stream || !Number.isFinite(duration)) {
    throw new Error(`ffprobe returned incomplete audio metadata for ${path}`);
  }
  return {
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    durationSeconds: duration,
  };
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(dirname(manifestPath), { recursive: true });
mkdirSync(dirname(auditPath), { recursive: true });

if (existsSync(manifestPath) || existsSync(auditPath)) {
  if (!existsSync(manifestPath) || !existsSync(auditPath)) {
    throw new Error("Gap supplement manifest/audit must either both exist or both be absent");
  }
  const existing = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (
    existing.voice !== voice ||
    existing.rate !== rate ||
    JSON.stringify(existing.assets.map((asset) => asset.spokenText)) !== JSON.stringify(sourceTexts)
  ) {
    throw new Error("Existing gap supplement does not match the versioned source-text contract");
  }
  for (const asset of existing.assets) {
    const path = join(root, ...asset.path.split("/"));
    if (
      !existsSync(path) ||
      statSync(path).size !== asset.bytes ||
      sha256File(path) !== asset.sha256
    ) {
      throw new Error(`Existing gap supplement bytes do not match manifest: ${asset.id}`);
    }
  }
  process.stdout.write(`Verified ${existing.assetCount} existing exact TTS gap clips.\n`);
  process.exit(0);
}

const assets = [];
const technicalAssets = [];
for (const spokenText of sourceTexts) {
  const textHash = sha256Bytes(spokenText).slice(0, 16);
  const id = `aud:tts:${textHash}:v1`;
  const filename = `tts-${textHash}.mp3`;
  const absolutePath = join(outputDir, filename);
  run("edge-tts", [
    "--voice",
    voice,
    `--rate=${rate}`,
    "--text",
    spokenText,
    "--write-media",
    absolutePath,
  ]);
  const bytes = statSync(absolutePath).size;
  const hash = sha256File(absolutePath);
  const technical = probe(absolutePath);
  if (
    technical.codec !== "mp3" ||
    technical.sampleRate !== 24000 ||
    technical.channels !== 1 ||
    bytes === 0
  ) {
    throw new Error(`Generated clip failed technical requirements: ${id}`);
  }
  const path = toPosix(relative(root, absolutePath));
  assets.push({
    id,
    kind: "speech",
    origin: "generated-prototype-edge-tts",
    locale: "de-DE",
    voice,
    rate,
    spokenText,
    conceptIds: ["lesson:01", "lesson:02"],
    path,
    bytes,
    sha256: hash,
    reviewStatus: "candidate-needs-listening-review",
  });
  technicalAssets.push({
    id,
    path,
    spokenText,
    conceptIds: ["lesson:01", "lesson:02"],
    bytes,
    sha256: hash,
    ...technical,
    riskTags: ["independent-german-listening-review-pending"],
    technicalStatus: "pass",
    humanReviewStatus: "candidate-needs-listening-review",
  });
}

const generatedAt = new Date().toISOString();
const manifest = {
  schemaVersion: 1,
  generatedAt,
  generator: { name: "edge-tts", version: "7.2.7" },
  voice,
  rate,
  purpose: "Exact-source owner-authorized synthesized preview gap supplement for Lessons 1 and 2",
  independentGermanListeningReview: "pending",
  assetCount: assets.length,
  assets,
};
const audit = {
  schemaVersion: 1,
  generatedAt,
  voice,
  rate,
  purpose: "Technical validation only; not a German pronunciation approval",
  technicalGate: "pass",
  independentGermanListeningReview: "pending",
  assetCount: technicalAssets.length,
  assets: technicalAssets,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
process.stdout.write(
  `Generated ${assets.length} exact TTS gap clips; independent German listening review remains pending.\n`,
);
