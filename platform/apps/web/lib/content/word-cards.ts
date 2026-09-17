import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WordCardCatalog } from "./word-card-types";
import type {
  LearnerSearchProjection,
  LearnerSearchDocument,
  LearnerSearchField,
} from "./search-types";
import { germanMatchKeys } from "./match-keys";
import type { LearnerHubDefinition, LearnerHubRecord } from "./hub-types";
import { lessonFourCards } from "../study/word-cards";
import { wordStudyTags } from "../study/tags";

let cached: WordCardCatalog | undefined;
const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../generated/word-cards.json",
);
export function loadWordCards(): WordCardCatalog {
  if (!cached) {
    const original = JSON.parse(
      readFileSync(catalogPath, "utf8"),
    ) as WordCardCatalog;
    const speech = JSON.parse(
      readFileSync(join(dirname(catalogPath), "study-speech.json"), "utf8"),
    ) as Record<string, string>;
    const additions = lessonFourCards().map((card) => ({
      ...card,
      rows: card.rows.map((row) => ({
        ...row,
        singular: { ...row.singular, audio: speech[row.singular.text] ?? null },
        plurals: row.plurals.map((form) => ({
          ...form,
          audio: speech[form.text] ?? null,
        })),
      })),
      examples: card.examples.map((example) => ({
        ...example,
        audio: speech[example.de] ?? null,
      })),
    }));
    cached = { ...original, cards: [...original.cards, ...additions].map(card=>({...card,studyTags:wordStudyTags(card)})) };
  }
  return cached;
}
export function wordCardForPath(path: string) {
  return loadWordCards().cards.find(
    (card) => card.path === path || card.aliases.includes(path),
  );
}

/** Keep the established hub UI and query contract; replace only its inventory. */
export function withWordCardHub(
  original: LearnerHubDefinition,
): LearnerHubDefinition {
  const categoryMap: Record<string, string> = {
    Noun: "noun",
    Profession: "noun",
    Family: "noun",
    Language: "noun",
    Country: "proper-noun",
    Geography: "proper-noun",
    Functionword: "function-word",
    Questionword: "question-word",
  };
  const items: LearnerHubRecord[] = loadWordCards()
    .cards.map((card): LearnerHubRecord => {
      const previous = original.items.find(
        (item) =>
          card.aliases.includes(item.hubDestination.path) ||
          card.aliases.includes(
            `/vocabulary/id-${Buffer.from(item.id).toString("hex")}`,
          ),
      );
      const category =
        previous?.category ??
        categoryMap[card.category] ??
        card.category.toLowerCase();
      const lessonIds = [
        ...new Set([
          ...wordStudyTags(card).lessons.map(n=>`lesson:${String(n).padStart(2,"0")}`),
          ...(previous?.lessonIds ?? []),
          ...(card.teacherRows.length ? ["lesson:02"] : []),
        ]),
      ];
      const field = (name: string, text: string) => ({
        field: name,
        displayText: text,
        matchKeys: germanMatchKeys(text),
      });
      return {
        id: `lex:study-${card.id.toLowerCase()}`,
        kind: "Lexeme",
        publicationStatus: "published",
        displayLabel: card.rows.map((r) => r.singular.text).join(" / "),
        category,
        lessonIds,
        sourcePriority: card.priorities.includes("Core")
          ? 1
          : card.teacherRows.length
            ? 3
            : 2,
        hubDestination: { hub: "vocabulary", path: card.path },
        wordFamily: card,
        searchFields: [
          field("meaning", card.title),
          field("category", category),
          field("topic", card.category),
          ...card.rows.flatMap((r) => [
            field("lemma", r.singular.text),
            field("meaning", r.meaning),
            ...r.plurals.map((p) => field("form", p.text)),
          ]),
        ],
      };
    })
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel, "de"));
  return {
    ...original,
    items,
    itemCount: items.length,
    categories: [
      ...new Set([
        ...original.categories,
        ...items.map((i) => i.category!).filter(Boolean),
      ]),
    ].sort(),
  };
}

export function withWordCardSearch(
  projection: LearnerSearchProjection,
): LearnerSearchProjection {
  const documents: LearnerSearchDocument[] = projection.documents.filter(
    (d) => d.kind !== "Lexeme",
  );
  for (const card of loadWordCards().cards) {
    const field = (
      kind: LearnerSearchField["field"],
      displayText: string,
    ): LearnerSearchField => ({
      field: kind,
      displayText,
      matchKeys: germanMatchKeys(displayText),
    });
    documents.push({
      id: `lex:study-${card.id.toLowerCase()}`,
      kind: "Lexeme",
      publicationStatus: "published",
      displayLabel: card.rows.map((r) => r.singular.text).join(" / "),
      sourcePriority: card.priorities.includes("Core")
        ? 1
        : card.teacherRows.length
          ? 3
          : 2,
      lessonIds: wordStudyTags(card).lessons.map(n=>`lesson:${String(n).padStart(2,"0")}`),
      category: card.category,
      hubDestination: { hub: "vocabulary" },
      canonicalHref: card.path,
      fields: [
        field("meaning", card.title),
        field("category", card.category),
        ...card.rows.flatMap((r) => [
          field("lemma", r.singular.text),
          ...r.plurals.map((p) => field("form", p.text)),
        ]),
      ],
    });
  }
  return {
    ...projection,
    documentCount: documents.length,
    documents,
    documentsById: Object.fromEntries(documents.map((d) => [d.id, d])),
  };
}
