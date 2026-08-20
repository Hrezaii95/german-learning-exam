/**
 * Build-time projection for the pronunciation listening surface.
 *
 * SERVER ONLY. This module reads files, so it may only ever be imported from a
 * server component — `app/review-audio/page.tsx` is the single caller. The
 * shared half (types, the risk-tag table, the pure helpers) lives in
 * `pronunciation-review.ts` and is the only one a `"use client"` file may
 * touch. See the header of that file for the build failure this split exists
 * to prevent; `tests/web/pronunciation-review-surface.test.ts` enforces it by
 * walking the real import graph.
 *
 * WHY THIS EXISTS
 * The generated German voice is a computer voice. Every clip it produced is
 * still waiting for a qualified German listener to say whether it is good
 * enough to teach with — no automated check can decide that, and this codebase
 * must never decide it either. Until that listening happens the clips sit one
 * at a time behind a Listen button on about a hundred separate pages, which is
 * not a surface anyone can sit down and work through.
 *
 * SCOPE — the honest 110 against 354
 * `public/audio/tts-de-de-v1/manifest.json` carries the 110 clips wired into
 * the running app. The whole generated set holds 354; the remaining 244 are
 * not reachable from any page, so listening to them would say nothing about
 * what a learner actually hears. The page states this in as many words.
 *
 * It reads; it writes nothing, and it changes nothing about what the app plays.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getActivityById, getLearnerDetail } from "../content/access";
import { lessonLabel } from "../content/lesson-label";
import {
  clipReference,
  compareReviewClips,
  riskTagsFor,
  type PronunciationReviewClip,
  type ReviewClipUsage,
} from "./pronunciation-review";

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
 * The phonetic classes come from the technical pass over the whole generated
 * set, plus the later gap supplement. Both are read because the 110 in the app
 * are drawn from both runs, and a clip whose tag list went missing would
 * quietly drop out of every focused filter.
 */
const TECHNICAL_NOTE_PATHS = [
  join(repoRoot, "media", "qa", "alpha-tts-technical-audit.json"),
  join(
    repoRoot,
    "media",
    "qa",
    "exact-tts-gap-supplement-v1-technical-audit.json",
  ),
] as const;

type ManifestAsset = {
  id: string;
  spokenText: string;
  voice: string;
  rate: string;
  publicRelativePath: string;
  sha256: string;
  durationSeconds: number;
  detailMappings: readonly { detailId: string }[];
  activityMappings: readonly { activityId: string }[];
};

type AppManifest = {
  assetCount: number;
  assets: readonly ManifestAsset[];
};

type TechnicalNote = { id: string; riskTags?: readonly string[] };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
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
 * surface names a word or a step the way a learner sees it. A mapping that no
 * longer resolves is dropped rather than printed — printing it would both
 * confuse a listener and break the app-wide copy gate.
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
 * Every clip the running app can play, ordered hardest sound first.
 *
 * The two consistency checks are not defensive noise: a manifest that lost
 * rows, or that disagrees with its own count, would silently shrink the review
 * to a subset while the page still claimed to show everything a learner hears.
 * Failing the build is the only honest response to that.
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
      const existing = tagsById.get(note.id) ?? [];
      tagsById.set(note.id, [...existing, ...(note.riskTags ?? [])]);
    }
  }

  const clips = manifest.assets.map((asset) => {
    const riskTags = riskTagsFor(tagsById.get(asset.id) ?? []);
    const clip: PronunciationReviewClip = Object.freeze({
      id: asset.id,
      reference: clipReference(asset.id),
      spokenText: asset.spokenText,
      publicPath: `/${asset.publicRelativePath}`,
      publicRelativePath: asset.publicRelativePath,
      durationSeconds: asset.durationSeconds,
      voice: asset.voice,
      rate: asset.rate,
      sha256: asset.sha256,
      riskTags,
      primaryRiskTag: riskTags[0] ?? null,
      usages: usagesFor(asset),
    });
    return clip;
  });

  clips.sort(compareReviewClips);

  cachedClips = Object.freeze(clips);
  return cachedClips;
}
