/**
 * Query-side German match keys for hub filters.
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

function nfc(text: string): string {
  return text.normalize("NFC");
}

function caseFoldNfc(text: string): string {
  return nfc(text).toLowerCase();
}

function mapChars(text: string, table: Record<string, string>): string {
  let out = "";
  for (const ch of text) {
    out += table[ch] ?? ch;
  }
  return out;
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
