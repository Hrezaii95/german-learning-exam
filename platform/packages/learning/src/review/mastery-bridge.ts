/**
 * Derive recent/weak mission flags from an approved mastery snapshot (C2CR1).
 *
 * Unrecovered lapse ⇒ weak. Recovered historical failures alone are not
 * permanently difficult. Do not use cumulative `failures > 0`.
 */

import type { MasteryDimension } from "../mastery/dimensions.js";
import { isMasteryDimension } from "../mastery/dimensions.js";
import type {
  AttemptOutcome,
  ConceptMasterySnapshot,
  EvidenceRecord,
} from "../mastery/types.js";
import { reviewError } from "./errors.js";

export type MasteryDimensionReviewState = {
  readonly dimension: MasteryDimension;
  /** Unrecovered lapse on this dimension (dimensionRecovery). */
  readonly weak: boolean;
  readonly hasUnrecoveredLapse: boolean;
  readonly recovered: boolean;
  readonly latestEvidence: EvidenceRecord | null;
  readonly latestOutcome: AttemptOutcome | "exposure" | null;
  /**
   * Suitable for `recentFailureOrDifficult` on a mission candidate measuring
   * this dimension: unrecovered lapse or latest non-exposure evidence is
   * incorrect/partial. Recovered cumulative failures alone are false.
   */
  readonly recentFailureOrDifficult: boolean;
};

function latestEvidenceForDimension(
  snapshot: ConceptMasterySnapshot,
  dimension: MasteryDimension,
): EvidenceRecord | null {
  // recentEvidence is append order (oldest→newest); scan from the end.
  for (let i = snapshot.recentEvidence.length - 1; i >= 0; i--) {
    const row = snapshot.recentEvidence[i]!;
    if (row.dimension === dimension) return row;
  }
  return null;
}

/**
 * Typed helper: recent/weak state for one mastery dimension from a snapshot.
 */
export function deriveMasteryDimensionReviewState(
  snapshot: ConceptMasterySnapshot,
  dimension: MasteryDimension,
): MasteryDimensionReviewState {
  if (snapshot === null || typeof snapshot !== "object") {
    throw reviewError("INVALID_TYPE", "snapshot must be a ConceptMasterySnapshot", "snapshot");
  }
  if (!isMasteryDimension(dimension)) {
    throw reviewError("INVALID_TYPE", "dimension must be a mastery dimension", "dimension");
  }
  if (
    snapshot.dimensionRecovery === undefined ||
    snapshot.dimensions === undefined ||
    snapshot.recentEvidence === undefined
  ) {
    throw reviewError(
      "INVALID_TYPE",
      "snapshot missing dimensions/dimensionRecovery/recentEvidence",
      "snapshot",
    );
  }

  const recovery = snapshot.dimensionRecovery[dimension];
  if (recovery === undefined) {
    throw reviewError(
      "INVALID_TYPE",
      `snapshot.dimensionRecovery missing ${dimension}`,
      "dimensionRecovery",
    );
  }

  const hasLapse = recovery.latestLapseEventId !== null;
  const hasUnrecoveredLapse = hasLapse && recovery.recovered === false;
  const weak = hasUnrecoveredLapse;

  const latestEvidence = latestEvidenceForDimension(snapshot, dimension);
  const latestOutcome = latestEvidence?.outcome ?? null;
  const latestIsFailure =
    latestOutcome === "incorrect" || latestOutcome === "partial";

  const recentFailureOrDifficult = hasUnrecoveredLapse || latestIsFailure;

  return Object.freeze({
    dimension,
    weak,
    hasUnrecoveredLapse,
    recovered: recovery.recovered,
    latestEvidence,
    latestOutcome,
    recentFailureOrDifficult,
  });
}
