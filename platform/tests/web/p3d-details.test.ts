import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadAndValidatePublication,
} from "@german-learning/content";
import {
  assertLearnerDetailProjection,
  GENERATED_DETAIL_PROJECTION_PATH,
} from "../../apps/web/lib/content/access.js";
import {
  projectPublishedLearnerDetails,
  serializeDetailProjectionDeterministic,
} from "../../apps/web/lib/content/detail-project.js";
import {
  DETAIL_REPRESENTATIVE_IDS,
  detailCanonicalPath,
} from "../../apps/web/lib/content/detail-types.js";
import { matchPublishedQaPattern } from "../../apps/web/lib/content/qa-normalize.js";
import {
  isSafeNavigationPath,
  parseNavigationContextParam,
  resolveBackHref,
} from "../../apps/web/lib/content/navigation-context.js";
import {
  listCanonicalDetailPaths,
  rawColonDetailPath,
  resolveLearnerRoute,
} from "../../apps/web/lib/content/routes.js";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import { projectPublishedLearnerSearch } from "../../apps/web/lib/content/search-project.js";
import type { LearnerDetailProjection } from "../../apps/web/lib/content/detail-types.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const webRoot = join(platformRoot, "apps", "web");
const generatedDetailPath = join(webRoot, "generated", "learner-details.json");

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value != null && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, out);
    }
  }
}

function collectKeys(value: unknown, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, out);
    return;
  }
  if (value != null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out.push(key);
      collectKeys(nested, out);
    }
  }
}

describe("P3D learner detail projection", () => {
  it("writes exactly three representatives with canonical field equality", () => {
    const projected = projectPublishedLearnerDetails(publishedDir);
    expect(projected.representativeCount).toBe(3);
    expect(projected.representatives.map((r) => r.id).sort()).toEqual(
      [...DETAIL_REPRESENTATIVE_IDS].sort(),
    );

    const publication = loadAndValidatePublication({ publishedDir });
    expect(publication.ok).toBe(true);
    const bundle = publication.bundle;
    expect(bundle).not.toBeNull();
    if (!bundle) throw new Error("expected validated bundle");
    const lex = bundle.lexemes.find((l) => l.id === "lex:architekt")!;
    const verb = bundle.verbs.find((v) => v.id === "verb:sein")!;
    const qa = bundle.qaPairs.find((q) => q.id === "qa:profession-casual-main")!;

    const vocab = projected.representativesById["lex:architekt"];
    expect(vocab.kind).toBe("Lexeme");
    if (vocab.kind !== "Lexeme") throw new Error("expected lexeme");
    expect(vocab.lemma).toBe(lex.lemma);
    expect(vocab.article).toBe(lex.noun!.article);
    expect(vocab.gender).toBe(lex.noun!.gender);
    expect(vocab.singular).toBe(lex.noun!.singular);
    expect(vocab.plurals).toEqual([]);
    expect(vocab.pluralGapMessage).toBe("Plural awaiting content approval");
    expect(vocab.meaningEn).toBe(lex.meanings[0]!.glossEn);
    expect(vocab.personForm.relatedId).toBe("lex:architektin");
    expect(vocab.personForm.sharedStem).toBe("Architekt");
    expect(vocab.personForm.feminineSuffix).toBe("in");

    const verbDetail = projected.representativesById["verb:sein"];
    expect(verbDetail.kind).toBe("Verb");
    if (verbDetail.kind !== "Verb") throw new Error("expected verb");
    expect(verbDetail.infinitive).toBe(verb.infinitive);
    expect(verbDetail.meaningEn).toBe(verb.meanings[0]!.glossEn);
    expect(verbDetail.present.map((p) => p.form)).toEqual(
      verb.present.map((p) => p.form),
    );
    expect(verbDetail.present).toHaveLength(7);

    const qaDetail = projected.representativesById["qa:profession-casual-main"];
    expect(qaDetail.kind).toBe("QAPair");
    if (qaDetail.kind !== "QAPair") throw new Error("expected qa");
    expect(qaDetail.register).toBe("informal");
    expect(qaDetail.question.realization).toBe("Was bist du von Beruf?");
    expect(qaDetail.answers.map((a) => a.realization)).toEqual([
      "Ich bin … von Beruf.",
      "Ich bin …",
      "Ich arbeite als …",
    ]);
    expect(qa.answerPatternIds).toEqual(qaDetail.answers.map((a) => a.id));
  });

  it("requires deterministic disk artifact and rejects leaks", () => {
    const projected = projectPublishedLearnerDetails(publishedDir);
    const expected = serializeDetailProjectionDeterministic(projected);
    // Disk-mandatory: no absence try/catch.
    const disk = readFileSync(generatedDetailPath, "utf8");
    expect(disk).toBe(expected);
    expect(GENERATED_DETAIL_PROJECTION_PATH).toBe(generatedDetailPath);
    expect(sha256(disk)).toHaveLength(64);

    assertLearnerDetailProjection(JSON.parse(disk) as LearnerDetailProjection);

    const keys: string[] = [];
    const strings: string[] = [];
    collectKeys(JSON.parse(disk), keys);
    collectStrings(JSON.parse(disk), strings);

    for (const key of keys) {
      expect(key.toLowerCase()).not.toMatch(/sourceassertion|assertionvalue|mp3path|audiourl|sha256|reviewstatus/);
    }
    for (const value of strings) {
      expect(value).not.toMatch(/Architekten|Architektinnen|media\/generated|candidate-needs-listening-review|assert:/i);
    }

    for (const record of projected.representatives) {
      expect(record.media.state).toBe("preview");
      if (record.media.state !== "preview") throw new Error("expected approved pronunciation");
      expect(record.media.assetId).toMatch(/^aud:tts:/u);
      expect(record.media.publicPath).toMatch(/^\/audio\/tts-de-de-v1\/tts-[a-f0-9]{16}\.mp3$/u);
      expect(record.media.sourceText).toBe(record.media.spokenText);
      expect(record.media.voice).toBe("de-DE-KatjaNeural");
      expect(record.media.generationRate).toBe("+4%");
      expect(record.media.origin).toBe("synthesized-edge-tts");
    }
  });

  it("fail-closes when artifact shape is tampered", () => {
    const projected = projectPublishedLearnerDetails(publishedDir);
    const clone = structuredClone(projected) as LearnerDetailProjection & {
      secret?: string;
    };
    clone.secret = "nope";
    expect(() => assertLearnerDetailProjection(clone)).toThrow();

    const withPlural = structuredClone(projected);
    const vocab = withPlural.representativesById["lex:architekt"];
    if (vocab.kind === "Lexeme") {
      (vocab.plurals as string[]).push("Architekten");
    }
    expect(() => assertLearnerDetailProjection(withPlural)).toThrow();
  });

  it("rejects adversarial per-family content tampering without leaking values", () => {
    const projected = projectPublishedLearnerDetails(publishedDir);
    expect(() => assertLearnerDetailProjection(projected)).not.toThrow();

    type Case = {
      family: "vocabulary" | "verb" | "qa" | "byId-only";
      mutate: (clone: LearnerDetailProjection) => string;
    };

    const cases: Case[] = [
      {
        family: "vocabulary",
        mutate: (clone) => {
          const leaked = "InventedArchitektWort";
          const idx = clone.representatives.findIndex((r) => r.id === "lex:architekt");
          const record = clone.representatives[idx]!;
          if (record.kind !== "Lexeme") throw new Error("expected lexeme");
          const next = {
            ...record,
            displayText: leaked,
            personForm: {
              ...record.personForm,
              relatedDisplayText: "die InventedArchitektinWort",
            },
          };
          (clone.representatives as LearnerDetailProjection["representatives"][number][])[idx] =
            next;
          (clone.representativesById as Record<string, unknown>)["lex:architekt"] = next;
          return leaked;
        },
      },
      {
        family: "verb",
        mutate: (clone) => {
          const leaked = "binX";
          const idx = clone.representatives.findIndex((r) => r.id === "verb:sein");
          const record = clone.representatives[idx]!;
          if (record.kind !== "Verb") throw new Error("expected verb");
          const present = record.present.map((row, i) =>
            i === 0 ? { ...row, form: leaked } : row,
          );
          const next = { ...record, present };
          (clone.representatives as LearnerDetailProjection["representatives"][number][])[idx] =
            next;
          (clone.representativesById as Record<string, unknown>)["verb:sein"] = next;
          return leaked;
        },
      },
      {
        family: "qa",
        mutate: (clone) => {
          const leaked = "Was bist du von Beruf, wirklich?";
          const idx = clone.representatives.findIndex(
            (r) => r.id === "qa:profession-casual-main",
          );
          const record = clone.representatives[idx]!;
          if (record.kind !== "QAPair") throw new Error("expected qa");
          const next = {
            ...record,
            displayText: leaked,
            question: { ...record.question, realization: leaked },
            answers: [
              { ...record.answers[0]!, realization: "Ich bin total erfunden." },
              record.answers[1]!,
              record.answers[2]!,
            ],
          };
          (clone.representatives as LearnerDetailProjection["representatives"][number][])[idx] =
            next;
          (clone.representativesById as Record<string, unknown>)[
            "qa:profession-casual-main"
          ] = next;
          return leaked;
        },
      },
      {
        family: "byId-only",
        mutate: (clone) => {
          const leaked = "binY";
          const byId = clone.representativesById["verb:sein"];
          if (byId.kind !== "Verb") throw new Error("expected verb");
          const present = byId.present.map((row, i) =>
            i === 0 ? { ...row, form: leaked } : row,
          );
          (clone.representativesById as Record<string, unknown>)["verb:sein"] = {
            ...byId,
            present,
          };
          return leaked;
        },
      },
    ];

    for (const testCase of cases) {
      const clone = structuredClone(projected);
      const leaked = testCase.mutate(clone);
      expect(() => assertLearnerDetailProjection(clone)).toThrow();
      try {
        assertLearnerDetailProjection(clone);
        throw new Error(`expected ${testCase.family} tamper to throw`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(message).not.toContain(leaked);
        expect(message).not.toContain("Invented");
        expect(message).not.toContain("erfunden");
        expect(message).not.toContain("binX");
        expect(message).not.toContain("binY");
        expect(message).not.toMatch(/assert:|SourceAssertion|media\/generated|\.mp3/i);
      }
    }
  });
});

describe("P3D detail routes", () => {
  const web = projectPublishedLearnerWeb(publishedDir);
  const details = projectPublishedLearnerDetails(publishedDir);

  it("resolves canonical encoded paths and raw-colon aliases", () => {
    for (const id of DETAIL_REPRESENTATIVE_IDS) {
      const canonical = details.representativesById[id].canonicalPath;
      const resolved = resolveLearnerRoute(canonical, web, details);
      expect(resolved.kind).toBe("detail");
      if (resolved.kind === "detail") {
        expect(resolved.entityId).toBe(id);
        expect(resolved.canonicalPath).toBe(canonical);
      }

      const raw = rawColonDetailPath(id);
      const alias = resolveLearnerRoute(raw, web, details);
      expect(alias.kind).toBe("canonical-redirect");
      if (alias.kind === "canonical-redirect") {
        expect(alias.canonicalPath).toBe(canonical);
        expect(alias.status).toBe(308);
      }

      for (const legacySegment of [
        encodeURIComponent(id),
        encodeURIComponent(id).replace(/%3A/g, "%3a"),
      ]) {
        const legacy = `/${details.representativesById[id].hubSegment}/${legacySegment}`;
        const legacyAlias = resolveLearnerRoute(legacy, web, details);
        expect(legacyAlias.kind).toBe("canonical-redirect");
        if (legacyAlias.kind === "canonical-redirect") {
          expect(legacyAlias.canonicalPath).toBe(canonical);
          expect(legacyAlias.status).toBe(308);
        }
      }
    }
    expect(listCanonicalDetailPaths(details)).toEqual(
      details.details.map((detail) => detail.canonicalPath).sort(),
    );
  });

  it("404s wrong kind, unknown, review, malformed, and extra segments", () => {
    const cases = [
      "/verbs/lex%3Aarchitekt",
      "/vocabulary/verb%3Asein",
      "/vocabulary/lex%3Anot-published",
      "/phrases/qa%3Anot-published",
      "/vocabulary/lex%253Aarchitekt",
      "/vocabulary/lex%3Aarchitekt/extra",
      "/grammar/lex%3Aarchitekt",
      "/listening/listen%3Aworkbook-1-01-ab-momente-a11-1-3",
    ];
    for (const path of cases) {
      const resolved = resolveLearnerRoute(path, web, details);
      expect(resolved.kind).toBe("not-found");
    }
  });

  it("allowlists only implemented detail paths for navigation", () => {
    for (const id of DETAIL_REPRESENTATIVE_IDS) {
      const record = details.representativesById[id];
      expect(isSafeNavigationPath(detailCanonicalPath(record.hubSegment, id))).toBe(true);
    }
    expect(isSafeNavigationPath("/vocabulary/lex:architekt")).toBe(false);
    expect(isSafeNavigationPath("/vocabulary/lex%3Aarchitektin")).toBe(false);
    expect(isSafeNavigationPath("//evil.example")).toBe(false);
  });
});

describe("P3D search links and QA normalize", () => {
  it("search links every published direct detail", () => {
    const search = projectPublishedLearnerSearch(publishedDir);
    const details = projectPublishedLearnerDetails(publishedDir);
    const detailDocuments = search.documents.filter(
      (doc) => details.detailsById[doc.id] != null,
    );
    expect(detailDocuments).toHaveLength(details.detailCount);
    for (const detail of details.details) {
      const document = detailDocuments.find((row) => row.id === detail.id);
      expect(document?.canonicalHref).toBe(detail.canonicalPath);
    }

    const otherLex = search.documents.find((d) => d.id === "lex:architektin");
    expect(otherLex?.canonicalHref).toBe(
      detailCanonicalPath("vocabulary", "lex:architektin"),
    );
  });

  it("construction matches only published patterns", () => {
    const answers = [
      "Ich bin … von Beruf.",
      "Ich bin …",
      "Ich arbeite als …",
    ];
    expect(matchPublishedQaPattern("Ich bin ... von Beruf.", answers)).toBe(
      true,
    );
    expect(matchPublishedQaPattern("Ich bin …", answers)).toBe(true);
    expect(
      matchPublishedQaPattern("Ich bin Architekt von Beruf.", answers),
    ).toBe(false);
  });

  it("restores hub/search back context safely", () => {
    const hubNav = parseNavigationContextParam(
      JSON.stringify({
        entryContext: "hub",
        returnPath: "/vocabulary",
        hubId: "vocabulary",
        lesson: "02",
        resultId: "lex:architekt",
      }),
    );
    expect(resolveBackHref(hubNav, "hub")).toBe("/vocabulary?lesson=02");

    const bad = parseNavigationContextParam(
      JSON.stringify({
        entryContext: "hub",
        returnPath: "https://evil.example",
        hubId: "vocabulary",
      }),
    );
    expect(resolveBackHref(bad, "hub")).not.toContain("evil");
  });
});
