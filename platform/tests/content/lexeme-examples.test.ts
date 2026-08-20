import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
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

const GLOSSARY_FILE_ID = "src:glossary:9e35984302ede169";

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
  de: "Er kommt aus der Schweiz.",
  translationEn: "He is from Switzerland.",
  sourceRef: {
    sourceFileId: GLOSSARY_FILE_ID,
    documentTitle: "Momente A1.1 KB Glossar Deutsch–Englisch",
    page: 2,
    exercise: "Lektion 01, 4",
  },
});

describe("Lexeme usage examples — schema contract", () => {
  it("accepts a lexeme with a complete, source-referenced example", () => {
    const result = validateContentBundle(fixtureWithExample(WELL_FORMED_EXAMPLE));
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("still accepts a lexeme that carries no example at all", () => {
    const result = validateContentBundle(loadValidFixture());
    expect(result.ok).toBe(true);
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

  it("requires a stored example to map to a verified assertion", () => {
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
});

describe("Lexeme usage examples — published package", () => {
  const validated = loadAndValidatePublication(PUBLISHED_DIR);
  const bundle = validated.bundle as ContentBundle;

  function publishedLexemes(): Lexeme[] {
    return bundle.lexemes.filter((lex) => lex.publication.status === "published");
  }

  it("publication still validates with the examples encoded", () => {
    expect(validated.ok).toBe(true);
    expect(bundle).not.toBeNull();
  });

  it("carries exactly the transcribed examples, word for word", () => {
    const withExample = publishedLexemes().filter((lex) => lex.example != null);
    expect(withExample.map((lex) => lex.id).sort()).toEqual(
      EXPECTED_EXAMPLES.map((e) => e.id).sort(),
    );
    for (const expected of EXPECTED_EXAMPLES) {
      const lexeme = withExample.find((lex) => lex.id === expected.id);
      expect(lexeme, `${expected.id} should carry an example`).toBeDefined();
      expect(lexeme!.example!.de).toBe(expected.de);
      expect(lexeme!.example!.translationEn).toBe(expected.translationEn);
      expect(lexeme!.example!.sourceRef.page).toBe(expected.page);
      expect(lexeme!.example!.sourceRef.sourceFileId).toBe(GLOSSARY_FILE_ID);
    }
  });

  it("leaves every other published lexeme with no example field at all", () => {
    const withIds = new Set(EXPECTED_EXAMPLES.map((e) => e.id));
    const others = publishedLexemes().filter((lex) => !withIds.has(lex.id));
    expect(others.length).toBeGreaterThan(0);
    for (const lexeme of others) {
      expect(
        Object.prototype.hasOwnProperty.call(lexeme, "example"),
        `${lexeme.id} must not carry an empty example placeholder`,
      ).toBe(false);
    }
  });

  it("backs every stored example with a verified assertion naming its page", () => {
    const assertions = new Map(bundle.sourceAssertions.map((a) => [a.id, a]));
    for (const lexeme of publishedLexemes()) {
      if (lexeme.example == null) continue;
      const ref = lexeme.publication.publishedFields.find(
        (field) => field.field === "example",
      );
      expect(ref, `${lexeme.id} example must be a published field`).toBeDefined();
      const assertion = assertions.get(ref!.assertionId);
      expect(assertion, `${lexeme.id} example assertion must exist`).toBeDefined();
      expect(assertion!.status).toBe("verified");
      expect(assertion!.subjectId).toBe(lexeme.id);
      expect(assertion!.field).toBe("example");
      expect(assertion!.location.page).toBe(lexeme.example.sourceRef.page);
      expect(lexeme.sourceAssertionIds).toContain(assertion!.id);
      expect(lexeme.example.sourceRef.documentTitle.length).toBeGreaterThan(0);
    }
  });
});
