import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MINIMUM_PUBLISHED_FIELDS,
  validateContentBundle,
  validateContentBundleOrThrow,
} from "@german-learning/content";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures");
const PLATFORM_ROOT = join(HERE, "../..");
const VALIDATE_CLI = join(PLATFORM_ROOT, "packages/content/src/cli/validate.ts");

function loadFixture(name: string): unknown {
  const raw = readFileSync(join(FIXTURES_DIR, name), "utf8");
  return JSON.parse(raw);
}

function errorCodes(result: ReturnType<typeof validateContentBundle>): string[] {
  return result.issues.filter((i) => i.severity === "error").map((i) => i.code);
}

function runValidateCli(args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", VALIDATE_CLI, ...args],
    {
      cwd: PLATFORM_ROOT,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("C0 content schema contract fixtures", () => {
  it("CONTENT-ID-RELATION-01 / positive: minimal valid Lesson 1 object graph passes", () => {
    const result = validateContentBundle(loadFixture("valid-lesson-01-bundle.json"));
    expect(result.ok).toBe(true);
    expect(errorCodes(result)).toEqual([]);
  });

  it("CONTENT-ID-RELATION-01 / negative: duplicate IDs fail", () => {
    const result = validateContentBundle(loadFixture("duplicate-ids.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("DUPLICATE_ID");
  });

  it("CONTENT-ID-RELATION-01 / negative: broken relationship fails", () => {
    const result = validateContentBundle(loadFixture("broken-relationship.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("UNRESOLVED_REFERENCE");
    const broken = result.issues.find(
      (i) => i.code === "UNRESOLVED_REFERENCE" && i.objectId === "rel:broken-target",
    );
    expect(broken?.field).toBe("toId");
  });

  it("CONTENT-PROVENANCE-01 / negative: published field without verified assertion fails", () => {
    const result = validateContentBundle(loadFixture("unverified-assertion.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_UNVERIFIED");
    const issue = result.issues.find(
      (i) => i.code === "PUBLISHED_ASSERTION_UNVERIFIED" && i.objectId === "lesson:01",
    );
    expect(issue?.field).toBe("titleDe");
    expect(issue?.assertionId).toBe("assert:lesson-01-title-de-candidate");
  });

  it("CONTENT-SCOPE-01 / negative: Lesson 3 publication fails", () => {
    const result = validateContentBundle(loadFixture("lesson-03-out-of-scope.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_LESSON");
  });

  it("CONTENT-SCOPE-01 / negative: draft Lesson 3 is still rejected", () => {
    const result = validateContentBundle(loadFixture("lesson-03-draft-out-of-scope.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_LESSON");
  });

  it("CONTENT-SCOPE-01 / negative: A1.2 publication fails", () => {
    const result = validateContentBundle(loadFixture("a12-out-of-scope.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_A12");
  });

  it("CONTENT-SCOPE-01 / negative: localized audio without verified review fails", () => {
    const result = validateContentBundle(loadFixture("localized-audio-unreviewed.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_LOCALIZED_AUDIO");
  });

  it("CONTENT-ATTACH-01 / positive: approved enrichment linked to Lesson 2 passes", () => {
    const result = validateContentBundle(loadFixture("approved-enrichment-lesson-02.json"));
    expect(result.ok).toBe(true);
    expect(errorCodes(result)).toEqual([]);
  });

  it("CONTENT-PROFESSION-FORMS-01 / positive: M/F professions are separate lexemes linked by person-form-of", () => {
    const bundle = loadFixture("profession-person-forms.json") as {
      lexemes: Array<{ id: string; noun?: { gender: string; personFormGroupId?: string } }>;
      relationships: Array<{ type: string; fromId: string; toId: string }>;
    };
    const result = validateContentBundle(bundle);
    expect(result.ok).toBe(true);

    const masc = bundle.lexemes.find((l) => l.id === "lex:koch");
    const fem = bundle.lexemes.find((l) => l.id === "lex:koechin");
    expect(masc?.noun?.gender).toBe("masculine");
    expect(fem?.noun?.gender).toBe("feminine");
    expect(masc?.noun?.personFormGroupId).toBe(fem?.noun?.personFormGroupId);

    const link = bundle.relationships.find((r) => r.type === "person-form-of");
    expect(link).toEqual(
      expect.objectContaining({
        type: "person-form-of",
        fromId: "lex:koechin",
        toId: "lex:koch",
      }),
    );
  });

  it("CONTENT-DEDUPE-01 / negative: slash alternatives are not accepted as one canonical lemma", () => {
    const result = validateContentBundle(loadFixture("slash-lemma-rejected.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SLASH_LEMMA");
  });

  it("CI-CONTENT-GATE-01 / negative: blocking gap rejects publication", () => {
    const result = validateContentBundle(loadFixture("blocking-gap.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("BLOCKING_GAP");
    const gapIssue = result.issues.find((i) => i.code === "BLOCKING_GAP");
    expect(gapIssue?.gapId).toBe("gap:audio:lex-fixture-gap");
  });

  it("C0R1 / missing publication on Verb returns stable issue and does not throw", () => {
    expect(() => validateContentBundle(loadFixture("missing-publication-verb.json"))).not.toThrow();
    const result = validateContentBundle(loadFixture("missing-publication-verb.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("REQUIRED_FIELD");
    expect(
      result.issues.some(
        (i) => i.objectId === "verb:fixture-sein" && i.field === "publication",
      ),
    ).toBe(true);
  });

  it("C0R1 / null publication on Dialogue returns stable issue and does not throw", () => {
    expect(() =>
      validateContentBundle(loadFixture("null-publication-dialogue.json")),
    ).not.toThrow();
    const result = validateContentBundle(loadFixture("null-publication-dialogue.json"));
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.code === "REQUIRED_FIELD" &&
          i.objectId === "dialogue:fixture-null-pub" &&
          i.field === "publication",
      ),
    ).toBe(true);
  });

  it("C0R1 / picture-dictionary publish without approved enrichment fails", () => {
    const result = validateContentBundle(loadFixture("picture-dictionary-unapproved.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_ENRICHMENT");
  });

  it("C0R1 / HTML in dialogue structured text fails with HTML_CONTENT", () => {
    const result = validateContentBundle(loadFixture("html-content-dialogue.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("HTML_CONTENT");
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "dialogue:fixture-html" &&
          i.field === "turns[0].textDe.tokens[0].text",
      ),
    ).toBe(true);
  });

  it("C0R1 / person-form-of with Lesson endpoint fails RELATIONSHIP_ENDPOINT on toId", () => {
    const result = validateContentBundle(loadFixture("person-form-of-lesson-endpoint.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("RELATIONSHIP_ENDPOINT");
    const endpoint = result.issues.find(
      (i) => i.code === "RELATIONSHIP_ENDPOINT" && i.objectId === "rel:person-form-lesson",
    );
    expect(endpoint?.field).toBe("toId");
  });

  it("C0R1 / partial publishedFields fails completeness policy", () => {
    expect(MINIMUM_PUBLISHED_FIELDS.Lesson).toEqual(["titleDe", "communicativeGoals"]);
    const result = validateContentBundle(loadFixture("partial-publish-lesson.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISSING");
    expect(
      result.issues.some(
        (i) =>
          i.code === "PUBLISHED_ASSERTION_MISSING" &&
          i.objectId === "lesson:01" &&
          i.field === "communicativeGoals",
      ),
    ).toBe(true);
  });

  it("C0R1 / published assertion field mismatch fails", () => {
    const result = validateContentBundle(loadFixture("published-assertion-mismatch.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISMATCH");
    const mismatch = result.issues.find((i) => i.code === "PUBLISHED_ASSERTION_MISMATCH");
    expect(mismatch?.field).toBe("communicativeGoals");
    expect(mismatch?.assertionId).toBe("assert:lesson-01-goals-wrong-field");
  });

  it("C0R1 / duplicate nested meaning IDs fail", () => {
    const result = validateContentBundle(loadFixture("duplicate-nested-meaning-ids.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("DUPLICATE_ID");
    expect(
      result.issues.some(
        (i) => i.code === "DUPLICATE_ID" && i.objectId === "meaning:shared-dup",
      ),
    ).toBe(true);
  });

  it("C0R1 / bad schema version fails", () => {
    const result = validateContentBundle(loadFixture("bad-schema-version.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCHEMA_VERSION");
  });

  it("C0R1 / malformed ID fails", () => {
    const result = validateContentBundle(loadFixture("malformed-id.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("INVALID_ID");
  });

  it("C0R1 / unknown relationship type fails", () => {
    const result = validateContentBundle(loadFixture("unknown-relationship-type.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("RELATIONSHIP_TYPE");
  });

  it("C0R1 / invalid LearningActivity.mode fails", () => {
    const result = validateContentBundle(loadFixture("invalid-activity-mode.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("INVALID_DISCRIMINANT");
    expect(
      result.issues.some(
        (i) => i.objectId === "activity:bad-mode" && i.field === "mode",
      ),
    ).toBe(true);
  });

  it("C0R1 / bad approval ID shape fails", () => {
    const result = validateContentBundle(loadFixture("bad-approval-id.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("INVALID_ID");
    expect(
      result.issues.some(
        (i) => i.field === "publication.scopeException.approvalId",
      ),
    ).toBe(true);
  });

  it("C0R2 / HTML in ListeningAsset transcript fails with HTML_CONTENT", () => {
    const result = validateContentBundle(loadFixture("html-content-listening.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("HTML_CONTENT");
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "listen:fixture-html" &&
          i.field === "transcriptSegments[0].textDe.tokens[0].text",
      ),
    ).toBe(true);
  });

  it("C0R2 / HTML in LearningActivity prompt and AnswerSpec fails", () => {
    const result = validateContentBundle(loadFixture("html-content-activity.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("HTML_CONTENT");
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "activity:fixture-html" &&
          i.field === "prompt.instruction.tokens[0].text",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "activity:fixture-html" &&
          i.field === "prompt.choices[0].label.tokens[0].text",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "activity:fixture-html" &&
          i.field === "answerSpec.accepted[1]",
      ),
    ).toBe(true);
  });

  it("C0R2 / HTML in Verb glossEn and MediaAsset spokenText fails", () => {
    const result = validateContentBundle(loadFixture("html-content-verb-media.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("HTML_CONTENT");
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "verb:fixture-html-gloss" &&
          i.field === "meanings[0].glossEn",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) =>
          i.code === "HTML_CONTENT" &&
          i.objectId === "media:fixture-spoken-html" &&
          i.field === "spokenText",
      ),
    ).toBe(true);
  });

  it("C0R2 / verified picture-dictionary with approved enrichment on Lesson 1 passes", () => {
    const result = validateContentBundle(loadFixture("picture-dictionary-approved.json"));
    expect(result.ok).toBe(true);
    expect(errorCodes(result)).toEqual([]);
  });

  it("C0R2 / duplicate example IDs fail DUPLICATE_ID", () => {
    const result = validateContentBundle(loadFixture("duplicate-example-ids.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("DUPLICATE_ID");
    expect(
      result.issues.some(
        (i) => i.code === "DUPLICATE_ID" && i.objectId === "example:shared-dup",
      ),
    ).toBe(true);
  });

  it("C0R2 / scopeException.attachedLessonId lesson:03 fails at stable location", () => {
    const result = validateContentBundle(loadFixture("scope-exception-lesson-03.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_LESSON");
    expect(
      result.issues.some(
        (i) =>
          i.code === "SCOPE_LESSON" &&
          i.objectId === "lex:fixture-scope03" &&
          i.field === "publication.scopeException.attachedLessonId",
      ),
    ).toBe(true);
  });

  it("C0R2 / null array element yields element-level INVALID_TYPE and does not throw", () => {
    expect(() =>
      validateContentBundle(loadFixture("null-array-element.json")),
    ).not.toThrow();
    const result = validateContentBundle(loadFixture("null-array-element.json"));
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("INVALID_TYPE");
    expect(
      result.issues.some(
        (i) => i.code === "INVALID_TYPE" && i.field === "lexemes[0]",
      ),
    ).toBe(true);
  });

  it("C0R2 / unverified picture-dictionary assertion cannot decide publishability", () => {
    const result = validateContentBundle(
      loadFixture("picture-dictionary-unverified.json"),
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("SCOPE_ENRICHMENT");
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_UNVERIFIED");
    expect(
      result.issues.some(
        (i) =>
          i.code === "SCOPE_ENRICHMENT" &&
          i.objectId === "lex:fixture-picture-unverified" &&
          i.assertionId === "assert:lex-picture-lemma-candidate",
      ),
    ).toBe(true);
  });

  it("C0R2 / partial publishedFields missing LearningActivity.answerSpec fails", () => {
    expect(MINIMUM_PUBLISHED_FIELDS.LearningActivity).toEqual(["prompt"]);
    const result = validateContentBundle(
      loadFixture("partial-publish-activity-answerspec.json"),
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISSING");
    expect(
      result.issues.some(
        (i) =>
          i.code === "PUBLISHED_ASSERTION_MISSING" &&
          i.objectId === "activity:partial-answer" &&
          i.field === "answerSpec",
      ),
    ).toBe(true);
  });

  it("C0R2 / partial publishedFields missing MediaAsset.spokenText fails", () => {
    expect(MINIMUM_PUBLISHED_FIELDS.MediaAsset).toEqual(["variants"]);
    const result = validateContentBundle(
      loadFixture("partial-publish-media-spoken.json"),
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("PUBLISHED_ASSERTION_MISSING");
    expect(
      result.issues.some(
        (i) =>
          i.code === "PUBLISHED_ASSERTION_MISSING" &&
          i.objectId === "media:partial-spoken" &&
          i.field === "spokenText",
      ),
    ).toBe(true);
  });

  it("C0R2 / validateContentBundleOrThrow cites stable codes/locations without value leakage", () => {
    const valid = loadFixture("valid-lesson-01-bundle.json");
    expect(() => validateContentBundleOrThrow(valid)).not.toThrow();

    let thrown: unknown;
    try {
      validateContentBundleOrThrow(loadFixture("unverified-assertion.json"));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("PUBLISHED_ASSERTION_UNVERIFIED");
    expect(message).toContain("lesson:01");
    expect(message).toContain("titleDe");
    expect(message).not.toContain("[fixture-title-de]");
    expect(message).not.toMatch(/"value"\s*:/);
  });

  it.each([
    ["source assertion source", (b: any) => { b.sourceAssertions[0].sourceId = "lesson:01"; }, "sourceId"],
    ["lexeme assertion", (b: any) => { b.lexemes[0].sourceAssertionIds = ["lesson:01"]; }, "sourceAssertionIds"],
    ["lesson activity", (b: any) => { b.lessons[0].stages[0].activityIds = ["lesson:01"]; }, "stages.overview.activityIds"],
  ])("C0R3 / typed reference rejects wrong entity kind: %s", (_label, mutate, field) => {
    const bundle = loadFixture("valid-lesson-01-bundle.json") as any;
    mutate(bundle);
    const result = validateContentBundle(bundle);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain("REFERENCE_KIND_MISMATCH");
    expect(result.issues.some((i) => i.code === "REFERENCE_KIND_MISMATCH" && i.field === field)).toBe(true);
  });

  it.each([
    ["publication status", (b: any) => { b.lessons[0].publication.status = "publishd"; }, "publication.status"],
    ["CEFR", (b: any) => { b.lessons[0].cefr = "B2"; }, "cefr"],
    ["lesson stage", (b: any) => { b.lessons[0].stages[0].kind = "banana"; }, "stages.overview.kind"],
    ["plain token payload", (b: any) => { b.learningActivities[0].prompt.instruction.tokens[0] = { type: "plain" }; }, "prompt.instruction.tokens[0].text"],
  ])("C0R3 / runtime discriminant rejects malformed %s", (_label, mutate, field) => {
    const bundle = loadFixture("valid-lesson-01-bundle.json") as any;
    mutate(bundle);
    const result = validateContentBundle(bundle);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === field)).toBe(true);
    expect(() => validateContentBundleOrThrow(bundle)).toThrow();
  });

  it("errors never expose assertion value bodies", () => {
    const result = validateContentBundle(loadFixture("unverified-assertion.json"));
    const blob = JSON.stringify(result.issues);
    expect(blob).not.toContain("[fixture-title-de]");
    expect(blob).not.toMatch(/"value"\s*:/);
  });

  it("fixture paths are portable (no machine-specific absolute paths in fixtures)", () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const file of files) {
      if (file === "cli-invalid.json") continue;
      const raw = readFileSync(join(FIXTURES_DIR, file), "utf8");
      expect(raw).not.toMatch(/[A-Za-z]:\\\\/);
      expect(raw).not.toMatch(/\/Users\//);
      expect(raw).not.toMatch(/C:\\\\Users/);
    }
  });
});

describe("C0R1 CLI negative contracts", () => {
  it("missing argument exits nonzero without credentials", () => {
    const run = runValidateCli([]);
    expect(run.status).not.toBe(0);
    const combined = `${run.stdout}\n${run.stderr}`;
    expect(combined).toMatch(/Usage:/);
    expect(combined).not.toMatch(/password|token|secret|api[_-]?key/i);
    expect(combined).not.toMatch(/[A-Za-z]:\\Users\\/);
  });

  it("invalid JSON exits nonzero with INVALID_JSON", () => {
    const run = runValidateCli([join(FIXTURES_DIR, "cli-invalid.json")]);
    expect(run.status).not.toBe(0);
    const combined = `${run.stdout}\n${run.stderr}`;
    expect(combined).toContain("INVALID_JSON");
    expect(combined).not.toMatch(/password|token|secret|api[_-]?key/i);
  });

  it("structurally valid but rejected fixture exits nonzero with stable codes", () => {
    const run = runValidateCli([join(FIXTURES_DIR, "slash-lemma-rejected.json")]);
    expect(run.status).not.toBe(0);
    const combined = `${run.stdout}\n${run.stderr}`;
    expect(combined).toContain("SLASH_LEMMA");
    expect(combined).toContain("VALIDATION_FAILED");
    expect(combined).not.toContain("Landwirt/Bauer");
    expect(combined).not.toMatch(/password|token|secret|api[_-]?key/i);
  });
});
