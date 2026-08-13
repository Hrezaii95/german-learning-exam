/**
 * Read-only TTS manifest status detection for learner detail media.
 * Server-only (node:fs). Client components must import copy from media-copy.ts.
 * Never copies paths, hashes, spoken secrets, or candidate files into artifacts.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LearnerMediaAvailability } from "./detail-types";

type TtsManifestRow = {
  id?: unknown;
  spokenText?: unknown;
  conceptIds?: unknown;
  reviewStatus?: unknown;
  path?: unknown;
  sha256?: unknown;
};

type TtsManifest = {
  assets?: unknown;
};

const APPROVED_STATUSES = new Set([
  "approved",
  "listening-approved",
  "published-approved",
]);

const PENDING_STATUSES = new Set([
  "candidate-needs-listening-review",
  "needs-listening-review",
  "pending-review",
  "candidate",
]);

function defaultManifestPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // apps/web/lib/content → repo root media/manifests
  return resolve(
    here,
    "..",
    "..",
    "..",
    "..",
    "..",
    "media",
    "manifests",
    "alpha-tts-manifest.json",
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function asRow(value: unknown): TtsManifestRow | null {
  return isPlainObject(value) ? (value as TtsManifestRow) : null;
}

/**
 * Resolve media availability for a representative.
 * Matches by concept id and/or exact spoken-text candidates from published data.
 * Returns pending-review when a technical candidate exists but is not approved.
 */
export function resolveMediaAvailability(input: {
  conceptIds: readonly string[];
  spokenTexts: readonly string[];
  manifestPath?: string;
}): LearnerMediaAvailability {
  const path = input.manifestPath ?? defaultManifestPath();
  if (!existsSync(path)) {
    return Object.freeze({ state: "missing", assetId: null });
  }

  let parsed: TtsManifest;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as TtsManifest;
  } catch {
    return Object.freeze({ state: "missing", assetId: null });
  }

  if (!Array.isArray(parsed.assets)) {
    return Object.freeze({ state: "missing", assetId: null });
  }

  const conceptSet = new Set(input.conceptIds);
  const spokenSet = new Set(input.spokenTexts);

  let best: { state: LearnerMediaAvailability["state"]; assetId: string | null } =
    { state: "missing", assetId: null };

  for (const raw of parsed.assets) {
    const row = asRow(raw);
    if (!row) continue;

    const spoken =
      typeof row.spokenText === "string" ? row.spokenText : null;
    const concepts = Array.isArray(row.conceptIds)
      ? row.conceptIds.filter((c): c is string => typeof c === "string")
      : [];

    const conceptHit = concepts.some((c) => conceptSet.has(c));
    const spokenHit = spoken != null && spokenSet.has(spoken);
    if (!conceptHit && !spokenHit) continue;

    const status =
      typeof row.reviewStatus === "string" ? row.reviewStatus : "";
    const id = typeof row.id === "string" ? row.id : null;

    if (APPROVED_STATUSES.has(status) && id) {
      // Approved wins immediately; asset id is safe to expose without path/hash.
      return Object.freeze({ state: "approved", assetId: id });
    }
    if (PENDING_STATUSES.has(status)) {
      best = { state: "pending-review", assetId: null };
    } else if (best.state === "missing") {
      // Unknown status with a match → treat as pending, never expose path.
      best = { state: "pending-review", assetId: null };
    }
  }

  return Object.freeze(best);
}
