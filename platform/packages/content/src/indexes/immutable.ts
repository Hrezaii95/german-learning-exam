/**
 * Runtime mutation-resistant Map/Set views.
 * TypeScript ReadonlyMap/ReadonlySet do not strip mutating methods from real Map/Set;
 * Object.freeze(map) also leaves .set/.delete/.clear callable.
 */

export function immutableMap<K, V>(source: Map<K, V>): ReadonlyMap<K, V> {
  const view: ReadonlyMap<K, V> = {
    get size() {
      return source.size;
    },
    get: (key: K) => source.get(key),
    has: (key: K) => source.has(key),
    forEach: (
      callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
      thisArg?: unknown,
    ) => {
      source.forEach((value, key) => {
        callbackfn.call(thisArg, value, key, view);
      });
    },
    entries: () => source.entries(),
    keys: () => source.keys(),
    values: () => source.values(),
    [Symbol.iterator]: () => source.entries(),
  };
  return Object.freeze(view);
}

export function immutableSet<T>(source: Set<T>): ReadonlySet<T> {
  const view: ReadonlySet<T> = {
    get size() {
      return source.size;
    },
    has: (value: T) => source.has(value),
    forEach: (
      callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void,
      thisArg?: unknown,
    ) => {
      source.forEach((value) => {
        callbackfn.call(thisArg, value, value, view);
      });
    },
    entries: () => source.entries(),
    keys: () => source.keys(),
    values: () => source.values(),
    [Symbol.iterator]: () => source.values(),
  };
  return Object.freeze(view);
}
