import type { DictionaryEntry } from "./types";
import { dictionaryKey } from "./storage";

/** Phrase keys keep articles and ellipses: a template is not a full sentence. */
export function phraseKey(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("de-DE")
    .replace(/[’‘]/g, "'").replace(/[.,!?;:()[\]“”„]/g, "")
    .replace(/\s+/g, " ").trim();
}

export function lookupEntries(dictionary: DictionaryEntry[], query: string) {
  const key = phraseKey(query);
  if (!key) return { exact: false, entries: [] as DictionaryEntry[] };
  const forms = (entry: DictionaryEntry) => [entry.de, ...entry.forms];
  const equals = (entry: DictionaryEntry, form: string) =>
    entry.kind && entry.kind !== "word"
      ? phraseKey(form) === key
      : dictionaryKey(form) === dictionaryKey(query);
  const exact = dictionary.filter(entry => forms(entry).some(form => equals(entry, form)));
  const candidates = exact.length ? exact : dictionary.filter(entry =>
    [...forms(entry), entry.en].some(form => phraseKey(form).includes(key)));
  candidates.sort((a, b) => Number(b.kind === "phrase") - Number(a.kind === "phrase"));
  // Multiple word cards can share an example. Show its translation once.
  const seen = new Set<string>();
  return { exact: exact.length > 0, entries: candidates.filter(entry => {
    const identity = `${phraseKey(entry.de)}|${entry.en}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }).slice(0, 12) };
}
