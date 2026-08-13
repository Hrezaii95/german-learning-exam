/**
 * Browser-safe exact-string pronunciation lookup.
 *
 * The generated projection contains only the owner-approved, technically
 * validated subset copied to public assets. Matching is deliberately strict:
 * no Unicode normalization, trimming, case folding, or concept-only fallback.
 */
import publishedPronunciation from "./published-pronunciation.json";
import type { LearnerMediaAvailability } from "./detail-types";

type PublishedPronunciationAsset = {
  id: string;
  sourceText: string;
  spokenText: string;
  locale: string;
  voice: string;
  rate: string;
  origin: string;
  publicRelativePath: string;
  publicationStatus: string;
};

const assets = publishedPronunciation.assets as readonly PublishedPronunciationAsset[];

export function resolvePublishedPronunciationExact(
  sourceText: string,
): LearnerMediaAvailability {
  const row = assets.find(
    (asset) =>
      asset.sourceText === sourceText &&
      asset.spokenText === sourceText &&
      asset.locale === "de-DE" &&
      asset.origin === "synthesized-edge-tts" &&
      asset.publicationStatus === "public-owner-authorized-synthesized-preview",
  );
  if (!row) return Object.freeze({ state: "missing", assetId: null });

  return Object.freeze({
    state: "preview",
    assetId: row.id,
    publicPath: `/${row.publicRelativePath}`,
    sourceText: row.sourceText,
    spokenText: row.spokenText,
    locale: "de-DE",
    voice: row.voice,
    generationRate: row.rate,
    origin: "synthesized-edge-tts",
  });
}

/**
 * Resolve the first exact source-text match in caller-provided priority order.
 * conceptIds remain part of the call contract for provenance, but never select
 * an asset: concept-only matching could play the wrong German utterance.
 */
export function resolveMediaAvailability(input: {
  conceptIds: readonly string[];
  spokenTexts: readonly string[];
}): LearnerMediaAvailability {
  void input.conceptIds;
  for (const sourceText of input.spokenTexts) {
    const media = resolvePublishedPronunciationExact(sourceText);
    if (media.state === "preview") return media;
  }
  return Object.freeze({ state: "missing", assetId: null });
}
