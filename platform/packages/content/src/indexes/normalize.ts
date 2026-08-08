/**
 * German-aware normalization for search matching only.
 * Display labels must remain canonical NFC text; never return folded forms to UI.
 */

const UMLAUT_TO_DIGRAPH: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

const UMLAUT_TO_BASE: Record<string, string> = {
  ä: "a",
  ö: "o",
  ü: "u",
  ß: "ss",
};

const HTML_TAG = /<\/?[a-zA-Z][^>]*>/;
const ASSERTION_ID = /\bassert:[a-z0-9][a-z0-9:-]*/i;
const ASSERTION_VALUE_SHAPE = /"value"\s*:/;

/** NFC-normalize without altering semantics of well-formed German text. */
export function nfc(text: string): string {
  return text.normalize("NFC");
}

/** Case-fold after NFC (locale-independent ASCII + Unicode lowercasing). */
export function caseFoldNfc(text: string): string {
  return nfc(text).toLowerCase();
}

function mapChars(text: string, table: Record<string, string>): string {
  let out = "";
  for (const ch of text) {
    out += table[ch] ?? ch;
  }
  return out;
}

/** Predictable umlaut/ß → digraph fold (ä→ae, ß→ss). */
export function foldUmlautDigraph(text: string): string {
  return mapChars(caseFoldNfc(text), UMLAUT_TO_DIGRAPH);
}

/** Predictable umlaut/ß → base fold (ä→a, ß→ss) for secondary alias matching. */
export function foldUmlautBase(text: string): string {
  return mapChars(caseFoldNfc(text), UMLAUT_TO_BASE);
}

/**
 * Deterministic match keys for a display string.
 * Order: casefolded NFC, digraph fold, base fold (deduped).
 */
export function germanMatchKeys(displayText: string): string[] {
  const folded = caseFoldNfc(displayText);
  const digraph = mapChars(folded, UMLAUT_TO_DIGRAPH);
  const base = mapChars(folded, UMLAUT_TO_BASE);
  const keys: string[] = [];
  for (const k of [folded, digraph, base]) {
    if (k.length > 0 && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u;

/** Safe tokenization on letters/digits; empty tokens dropped. */
export function tokenizeNormalized(text: string): string[] {
  const folded = foldUmlautDigraph(text);
  return folded.split(TOKEN_SPLIT).filter((t) => t.length > 0);
}

export function tokenizeAllKeys(displayText: string): string[] {
  const tokens: string[] = [];
  for (const key of germanMatchKeys(displayText)) {
    for (const t of key.split(TOKEN_SPLIT)) {
      if (t.length > 0 && !tokens.includes(t)) tokens.push(t);
    }
  }
  return tokens;
}

function isMalformedRawString(value: string): boolean {
  return (
    HTML_TAG.test(value) ||
    ASSERTION_ID.test(value) ||
    ASSERTION_VALUE_SHAPE.test(value)
  );
}

/**
 * Guard every plain string that becomes a search field or display label.
 * Rejects HTML / assertion-shaped content with stable INDEX_PLAINTEXT_REJECTED.
 */
export function assertIndexPlaintext(value: string, context?: string): string {
  if (isMalformedRawString(value)) {
    throw new Error(
      context
        ? `INDEX_PLAINTEXT_REJECTED: malformed plain string refused for indexing (${context})`
        : "INDEX_PLAINTEXT_REJECTED: malformed plain string refused for indexing",
    );
  }
  return nfc(value);
}

/**
 * Extract plain text from StructuredText-like token arrays without HTML.
 * Raw strings that are HTML- or assertion-shaped are rejected (fail closed).
 * Non-object / non-StructuredText inputs yield empty string; malformed raw
 * strings throw a stable INDEX_PLAINTEXT_REJECTED error.
 */
export function plainTextFromStructured(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    if (isMalformedRawString(value)) {
      throw new Error(
        "INDEX_PLAINTEXT_REJECTED: malformed raw string refused for indexing",
      );
    }
    // Plain raw strings are not StructuredText — refuse rather than index a bypass.
    throw new Error(
      "INDEX_PLAINTEXT_REJECTED: raw string is not StructuredText; token array required",
    );
  }
  if (typeof value !== "object") return "";
  const tokens = (value as { tokens?: unknown }).tokens;
  if (!Array.isArray(tokens)) return "";
  const parts: string[] = [];
  for (const tok of tokens) {
    if (tok == null || typeof tok !== "object") continue;
    const t = tok as { type?: string; text?: unknown; label?: unknown };
    if (typeof t.text === "string") {
      if (isMalformedRawString(t.text)) {
        throw new Error(
          "INDEX_PLAINTEXT_REJECTED: malformed token text refused for indexing",
        );
      }
      parts.push(t.text);
    } else if (typeof t.label === "string") {
      if (isMalformedRawString(t.label)) {
        throw new Error(
          "INDEX_PLAINTEXT_REJECTED: malformed token label refused for indexing",
        );
      }
      parts.push(t.label);
    }
  }
  return nfc(parts.join(""));
}
