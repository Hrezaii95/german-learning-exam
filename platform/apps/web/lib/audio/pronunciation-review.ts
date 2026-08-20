/**
 * The pronunciation listening surface — the half that both runtimes may read.
 *
 * WHY THE FILE IS SPLIT IN TWO
 * A first attempt at this surface put `node:fs`, `node:path` and `node:url` in
 * one module and then imported that module from a `"use client"` component for
 * its constants. Webpack follows value imports across the client boundary, so
 * the browser bundle inherited `node:fs` and `next build` died with
 * `UnhandledSchemeError` — taking every downstream gate with it.
 *
 * The rule that prevents a repeat: **anything a client component imports lives
 * here, and nothing here may touch a Node builtin.** Reading files happens in
 * `pronunciation-review.server.ts`, which only a server component imports.
 * `tests/web/pronunciation-review-surface.test.ts` walks the real import graph
 * and fails if a client component can reach a builtin again.
 *
 * No DOM either: `platform/tsconfig.json` typechecks `apps/web/lib` with
 * `lib: ["ES2022"]`, so anything browser-shaped belongs in the component.
 */

/** Clips in the whole generated set, stated on the page so the scope is honest. */
export const FULL_GENERATED_SET_SIZE = 354;

/* ---------------------------------------------------------------------------
 * The sounds worth checking
 * ------------------------------------------------------------------------ */

/**
 * The eight phonetic classes the technical pass recorded against each clip
 * (`media/qa/alpha-tts-technical-audit.json`, field `riskTags`). These ids are
 * the artifact's own vocabulary and travel unchanged into the downloaded file;
 * the label and the sentence beside them are for the person listening.
 */
export type PronunciationRiskTagId =
  | "ich-or-ach-sound"
  | "umlaut-or-eszett"
  | "r-sound"
  | "final-obstruent"
  | "feminine-in-or-innen"
  | "conjugated-form"
  | "profession-form"
  | "connected-speech";

export type PronunciationRiskTag = Readonly<{
  id: PronunciationRiskTagId;
  /** Short name on the filter control. */
  label: string;
  /** One sentence telling the listener what to listen for. */
  listenFor: string;
}>;

/**
 * Ordered hardest first, so a listener with limited time spends it where a
 * computer voice is most likely to be wrong. Filter order, group order and
 * which tag heads a multi-tag clip all read this array, so there is exactly one
 * place to argue about difficulty.
 */
export const PRONUNCIATION_RISK_TAGS: readonly PronunciationRiskTag[] =
  Object.freeze([
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

const RISK_TAG_IDS: readonly string[] = PRONUNCIATION_RISK_TAGS.map(
  (entry) => entry.id,
);

export function riskTagById(id: PronunciationRiskTagId): PronunciationRiskTag {
  const found = PRONUNCIATION_RISK_TAGS.find((entry) => entry.id === id);
  if (!found) throw new Error(`unknown pronunciation risk tag: ${id}`);
  return found;
}

/** Guard for a value arriving from a control or a stored preference. */
export function isPronunciationRiskTagId(
  value: string,
): value is PronunciationRiskTagId {
  return RISK_TAG_IDS.includes(value);
}

/**
 * The tags on one clip, ordered hardest first and free of anything the audit
 * recorded that is not a phonetic class (the supplement run also writes a
 * process marker, which is not something a person can listen for).
 */
export function riskTagsFor(
  tags: readonly string[],
): readonly PronunciationRiskTagId[] {
  const present = new Set(tags);
  return Object.freeze(
    PRONUNCIATION_RISK_TAGS.filter((entry) => present.has(entry.id)).map(
      (entry) => entry.id,
    ),
  );
}

/* ---------------------------------------------------------------------------
 * One clip
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
  /** Root-relative audio path; the deploy base path is added in the browser. */
  publicPath: string;
  /** Path as stored, kept verbatim for the downloaded file. */
  publicRelativePath: string;
  durationSeconds: number;
  voice: string;
  rate: string;
  /** Binds a verdict to the exact bytes it judged. */
  sha256: string;
  riskTags: readonly PronunciationRiskTagId[];
  /** First tag in difficulty order, or null when the audit recorded none. */
  primaryRiskTag: PronunciationRiskTagId | null;
  usages: readonly ReviewClipUsage[];
}>;

export type RiskTagCount = Readonly<{
  riskTag: PronunciationRiskTag;
  count: number;
}>;

export type PronunciationReviewSummary = Readonly<{
  /** Clips a learner can hear in the app today. */
  clipCount: number;
  /** Clips in the whole generated set, most of which no page uses. */
  fullSetSize: number;
  voice: string;
  rate: string;
  tagCounts: readonly RiskTagCount[];
  /** Clips the technical pass left without a phonetic class. */
  untaggedCount: number;
}>;

/**
 * `aud:tts:9b5ae83759130817:v1` becomes `9b5ae837`.
 *
 * The page shows this rather than the whole id, for two reasons in this order:
 * a reviewer writing a note needs something short to name a clip by, and the
 * app-wide copy gate rejects raw typed ids in anything a person can see. The
 * full id is never lost — it is what the downloaded file records.
 */
export function clipReference(clipId: string): string {
  const parts = clipId.split(":");
  const body = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
  return (body ?? clipId).slice(0, 8);
}

/** Ranking used for clip order and group order. Unknown/absent sorts last. */
export function riskTagRank(tag: PronunciationRiskTagId | null): number {
  if (tag === null) return PRONUNCIATION_RISK_TAGS.length;
  const index = PRONUNCIATION_RISK_TAGS.findIndex((entry) => entry.id === tag);
  return index === -1 ? PRONUNCIATION_RISK_TAGS.length : index;
}

/**
 * Hardest sound first, then alphabetically by the German itself. Pure and
 * total, so the same clips always produce the same page.
 */
export function compareReviewClips(
  left: PronunciationReviewClip,
  right: PronunciationReviewClip,
): number {
  return (
    riskTagRank(left.primaryRiskTag) - riskTagRank(right.primaryRiskTag) ||
    left.spokenText.localeCompare(right.spokenText, "de") ||
    left.id.localeCompare(right.id, "en")
  );
}

/** Counts behind the filter controls, computed from the clips themselves. */
export function summarisePronunciationReview(
  clips: readonly PronunciationReviewClip[],
): PronunciationReviewSummary {
  const first = clips[0];
  const tagCounts = PRONUNCIATION_RISK_TAGS.map((riskTag) =>
    Object.freeze({
      riskTag,
      count: clips.filter((clip) => clip.riskTags.includes(riskTag.id)).length,
    }),
  );
  return Object.freeze({
    clipCount: clips.length,
    fullSetSize: FULL_GENERATED_SET_SIZE,
    voice: first?.voice ?? "",
    rate: first?.rate ?? "",
    tagCounts: Object.freeze(tagCounts),
    untaggedCount: clips.filter((clip) => clip.primaryRiskTag === null).length,
  });
}
