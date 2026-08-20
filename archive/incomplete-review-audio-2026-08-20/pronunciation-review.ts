/**
 * Build-time projection for the pronunciation listening surface.
 *
 * WHY THIS EXISTS
 * The generated German voice is a computer voice. Every clip it produced is
 * still waiting for a qualified German listener to say whether it is good
 * enough to teach with — no automated check can decide that, and this codebase
 * must never decide it either. Until that listening happens the clips sit one
 * at a time behind a Listen button on about a hundred separate pages, which is
 * not a surface anyone can actually sit down and work through.
 *
 * This module gathers the clips a learner can really hear in the app into one
 * ordered list, attaches the sound classes the technical pass flagged, and
 * resolves each mapping id into the words a human recognises. It reads; it
 * never writes, and it changes nothing about what the app plays.
 *
 * SCOPE — the honest 110 against 354
 * `public/audio/tts-de-de-v1/manifest.json` carries the 110 clips wired into
 * the running app. The whole generated set (`media/manifests/…`) holds 354; the
 * remaining 244 are not reachable from any page, so listening to them would
 * say nothing about what a learner hears. The page states this.
 *
 * No DOM here: `platform/tsconfig.json` typechecks `apps/web/lib` with
 * `lib: ["ES2022"]`. Node file reads are fine (the same pattern as
 * `lib/content/access.ts`); anything browser-shaped belongs in the component.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getActivityById, getLearnerDetail } from "../content/access";
import { lessonLabel } from "../content/lesson-label";

const here = dirname(fileURLToPath(import.meta.url));
/** `apps/web` — the manifest that drives the running app lives under `public/`. */
const webRoot = join(here, "..", "..");
/** Repository root. The technical listening notes are a media artifact, not app data. */
const repoRoot = join(here, "..", "..", "..", "..", "..");

const APP_MANIFEST_PATH = join(
  webRoot,
  "public",
  "audio",
  "tts-de-de-v1",
  "manifest.json",
);

/**
 * The sound classes come from the technical pass over the whole generated set
 * plus the later gap supplement. Both are read because the 110 in the app are
 * drawn from both runs, and a clip whose class list went missing would quietly
 * drop out of every focused filter.
 */
const TECHNICAL_NOTE_PATHS = [
  join(repoRoot, "media", "qa", "alpha-tts-technical-audit.json"),
  join(repoRoot, "media", "qa", "exact-tts-gap-supplement-v1-technical-audit.json"),
] as const;

/** Size of the whole generated set, stated on the page so the scope is honest. */
export const FULL_GENERATED_SET_SIZE = 354;

/* ---------------------------------------------------------------------------
 * Sound classes
 * ------------------------------------------------------------------------ */

export type SoundClassId =
  | "ich-or-ach-sound"
  | "umlaut-or-eszett"
  | "r-sound"
  | "final-obstruent"
  | "feminine-in-or-innen"
  | "conjugated-form"
  | "profession-form"
  | "connected-speech";

export type SoundClass = Readonly<{
  id: SoundClassId;
  /** Short name on the filter control. */
  label: string;
  /** One sentence telling the listener what to listen for. */
  listenFor: string;
}>;

/**
 * Ordered hardest first, so a listener with limited time spends it where a
 * computer voice is most likely to be wrong. Everything downstream — filter
 * order, group order, which class heads a multi-class clip — reads this order,
 * so there is exactly one place to argue about difficulty.
 */
export const SOUND_CLASSES: readonly SoundClass[] = Object.freeze([
  Object.freeze({
    id: "ich-or-ach-sound" as const,
    label: "ich / ach sound",
    listenFor:
      "The soft ch after i, e, ä, ö, ü or ei against the throaty ch after a, o and u.",
  }),
  Object.freeze({
    id: "umlaut-or-eszett" as const,
    label: "Umlaut or ß",
    listenFor: "Whether ä, ö, ü and ß stay clearly apart from a, o, u and s.",
  }),
  Object.freeze({
    id: "r-sound" as const,
    label: "German r",
    listenFor:
      "The r at the front of a syllable, and the vowel-like r at the end of a word.",
  }),
  Object.freeze({
    id: "final-obstruent" as const,
    label: "Hard word ending",
    listenFor:
      "A b, d or g at the end of a word, which should sound like p, t or k.",
  }),
  Object.freeze({
    id: "feminine-in-or-innen" as const,
    label: "-in / -innen ending",
    listenFor:
      "The feminine ending, and whether the stress stays where it belongs.",
  }),
  Object.freeze({
    id: "conjugated-form" as const,
    label: "Changed verb form",
    listenFor: "The ending on a verb that has changed for its person.",
  }),
  Object.freeze({
    id: "profession-form" as const,
    label: "Job word",
    listenFor: "Job names: the ending, and which syllable carries the stress.",
  }),
  Object.freeze({
    id: "connected-speech" as const,
    label: "Words run together",
    listenFor:
      "More than one word in a row: linking, rhythm and where it breathes.",
  }),
]);

const SOUND_CLASS_IDS: readonly string[] = SOUND_CLASSES.map((entry) => entry.id);

export function soundClassById(id: SoundClassId): SoundClass {
  const found = SOUND_CLASSES.find((entry) => entry.id === id);
  if (!found) throw new Error(`unknown sound class: ${id}`);
  return found;
}

/** Guard for a value arriving from a control or a stored preference. */
export function isSoundClassId(value: string): value is SoundClassId {
  return SOUND_CLASS_IDS.includes(value);
}

/* ---------------------------------------------------------------------------
 * Clip shape
 * ------------------------------------------------------------------------ */

/** Where in the app a learner meets this clip. Words, never internal ids. */
export type ReviewClipUsage = Readonly<{
  label: string;
  /**
   * Which language `label` is in. A word page is named by its German; a lesson
   * step is named by its English prompt, and marking that as German would make
   * a screen reader read English words with a German voice.
   */
  language: "de" | "en";
  context: string;
  href: string;
}>;

export type PronunciationReviewClip = Readonly<{
  /** Full clip id. Travels in the downloaded file, not in visible page copy. */
  id: string;
  /** Short reference shown on screen so a note can name a clip out loud. */
  reference: string;
  /** Exactly the German the voice was asked to say. */
  spokenText: string;
  /** The learner-facing string this clip was chosen for. Equal to spokenText. */
  sourceText: string;
  /** Root-relative audio path; the deploy base path is added in the browser. */
  publicPath: string;
  /** Path as stored, kept verbatim for the downloaded file. */
  publicRelativePath: string;
  durationSeconds: number;
  voice: string;
  rate: string;
  /** Binds a verdict to the exact bytes it judged. */
  sha256: string;
  soundClasses: readonly SoundClassId[];
  /** First class in difficulty order, or null when none was recorded. */
  primaryClass: SoundClassId | null;
  usages: readonly ReviewClipUsage[];
}>;

export type SoundClassCount = Readonly<{
  soundClass: SoundClass;
  count: number;
}>;

export type PronunciationReviewSummary = Readonly<{
  /** Clips a learner can hear in the app today. */
  clipCount: number;
  /** Clips in the whole generated set, most of which no page uses. */
  fullSetSize: number;
  voice: string;
  rate: string;
  classCounts: readonly SoundClassCount[];
  /** Clips the technical pass left without a sound class. */
  unclassifiedCount: number;
}>;

/* ---------------------------------------------------------------------------
 * Reading the artifacts
 * ------------------------------------------------------------------------ */

type ManifestAsset = {
  id: string;
  sourceText: string;
  spokenText: string;
  voice: string;
  rate: string;
  publicRelativePath: string;
  sha256: string;
  durationSeconds: number;
  detailMappings: readonly { detailId: string; kind: string; sourceText: string }[];
  activityMappings: readonly { activityId: string; sourceText: string }[];
};

type AppManifest = {
  assetCount: number;
  voice: string;
  rate: string;
  assets: readonly ManifestAsset[];
};

type TechnicalNote = { id: string; riskTags?: readonly string[] };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/**
 * `aud:tts:9b5ae83759130817:v1` becomes `9b5ae837`.
 *
 * The page shows this rather than the whole id. Two reasons, in order: a
 * reviewer writing a note needs something short to name a clip by, and the
 * app-wide copy gate rejects raw typed ids in anything a person can see. The
 * full id is never lost — it is what the downloaded file records.
 */
export function clipReference(clipId: string): string {
  const parts = clipId.split(":");
  const body = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
  return (body ?? clipId).slice(0, 8);
}

/** Sound classes on one clip, ordered hardest first and free of unknown tags. */
function soundClassesFor(tags: readonly string[]): readonly SoundClassId[] {
  const present = new Set(tags);
  return Object.freeze(
    SOUND_CLASSES.filter((entry) => present.has(entry.id)).map((entry) => entry.id),
  );
}

const DETAIL_KIND_LABEL: Readonly<Record<string, string>> = Object.freeze({
  Lexeme: "Word page",
  Verb: "Verb page",
  QAPair: "Phrase page",
  GrammarConcept: "Grammar page",
});

/**
 * The pages this clip is heard on, as words.
 *
 * Mapping rows carry typed ids. Those are addresses, not language: they are
 * resolved here through the same projections the real pages read, so this
 * surface names a word or a step the way a learner sees it. An id that no
 * longer resolves is dropped rather than printed — printing it would both
 * confuse a listener and break the copy gate.
 */
function usagesFor(asset: ManifestAsset): readonly ReviewClipUsage[] {
  const byHref = new Map<string, ReviewClipUsage>();

  for (const mapping of asset.detailMappings) {
    const detail = getLearnerDetail(mapping.detailId);
    if (!detail) continue;
    byHref.set(detail.canonicalPath, {
      label: detail.displayText,
      language: "de",
      context: DETAIL_KIND_LABEL[detail.kind] ?? "Word page",
      href: detail.canonicalPath,
    });
  }

  for (const mapping of asset.activityMappings) {
    const activity = getActivityById(mapping.activityId);
    if (!activity) continue;
    byHref.set(activity.canonicalPath, {
      label: activity.promptPlainText,
      language: "en",
      context: `${lessonLabel(activity.lessonRouteSegment)} · ${activity.stageTitleEn}`,
      href: activity.canonicalPath,
    });
  }

  return Object.freeze(
    [...byHref.values()].sort(
      (left, right) =>
        left.context.localeCompare(right.context, "en") ||
        left.label.localeCompare(right.label, "de"),
    ),
  );
}

let cachedClips: readonly PronunciationReviewClip[] | null = null;

/**
 * Every clip the running app can play, ordered hardest sound class first and
 * then alphabetically by the German itself. The order is fully determined by
 * the artifacts, so two builds produce the same page.
 */
export function listPronunciationReviewClips(): readonly PronunciationReviewClip[] {
  if (cachedClips) return cachedClips;

  const manifest = readJson<AppManifest>(APP_MANIFEST_PATH);
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error("pronunciation manifest carries no clips");
  }
  if (manifest.assets.length !== manifest.assetCount) {
    throw new Error(
      `pronunciation manifest count mismatch: says ${manifest.assetCount}, holds ${manifest.assets.length}`,
    );
  }

  const tagsById = new Map<string, readonly string[]>();
  for (const path of TECHNICAL_NOTE_PATHS) {
    const notes = readJson<{ assets: readonly TechnicalNote[] }>(path);
    for (const note of notes.assets) {
      tagsById.set(note.id, note.riskTags ?? []);
    }
  }

  const rank = new Map(SOUND_CLASSES.map((entry, index) => [entry.id, index]));
  const unranked = SOUND_CLASSES.length;

  const clips = manifest.assets.map((asset) => {
    const soundClasses = soundClassesFor(tagsById.get(asset.id) ?? []);
    const clip: PronunciationReviewClip = Object.freeze({
      id: asset.id,
      reference: clipReference(asset.id),
      spokenText: asset.spokenText,
      sourceText: asset.sourceText,
      publicPath: `/${asset.publicRelativePath}`,
      publicRelativePath: asset.publicRelativePath,
      durationSeconds: asset.durationSeconds,
      voice: asset.voice,
      rate: asset.rate,
      sha256: asset.sha256,
      soundClasses,
      primaryClass: soundClasses[0] ?? null,
      usages: usagesFor(asset),
    });
    return clip;
  });

  clips.sort((left, right) => {
    const leftRank =
      left.primaryClass == null ? unranked : (rank.get(left.primaryClass) ?? unranked);
    const rightRank =
      right.primaryClass == null ? unranked : (rank.get(right.primaryClass) ?? unranked);
    return (
      leftRank - rightRank || left.spokenText.localeCompare(right.spokenText, "de")
    );
  });

  cachedClips = Object.freeze(clips);
  return cachedClips;
}

/** Counts behind the filter controls, computed from the clips themselves. */
export function summarisePronunciationReview(
  clips: readonly PronunciationReviewClip[] = listPronunciationReviewClips(),
): PronunciationReviewSummary {
  const first = clips[0];
  const classCounts = SOUND_CLASSES.map((soundClass) =>
    Object.freeze({
      soundClass,
      count: clips.filter((clip) => clip.soundClasses.includes(soundClass.id)).length,
    }),
  );
  return Object.freeze({
    clipCount: clips.length,
    fullSetSize: FULL_GENERATED_SET_SIZE,
    voice: first?.voice ?? "",
    rate: first?.rate ?? "",
    classCounts: Object.freeze(classCounts),
    unclassifiedCount: clips.filter((clip) => clip.primaryClass == null).length,
  });
}
