/**
 * The source-transcription contract for the words and patterns that closed the
 * Lessons 1–2 curriculum diff.
 *
 * Every German string and every English gloss below was read off an official
 * page — the Momente A1.1 Kursbuch glossary, the coursebook, or the workbook —
 * and is pinned here character for character. That is the whole point: a later
 * pass that "tidies" a gloss, drops a printed full stop, or quietly invents an
 * English half for a word the sources only print in German fails a test instead
 * of teaching a learner something no publisher ever wrote.
 *
 * The gaps are pinned for the same reason. An honest gap is a decision, and a
 * decision that nothing asserts is a decision that can vanish silently.
 */
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadAndValidatePublication,
  type ContentBundle,
  type Lexeme,
  type PhrasePattern,
  type GrammarConcept,
} from "@german-learning/content";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLISHED_DIR = join(HERE, "../../content/published");

/**
 * Words transcribed from the official English glossary, with the glossary's own
 * page. German exactly as printed — the trailing full stops on "Entschuldigung."
 * and "Danke." are the glossary's, not a stylistic choice — and English exactly
 * as the publisher printed it beside it.
 */
const GLOSSARY_LEXEMES: ReadonlyArray<{
  id: string;
  lemma: string;
  glossEn: string;
  page: number;
  partOfSpeech: string;
  article?: "der" | "die" | "das";
  plural?: string;
}> = [
  // Lektion 01, exercise 2 (glossary p.1)
  { id: "lex:entschuldigung", lemma: "Entschuldigung.", glossEn: "Sorry.", page: 1, partOfSpeech: "phrase" },
  { id: "lex:wie-bitte", lemma: "Wie bitte?", glossEn: "Pardon?", page: 1, partOfSpeech: "phrase" },
  { id: "lex:danke", lemma: "Danke.", glossEn: "Thank you.", page: 1, partOfSpeech: "phrase" },
  // Lektion 01, exercise 3 (glossary p.2)
  { id: "lex:und-dir", lemma: "Und dir?", glossEn: "What about you?", page: 2, partOfSpeech: "phrase" },
  // Lektion 01 pronouns: ich/du at exercise 1 (p.1), er/sie at 4 and Sie at 8 (p.2)
  { id: "lex:ich", lemma: "ich", glossEn: "I", page: 1, partOfSpeech: "pronoun" },
  { id: "lex:du", lemma: "du", glossEn: "you", page: 1, partOfSpeech: "pronoun" },
  { id: "lex:er", lemma: "er", glossEn: "he", page: 2, partOfSpeech: "pronoun" },
  { id: "lex:sie", lemma: "sie", glossEn: "she", page: 2, partOfSpeech: "pronoun" },
  { id: "lex:sie-formal", lemma: "Sie", glossEn: "you (formal)", page: 2, partOfSpeech: "pronoun" },
  // Lektion 02, exercise 2 (glossary p.3)
  { id: "lex:interview", lemma: "Interview", glossEn: "interview", page: 3, partOfSpeech: "noun", article: "das", plural: "Interviews" },
  { id: "lex:partner", lemma: "Partner", glossEn: "partner (m./f.)", page: 3, partOfSpeech: "noun", article: "der", plural: "Partner" },
  { id: "lex:partnerin", lemma: "Partnerin", glossEn: "partner (m./f.)", page: 3, partOfSpeech: "noun", article: "die", plural: "Partnerinnen" },
  { id: "lex:zusammenleben", lemma: "zusammenleben", glossEn: "to live together", page: 3, partOfSpeech: "verb" },
  // Lektion 02, exercise 7 (glossary p.4)
  { id: "lex:text", lemma: "Text", glossEn: "text", page: 4, partOfSpeech: "noun", article: "der", plural: "Texte" },
];

/**
 * Patterns the course prints as a line of its own.
 *
 * These carry German and no English, which is exactly what a phrase pattern is
 * — and what makes "Und Ihnen?" encodable at all. The workbook prints it; the
 * English glossary never uses the word "Ihnen" anywhere, so there is no
 * publisher English for the formal variant to quote.
 */
const STANDALONE_PHRASES: ReadonlyArray<{
  id: string;
  de: string;
  register: "informal" | "formal" | "neutral";
  sourceId: string;
  printedPage: number;
}> = [
  { id: "phrase:identity-und-wer-bist-du", de: "Und wer bist du?", register: "informal", sourceId: "source:glossary-momente-a11", printedPage: 1 },
  { id: "phrase:name-answer-ich-bin", de: "Ich bin …", register: "neutral", sourceId: "source:glossary-momente-a11", printedPage: 1 },
  { id: "phrase:identity-wer-sind-sie", de: "Wer sind Sie?", register: "formal", sourceId: "source:glossary-momente-a11", printedPage: 2 },
  { id: "phrase:wellbeing-und-ihnen", de: "Und Ihnen?", register: "formal", sourceId: "source:workbook-momente-a11", printedPage: 9 },
  { id: "phrase:status-keine-kinder", de: "keine Kinder", register: "neutral", sourceId: "source:glossary-momente-a11", printedPage: 3 },
  { id: "phrase:work-job-stelle-haben", de: "Ich habe eine Stelle / einen Job als …", register: "neutral", sourceId: "source:coursebook-momente-a11", printedPage: 18 },
  { id: "phrase:work-ausbildung-praktikum", de: "Ich mache eine Ausbildung / ein Praktikum als … / bei …", register: "neutral", sourceId: "source:coursebook-momente-a11", printedPage: 18 },
];

/**
 * The worked models on the Lesson 1 und-linking card, quoted from the box the
 * workbook prints beside the exercise on printed page 8. The first one is the
 * model the grammar hub card shows.
 */
const UND_LINKING_MODELS = [
  "Sie kommt aus Frankreich und sie lernt Deutsch.",
  "Sie kommt aus Frankreich und lernt Deutsch.",
] as const;

const validated = loadAndValidatePublication(PUBLISHED_DIR);
const bundle = validated.bundle as ContentBundle;

function publishedLexeme(id: string): Lexeme {
  const found = bundle.lexemes.find((lex) => lex.id === id);
  expect(found, `${id} should exist`).toBeDefined();
  expect(found!.publication.status, `${id} should be published`).toBe("published");
  return found!;
}

function publishedPhrase(id: string): PhrasePattern {
  const found = bundle.phrasePatterns.find((phrase) => phrase.id === id);
  expect(found, `${id} should exist`).toBeDefined();
  expect(found!.publication.status, `${id} should be published`).toBe("published");
  return found!;
}

function plainText(tokens: PhrasePattern["fixedTokens"]): string {
  return tokens.tokens
    .map((token) => (token.type === "gap" ? token.label : token.text))
    .join("");
}

describe("Lessons 1–2 source gap closure — transcribed vocabulary", () => {
  it("still validates as a whole publication", () => {
    expect(validated.ok).toBe(true);
  });

  it("carries the glossary's German and the glossary's English, word for word", () => {
    for (const expected of GLOSSARY_LEXEMES) {
      const lex = publishedLexeme(expected.id);
      expect(lex.lemma, `${expected.id} German`).toBe(expected.lemma);
      expect(lex.meanings[0]?.glossEn, `${expected.id} English`).toBe(expected.glossEn);
      expect(lex.partOfSpeech, `${expected.id} part of speech`).toBe(expected.partOfSpeech);
    }
  });

  it("gives every noun its article, its gender, and only a printed plural", () => {
    for (const expected of GLOSSARY_LEXEMES) {
      const lex = publishedLexeme(expected.id);
      if (!expected.article) {
        expect(lex.noun, `${expected.id} is not a noun`).toBeUndefined();
        continue;
      }
      expect(lex.noun?.article, `${expected.id} article`).toBe(expected.article);
      expect(lex.noun?.gender, `${expected.id} gender`).toBe(
        expected.article === "der" ? "masculine" : expected.article === "die" ? "feminine" : "neuter",
      );
      expect(lex.noun?.singular, `${expected.id} singular`).toBe(expected.lemma);
      expect(
        lex.noun?.plurals.map((plural) => plural.form),
        `${expected.id} plural`,
      ).toEqual(expected.plural ? [expected.plural] : []);
    }
  });

  it("traces each word to a verified assertion naming the glossary page it was read from", () => {
    const assertions = new Map(bundle.sourceAssertions.map((a) => [a.id, a]));
    for (const expected of GLOSSARY_LEXEMES) {
      const lex = publishedLexeme(expected.id);
      for (const field of ["lemma", "meanings"] as const) {
        const ref = lex.publication.publishedFields.find((row) => row.field === field);
        expect(ref, `${expected.id} ${field} must be a published field`).toBeDefined();
        const source = assertions.get(ref!.assertionId);
        expect(source, `${expected.id} ${field} assertion must exist`).toBeDefined();
        expect(source!.status).toBe("verified");
        expect(source!.subjectId).toBe(expected.id);
        expect(source!.location.printedPage, `${expected.id} ${field} page`).toBe(expected.page);
      }
    }
  });

  it("links Partnerin to Partner as a person form without filing it as a job", () => {
    const relation = bundle.relationships.find(
      (rel) => rel.type === "person-form-of" && rel.fromId === "lex:partnerin",
    );
    expect(relation?.toId).toBe("lex:partner");
    // The prefix is load-bearing: the professions deck selects its members from
    // exactly this relationship type, and a partner is not a profession.
    expect(relation?.id).toBe("rel:person-pair-partner-person-form");
    expect(publishedLexeme("lex:partner").noun?.personFormGroupId).toBe("person-form:partner");
    expect(publishedLexeme("lex:partnerin").noun?.personFormGroupId).toBe("person-form:partner");
  });

  it("invents no example for a word the glossary prints as a bare headword", () => {
    for (const expected of GLOSSARY_LEXEMES) {
      expect(
        Object.prototype.hasOwnProperty.call(publishedLexeme(expected.id), "example"),
        `${expected.id} must not carry an example nobody printed`,
      ).toBe(false);
    }
  });
});

describe("Lessons 1–2 source gap closure — transcribed patterns", () => {
  it("carries each standalone pattern exactly as its page prints it", () => {
    for (const expected of STANDALONE_PHRASES) {
      const phrase = publishedPhrase(expected.id);
      expect(plainText(phrase.fixedTokens), `${expected.id} German`).toBe(expected.de);
      expect(phrase.acceptedRealizations.map(plainText), `${expected.id} realizations`).toEqual([
        expected.de,
      ]);
      expect(phrase.register, `${expected.id} register`).toBe(expected.register);
    }
  });

  it("names the document and printed page each pattern was read from", () => {
    const assertions = new Map(bundle.sourceAssertions.map((a) => [a.id, a]));
    for (const expected of STANDALONE_PHRASES) {
      const phrase = publishedPhrase(expected.id);
      expect(phrase.publication.publishedFields.map((row) => row.field).sort()).toEqual([
        "acceptedRealizations",
        "fixedTokens",
      ]);
      for (const ref of phrase.publication.publishedFields) {
        const source = assertions.get(ref.assertionId);
        expect(source, `${expected.id} assertion must exist`).toBeDefined();
        expect(source!.status).toBe("verified");
        expect(source!.sourceId, `${expected.id} source`).toBe(expected.sourceId);
        expect(source!.location.printedPage, `${expected.id} page`).toBe(expected.printedPage);
      }
    }
  });

  it("gives the formal wellbeing follow-up no English, because no source prints one", () => {
    const phrase = publishedPhrase("phrase:wellbeing-und-ihnen");
    expect(plainText(phrase.fixedTokens)).toBe("Und Ihnen?");
    // Its informal twin does have both halves, and keeps them.
    expect(publishedLexeme("lex:und-dir").meanings[0]?.glossEn).toBe("What about you?");
    const gap = bundle.contentGaps.find((row) => row.id === "gap:meaning-und-ihnen");
    expect(gap?.objectId).toBe("phrase:wellbeing-und-ihnen");
    expect(gap?.blocksPublication).toBe(false);
    expect(gap?.reason).toContain("Ihnen");
  });
});

describe("Lessons 1–2 source gap closure — linking with und", () => {
  function concept(): GrammarConcept {
    const found = bundle.grammarConcepts.find((gram) => gram.id === "gram:und-linking-l1");
    expect(found, "gram:und-linking-l1 should exist").toBeDefined();
    expect(found!.publication.status).toBe("published");
    return found!;
  }

  it("publishes the concept with both worked models quoted from the workbook", () => {
    const gram = concept();
    expect(gram.titleEn).toBe("Linking with und");
    expect(gram.titleDe).toBe("Sätze mit und verbinden");
    expect(
      gram.ruleSteps.map((step) =>
        step.model?.tokens.map((token) => (token.type === "gap" ? token.label : token.text)).join(""),
      ),
    ).toEqual([...UND_LINKING_MODELS]);
  });

  it("keeps the same published-field shape as the ten concepts before it", () => {
    const gram = concept();
    expect(gram.publication.publishedFields.map((row) => row.field).sort()).toEqual([
      "noticeTarget",
      "ruleSteps",
    ]);
    expect(gram.prerequisiteIds).toEqual(["gram:main-clause-word-order-l1"]);
    const introduced = bundle.relationships.find(
      (rel) => rel.type === "introduced-in" && rel.fromId === "gram:und-linking-l1",
    );
    expect(introduced?.toId).toBe("lesson:01");
  });

  it("traces the German models to the workbook page that prints them", () => {
    const assertions = new Map(bundle.sourceAssertions.map((a) => [a.id, a]));
    const gram = concept();
    const models = gram.sourceAssertionIds
      .map((id) => assertions.get(id))
      .filter((a) => a?.field === "ruleSteps.model");
    expect(models, "the models need their own evidence").toHaveLength(1);
    const source = models[0]!;
    expect(source.sourceId).toBe("source:workbook-momente-a11");
    expect(source.status).toBe("verified");
    expect(source.location.printedPage).toBe(8);
    expect(source.location.exercise).toBe("Lektion 01, 6");
    expect(source.value).toEqual([...UND_LINKING_MODELS]);
  });
});

describe("Lessons 1–2 source gap closure — the gaps that stayed open", () => {
  function gap(id: string) {
    const found = bundle.contentGaps.find((row) => row.id === id);
    expect(found, `${id} should still be recorded`).toBeDefined();
    return found!;
  }

  /**
   * The alphabet and the numbers are the two spec inventories this wave did not
   * close, and they are not closed for the same reason: the German is printed,
   * the English is not, and a vocabulary entry cannot exist without a meaning.
   * Writing "the letter B" or translating "null" ourselves would have made the
   * counts look better and the content less true.
   */
  it("still records the alphabet inventory as open, with the reason", () => {
    const alphabet = gap("gap:alphabet-l1");
    expect(alphabet.field).toBe("lexemes.alphabet");
    expect(alphabet.reason).toContain("no official source prints an English meaning");
  });

  it("still records numbers 0–100 as open", () => {
    expect(gap("gap:numbers-0-100").field).toBe("lexemes.numbers");
  });

  /** Pronouns are no longer a gap — they are five typed entries now. */
  it("no longer claims the pronouns are missing", () => {
    expect(bundle.contentGaps.some((row) => row.id === "gap:pronouns-l1")).toBe(false);
    for (const id of ["lex:ich", "lex:du", "lex:er", "lex:sie", "lex:sie-formal"]) {
      expect(publishedLexeme(id).publication.status).toBe("published");
    }
  });

  it("records that the spec and the glossary disagree about Text", () => {
    const classification = gap("gap:classification-text");
    expect(classification.objectId).toBe("lex:text");
    expect(classification.blocksPublication).toBe(false);
    expect(classification.reason).toContain("italics");
  });
});
