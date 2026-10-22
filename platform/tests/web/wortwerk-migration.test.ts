import { describe, expect, it } from "vitest";
import type { SubjectVocabularyItem } from "../../apps/web/lib/study/subject-sheets";
import germanProfile from "../../content/languages/de.json";
import type { LanguageProfile } from "../../packages/content/src/types/packs";
import { gradeTextAnswer } from "../../packages/wortwerk/src/normalization";
import { A1MigrationError, inspectA1Vocabulary, migrateA1Vocabulary } from "../../packages/wortwerk/scripts/migration";

function sourceRow(overrides: Partial<SubjectVocabularyItem> = {}): SubjectVocabularyItem {
  return {
    id: "fixture-book-0", cardId: "fixture-book", de: "das Buch", meaning: "book", category: "Noun", tone: "neuter", audio: "/audio/book.mp3",
    plurals: [
      { text: "die Bücher", label: "Plural", tone: "plural", audio: "/audio/books.mp3" },
      { text: "die Buchformen", label: "Source variant", tone: "plural", audio: null },
    ],
    href: "/vocabulary/fixture-book",
    studyTags: { lessons: [2, 4], concepts: ["objects", "classroom"], source: "course", sources: ["course", "teacher-extra"], sourceLessons: { course: [4], "teacher-extra": [2] } },
    savedItem: { id: "fixture-book", title: "das Buch", meaning: "book", kind: "word", href: "/vocabulary/fixture-book" },
    examples: [{ de: "Das ist ein Buch.", en: "That is a book.", audio: "/audio/book-example.mp3" }],
    patterns: ["Source pattern"], note: "Source note retained verbatim.", ...overrides,
  };
}

describe("Wortwerk legacy vocabulary migration", () => {
  it("preserves exact ids, meanings, every form variant, audio, examples and source dimensions", () => {
    const source = sourceRow();
    const before = JSON.stringify(source);
    const item = migrateA1Vocabulary([source]).items[0]!;
    expect(item.id).toBe(source.id);
    expect(item.type).toBe("lexeme");
    if (item.type !== "lexeme") throw new Error("Expected a migrated lexeme");
    expect(item.lemma).toBe("Buch");
    expect(item.meaning).toBe(source.meaning);
    expect(item.article).toBe("das");
    expect(item.gender).toBe("neuter");
    expect(item.forms?.singular).toEqual([source.de]);
    expect(item.forms?.plural).toEqual(source.plurals.map(form => form.text));
    expect(item.audio).toEqual({ src: source.audio, text: source.de, review: "preview" });
    expect(item.pluralAudio).toEqual({ "die Bücher": { src: "/audio/books.mp3", text: "die Bücher", review: "preview" } });
    expect(item.examples).toEqual([{ text: source.examples[0]!.de, translation: source.examples[0]!.en, audio: { src: "/audio/book-example.mp3", text: source.examples[0]!.de, review: "preview" } }]);
    expect(item.sourceRef).toEqual({ cardId: source.cardId, href: source.href, lessons: [2, 4], sources: ["course", "teacher-extra"], sourceLessons: { course: [4], "teacher-extra": [2] } });
    expect(item.display).toEqual({ text: source.de, category: source.category, tone: source.tone, patterns: source.patterns, note: source.note });
    expect(item.tags).toEqual(source.studyTags.concepts);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("preserves leading demonstratives and articles inside plain expressions", () => {
    const source = sourceRow({ id: "l8-das-weiss-ich-noch-nicht-0", de: "Das weiß ich noch nicht.", category: "Expression", tone: "plain", plurals: [] });
    const item = migrateA1Vocabulary([source]).items[0]!;
    expect(item.type).toBe("lexeme");
    if (item.type !== "lexeme") throw new Error("Expected a migrated lexeme");
    expect(item.lemma).toBe(source.de);
    expect(item).not.toHaveProperty("article");
    expect(item).not.toHaveProperty("gender");
    const other = sourceRow({ id: "plain-phrase", de: "weiß ich noch nicht.", category: "Expression", tone: "plain", plurals: [] });
    expect(inspectA1Vocabulary([source, other])).toEqual([]);
  });

  it.each([["Aepfel", "Äpfel"], ["Oefen", "Öfen"], ["Uebungen", "Übungen"]])("accepts %s as a hint-level spelling of %s without losing noun case", (answer, expected) => {
    const profile = germanProfile as LanguageProfile;
    expect(gradeTextAnswer(answer, [expected], profile, "noun").outcome).toBe("almost");
    expect(gradeTextAnswer(answer.toLocaleLowerCase("de-DE"), [expected], profile, "noun").outcome).toBe("incorrect");
  });

  it("never invents coursebook page or exercise references or can-do claims", () => {
    const pack = migrateA1Vocabulary([sourceRow()]);
    expect(pack.items[0]!.bookRef).toEqual({ book: "momente-a1", lesson: 2 });
    expect(pack.units).toEqual([
      { id: "lesson-2", title: "Lesson 2", canDo: [], bookRef: { book: "momente-a1", lesson: 2 } },
      { id: "lesson-4", title: "Lesson 4", canDo: [], bookRef: { book: "momente-a1", lesson: 4 } },
    ]);
    expect(pack.items[0]!.bookRef).not.toHaveProperty("page");
    expect(pack.items[0]!.bookRef).not.toHaveProperty("exercise");
  });

  it("keeps migration content pending review and existing audio as preview", () => {
    const pack = migrateA1Vocabulary([sourceRow()]);
    expect(pack.review).toEqual({ status: "pending-german-review" });
    expect(pack.items.every(item => item.review?.status === "pending-german-review")).toBe(true);
    expect(pack.items[0]!.audio?.review).toBe("preview");
    expect(pack).not.toHaveProperty("enabled", true);
    expect(pack).not.toHaveProperty("review.reviewer");
  });

  it("does not infer a definite article or gender from a country colour or add an untaught plural", () => {
    const item = migrateA1Vocabulary([sourceRow({ de: "Deutschland", category: "Country", tone: "neuter", plurals: [], audio: null })]).items[0]!;
    expect(item.type).toBe("lexeme");
    if (item.type !== "lexeme") throw new Error("Expected a migrated lexeme");
    expect(item).not.toHaveProperty("gender");
    expect(item).not.toHaveProperty("article");
    expect(item).not.toHaveProperty("audio");
    expect(item.forms).toEqual({ singular: ["Deutschland"] });
    expect(item).not.toHaveProperty("pluralAudio");
  });

  it("preserves case-sensitive recall for a migrated country name", () => {
    const item = migrateA1Vocabulary([sourceRow({ de: "Deutschland", category: "Country", tone: "plain", plurals: [], audio: null })]).items[0]!;
    if (item.type !== "lexeme") throw new Error("Expected a migrated lexeme");
    const profile = germanProfile as LanguageProfile;
    expect(item.pos).toBe("country");
    expect(gradeTextAnswer("Deutschland", [item.lemma], profile, item.pos).outcome).toBe("correct");
    expect(gradeTextAnswer("deutschland", [item.lemma], profile, item.pos).outcome).not.toBe("correct");
  });

  it("fails on NFC-equivalent duplicates of the same form and category without mutating or returning partial content", () => {
    const rows = [sourceRow({ id: "one", de: "die Tür", tone: "female" }), sourceRow({ id: "two", de: "die Tu\u0308r", tone: "female" })];
    const before = JSON.stringify(rows);
    expect(() => migrateA1Vocabulary(rows)).toThrow(A1MigrationError);
    expect(inspectA1Vocabulary(rows)).toEqual([expect.objectContaining({ code: "duplicate-headword", headword: "Tür", ids: ["one", "two"] })]);
    expect(JSON.stringify(rows)).toBe(before);
    expect(() => migrateA1Vocabulary([sourceRow({ id: "one", de: "das Bild" }), sourceRow({ id: "two", de: "das Bild", meaning: "image" })])).toThrow(/duplicate-headword/);
  });

  it("keeps homographs and gender variants of one card as distinct items", () => {
    const rows = [
      sourceRow({ id: "noun", de: "das Essen", category: "Noun" }), sourceRow({ id: "verb", de: "essen", category: "Verb", tone: "plain" }),
      sourceRow({ id: "she", de: "sie", category: "Pronoun", tone: "plain" }), sourceRow({ id: "formal", de: "Sie", category: "Pronoun", tone: "plain" }),
      sourceRow({ id: "pronoun", de: "er", category: "Pronoun", tone: "plain" }), sourceRow({ id: "letter", de: "er", category: "Alphabet", tone: "plain" }),
      sourceRow({ id: "m", de: "der Verwandte", category: "Family", tone: "male" }), sourceRow({ id: "f", de: "die Verwandte", category: "Family", tone: "female" }),
    ];
    expect(inspectA1Vocabulary(rows).filter(problem => problem.code === "duplicate-headword")).toEqual([]);
  });

  it("reports source rows with no attached lesson instead of guessing one", () => {
    const row = sourceRow({ studyTags: { lessons: [], concepts: ["objects"], source: "study-extra" } });
    expect(inspectA1Vocabulary([row])).toEqual([expect.objectContaining({ code: "missing-lesson", ids: [row.id] })]);
    expect(() => migrateA1Vocabulary([row])).toThrow(/no source-attached lesson/);
  });
});
