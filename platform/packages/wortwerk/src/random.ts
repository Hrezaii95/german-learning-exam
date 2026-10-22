import type { RandomSource } from "./tasks.js";

/** Stable across engines, devices and locales; no clock or global Math.random state. */
export function seededRng(seed: string | number): RandomSource {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.codePointAt(0)!;
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomIndex(length: number, random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("Random source must return a number in [0, 1).");
  return Math.floor(value * length);
}

/** Fisher–Yates; options receive opaque ids only after this operation. */
export function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomIndex(index + 1, random);
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}
