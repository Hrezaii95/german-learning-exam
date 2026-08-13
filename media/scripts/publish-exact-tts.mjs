import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const alphaPath = join(root, "media", "manifests", "alpha-tts-manifest.json");
const auditPath = join(root, "media", "qa", "alpha-tts-technical-audit.json");
const detailsPath = join(root, "platform", "apps", "web", "generated", "learner-details.json");
const enrichmentPath = join(
  root,
  "platform",
  "apps",
  "web",
  "generated",
  "enrichment",
  "learner-content-enrichment.json",
);
const canonicalManifestPath = join(
  root,
  "media",
  "manifests",
  "published-tts-exact-v1.json",
);
const clientManifestPath = join(
  root,
  "platform",
  "apps",
  "web",
  "lib",
  "content",
  "published-pronunciation.json",
);
const publicDir = join(
  root,
  "platform",
  "apps",
  "web",
  "public",
  "audio",
  "tts-de-de-v1",
);

function parse(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function detailSourceTexts(detail) {
  if (detail.kind === "Lexeme") return [detail.displayText, detail.lemma];
  if (detail.kind === "Verb") return [detail.infinitive];
  if (detail.kind === "QAPair") return [detail.question.realization];
  if (detail.kind === "GrammarConcept") {
    return [
      detail.titleDe,
      ...detail.ruleSteps.map((step) => step.model).filter((model) => model !== null),
    ];
  }
  throw new Error(`Unsupported learner detail kind: ${detail.kind}`);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "de"));
}

const alpha = parse(alphaPath);
const audit = parse(auditPath);
const details = parse(detailsPath).details;
const activities = parse(enrichmentPath).activities;
// These exact strings are the source-backed, purpose-built prompts in the two
// activities whose enrichment target lists are intentionally empty. Their
// learning audio is the approved workbook recording; none has a generated TTS
// exact match in the current 327-clip corpus.
const specializedPracticeUtterances = Object.freeze([
  "Ä Ö Ü ß",
  "M I R I A M",
  "einundzwanzig",
  "siebenunddreißig",
  "sechsundvierzig",
  "vierundsechzig",
  "zweiundsiebzig",
  "achtundachtzig",
  "neunundneunzig",
  "hundert",
]);

if (alpha.assetCount !== alpha.assets.length || audit.assets.length !== alpha.assets.length) {
  throw new Error("TTS manifest/audit count mismatch");
}
if (audit.technicalGate !== "pass") {
  throw new Error("TTS technical audit is not green");
}

const auditById = new Map(audit.assets.map((asset) => [asset.id, asset]));
const alphaByText = new Map();
for (const asset of alpha.assets) {
  if (alphaByText.has(asset.spokenText)) {
    throw new Error(`Duplicate generated spokenText: ${asset.spokenText}`);
  }
  const technical = auditById.get(asset.id);
  if (!technical || technical.technicalStatus !== "pass") {
    throw new Error(`Generated clip is not technically approved: ${asset.id}`);
  }
  if (
    technical.spokenText !== asset.spokenText ||
    technical.sha256 !== asset.sha256 ||
    technical.bytes !== asset.bytes
  ) {
    throw new Error(`TTS manifest/audit metadata mismatch: ${asset.id}`);
  }
  const absoluteSource = join(root, ...asset.path.split("/"));
  if (!existsSync(absoluteSource)) throw new Error(`Missing generated clip: ${asset.id}`);
  if (statSync(absoluteSource).size !== asset.bytes || sha256(absoluteSource) !== asset.sha256) {
    throw new Error(`Generated clip bytes do not match manifest: ${asset.id}`);
  }
  alphaByText.set(asset.spokenText, { asset, technical, absoluteSource });
}

const detailMappingsByText = new Map();
const unmappedDetails = [];
for (const detail of details) {
  const exactTexts = sortedUnique(
    detailSourceTexts(detail).filter((sourceText) => alphaByText.has(sourceText)),
  );
  if (exactTexts.length === 0) {
    unmappedDetails.push({
      detailId: detail.id,
      kind: detail.kind,
      exactSourceTextsChecked: detailSourceTexts(detail),
    });
    continue;
  }
  for (const sourceText of exactTexts) {
    const rows = detailMappingsByText.get(sourceText) ?? [];
    rows.push({ detailId: detail.id, kind: detail.kind, sourceText });
    detailMappingsByText.set(sourceText, rows);
  }
}

const activityMappingsByText = new Map();
const allActivityUtterances = new Set();
const unmappedActivityUtterances = new Set();
for (const activity of activities) {
  const utterances = sortedUnique(
    activity.contentTargets.map((target) => target.displayTextDe),
  );
  for (const sourceText of utterances) {
    allActivityUtterances.add(sourceText);
    if (!alphaByText.has(sourceText)) {
      unmappedActivityUtterances.add(sourceText);
      continue;
    }
    const rows = activityMappingsByText.get(sourceText) ?? [];
    rows.push({ activityId: activity.id, sourceText });
    activityMappingsByText.set(sourceText, rows);
  }
}
for (const sourceText of specializedPracticeUtterances) {
  allActivityUtterances.add(sourceText);
  if (!alphaByText.has(sourceText)) unmappedActivityUtterances.add(sourceText);
}

const selectedTexts = sortedUnique([
  ...detailMappingsByText.keys(),
  ...activityMappingsByText.keys(),
]);

mkdirSync(publicDir, { recursive: true });
for (const filename of readdirSync(publicDir)) {
  if (filename.endsWith(".mp3") || filename === "manifest.json") {
    rmSync(join(publicDir, filename), { force: true });
  }
}

const assets = selectedTexts.map((sourceText) => {
  const selected = alphaByText.get(sourceText);
  if (!selected) throw new Error(`Internal exact-map error: ${sourceText}`);
  const filename = basename(selected.absoluteSource);
  const publicRelativePath = `audio/tts-de-de-v1/${filename}`;
  const publicAbsolutePath = join(publicDir, filename);
  copyFileSync(selected.absoluteSource, publicAbsolutePath);
  if (
    statSync(publicAbsolutePath).size !== selected.asset.bytes ||
    sha256(publicAbsolutePath) !== selected.asset.sha256
  ) {
    throw new Error(`Published clip differs from generated source: ${selected.asset.id}`);
  }
  return {
    id: selected.asset.id,
    sourceText,
    spokenText: selected.asset.spokenText,
    locale: selected.asset.locale,
    voice: selected.asset.voice,
    rate: selected.asset.rate,
    origin: "synthesized-edge-tts",
    publicRelativePath,
    bytes: selected.asset.bytes,
    sha256: selected.asset.sha256,
    codec: selected.technical.codec,
    sampleRate: selected.technical.sampleRate,
    channels: selected.technical.channels,
    durationSeconds: selected.technical.durationSeconds,
    technicalStatus: "pass",
    publicationStatus: "public-owner-authorized-synthesized-preview",
    detailMappings: (detailMappingsByText.get(sourceText) ?? []).sort((a, b) =>
      a.detailId.localeCompare(b.detailId),
    ),
    activityMappings: (activityMappingsByText.get(sourceText) ?? []).sort((a, b) =>
      a.activityId.localeCompare(b.activityId),
    ),
  };
});

const mappedActivityIds = new Set(
  assets.flatMap((asset) => asset.activityMappings.map((mapping) => mapping.activityId)),
);
const activitiesWithApprovedWorkbookAudio = new Set([
  "activity:lesson-01-alphabet-listen-spell",
  "activity:lesson-01-workbook-listening",
  "activity:lesson-02-numbers-0-100",
  "activity:lesson-02-workbook-listening",
]);

const manifest = {
  schemaVersion: 1,
  generatedAt: "2026-08-13T00:00:00.000Z",
  purpose: "Exact-source German pronunciation for the published Lesson 1 and 2 learner experience",
  sourceManifest: "media/manifests/alpha-tts-manifest.json",
  sourceTechnicalAudit: "media/qa/alpha-tts-technical-audit.json",
  publicationPolicy: {
    ownerAuthorizedSynthesizedPreview: true,
    qualifiedGermanListeningReview: false,
    matchRule: "strict Unicode string equality; no trimming, normalization, case-folding, or text substitution",
    byteRule: "public MP3 must match source bytes and SHA-256",
    learnerLabel: "Synthesized German preview voice — independent German listening review pending",
  },
  voice: alpha.voice,
  rate: alpha.rate,
  assetCount: assets.length,
  coverage: {
    publishedDetailConcepts: details.length,
    detailConceptsWithExactAudio: details.length - unmappedDetails.length,
    exactDetailSourceMappings: [...detailMappingsByText.values()].reduce(
      (total, rows) => total + rows.length,
      0,
    ),
    uniqueActivityUtterances: allActivityUtterances.size,
    activityUtterancesWithExactAudio:
      allActivityUtterances.size - unmappedActivityUtterances.size,
    activitiesWithExactGeneratedAudio: mappedActivityIds.size,
    activitiesWithApprovedWorkbookAudio: activitiesWithApprovedWorkbookAudio.size,
    activitiesWithEitherAudio:
      new Set([...mappedActivityIds, ...activitiesWithApprovedWorkbookAudio]).size,
    totalActivities: activities.length,
  },
  unmappedDetails: unmappedDetails.sort((a, b) => a.detailId.localeCompare(b.detailId)),
  unmappedActivityUtterances: sortedUnique(unmappedActivityUtterances),
  assets,
};

const output = `${JSON.stringify(manifest, null, 2)}\n`;
const clientProjection = {
  schemaVersion: manifest.schemaVersion,
  voice: manifest.voice,
  rate: manifest.rate,
  assetCount: manifest.assetCount,
  assets: manifest.assets.map((asset) => ({
    id: asset.id,
    sourceText: asset.sourceText,
    spokenText: asset.spokenText,
    locale: asset.locale,
    voice: asset.voice,
    rate: asset.rate,
    origin: asset.origin,
    publicRelativePath: asset.publicRelativePath,
    publicationStatus: asset.publicationStatus,
  })),
};
mkdirSync(dirname(canonicalManifestPath), { recursive: true });
mkdirSync(dirname(clientManifestPath), { recursive: true });
writeFileSync(canonicalManifestPath, output, "utf8");
writeFileSync(
  clientManifestPath,
  `${JSON.stringify(clientProjection, null, 2)}\n`,
  "utf8",
);
writeFileSync(join(publicDir, "manifest.json"), output, "utf8");

process.stdout.write(
  `Published ${manifest.assetCount} exact TTS clips; details ${manifest.coverage.detailConceptsWithExactAudio}/${manifest.coverage.publishedDetailConcepts}; activity utterances ${manifest.coverage.activityUtterancesWithExactAudio}/${manifest.coverage.uniqueActivityUtterances}; activities with either generated or workbook audio ${manifest.coverage.activitiesWithEitherAudio}/${manifest.coverage.totalActivities}.\n`,
);
