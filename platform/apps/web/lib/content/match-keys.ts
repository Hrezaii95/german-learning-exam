/**
 * Query-side German match keys for hub filters and global search.
 * Mirrors content-index fold semantics so artifact matchKeys stay compatible.
 * Display labels must remain canonical; never return folded forms to UI.
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

const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u;

export function nfc(text: string): string {
  return text.normalize("NFC");
}

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

export function foldUmlautDigraph(text: string): string {
  return mapChars(caseFoldNfc(text), UMLAUT_TO_DIGRAPH);
}

/** Deterministic match keys: casefolded NFC, digraph fold, base fold (deduped). */
export function queryMatchKeys(displayText: string): string[] {
  const folded = caseFoldNfc(displayText);
  const digraph = mapChars(folded, UMLAUT_TO_DIGRAPH);
  const base = mapChars(folded, UMLAUT_TO_BASE);
  const keys: string[] = [];
  for (const k of [folded, digraph, base]) {
    if (k.length > 0 && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

/** Alias used by search scoring — identical to queryMatchKeys. */
export function germanMatchKeys(displayText: string): string[] {
  return queryMatchKeys(displayText);
}

/** Safe tokenization on letters/digits; empty tokens dropped. */
export function tokenizeNormalized(text: string): string[] {
  const folded = foldUmlautDigraph(text);
  return folded.split(TOKEN_SPLIT).filter((t) => t.length > 0);
}
