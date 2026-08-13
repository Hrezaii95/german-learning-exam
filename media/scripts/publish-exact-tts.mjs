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
const supplementPath = join(
  root,
  "media",
  "manifests",
  "exact-tts-gap-supplement-v1.json",
);
const supplementAuditPath = join(
  root,
  "media",
  "qa",
  "exact-tts-gap-supplement-v1-technical-audit.json",
);
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
const supplement = parse(supplementPath);
const supplementAudit = parse(supplementAuditPath);
const details = parse(detailsPath).details;
const activities = parse(enrichmentPath).activities;
// These exact strings are the source-backed, purpose-built prompts in the two
// activities whose enrichment target lists are intentionally empty. Their
// primary learning audio is the approved workbook recording; this explicit
// mapping lets exact prompt previews participate in publication and coverage.
const specializedPracticeUtterances = Object.freeze([
  { activityId: "activity:lesson-01-alphabet-listen-spell", sourceText: "Ä Ö Ü ß" },
  { activityId: "activity:lesson-01-alphabet-listen-spell", sourceText: "M I R I A M" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "einundzwanzig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "siebenunddreißig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "sechsundvierzig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "vierundsechzig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "zweiundsiebzig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "achtundachtzig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "neunundneunzig" },
  { activityId: "activity:lesson-02-numbers-0-100", sourceText: "hundert" },
]);

const alphaByText = new Map();
for (const [corpusName, corpus, corpusAudit] of [
  ["alpha", alpha, audit],
  ["exact-gap-supplement", supplement, supplementAudit],
]) {
  if (
    corpus.assetCount !== corpus.assets.length ||
    (corpusAudit.assetCount !== undefined &&
      corpusAudit.assetCount !== corpusAudit.assets.length) ||
    corpusAudit.assets.length !== corpus.assets.length
  ) {
    throw new Error(`${corpusName} TTS manifest/audit count mismatch`);
  }
  if (corpusAudit.technicalGate !== "pass") {
    throw new Error(`${corpusName} TTS technical audit is not green`);
  }
  if (corpus.voice !== alpha.voice || corpus.rate !== alpha.rate) {
    throw new Error(`${corpusName} TTS voice/rate differs from the alpha corpus`);
  }
  const auditById = new Map(corpusAudit.assets.map((asset) => [asset.id, asset]));
  for (const asset of corpus.assets) {
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
for (const { activityId, sourceText } of specializedPracticeUtterances) {
  allActivityUtterances.add(sourceText);
  if (!alphaByText.has(sourceText)) {
    unmappedActivityUtterances.add(sourceText);
    continue;
  }
  const rows = activityMappingsByText.get(sourceText) ?? [];
  rows.push({ activityId, sourceText });
  activityMappingsByText.set(sourceText, rows);
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
  sourceManifests: [
    "media/manifests/alpha-tts-manifest.json",
    "media/manifests/exact-tts-gap-supplement-v1.json",
  ],
  sourceTechnicalAudits: [
    "media/qa/alpha-tts-technical-audit.json",
    "media/qa/exact-tts-gap-supplement-v1-technical-audit.json",
  ],
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
