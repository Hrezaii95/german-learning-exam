/**
 * Runtime mutation-resistant Map views for hydration (C2DR2).
 * ReadonlyMap typing alone does not strip Map.set/delete/clear;
 * Object.freeze(map) also leaves those methods callable.
 */

import type { ConceptMasterySnapshot } from "../mastery/types.js";

/**
 * Detach mastery snapshots into a frozen facade with no mutators.
 * Iteration/forEach expose only the frozen snapshot values.
 */
export function immutableMasteryByConcept(
  source: Map<string, ConceptMasterySnapshot>,
): ReadonlyMap<string, ConceptMasterySnapshot> {
  const snapshots = new Map<string, ConceptMasterySnapshot>();
  for (const [key, value] of source) {
    snapshots.set(key, value);
  }

  const view: ReadonlyMap<string, ConceptMasterySnapshot> = {
    get size() {
      return snapshots.size;
    },
    get: (key: string) => snapshots.get(key),
    has: (key: string) => snapshots.has(key),
    forEach: (
      callbackfn: (
        value: ConceptMasterySnapshot,
        key: string,
        map: ReadonlyMap<string, ConceptMasterySnapshot>,
      ) => void,
      thisArg?: unknown,
    ) => {
      snapshots.forEach((value, key) => {
        callbackfn.call(thisArg, value, key, view);
      });
    },
    entries: () => snapshots.entries(),
    keys: () => snapshots.keys(),
    values: () => snapshots.values(),
    [Symbol.iterator]: () => snapshots.entries(),
  };

  return Object.freeze(view);
}
