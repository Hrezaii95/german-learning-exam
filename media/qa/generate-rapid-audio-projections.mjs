import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATE = "2026-08-13T00:00:00.000Z";
const TTS_MANIFEST = "media/manifests/alpha-tts-manifest.json";
const TTS_AUDIT = "media/qa/alpha-tts-technical-audit.json";
const RAPID_MANIFEST = "media/manifests/rapid-preview-tts-candidates.json";
const WORKBOOK_SOURCE_MAP = "content/source-index/alpha-workbook-audio-map.json";
const WORKBOOK_MANIFEST = "media/manifests/workbook-audio-rights-projections.json";
const RAPID_AUDIT = "media/qa/rapid-audio-deployment-audit.json";
const WORKBOOK_PRIVATE_ROOT = "media/private/source-workbook";
const WORKBOOK_PACKAGE_ROOT = "media/generated/source-workbook-approved-v1";

const SELECTED_TTS_HASHES = Object.freeze([
  "d19267787b4beff7", "6a8284819483191d", "3a7e225e0e49a58a", "753692ec36adb4c7",
  "c872cd6d08e13b1c", "6b973d266dfceb93", "cda2dfd43fca1ece", "2753e4860651be83",
  "e77cf338c3f6f281", "3f22e95182a83d53", "fec17b90a93577c6", "ba838082d88f7fad",
  "c5c4f17bb2ff6e2d", "33570f12e2363ed6", "75c9561d41a7e4d0", "f9c202035068db9b",
  "c9fc6c577e157747", "0fa7d1006e9255e8", "bad67a0dde04dd09", "d3241bf9c5208ed6",
  "f0abec8675ebc550", "a1e1057546b3816a", "eb740a0d476fc93c", "0bbf7a1c7251abe2",
  "9ce4ec9417958565", "518602b71f856b0d", "8571b87255d733b4", "f1ce4cfaa9130b28",
  "e6282cf9be8c7ae1", "55bc73c60d5aff34", "015411a545d92029", "0eba6f6bbaaa5b61",
  "a0769ae9d9921e63", "906a799d46a8c8e8", "62dc09ce76149784", "bab366a7e6e4166e",
  "e35c3d3e17dd4e01", "364993bc52161c56", "2128ffb48d81a189", "27c8c016adc2e8b0",
  "74ee8a36e7b01cfb", "80798c4d363a9748", "dd89a6c67a34d33d", "15c37e6df58994ef",
  "21adcacce0dcc8ee", "3f3b37fa618748f2", "3496d498b66ac57c", "3a1b31be21a07874",
  "548338f5aac9569b", "9fb1d64c0171cc58", "83680e7d8ca6339f", "085bcb14efd9f8e5",
  "a7e7467bdd8e518a", "9df1eb79cf946d87",
]);

function readJson(file) { return JSON.parse(readFileSync(file, "utf8")); }
function writeJson(file, value) { writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function sha256(file) { return createHash("sha256").update(readFileSync(file)).digest("hex"); }
function walkFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en")).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : entry.isFile() ? [absolute] : [];
  });
}
function probe(file) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "json", file], { encoding: "utf8", windowsHide: true });
  const parsed = JSON.parse(raw);
  const stream = parsed.streams?.[0] ?? {};
  return { codec: stream.codec_name ?? null, sampleRate: Number(stream.sample_rate) || null, channels: stream.channels ?? null, durationSeconds: Number(parsed.format?.duration) || null };
}
function publicPathSafe(value) {
  return typeof value === "string" && !value.startsWith("/") && !value.includes("\\") && !value.split("/").some((part) => !part || part === "." || part === "..") && !/media\/private|resources\/original|secrets/i.test(value);
}
function entitySegment(id) { return `id-${Buffer.from(id, "utf8").toString("hex")}`; }
function activityRoute(lesson, id) { return `/lessons/${lesson}/activity/${entitySegment(id)}`; }

function ttsPageMappings(asset) {
  const ids = asset.conceptIds;
  if (ids.includes("verb:sein")) return [{ route: "/verbs/id-766572623a7365696e", surface: "sein verb detail and conjugation cards", availability: "live" }];
  if (ids.includes("verb:arbeiten")) return [{ route: "/verbs", surface: "verb hub and future arbeiten detail cards", availability: "hub-live-detail-not-yet-routed" }];
  if (ids.includes("profession:architekt")) return [{ route: "/vocabulary/id-6c65783a617263686974656b74", surface: "Architekt vocabulary detail", availability: "live" }];
  if (ids.includes("profession:ingenieur")) return [{ route: "/vocabulary", surface: "profession vocabulary hub card", availability: "hub-live-detail-not-yet-routed" }];
  if (ids.includes("qa:profession-casual") || ids.includes("qa:profession-formal") || ids.includes("phrase:profession-model")) return [
    { route: "/phrases/id-71613a70726f66657373696f6e2d63617375616c2d6d61696e", surface: "profession Q&A detail", availability: "live-representative" },
    { route: "/conversation/id-71613a70726f66657373696f6e2d63617375616c2d6d61696e", surface: "profession conversation ladder", availability: "live-representative" },
  ];
  if (ids.some((id) => id.startsWith("teacher-job:")) && !ids.some((id) => id.startsWith("profession:"))) return [{ route: null, surface: "extra professions collection card", availability: "blocked-until-content-and-audio-human-review" }];
  if (ids.some((id) => id.startsWith("profession:"))) return [{ route: "/vocabulary", surface: "profession vocabulary hub card", availability: "hub-live-detail-not-yet-routed" }];
  if (ids.some((id) => id.startsWith("qa:")) || ids.includes("lesson:01")) return [{ route: "/lessons/01", surface: "Lesson 1 card or activity", availability: "live" }];
  if (ids.includes("lesson:02")) return [{ route: "/lessons/02", surface: "Lesson 2 card or activity", availability: "live" }];
  return [{ route: "/hubs", surface: "relevant learner hub", availability: "live" }];
}

function workbookPageMappings(track) {
  if (track.exercise === "AB 3") return [{ route: activityRoute("01", "activity:lesson-01-alphabet-listen-spell"), surface: "Lesson 1 alphabet, names and spelling listening", availability: "live-route-audio-integration-required" }];
  if (track.exercise === "AB 9a" || track.exercise === "AB 9b") return [{ route: activityRoute("01", "activity:lesson-01-workbook-listening"), surface: "Lesson 1 workbook sentence-melody listening", availability: "live-route-audio-integration-required" }];
  if (track.exercise === "AB 6a" || track.exercise === "AB 6b") return [
    { route: activityRoute("02", "activity:lesson-02-workbook-listening"), surface: "Lesson 2 workbook telephone-number listening", availability: "live-route-audio-integration-required" },
    { route: activityRoute("02", "activity:lesson-02-numbers-0-100"), surface: "Lesson 2 number practice", availability: "live-route-audio-integration-required" },
  ];
  return [
    { route: activityRoute("02", "activity:lesson-02-workbook-listening"), surface: "Lesson 2 workbook profession-stress listening", availability: "live-route-audio-integration-required" },
    { route: activityRoute("02", "activity:lesson-02-core-professions"), surface: "Lesson 2 profession cards", availability: "live-route-audio-integration-required" },
  ];
}

const alpha = readJson(TTS_MANIFEST);
const alphaAudit = readJson(TTS_AUDIT);
const auditById = new Map(alphaAudit.assets.map((asset) => [asset.id, asset]));
const rapidAssets = SELECTED_TTS_HASHES.map((hash) => {
  const id = `aud:tts:${hash}:v1`;
  const source = alpha.assets.find((asset) => asset.id === id);
  const audited = auditById.get(id);
  if (!source || !audited) throw new Error(`Missing selected TTS asset: ${id}`);
  return {
    id, spokenText: source.spokenText, conceptIds: source.conceptIds, voice: source.voice, rate: source.rate,
    sourcePath: source.path, publicRelativePath: `audio/tts-de-de-v1/${path.basename(source.path)}`,
    bytes: audited.bytes, sha256: audited.sha256, codec: audited.codec, sampleRate: audited.sampleRate,
    channels: audited.channels, durationSeconds: audited.durationSeconds, riskTags: audited.riskTags,
    technicalStatus: audited.technicalStatus, humanListeningStatus: "pending-human-listening-review",
    deploymentEligibility: "blocked-until-human-listening-approval", pageAndCardMappings: ttsPageMappings(source),
  };
});
const rapid = {
  schemaVersion: 1, generatedAt: DATE,
  purpose: "rapid high-value audio preview wave for Lessons 1-2, representative details, Q&A, verbs, and extra professions",
  sourceManifest: TTS_MANIFEST, sourceTechnicalAudit: TTS_AUDIT, generator: alpha.generator,
  voice: alpha.voice, rate: alpha.rate, assetCount: rapidAssets.length,
  technicalGate: rapidAssets.every((asset) => asset.technicalStatus === "pass") ? "pass" : "fail",
  humanListeningGate: "pending-human-listening-review",
  publicationPolicy: { publicRelativePathsAreProjectionOnly: true, copyBytesToDeployableBundle: false, copyGate: "qualified German text/form and naturalness listening passes", publisherAudioIncluded: false },
  assets: rapidAssets,
};
writeJson(RAPID_MANIFEST, rapid);

const sourceMap = readJson(WORKBOOK_SOURCE_MAP);
if (sourceMap.trackCount !== 15 || sourceMap.tracks.length !== 15) throw new Error("Approved workbook package must contain exactly 15 mapped tracks");
mkdirSync(WORKBOOK_PACKAGE_ROOT, { recursive: true });
const publicWorkbookAssets = [];
const privateWorkbookRefs = [];
for (const track of sourceMap.tracks) {
  const privatePath = path.join(WORKBOOK_PRIVATE_ROOT, track.filename);
  const packagedPath = path.join(WORKBOOK_PACKAGE_ROOT, track.filename);
  copyFileSync(privatePath, packagedPath);
  const media = probe(packagedPath);
  const digest = sha256(packagedPath);
  publicWorkbookAssets.push({
    sourceAudioId: track.sourceAudioId, filename: track.filename, lessonId: track.lessonId,
    exercise: track.exercise, purpose: track.purpose, packagedPath: packagedPath.replaceAll("\\", "/"),
    publicRelativePath: `audio/source-workbook-approved-v1/${track.filename}`, bytes: statSync(packagedPath).size,
    sha256: digest, ...media, mappedDurationSeconds: track.durationSeconds, mappingEvidence: track.evidence,
    sourceIndexMappingStatus: track.status, ownerApprovalStatus: "approved-for-alpha-public-redistribution",
    qualifiedGermanListeningQaStatus: "not-separately-recorded-in-audio-qa-artifact",
    pageAndActivityMappings: workbookPageMappings(track),
    referenceUses: ["canonical workbook exercise playback", "prosody and stress reference for generated candidates"],
  });
  privateWorkbookRefs.push({ sourceAudioId: track.sourceAudioId, filename: track.filename, privateSourceReferencePath: privatePath.replaceAll("\\", "/"), sha256: digest, mustRemainOutsideStaticPublicCopyRules: true });
}
const workbook = {
  schemaVersion: 1, generatedAt: DATE, sourcePack: sourceMap.sourcePack, transcriptSource: sourceMap.transcriptSource,
  trackCount: publicWorkbookAssets.length,
  scopeLock: { includedTrackRange: "1_01 through 1_15 only", includedLessons: ["lesson:01", "lesson:02"], otherPublisherAssetsApproved: false },
  ownerDecision: { status: "approved", authorizedBy: "project owner (user)", recordedDate: "2026-08-13", decisionChannel: "active Codex task", decisionText: "public redistribution approved", scope: "exact 15 already mapped Momente A1.1 workbook CD1 tracks for Lessons 1-2" },
  rightsBasis: "Explicit project-owner approval for public redistribution, recorded 2026-08-13, limited to the exact 15 mapped Lesson 1-2 workbook tracks in this manifest.",
  rightsAndApprovalSeparation: { contentOrListeningApprovalDoesNotNormallyGrantRedistribution: true, ownerHasNowExplicitlyGrantedProjectRedistributionApproval: true, qualifiedGermanListeningQaStillSeparatelyRecorded: false },
  projections: {
    publicDeployable: { status: "approved-for-packaging-and-web-integration", assetCount: publicWorkbookAssets.length, publicRoot: "audio/source-workbook-approved-v1", byteIdentity: "packaged files preserve source SHA-256", assets: publicWorkbookAssets },
    privateReferenceAuthority: { status: "retained-for-provenance", assetCount: privateWorkbookRefs.length, tracks: privateWorkbookRefs },
  },
};
writeJson(WORKBOOK_MANIFEST, workbook);

const failures = [];
const detail = { tts: [], workbook: [] };
const seenPublicPaths = new Set();
for (const asset of rapid.assets) {
  const media = probe(asset.sourcePath);
  const digest = sha256(asset.sourcePath);
  const checks = {
    hashMatches: digest === asset.sha256, bytesMatch: statSync(asset.sourcePath).size === asset.bytes,
    codecMatches: media.codec === asset.codec, sampleRateMatches: media.sampleRate === asset.sampleRate,
    channelsMatch: media.channels === asset.channels, durationMatches: Math.abs(media.durationSeconds - asset.durationSeconds) < 0.001,
    publicPathSafe: publicPathSafe(asset.publicRelativePath), uniquePublicPath: !seenPublicPaths.has(asset.publicRelativePath),
    humanGateHonest: asset.humanListeningStatus === "pending-human-listening-review" && asset.deploymentEligibility === "blocked-until-human-listening-approval",
  };
  seenPublicPaths.add(asset.publicRelativePath);
  if (Object.values(checks).some((value) => !value)) failures.push({ code: "RAPID_TTS_ASSET_CHECK", assetId: asset.id, checks });
  detail.tts.push({ id: asset.id, path: asset.sourcePath, publicRelativePath: asset.publicRelativePath, ...media, sha256: digest, checks });
}
const expectedById = new Map(sourceMap.tracks.map((track) => [track.sourceAudioId, track]));
const diskFiles = walkFiles(WORKBOOK_PACKAGE_ROOT).map((file) => path.relative(WORKBOOK_PACKAGE_ROOT, file).replaceAll("\\", "/")).sort();
const declaredFiles = workbook.projections.publicDeployable.assets.map((asset) => asset.filename).sort();
if (JSON.stringify(diskFiles) !== JSON.stringify(declaredFiles)) failures.push({ code: "WORKBOOK_DISK_MANIFEST_SET", diskFiles, declaredFiles });
for (const asset of workbook.projections.publicDeployable.assets) {
  const expected = expectedById.get(asset.sourceAudioId);
  const media = probe(asset.packagedPath);
  const digest = sha256(asset.packagedPath);
  const privateDigest = sha256(path.join(WORKBOOK_PRIVATE_ROOT, asset.filename));
  const checks = {
    sourceMapEntry: Boolean(expected), filenameMatches: expected?.filename === asset.filename,
    hashMatchesManifest: digest === asset.sha256, hashMatchesSource: digest === expected?.sha256,
    hashMatchesPrivateSource: digest === privateDigest, bytesMatch: statSync(asset.packagedPath).size === asset.bytes,
    codecMatches: media.codec === asset.codec && asset.codec === "mp3", sampleRateMatches: media.sampleRate === asset.sampleRate,
    channelsMatch: media.channels === asset.channels, durationMatches: Math.abs(media.durationSeconds - asset.durationSeconds) < 0.001,
    mappedDurationMatches: Math.abs(expected.durationSeconds - asset.mappedDurationSeconds) < 0.001,
    publicPathSafe: publicPathSafe(asset.publicRelativePath), scopeApproved: workbook.ownerDecision.status === "approved",
  };
  if (Object.values(checks).some((value) => !value)) failures.push({ code: "WORKBOOK_ASSET_CHECK", sourceAudioId: asset.sourceAudioId, checks });
  detail.workbook.push({ sourceAudioId: asset.sourceAudioId, path: asset.packagedPath, publicRelativePath: asset.publicRelativePath, ...media, sha256: digest, checks });
}
const rapidText = JSON.stringify(rapid);
const workbookPublicText = JSON.stringify(workbook.projections.publicDeployable);
const webPublicFiles = walkFiles("platform/apps/web/public").map((file) => file.replaceAll("\\", "/"));
const approvedWorkbookFilenames = new Set(declaredFiles.map((file) => path.basename(file)));
const leakChecks = {
  rapidProjectionContainsPrivatePath: /media\/private|resources\/original|secrets/i.test(rapidText),
  workbookPublicProjectionContainsPrivatePath: /media\/private|resources\/original|secrets/i.test(workbookPublicText),
  unapprovedPublisherFilesInApprovedPackage: diskFiles.filter((file) => !declaredFiles.includes(file)),
  publisherFilesCurrentlyInWebPublic: webPublicFiles.filter((file) => /_AB_Momente_/i.test(path.basename(file))),
  unapprovedPublisherFilesInWebPublic: webPublicFiles.filter((file) => /_AB_Momente_/i.test(path.basename(file)) && !approvedWorkbookFilenames.has(path.basename(file))),
  pendingTtsCandidatesInWebPublic: webPublicFiles.filter((file) => /^tts-[0-9a-f]{16}\.mp3$/i.test(path.basename(file))),
};
if (leakChecks.rapidProjectionContainsPrivatePath || leakChecks.workbookPublicProjectionContainsPrivatePath || leakChecks.unapprovedPublisherFilesInApprovedPackage.length || leakChecks.unapprovedPublisherFilesInWebPublic.length || leakChecks.pendingTtsCandidatesInWebPublic.length) failures.push({ code: "PUBLIC_PROJECTION_LEAK", leakChecks });
const result = {
  schemaVersion: 1, generatedAt: DATE, technicalGate: failures.length ? "fail" : "pass",
  humanListeningGate: { generatedTts: "pending-human-listening-review", publisherWorkbook: "owner-approved-for-alpha; qualified German listening QA not separately recorded" },
  summary: { rapidTtsCandidates: rapid.assets.length, approvedWorkbookTracks: declaredFiles.length, ffprobeAssets: detail.tts.length + detail.workbook.length, failureCount: failures.length, rapidTtsDurationSeconds: Number(detail.tts.reduce((sum, asset) => sum + asset.durationSeconds, 0).toFixed(3)), workbookDurationSeconds: Number(detail.workbook.reduce((sum, asset) => sum + asset.durationSeconds, 0).toFixed(3)) },
  scopeChecks: { exactWorkbookSet: declaredFiles.length === 15 && JSON.stringify(diskFiles) === JSON.stringify(declaredFiles), otherPublisherAssetsApproved: false, publicProjectionSafe: !leakChecks.rapidProjectionContainsPrivatePath && !leakChecks.workbookPublicProjectionContainsPrivatePath },
  leakChecks, failures, assets: detail,
};
writeJson(RAPID_AUDIT, result);
console.log(JSON.stringify({ rapidManifest: RAPID_MANIFEST, workbookManifest: WORKBOOK_MANIFEST, audit: RAPID_AUDIT, ...result.summary, technicalGate: result.technicalGate }, null, 2));
if (failures.length) process.exitCode = 1;
