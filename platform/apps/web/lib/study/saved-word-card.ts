import type { WordCard } from "../content/word-card-types";
import { wordStudyTags } from "./tags";
import type { DictionaryEntry,SavedItem } from "./types";

/** IDs stored in links and saves before the Lesson 4 families were merged. */
export function legacyWordCardIds(card:WordCard):string[]{
  return card.aliases.filter(path=>path.startsWith("/vocabulary/l4-")).map(path=>path.slice("/vocabulary/".length));
}

export function savedDictionaryEntry(entry:DictionaryEntry):SavedItem{
  return {
    id:entry.saveId??`card-${entry.id}`,
    ...(entry.legacySaveIds?.length?{legacyIds:entry.legacySaveIds}:{}),
    title:entry.de,meaning:entry.en,
    kind:entry.kind==="phrase"?"phrase":entry.kind==="sentence"?"line":"word",
    href:entry.href,audio:entry.audio,
    ...(entry.studyTags?{studyTags:entry.studyTags}:{}),
  };
}

/** A family has the same saved identity in the library, collections and details. */
export function savedWordCard(card: WordCard): SavedItem {
  const legacyIds=legacyWordCardIds(card).map(id=>`card-${id}`);
  return {
    id: `card-${card.id}`,
    ...(legacyIds.length?{legacyIds}:{}),
    title: card.rows.map(row => row.singular.text).join(" / "),
    meaning: card.title,
    kind: "word",
    href: card.path,
    studyTags: card.studyTags ?? wordStudyTags(card),
    audio: card.rows[0]?.singular.audio ?? null,
  };
}
