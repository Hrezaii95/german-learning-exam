/**
 * Mastery selectors — single concept and labelled aggregates (no single %).
 */

import { MASTERY_DIMENSIONS, type MasteryDimension } from "./dimensions.js";
import { masteryError } from "./errors.js";
import { resolvePolicy } from "./policy.js";
import type {
  AggregateMasteryView,
  ConceptMasterySnapshot,
  MasteryPolicy,
  MasteryStatus,
} from "./types.js";

export function selectConceptMastery(
  snapshots: ReadonlyMap<string, ConceptMasterySnapshot> | readonly ConceptMasterySnapshot[],
  conceptId: string,
): ConceptMasterySnapshot | undefined {
  if (Array.isArray(snapshots)) {
    return snapshots.find((s) => s.conceptId === conceptId);
  }
  return (snapshots as ReadonlyMap<string, ConceptMasterySnapshot>).get(conceptId);
}

function emptyStatusCounts(): Record<MasteryStatus, number> {
  return {
    new: 0,
    exploring: 0,
    learning: 0,
    practising: 0,
    strong: 0,
    mastered: 0,
  };
}

type DimTotal = {
  conceptsWithAttempts: number;
  conceptsMet: number;
  totalSuccesses: number;
  totalFailures: number;
};

/**
 * Deterministic aggregate over concepts.
 * Exposes labelled per-dimension totals — never a collapsed mastery percentage.
 */
export function aggregateMastery(
  snapshots: ReadonlyMap<string, ConceptMasterySnapshot> | readonly ConceptMasterySnapshot[],
  policyInput?: MasteryPolicy,
): AggregateMasteryView {
  const policy = resolvePolicy(policyInput);
  const list: ConceptMasterySnapshot[] = Array.isArray(snapshots)
    ? [...snapshots]
    : [...(snapshots as ReadonlyMap<string, ConceptMasterySnapshot>).values()];

  list.sort((a, b) => (a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0));

  const statusCounts = emptyStatusCounts();
  const dimAcc: Record<MasteryDimension, DimTotal> = {
    exposure: { conceptsWithAttempts: 0, conceptsMet: 0, totalSuccesses: 0, totalFailures: 0 },
    recognition: { conceptsWithAttempts: 0, conceptsMet: 0, totalSuccesses: 0, totalFailures: 0 },
    recall: { conceptsWithAttempts: 0, conceptsMet: 0, totalSuccesses: 0, totalFailures: 0 },
    listening: { conceptsWithAttempts: 0, conceptsMet: 0, totalSuccesses: 0, totalFailures: 0 },
    form: { conceptsWithAttempts: 0, conceptsMet: 0, totalSuccesses: 0, totalFailures: 0 },
    production: { conceptsWithAttempts: 0, conceptsMet: 0, totalSuccesses: 0, totalFailures: 0 },
  };

  for (const snap of list) {
    statusCounts[snap.status] += 1;
    for (const d of MASTERY_DIMENSIONS) {
      const ev = snap.dimensions[d];
      if (ev.attempts > 0 || ev.exposureTouches > 0) {
        dimAcc[d].conceptsWithAttempts += 1;
      }
      dimAcc[d].totalSuccesses += ev.successes;
      dimAcc[d].totalFailures += ev.failures;
      if (d !== "exposure" && ev.successes >= policy.minSuccessesPerDimension) {
        dimAcc[d].conceptsMet += 1;
      }
    }
  }

  const dimensionTotals = {
    exposure: Object.freeze({ ...dimAcc.exposure }),
    recognition: Object.freeze({ ...dimAcc.recognition }),
    recall: Object.freeze({ ...dimAcc.recall }),
    listening: Object.freeze({ ...dimAcc.listening }),
    form: Object.freeze({ ...dimAcc.form }),
    production: Object.freeze({ ...dimAcc.production }),
  };

  return Object.freeze({
    conceptIds: Object.freeze(list.map((s) => s.conceptId)),
    dimensionTotals: Object.freeze(dimensionTotals),
    statusCounts: Object.freeze({ ...statusCounts }),
  });
}

/** Runtime assertion: mastery views never carry reward fields. */
export function assertNoRewardFieldsOnMastery(value: unknown): void {
  if (value === null || typeof value !== "object") {
    throw masteryError("INVALID_TYPE", "Expected mastery object");
  }
  const forbidden = ["xp", "streak", "badge", "badges", "streakDays", "xpDelta"] as const;
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || typeof cur !== "object") continue;
    if (seen.has(cur as object)) continue;
    seen.add(cur as object);
    for (const key of Object.keys(cur as object)) {
      if ((forbidden as readonly string[]).includes(key)) {
        throw masteryError(
          "REWARD_FIELD_FORBIDDEN",
          `Reward field "${key}" must not appear on mastery artifacts`,
          key,
        );
      }
      stack.push((cur as Record<string, unknown>)[key]);
    }
  }
}
