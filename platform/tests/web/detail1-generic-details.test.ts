import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import { detailCanonicalPath } from "../../apps/web/lib/content/detail-types.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

describe("DETAIL1 generic published detail projection", () => {
  const projection = projectPublishedLearnerDetails(publishedDir);

  it("projects every published vocabulary, verb, and Q&A hub record", () => {
    expect(projection.detailCount).toBe(97);
    expect(projection.details).toHaveLength(97);
    expect(Object.keys(projection.detailsById)).toHaveLength(97);
    expect(projection.details.filter((row) => row.kind === "Lexeme")).toHaveLength(69);
    expect(projection.details.filter((row) => row.kind === "Verb")).toHaveLength(4);
    expect(projection.details.filter((row) => row.kind === "QAPair")).toHaveLength(14);
  });

  it("keeps representative records rich and renders honest generic gaps", () => {
    expect(projection.detailsById["lex:architekt"]).toBe(
      projection.representativesById["lex:architekt"],
    );

    const genericLexeme = projection.detailsById["lex:alter"];
    expect(genericLexeme?.kind).toBe("Lexeme");
    if (genericLexeme?.kind !== "Lexeme") throw new Error("expected lexeme");
    expect(genericLexeme.personForm).toBeNull();
    expect(genericLexeme.pluralGapMessage).toBe("Plural is not published for this item.");
    expect(genericLexeme.canonicalPath).toBe(
      detailCanonicalPath("vocabulary", "lex:alter"),
    );

    const genericVerb = projection.detailsById["verb:lernen"];
    expect(genericVerb?.kind).toBe("Verb");
    if (genericVerb?.kind !== "Verb") throw new Error("expected verb");
    expect(genericVerb.present.length).toBeGreaterThan(0);
    expect(genericVerb.canonicalPath).toBe(detailCanonicalPath("verbs", "verb:lernen"));

    const genericQa = projection.detailsById["qa:name-formal"];
    expect(genericQa?.kind).toBe("QAPair");
    if (genericQa?.kind !== "QAPair") throw new Error("expected QA");
    expect(genericQa.register).toBe("formal");
    expect(genericQa.answers.length).toBeGreaterThan(0);
    expect(genericQa.conversationLevels).toEqual([]);
  });

  it("contains no review-only teacher records or private source material", () => {
    const json = JSON.stringify(projection);
    expect(json).not.toContain("collection:teacher-professions");
    expect(json).not.toContain("person-form:teacher-");
    expect(json).not.toContain("resources/original");
    const publicAudioPaths = projection.details.flatMap((detail) =>
      detail.media.state === "preview" ? [detail.media.publicPath] : [],
    );
    expect(publicAudioPaths.length).toBeGreaterThan(0);
    expect(publicAudioPaths.every((path) => /^\/audio\/tts-de-de-v1\/tts-[a-f0-9]+\.mp3$/u.test(path))).toBe(true);
    expect(json).not.toContain("media/generated");
    expect(json).not.toMatch(/[A-Z]:\\/);
  });
});
