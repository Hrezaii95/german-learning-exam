import type { WordCard } from "../content/word-card-types";
import { wordStudyTags } from "./tags";
import type { SavedItem } from "./types";

/** A family has the same saved identity in the library, collections and details. */
export function savedWordCard(card: WordCard): SavedItem {
  return {
    id: `card-${card.id}`,
    title: card.rows.map(row => row.singular.text).join(" / "),
    meaning: card.title,
    kind: "word",
    href: card.path,
    studyTags: card.studyTags ?? wordStudyTags(card),
    audio: card.rows[0]?.singular.audio ?? null,
  };
}
