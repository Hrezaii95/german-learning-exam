import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WordCardCatalog } from "./word-card-types";
import type { LearnerSearchProjection, LearnerSearchDocument, LearnerSearchField } from "./search-types";
import { germanMatchKeys } from "./match-keys";

let cached: WordCardCatalog | undefined;
const catalogPath = join(dirname(fileURLToPath(import.meta.url)), "../../generated/word-cards.json");
export function loadWordCards(): WordCardCatalog {
  cached ??= JSON.parse(readFileSync(catalogPath, "utf8")) as WordCardCatalog;
  return cached;
}
export function wordCardForPath(path: string) {
  return loadWordCards().cards.find(card => card.path === path || card.aliases.includes(path));
}

export function withWordCardSearch(projection: LearnerSearchProjection): LearnerSearchProjection {
  const documents: LearnerSearchDocument[] = projection.documents.filter(d => d.kind !== "Lexeme");
  for (const card of loadWordCards().cards) {
    const field = (kind: LearnerSearchField["field"], displayText: string): LearnerSearchField => ({ field: kind, displayText, matchKeys: germanMatchKeys(displayText) });
    documents.push({ id: `lex:study-${card.id.toLowerCase()}`, kind: "Lexeme", publicationStatus: "published", displayLabel: card.rows.map(r => r.singular.text).join(" / "), sourcePriority: card.priorities.includes("Core") ? 1 : card.teacherRows.length ? 3 : 2, lessonIds: card.lessons.filter(l => /^[123]$/.test(l)).map(l => `lesson:0${l}`), category: card.category, hubDestination: { hub: "vocabulary" }, canonicalHref: card.path, fields: [field("meaning", card.title), field("category", card.category), ...card.rows.flatMap(r => [field("lemma", r.singular.text), ...r.plurals.map(p => field("form", p.text))])] });
  }
  return { ...projection, documentCount: documents.length, documents, documentsById: Object.fromEntries(documents.map(d => [d.id, d])) };
}
