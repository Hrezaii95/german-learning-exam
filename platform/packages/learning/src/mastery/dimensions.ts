/**
 * Six labelled mastery dimensions (LRN-003 / P2-03).
 * Stability is derived scheduling/history evidence — not a vector slot.
 */

export const MASTERY_DIMENSIONS = [
  "exposure",
  "recognition",
  "recall",
  "listening",
  "form",
  "production",
] as const;

export type MasteryDimension = (typeof MASTERY_DIMENSIONS)[number];

/** Explicit non-slot: delayed checkpoints / review history, not MasteryVector. */
export type StabilityEvidenceKind = "stability";

export const STABILITY_EVIDENCE_KIND = "stability" as const satisfies StabilityEvidenceKind;

export function isMasteryDimension(value: unknown): value is MasteryDimension {
  return (
    typeof value === "string" &&
    (MASTERY_DIMENSIONS as readonly string[]).includes(value)
  );
}

export function emptyMasteryCounts(): Record<MasteryDimension, number> {
  return {
    exposure: 0,
    recognition: 0,
    recall: 0,
    listening: 0,
    form: 0,
    production: 0,
  };
}
