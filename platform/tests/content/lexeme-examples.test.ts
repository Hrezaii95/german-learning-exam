import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  forbiddenPublishedFieldsFor,
  loadAndValidatePublication,
  requiredPublishedFieldsFor,
  validateContentBundle,
  type ContentBundle,
  type Lexeme,
} from "@german-learning/content";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures");
const PUBLISHED_DIR = join(HERE, "../../content/published");

/**
 * The exact transcription contract.
 *
 * Every pair below was read off the official Momente A1.1 Kursbuch glossary
 * (Deutsch–Englisch) at the stated page: the German exactly as printed, the
 * publisher's own English beside it. Pinning them here means a later edit that
 * quietly rewrites a sentence — or "improves" a translation — fails a test
 * instead of shipping invented German to a learner.
 */
const EXPECTED_EXAMPLES: ReadonlyArray<{
  id: string;
  de: string;
  translationEn: string;
  page: number;
}> = [
  { id: "lex:name", de: "Mein Name ist …", translationEn: "My name is …", page: 1 },
  {
    id: "lex:schweiz",
    de: "Er kommt aus der Schweiz.",
    translationEn: "He is from Switzerland.",
    page: 2,
  },
  { id: "lex:jahr", de: "… Jahre alt", translationEn: "… years old", page: 2 },
  { id: "lex:kind", de: "keine Kinder", translationEn: "no children", page: 3 },
  {
    id: "lex:geschieden",
    de: "geschieden sein",
    translationEn: "to be divorced",
    page: 3,
  },
  { id: "lex:beruf", de: "von Beruf", translationEn: "by profession", page: 4 },
];

/**
 * The exact app-authoring contract — the mirror image of the block above.
 *
 * None of these sentences is quoted from anything. They were written for this
 * app and no qualified German speaker has checked them, which is why they are
 * stored with `origin: "app-authored"` and can never carry a page. They are
 * pinned for the same reason the quotations are: so that a later pass which
 * silently rewrites a learner-visible sentence fails a test instead of
 * changing what a learner is taught without anyone noticing.
 */
const EXPECTED_APP_AUTHORED: ReadonlyArray<{
  id: string;
  de: string;
  en: string;
}> = [
  { id: "lex:aerztin", de: "Maria ist Ärztin.", en: "Maria is a doctor." },
  { id: "lex:arzt", de: "Paul ist Arzt.", en: "Paul is a doctor." },
  { id: "lex:architekt", de: "Thomas ist Architekt.", en: "Thomas is an architect." },
  { id: "lex:architektin", de: "Anna ist Architektin.", en: "Anna is an architect." },
  { id: "lex:allein", de: "Ich bin allein.", en: "I am alone." },
  { id: "lex:alter", de: "Mein Alter ist 30 Jahre.", en: "I am 30 years old." },
  { id: "lex:auch-super", de: "Auch super.", en: "I'm great too." },
  { id: "lex:auf-wiedersehen", de: "Auf Wiedersehen, Herr Braun.", en: "Goodbye, Mr Braun." },
  { id: "lex:ausbildung", de: "Ich mache eine Ausbildung.", en: "I'm doing vocational training." },
  { id: "lex:deutschland", de: "Ich komme aus Deutschland.", en: "I come from Germany." },
  { id: "lex:eritrea", de: "Ich komme aus Eritrea.", en: "I come from Eritrea." },
  { id: "lex:es-geht", de: "Es geht.", en: "I'm okay." },
  { id: "lex:familienname", de: "Mein Familienname ist Müller.", en: "My surname is Müller." },
  { id: "lex:familienstand", de: "Mein Familienstand ist verheiratet.", en: "I am married." },
  { id: "lex:firma", de: "Die Firma heißt Mosaik.", en: "The company is called Mosaik." },
  { id: "lex:frankreich", de: "Ich komme aus Frankreich.", en: "I come from France." },
  { id: "lex:frau", de: "Frau Müller ist Ärztin.", en: "Mrs Müller is a doctor." },
  { id: "lex:friseur", de: "Ali ist Friseur.", en: "Ali is a hairdresser." },
  { id: "lex:friseurin", de: "Eva ist Friseurin.", en: "Eva is a hairdresser." },
  { id: "lex:gut-danke", de: "Gut, danke.", en: "Fine, thanks." },
  { id: "lex:gute-nacht", de: "Gute Nacht, Anna.", en: "Good night, Anna." },
  { id: "lex:guten-abend", de: "Guten Abend, Frau Müller.", en: "Good evening, Mrs Müller." },
  { id: "lex:guten-morgen", de: "Guten Morgen, Herr Braun.", en: "Good morning, Mr Braun." },
  { id: "lex:guten-tag", de: "Guten Tag, ich heiße Mia.", en: "Hello, my name is Mia." },
  { id: "lex:hallo", de: "Hallo, ich heiße Tom.", en: "Hello, my name is Tom." },
  { id: "lex:herkunft", de: "Meine Herkunft ist Eritrea.", en: "I am originally from Eritrea." },
  { id: "lex:herr", de: "Herr Müller ist Arzt.", en: "Mr Müller is a doctor." },
  { id: "lex:ingenieur", de: "Omar ist Ingenieur.", en: "Omar is an engineer." },
  { id: "lex:ingenieurin", de: "Lea ist Ingenieurin.", en: "Lea is an engineer." },
  { id: "lex:job", de: "Mein Job ist super.", en: "My job is great." },
  { id: "lex:journalist", de: "Ben ist Journalist.", en: "Ben is a journalist." },
  { id: "lex:journalistin", de: "Sara ist Journalistin.", en: "Sara is a journalist." },
  { id: "lex:kellner", de: "Lukas ist Kellner.", en: "Lukas is a waiter." },
  { id: "lex:kellnerin", de: "Nina ist Kellnerin.", en: "Nina is a waitress." },
  { id: "lex:kfz-mechatroniker", de: "Max ist Kfz-Mechatroniker.", en: "Max is a car mechatronics technician." },
  { id: "lex:kfz-mechatronikerin", de: "Lena ist Kfz-Mechatronikerin.", en: "Lena is a car mechatronics technician." },
  { id: "lex:lehrer", de: "Herr Koch ist Lehrer.", en: "Mr Koch is a teacher." },
  { id: "lex:lehrerin", de: "Frau Klein ist Lehrerin.", en: "Mrs Klein is a teacher." },
  { id: "lex:nicht-so-gut", de: "Nicht so gut.", en: "Not so good." },
  { id: "lex:oesterreich", de: "Ich komme aus Österreich.", en: "I come from Austria." },
  { id: "lex:paketzusteller", de: "Jan ist Paketzusteller.", en: "Jan is a parcel deliverer." },
  { id: "lex:paketzustellerin", de: "Mia ist Paketzustellerin.", en: "Mia is a parcel deliverer." },
  { id: "lex:praktikum", de: "Ich mache ein Praktikum.", en: "I am doing an internship." },
  { id: "lex:rentner", de: "Herr Weber ist Rentner.", en: "Mr Weber is retired." },
  { id: "lex:rentnerin", de: "Frau Wolf ist Rentnerin.", en: "Mrs Wolf is retired." },
  { id: "lex:schueler", de: "Tom ist Schüler.", en: "Tom is a pupil." },
  { id: "lex:schuelerin", de: "Mia ist Schülerin.", en: "Mia is a pupil." },
  { id: "lex:sehr-gut-danke", de: "Sehr gut, danke.", en: "Very well, thanks." },
  { id: "lex:single", de: "Ich bin Single.", en: "I am single." },
  { id: "lex:spanien", de: "Ich komme aus Spanien.", en: "I come from Spain." },
  { id: "lex:stelle", de: "Ich habe eine Stelle.", en: "I have a job." },
  { id: "lex:student", de: "Paul ist Student.", en: "Paul is a university student." },
  { id: "lex:studentin", de: "Anna ist Studentin.", en: "Anna is a university student." },
  { id: "lex:studium", de: "Mein Studium ist super.", en: "My studies are going great." },
  { id: "lex:super", de: "Super!", en: "Great!" },
  { id: "lex:tuerkei", de: "Ich komme aus der Türkei.", en: "I come from Turkey." },
  { id: "lex:tschues", de: "Tschüs, Anna!", en: "Bye, Anna!" },
  { id: "lex:usa", de: "Ich komme aus den USA.", en: "I come from the USA." },
  { id: "lex:verkaeufer", de: "Felix ist Verkäufer.", en: "Felix is a sales assistant." },
  { id: "lex:verkaeuferin", de: "Sofia ist Verkäuferin.", en: "Sofia is a sales assistant." },
  { id: "lex:vorname", de: "Mein Vorname ist Anna.", en: "My first name is Anna." },
  { id: "lex:verheiratet", de: "Ich bin verheiratet.", en: "I am married." },
  { id: "lex:wohnort", de: "Mein Wohnort ist Berlin.", en: "I live in Berlin." },
];

/**
 * The three lemmas the app also wrote a sentence for, and where the glossary
 * quote already existed. The quote keeps the slot; the app sentence is dropped.
 */
const GLOSSARY_WON: ReadonlyArray<{
  id: string;
  lostSentence: string;
  keptSentence: string;
}> = [
  { id: "lex:beruf", lostSentence: "Mein Beruf ist Lehrer.", keptSentence: "von Beruf" },
  { id: "lex:geschieden", lostSentence: "Ich bin geschieden.", keptSentence: "geschieden sein" },
  { id: "lex:schweiz", lostSentence: "Ich komme aus der Schweiz.", keptSentence: "Er kommt aus der Schweiz." },
];

const GLOSSARY_FILE_ID = "src:glossary:9e35984302ede169";
const APP_AUTHORED_SOURCE_ID = "source:app-authored-examples";

function loadValidFixture(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(FIXTURES_DIR, "valid-lesson-01-bundle.json"), "utf8"),
  ) as Record<string, unknown>;
}

function errorCodes(result: ReturnType<typeof validateContentBundle>): string[] {
  return result.issues.filter((i) => i.severity === "error").map((i) => i.code);
}

/**
 * Clones the valid fixture and gives its published lexeme an example, so each
 * negative case differs from a passing bundle by exactly one detail.
 *
 * `declarePublishedField` maps the example to a verified source assertion —
 * correct for a quotation, and the exact thing an app-authored example must be
 * refused, so both cases are reachable from one helper.
 */
function fixtureWithExample(
  example: unknown,
  opts?: { declarePublishedField?: boolean },
): Record<string, unknown> {
  const bundle = loadValidFixture();
  const lexemes = bundle.lexemes as Array<Record<string, unknown>>;
  const lexeme = lexemes[0]!;
  lexeme.example = example;
  if (opts?.declarePublishedField !== false) {
    const assertions = bundle.sourceAssertions as Array<Record<string, unknown>>;
    assertions.push({
      kind: "SourceAssertion",
      id: "assert:lex-fixture-noun-example",
      sourceId: "source:fixture-schema",
      location: { page: 2 },
      subjectId: lexeme.id,
      field: "example",
      value: example,
      extraction: "manual",
      confidence: 1,
      status: "verified",
      reviewer: "fixture",
      reviewedAt: "2026-08-20",
    });
    const publication = lexeme.publication as Record<string, unknown>;
    const fields = publication.publishedFields as Array<Record<string, unknown>>;
    fields.push({ field: "example", assertionId: "assert:lex-fixture-noun-example" });
    lexeme.sourceAssertionIds = [
      ...(lexeme.sourceAssertionIds as string[]),
      "assert:lex-fixture-noun-example",
    ];
  }
  return bundle;
}

const WELL_FORMED_EXAMPLE = Object.freeze({
  origin: "glossary" as const,
  de: "Er kommt aus der Schweiz.",
  translationEn: "He is from Switzerland.",
  sourceRef: {
    sourceFileId: GLOSSARY_FILE_ID,
    documentTitle: "Momente A1.1 KB Glossar Deutsch–Englisch",
    page: 2,
    exercise: "Lektion 01, 4",
  },
});

const WELL_FORMED_APP_AUTHORED = Object.freeze({
  origin: "app-authored" as const,
  de: "Maria ist Ärztin.",
  translationEn: "Maria is a doctor.",
  reviewState: "pending-german-review" as const,
});

describe("Lexeme usage examples — schema contract", () => {
  it("accepts a lexeme with a complete, source-referenced example", () => {
    const result = validateContentBundle(fixtureWithExample(WELL_FORMED_EXAMPLE));
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("accepts an app-authored example that admits it is waiting for review", () => {
    const result = validateContentBundle(
      fixtureWithExample(WELL_FORMED_APP_AUTHORED, { declarePublishedField: false }),
    );
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("still accepts a lexeme that carries no example at all", () => {
    const result = validateContentBundle(loadValidFixture());
    expect(result.ok).toBe(true);
  });

  it("rejects an example that does not declare which kind it is", () => {
    const { origin: _dropped, ...noOrigin } = WELL_FORMED_EXAMPLE;
    const result = validateContentBundle(fixtureWithExample(noOrigin));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("INVALID_DISCRIMINANT");
    expect(result.issues.some((i) => i.field === "example.origin")).toBe(true);
  });

  it("rejects an example with no source reference", () => {
    const { sourceRef: _dropped, ...withoutRef } = WELL_FORMED_EXAMPLE;
    const result = validateContentBundle(fixtureWithExample(withoutRef));
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.objectId === "lex:fixture-noun" && i.field === "example.sourceRef",
      ),
    ).toBe(true);
  });

  /**
   * The whole reason the discriminator exists. An app-written sentence that
   * could name a book and a page would be indistinguishable, to a learner and
   * to every downstream reader, from something the publisher actually printed.
   */
  it("rejects an app-authored example that claims a source reference", () => {
    const result = validateContentBundle(
      fixtureWithExample(
        { ...WELL_FORMED_APP_AUTHORED, sourceRef: WELL_FORMED_EXAMPLE.sourceRef },
        { declarePublishedField: false },
      ),
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISMATCH");
    expect(
      result.issues.some(
        (i) =>
          i.objectId === "lex:fixture-noun" && i.field === "example.sourceRef",
      ),
    ).toBe(true);
  });

  it("rejects an app-authored example whose review state is missing or unknown", () => {
    const { reviewState: _dropped, ...noState } = WELL_FORMED_APP_AUTHORED;
    const missing = validateContentBundle(
      fixtureWithExample(noState, { declarePublishedField: false }),
    );
    expect(missing.ok).toBe(false);
    expect(missing.issues.some((i) => i.field === "example.reviewState")).toBe(true);

    const unknown = validateContentBundle(
      fixtureWithExample(
        { ...WELL_FORMED_APP_AUTHORED, reviewState: "reviewed" },
        { declarePublishedField: false },
      ),
    );
    expect(unknown.ok).toBe(false);
    expect(unknown.issues.some((i) => i.field === "example.reviewState")).toBe(true);
  });

  it("rejects a glossary example that carries a review state", () => {
    const result = validateContentBundle(
      fixtureWithExample({
        ...WELL_FORMED_EXAMPLE,
        reviewState: "pending-german-review",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === "example.reviewState")).toBe(true);
  });

  it("rejects an example whose source page is not a real page number", () => {
    const result = validateContentBundle(
      fixtureWithExample({
        ...WELL_FORMED_EXAMPLE,
        sourceRef: { ...WELL_FORMED_EXAMPLE.sourceRef, page: 0 },
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.field === "example.sourceRef.page"),
    ).toBe(true);
  });

  it("rejects an example with German but no translation", () => {
    const result = validateContentBundle(
      fixtureWithExample({ ...WELL_FORMED_EXAMPLE, translationEn: "" }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.field === "example.translationEn"),
    ).toBe(true);
  });

  it("requires a stored glossary example to map to a verified assertion", () => {
    expect(
      requiredPublishedFieldsFor("Lexeme", { example: WELL_FORMED_EXAMPLE }),
    ).toEqual(["lemma", "meanings", "example"]);
    expect(requiredPublishedFieldsFor("Lexeme", {})).toEqual(["lemma", "meanings"]);

    const result = validateContentBundle(
      fixtureWithExample(WELL_FORMED_EXAMPLE, { declarePublishedField: false }),
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISSING");
    expect(
      result.issues.some(
        (i) => i.objectId === "lex:fixture-noun" && i.field === "example",
      ),
    ).toBe(true);
  });

  /**
   * The other direction of the same rule: an app-authored example has no source
   * to assert, so it must never be listed among the source-backed fields — that
   * listing is precisely what would lend it a quotation's authority.
   */
  it("refuses to let an app-authored example be declared a source-backed field", () => {
    expect(
      requiredPublishedFieldsFor("Lexeme", { example: WELL_FORMED_APP_AUTHORED }),
    ).toEqual(["lemma", "meanings"]);
    expect(
      forbiddenPublishedFieldsFor("Lexeme", { example: WELL_FORMED_APP_AUTHORED }),
    ).toEqual(["example"]);
    expect(
      forbiddenPublishedFieldsFor("Lexeme", { example: WELL_FORMED_EXAMPLE }),
    ).toEqual([]);

    const result = validateContentBundle(
      fixtureWithExample(WELL_FORMED_APP_AUTHORED, { declarePublishedField: true }),
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISMATCH");
    expect(
      result.issues.some(
        (i) => i.objectId === "lex:fixture-noun" && i.field === "example",
      ),
    ).toBe(true);
  });
});

describe("Lexeme usage examples — published package", () => {
  const validated = loadAndValidatePublication(PUBLISHED_DIR);
  const bundle = validated.bundle as ContentBundle;

  function publishedLexemes(): Lexeme[] {
    return bundle.lexemes.filter((lex) => lex.publication.status === "published");
  }

  function lexeme(id: string): Lexeme {
    const found = publishedLexemes().find((lex) => lex.id === id);
    expect(found, `${id} should be published`).toBeDefined();
    return found!;
  }

  it("publication still validates with the examples encoded", () => {
    expect(validated.ok).toBe(true);
    expect(bundle).not.toBeNull();
  });

  it("carries exactly the transcribed examples, word for word", () => {
    const withExample = publishedLexemes().filter(
      (lex) => lex.example?.origin === "glossary",
    );
    expect(withExample.map((lex) => lex.id).sort()).toEqual(
      EXPECTED_EXAMPLES.map((e) => e.id).sort(),
    );
    for (const expected of EXPECTED_EXAMPLES) {
      const found = withExample.find((lex) => lex.id === expected.id);
      expect(found, `${expected.id} should carry an example`).toBeDefined();
      const example = found!.example!;
      expect(example.origin).toBe("glossary");
      expect(example.de).toBe(expected.de);
      expect(example.translationEn).toBe(expected.translationEn);
      if (example.origin !== "glossary") throw new Error("unreachable");
      expect(example.sourceRef.page).toBe(expected.page);
      expect(example.sourceRef.sourceFileId).toBe(GLOSSARY_FILE_ID);
    }
  });

  it("carries exactly the app-authored sentences, word for word", () => {
    const authored = publishedLexemes().filter(
      (lex) => lex.example?.origin === "app-authored",
    );
    expect(authored).toHaveLength(EXPECTED_APP_AUTHORED.length);
    expect(authored.map((lex) => lex.id).sort()).toEqual(
      EXPECTED_APP_AUTHORED.map((e) => e.id).sort(),
    );
    for (const expected of EXPECTED_APP_AUTHORED) {
      const example = lexeme(expected.id).example!;
      expect(example.de, `${expected.id} German`).toBe(expected.de);
      expect(example.translationEn, `${expected.id} English`).toBe(expected.en);
    }
  });

  /**
   * A quotation always outranks a sentence we wrote about the same word, so
   * these three lexemes keep the printed line and drop the app's version.
   */
  it("lets the transcribed quotation win wherever both exist", () => {
    for (const collision of GLOSSARY_WON) {
      const example = lexeme(collision.id).example!;
      expect(example.origin).toBe("glossary");
      expect(example.de).toBe(collision.keptSentence);
      expect(example.de).not.toBe(collision.lostSentence);
    }
    const authoredIds = new Set(EXPECTED_APP_AUTHORED.map((e) => e.id));
    for (const collision of GLOSSARY_WON) {
      expect(authoredIds.has(collision.id)).toBe(false);
    }
  });

  it("never lets an app-authored sentence claim a page or a source field", () => {
    for (const lex of publishedLexemes()) {
      if (lex.example?.origin !== "app-authored") continue;
      expect(
        Object.prototype.hasOwnProperty.call(lex.example, "sourceRef"),
        `${lex.id} must not name a source`,
      ).toBe(false);
      expect(lex.example.reviewState).toBe("pending-german-review");
      expect(
        lex.publication.publishedFields.some((field) => field.field === "example"),
        `${lex.id} example must not be a source-backed field`,
      ).toBe(false);
    }
  });

  /**
   * The provenance trail still exists for app-authored sentences — it just
   * points at this app and stays `candidate`, which is what makes it impossible
   * to promote one into a published source field by accident.
   */
  it("traces every app-authored sentence to the app's own unverified assertion", () => {
    const assertions = new Map(bundle.sourceAssertions.map((a) => [a.id, a]));
    let traced = 0;
    for (const lex of publishedLexemes()) {
      if (lex.example?.origin !== "app-authored") continue;
      const owned = lex.sourceAssertionIds
        .map((id) => assertions.get(id))
        .filter((a) => a != null && a.field === "example");
      expect(owned, `${lex.id} needs one example assertion`).toHaveLength(1);
      const assertion = owned[0]!;
      expect(assertion.sourceId).toBe(APP_AUTHORED_SOURCE_ID);
      expect(assertion.status).toBe("candidate");
      expect(assertion.subjectId).toBe(lex.id);
      expect(assertion.reviewer).toBeUndefined();
      expect(assertion.location.page).toBeUndefined();
      traced += 1;
    }
    expect(traced).toBe(EXPECTED_APP_AUTHORED.length);
  });

  /** The pending review is a countable worklist, not a promise in a comment. */
  it("raises one non-blocking review gap per app-authored sentence", () => {
    const gaps = bundle.contentGaps.filter((gap) => gap.field === "example");
    expect(gaps).toHaveLength(EXPECTED_APP_AUTHORED.length);
    expect(gaps.map((gap) => gap.objectId).sort()).toEqual(
      EXPECTED_APP_AUTHORED.map((e) => e.id).sort(),
    );
    for (const gap of gaps) {
      expect(gap.blocksPublication).toBe(false);
      expect(gap.owner).toBe("owner-review");
    }
  });

  it("leaves every other published lexeme with no example field at all", () => {
    const withIds = new Set([
      ...EXPECTED_EXAMPLES.map((e) => e.id),
      ...EXPECTED_APP_AUTHORED.map((e) => e.id),
    ]);
    const others = publishedLexemes().filter((lex) => !withIds.has(lex.id));
    expect(others.length).toBeGreaterThan(0);
    for (const lex of others) {
      expect(
        Object.prototype.hasOwnProperty.call(lex, "example"),
        `${lex.id} must not carry an empty example placeholder`,
      ).toBe(false);
    }
  });

  it("backs every stored quotation with a verified assertion naming its page", () => {
    const assertions = new Map(bundle.sourceAssertions.map((a) => [a.id, a]));
    for (const lex of publishedLexemes()) {
      if (lex.example?.origin !== "glossary") continue;
      const ref = lex.publication.publishedFields.find(
        (field) => field.field === "example",
      );
      expect(ref, `${lex.id} example must be a published field`).toBeDefined();
      const assertion = assertions.get(ref!.assertionId);
      expect(assertion, `${lex.id} example assertion must exist`).toBeDefined();
      expect(assertion!.status).toBe("verified");
      expect(assertion!.subjectId).toBe(lex.id);
      expect(assertion!.field).toBe("example");
      expect(assertion!.location.page).toBe(lex.example.sourceRef.page);
      expect(lex.sourceAssertionIds).toContain(assertion!.id);
      expect(lex.example.sourceRef.documentTitle.length).toBeGreaterThan(0);
    }
  });
});
