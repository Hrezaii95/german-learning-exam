/**
 * Exact seven P4A game mode IDs — centralized, exhaustive, immutable.
 * Unknown / duplicate / missing modes fail closed at runtime.
 */

export const PRACTICE_GAME_IDS = [
  "flashcards",
  "picture-word-match",
  "article-choice",
  "audio-match",
  "word-order",
  "verb-builder",
  "morphology-puzzle",
] as const;

export type PracticeGameId = (typeof PRACTICE_GAME_IDS)[number];

const GAME_ID_SET = new Set<string>(PRACTICE_GAME_IDS);

export function isPracticeGameId(value: unknown): value is PracticeGameId {
  return typeof value === "string" && GAME_ID_SET.has(value);
}

/**
 * Assert the exact seven-ID set (order-insensitive equality to the canonical list).
 * Throws on unknown, duplicate, or missing modes — never silently pads.
 */
export function assertExactPracticeGameIds(
  ids: readonly string[],
): asserts ids is readonly PracticeGameId[] {
  if (ids.length !== PRACTICE_GAME_IDS.length) {
    throw new Error(
      `Practice game ID count mismatch: expected ${PRACTICE_GAME_IDS.length}, got ${ids.length}`,
    );
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (!isPracticeGameId(id)) {
      throw new Error("Unknown practice game mode");
    }
    if (seen.has(id)) {
      throw new Error("Duplicate practice game mode");
    }
    seen.add(id);
  }
  for (const expected of PRACTICE_GAME_IDS) {
    if (!seen.has(expected)) {
      throw new Error("Missing practice game mode");
    }
  }
}

/** Diff of actual vs exact required set — empty when complete and exact. */
export function practiceGameIdDiff(actual: readonly string[]): {
  readonly missing: readonly PracticeGameId[];
  readonly unknown: readonly string[];
  readonly duplicates: readonly string[];
} {
  const counts = new Map<string, number>();
  for (const id of actual) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const missing = PRACTICE_GAME_IDS.filter((id) => !counts.has(id));
  const unknown = [...counts.keys()].filter((id) => !isPracticeGameId(id));
  const duplicates = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([id]) => id);
  return Object.freeze({
    missing: Object.freeze([...missing]),
    unknown: Object.freeze(unknown),
    duplicates: Object.freeze(duplicates),
  });
}

export function isExactPracticeGameIdSet(actual: readonly string[]): boolean {
  const diff = practiceGameIdDiff(actual);
  return (
    diff.missing.length === 0 &&
    diff.unknown.length === 0 &&
    diff.duplicates.length === 0 &&
    actual.length === PRACTICE_GAME_IDS.length
  );
}
