/**
 * Canonical `/practice` and `/practice/[gameId]` path helpers.
 * Exact game IDs only — no catch-all fallback. Unknown/malformed/extra → 404.
 */

import {
  isPracticeGameId,
  PRACTICE_GAME_IDS,
  type PracticeGameId,
} from "./game-ids";

export const PRACTICE_ROOT_PATH = "/practice" as const;

export function practiceCanonicalPath(gameId?: PracticeGameId): string {
  if (gameId == null) return PRACTICE_ROOT_PATH;
  return `${PRACTICE_ROOT_PATH}/${gameId}`;
}

export function listCanonicalPracticePaths(): string[] {
  return [PRACTICE_ROOT_PATH, ...PRACTICE_GAME_IDS.map((id) => practiceCanonicalPath(id))];
}

/**
 * Decode a practice game segment. Game IDs are kebab-case with no reserved
 * characters, so the canonical form is the exact ID string (no encoding alias).
 * Encoded forms that decode to an exact ID are accepted only when they round-trip
 * to the same segment (documented identity alias — no raw special chars).
 */
export function tryDecodePracticeGameSegment(
  segment: string,
): PracticeGameId | null {
  if (typeof segment !== "string" || segment.length === 0) return null;
  if (segment.includes("/")) return null;
  if (isPracticeGameId(segment)) return segment;
  try {
    const decoded = decodeURIComponent(segment);
    if (!isPracticeGameId(decoded)) return null;
    if (encodeURIComponent(decoded) !== segment && decoded !== segment) {
      // Only identity / trivial encode of exact ID — reject exotic encodings.
      if (encodeURIComponent(decoded) !== segment) return null;
    }
    // Accept only when segment equals the exact ID (canonical) — encoded
    // forms of kebab IDs without reserved chars are identical anyway.
    return decoded === segment ? decoded : null;
  } catch {
    return null;
  }
}

export function isCanonicalPracticeGamePath(pathname: string): boolean {
  if (pathname === PRACTICE_ROOT_PATH) return true;
  const m = pathname.match(/^\/practice\/([^/]+)$/);
  if (!m) return false;
  return tryDecodePracticeGameSegment(m[1]!) != null;
}
