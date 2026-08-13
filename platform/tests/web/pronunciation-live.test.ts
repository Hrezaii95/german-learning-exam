import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePublishedPronunciationExact } from "../../apps/web/lib/content/media-availability.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const manifestPath = join(root, "media", "manifests", "published-tts-exact-v1.json");
const publicDir = join(root, "platform", "apps", "web", "public", "audio", "tts-de-de-v1");

type Manifest = {
  assetCount: number;
  coverage: {
    publishedDetailConcepts: number;
    detailConceptsWithExactAudio: number;
    exactDetailSourceMappings: number;
    uniqueActivityUtterances: number;
    activityUtterancesWithExactAudio: number;
    activitiesWithExactGeneratedAudio: number;
    activitiesWithApprovedWorkbookAudio: number;
    activitiesWithEitherAudio: number;
    totalActivities: number;
  };
  unmappedDetails: Array<{ detailId: string }>;
  unmappedActivityUtterances: string[];
  assets: Array<{
    id: string;
    sourceText: string;
    spokenText: string;
    publicRelativePath: string;
    bytes: number;
    sha256: string;
    voice: string;
    rate: string;
    publicationStatus: string;
  }>;
};

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

describe("live exact-source German pronunciation", () => {
  it("publishes only byte-verified exact source/spoken mappings", () => {
    expect(manifest.assetCount).toBe(110);
    expect(manifest.assets).toHaveLength(110);
    expect(readdirSync(publicDir).filter((name) => name.endsWith(".mp3"))).toHaveLength(110);
    for (const asset of manifest.assets) {
      expect(asset.spokenText).toBe(asset.sourceText);
      expect(asset.voice).toBe("de-DE-KatjaNeural");
      expect(asset.rate).toBe("+4%");
      expect(asset.publicationStatus).toBe("public-owner-authorized-synthesized-preview");
      const path = join(root, "platform", "apps", "web", "public", ...asset.publicRelativePath.split("/"));
      expect(statSync(path).size).toBe(asset.bytes);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(asset.sha256);
    }
  });

  it("reports exact Lesson 1 and 2 coverage without hiding gaps", () => {
    expect(manifest.coverage).toEqual({
      publishedDetailConcepts: 97,
      detailConceptsWithExactAudio: 97,
      exactDetailSourceMappings: 100,
      uniqueActivityUtterances: 92,
      activityUtterancesWithExactAudio: 92,
      activitiesWithExactGeneratedAudio: 21,
      activitiesWithApprovedWorkbookAudio: 4,
      activitiesWithEitherAudio: 23,
      totalActivities: 23,
    });
    expect(manifest.unmappedDetails).toEqual([]);
    expect(manifest.unmappedActivityUtterances).toEqual([]);
  });

  it("does not trim, normalize, case-fold, or substitute German source text", () => {
    expect(resolvePublishedPronunciationExact("der Architekt").state).toBe("preview");
    expect(resolvePublishedPronunciationExact(" der Architekt").state).toBe("missing");
    expect(resolvePublishedPronunciationExact("Der Architekt").state).toBe("missing");
    expect(resolvePublishedPronunciationExact("die Schweiz").state).toBe("preview");
    expect(resolvePublishedPronunciationExact(" die Schweiz").state).toBe("missing");
    expect(resolvePublishedPronunciationExact("Schweiz").state).toBe("preview");
  });
});
