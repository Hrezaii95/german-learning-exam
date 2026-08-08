/**
 * Hydration: replay raw events via approved mastery APIs; validate scheduler cards.
 * Public hydration always validates — no boolean escape hatch.
 * masteryByConcept is mutation-resistant at runtime (C2DR2).
 */

import { reduceAllConceptMastery } from "../mastery/reduce.js";
import type { MasteryPolicy } from "../mastery/types.js";
import type { ReviewCardState } from "../review/types.js";
import { persistenceError } from "./errors.js";
import { immutableMasteryByConcept } from "./immutable.js";
import type {
  ContentBundleIdentity,
  LearnerStateHydration,
  PublishedContentResolver,
} from "./types.js";
import {
  parseLearnerStateEnvelope,
  type ValidatedLearnerState,
} from "./validate.js";

export type HydrateOptions = {
  readonly publishedIds: PublishedContentResolver;
  readonly expectedContentBundle: ContentBundleIdentity;
  readonly masteryPolicy?: MasteryPolicy;
  /** Injected clock for due-card selection. */
  readonly now: Date;
};

/**
 * Select review cards due at or before `now` (stable cardId order).
 */
export function selectDueReviewCards(
  cards: readonly ReviewCardState[],
  now: Date,
): readonly ReviewCardState[] {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw persistenceError("INVALID_DATE", "now must be a valid Date", "now");
  }
  const nowMs = now.getTime();
  const due = cards.filter((c) => {
    const t = Date.parse(c.due);
    return Number.isFinite(t) && t <= nowMs;
  });
  return Object.freeze(
    [...due].sort((a, b) =>
      a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0,
    ),
  );
}

/**
 * Internal: hydrate a ValidatedLearnerState (opaque brand, not a boolean).
 * Not exported from the package public API.
 */
export function hydrateValidatedLearnerState(
  state: ValidatedLearnerState,
  options: {
    readonly now: Date;
    readonly masteryPolicy?: MasteryPolicy;
  },
): LearnerStateHydration {
  if (!(options.now instanceof Date) || Number.isNaN(options.now.getTime())) {
    throw persistenceError("INVALID_DATE", "now must be a valid Date", "now");
  }

  let reduced: Map<string, import("../mastery/types.js").ConceptMasterySnapshot>;
  try {
    reduced = reduceAllConceptMastery(state.events, options.masteryPolicy);
  } catch {
    throw persistenceError(
      "MALFORMED_EVENT",
      "Event replay failed during hydration",
      "events",
    );
  }

  const masteryByConcept = immutableMasteryByConcept(reduced);
  const dueCards = selectDueReviewCards(state.reviewCards, options.now);

  return Object.freeze({
    state,
    masteryByConcept,
    dueCards,
  });
}

/**
 * Always validate, then replay events and derive mastery + due cards.
 */
export function hydrateLearnerState(
  input: unknown,
  options: HydrateOptions,
): LearnerStateHydration {
  if (!(options.now instanceof Date) || Number.isNaN(options.now.getTime())) {
    throw persistenceError("INVALID_DATE", "now must be a valid Date", "now");
  }

  const state = parseLearnerStateEnvelope(input, {
    publishedIds: options.publishedIds,
    expectedContentBundle: options.expectedContentBundle,
  });

  return hydrateValidatedLearnerState(state, {
    now: options.now,
    ...(options.masteryPolicy !== undefined
      ? { masteryPolicy: options.masteryPolicy }
      : {}),
  });
}

/**
 * Load from adapter and hydrate. Returns null when adapter is empty.
 */
export async function loadAndHydrateLearnerState(
  adapter: {
    load(): Promise<import("./types.js").LearnerStateEnvelope | null>;
  },
  options: HydrateOptions,
): Promise<LearnerStateHydration | null> {
  const loaded = await adapter.load();
  if (loaded === null) return null;
  return hydrateLearnerState(loaded, options);
}
