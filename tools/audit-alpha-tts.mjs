import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repoRoot, "media", "manifests", "alpha-tts-manifest.json");
const audioRoot = path.join(repoRoot, "media", "generated", "tts-de-de-v1");
const reportPath = path.join(repoRoot, "media", "qa", "alpha-tts-technical-audit.json");
const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const failures = [];
const ids = new Set();
const manifestPaths = new Set();
const auditedAssets = [];
const requiredPrefix = "media/generated/tts-de-de-v1/";

function addFailure(code, asset, detail) {
  failures.push({ code, assetId: asset?.id ?? null, path: asset?.path ?? null, detail });
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
    else addFailure("TTS_UNSUPPORTED_DISK_ENTRY", null, path.relative(repoRoot, absolute).split(path.sep).join("/"));
  }
  return files;
}

function riskTags(asset) {
  const text = asset.spokenText;
  const tags = [];
  if (/[äöüÄÖÜß]/u.test(text)) tags.push("umlaut-or-eszett");
  if (/ch/iu.test(text)) tags.push("ich-or-ach-sound");
  if (/r/iu.test(text)) tags.push("r-sound");
  if (/[bdg](?:[.!?])?$/iu.test(text)) tags.push("final-obstruent");
  if (/\p{L}+(?:in|innen)\b/iu.test(text)) tags.push("feminine-in-or-innen");
  if (/\s/u.test(text)) tags.push("connected-speech");
  if (asset.conceptIds.some((id) => id.startsWith("profession:") || id.startsWith("teacher-job:"))) tags.push("profession-form");
  if (/^(ich|du|er|sie|es|wir|ihr|Sie)\s/u.test(text)) tags.push("conjugated-form");
  return tags;
}

for (const asset of manifest.assets) {
  const failuresBeforeAsset = failures.length;
  const result = {
    id: asset.id,
    path: asset.path,
    spokenText: asset.spokenText,
    conceptIds: asset.conceptIds,
    bytes: null,
    sha256: null,
    codec: null,
    sampleRate: null,
    channels: null,
    durationSeconds: null,
    riskTags: riskTags(asset),
    technicalStatus: "fail",
    humanReviewStatus: asset.reviewStatus,
  };
  if (ids.has(asset.id)) addFailure("TTS_DUPLICATE_ID", asset, asset.id);
  ids.add(asset.id);
  const declaredPath = asset.path;
  const pathSegments = typeof declaredPath === "string" ? declaredPath.split("/") : [];
  const pathIsSafe = typeof declaredPath === "string"
    && !path.posix.isAbsolute(declaredPath)
    && !path.win32.isAbsolute(declaredPath)
    && !declaredPath.includes("\\")
    && declaredPath.startsWith(requiredPrefix)
    && pathSegments.every((segment) => segment && segment !== "." && segment !== "..")
    && path.posix.dirname(declaredPath) === requiredPrefix.slice(0, -1);
  if (!pathIsSafe) {
    addFailure("TTS_UNSAFE_PATH", asset, String(declaredPath));
    auditedAssets.push(result);
    continue;
  }
  if (manifestPaths.has(declaredPath)) addFailure("TTS_DUPLICATE_PATH", asset, declaredPath);
  manifestPaths.add(declaredPath);
  const absolute = path.resolve(repoRoot, ...pathSegments);
  if (path.dirname(absolute) !== audioRoot) {
    addFailure("TTS_PATH_ESCAPE", asset, declaredPath);
    auditedAssets.push(result);
    continue;
  }
  let bytes;
  try {
    bytes = await readFile(absolute);
  } catch (error) {
    addFailure("TTS_FILE_MISSING", asset, error.code ?? error.message);
    auditedAssets.push(result);
    continue;
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  result.bytes = bytes.length;
  result.sha256 = sha256;
  if (sha256 !== asset.sha256) addFailure("TTS_HASH_MISMATCH", asset, sha256);
  if (bytes.length !== asset.bytes) addFailure("TTS_SIZE_MISMATCH", asset, String(bytes.length));

  let probe;
  try {
    probe = JSON.parse(execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-show_entries", "stream=codec_name,sample_rate,channels",
      "-of", "json",
      absolute,
    ], { encoding: "utf8", windowsHide: true }));
  } catch (error) {
    addFailure("TTS_FFPROBE_FAILED", asset, error.status?.toString() ?? error.message);
    auditedAssets.push(result);
    continue;
  }
  const stream = probe.streams?.[0] ?? {};
  const durationSeconds = Number(probe.format?.duration);
  result.codec = stream.codec_name ?? null;
  result.sampleRate = Number(stream.sample_rate) || null;
  result.channels = stream.channels ?? null;
  result.durationSeconds = Number.isFinite(durationSeconds) ? durationSeconds : null;
  if (stream.codec_name !== "mp3") addFailure("TTS_CODEC", asset, String(stream.codec_name));
  if (stream.sample_rate !== "24000") addFailure("TTS_SAMPLE_RATE", asset, String(stream.sample_rate));
  if (stream.channels !== 1) addFailure("TTS_CHANNELS", asset, String(stream.channels));
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0.15 || durationSeconds > 30) {
    addFailure("TTS_DURATION", asset, String(durationSeconds));
  }
  result.technicalStatus = failures.length === failuresBeforeAsset ? "pass" : "fail";
  auditedAssets.push(result);
}

const diskFiles = (await walkFiles(audioRoot))
  .map((absolute) => path.relative(repoRoot, absolute).split(path.sep).join("/"))
  .sort((a, b) => a.localeCompare(b, "en"));
for (const diskPath of diskFiles) {
  if (!manifestPaths.has(diskPath)) addFailure("TTS_UNMANIFESTED_FILE", null, diskPath);
}
for (const declaredPath of manifestPaths) {
  if (!diskFiles.includes(declaredPath)) addFailure("TTS_STALE_MANIFEST_PATH", null, declaredPath);
}
if (manifest.assetCount !== manifest.assets.length) {
  addFailure("TTS_MANIFEST_COUNT", null, `${manifest.assetCount} != ${manifest.assets.length}`);
}

const tagCounts = {};
for (const asset of auditedAssets) {
  for (const tag of asset.riskTags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
}
const report = {
  schemaVersion: 1,
  manifestSha256: createHash("sha256").update(manifestText).digest("hex"),
  voice: manifest.voice,
  rate: manifest.rate,
  generator: manifest.generator,
  technicalGate: failures.length === 0 ? "pass" : "fail",
  humanListeningGate: "pending-owner-or-qualified-german-review",
  humanReviewNotice: "Technical checks cannot establish pronunciation accuracy, stress, naturalness, or pedagogical suitability.",
  summary: {
    manifestAssets: manifest.assets.length,
    diskFiles: diskFiles.length,
    auditedAssets: auditedAssets.length,
    totalBytes: auditedAssets.reduce((sum, asset) => sum + (asset.bytes ?? 0), 0),
    totalDurationSeconds: Number(auditedAssets.reduce((sum, asset) => sum + (asset.durationSeconds ?? 0), 0).toFixed(3)),
    candidateAssetsAwaitingListeningReview: auditedAssets.filter((asset) => asset.humanReviewStatus !== "approved").length,
    riskTagCounts: Object.fromEntries(Object.entries(tagCounts).sort(([a], [b]) => a.localeCompare(b, "en"))),
    failureCount: failures.length,
  },
  failures,
  assets: auditedAssets.sort((a, b) => a.id.localeCompare(b.id, "en")),
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath: path.relative(repoRoot, reportPath), ...report.summary, technicalGate: report.technicalGate }, null, 2));
if (failures.length) process.exitCode = 1;
