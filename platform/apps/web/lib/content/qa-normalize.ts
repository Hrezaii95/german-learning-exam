/**
 * Ellipsis-safe normalization for Q&A construction checks.
 * Compares only against authoritative published fixed patterns.
 */
const ELLIPSIS_CHARS = /(?:\u2026|\u22EF|\.{3}|…)/g;

export function normalizeQaConstructionInput(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(ELLIPSIS_CHARS, "…")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchPublishedQaPattern(
  input: string,
  accepted: readonly string[],
): boolean {
  const normalized = normalizeQaConstructionInput(input);
  if (normalized.length === 0) return false;
  return accepted.some(
    (pattern) => normalizeQaConstructionInput(pattern) === normalized,
  );
}
