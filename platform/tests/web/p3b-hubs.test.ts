import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildContentIndexes,
  loadAndValidatePublication,
  openAuthorIndexes,
} from "@german-learning/content";
import {
  HUB_KIND_MEMBERSHIP,
  projectPublishedLearnerHubs,
  serializeHubProjectionDeterministic,
} from "../../apps/web/lib/content/hub-project.js";
import {
  filterHubRecords,
  HUB_QUERY_MAX_LENGTH,
  hubFilterSummary,
  parseHubSearchParams,
  sanitizeHubQueryText,
} from "../../apps/web/lib/content/hub-query.js";
import { LEARNER_HUB_IDS } from "../../apps/web/lib/content/hub-types.js";
import { LEARNER_REVIEW_ONLY_ACTIVITY_IDS } from "../../apps/web/lib/content/learner-publication-policy.js";
import {
  listCanonicalHubPaths,
  resolveLearnerRoute,
} from "../../apps/web/lib/content/routes.js";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const webRoot = join(platformRoot, "apps", "web");
const generatedHubsPath = join(webRoot, "generated", "learner-hubs.json");

const KNOWN_REVIEW_ONLY_IDS = [
  "collection:teacher-professions",
  "activity:lesson-02-teacher-professions-deck",
  "verb:arbeiten",
  "verb:haben",
  "verb:leben",
  "verb:machen",
  "verb:studieren",
  "verb:wohnen",
  "listen:workbook-1-01-ab-momente-a11-1-3",
  "lex:elektriker",
] as const;

const FORBIDDEN_KEY_FRAGMENTS = [
  "SourceAssertion",
  "sourceAssertion",
  "assertionValue",
  "assertionValues",
  "redistributionBasis",
  "originalPath",
  "privatePath",
  "absolutePath",
  "audioUrl",
  "mp3Path",
  "apiKey",
  "api_key",
  "secret",
  "password",
  "token",
  "credential",
] as const;

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

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function independentHubIdSets(
  indexes: ReturnType<typeof buildContentIndexes>,
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const hubId of LEARNER_HUB_IDS) {
    const ids = new Set<string>();
    for (const kind of HUB_KIND_MEMBERSHIP[hubId]) {
      for (const id of indexes.byKind.get(kind) ?? []) {
        ids.add(id);
      }
    }
    out[hubId] = ids;
  }
  return out;
}

describe("P3B six canonical hubs projection", () => {
  const lessonProjection = projectPublishedLearnerWeb(publishedDir);
  const hubs = projectPublishedLearnerHubs(publishedDir);
  const publication = loadAndValidatePublication({ publishedDir });
  if (!publication.ok || !publication.bundle) {
    throw new Error("publication must validate");
  }
  const indexes = buildContentIndexes(publication.bundle);
  const author = openAuthorIndexes(indexes);

  it("represents exactly six hub routes plus /hubs directory", () => {
    expect(hubs.hubCount).toBe(6);
    expect(hubs.hubs.map((hub) => hub.id)).toEqual([...LEARNER_HUB_IDS]);
    expect(listCanonicalHubPaths()).toEqual([
      "/vocabulary",
      "/verbs",
      "/grammar",
      "/phrases",
      "/listening",
      "/concepts",
      "/hubs",
    ]);
    for (const path of listCanonicalHubPaths()) {
      const resolved = resolveLearnerRoute(path, lessonProjection);
      if (path === "/hubs") {
        expect(resolved.kind).toBe("hubs-directory");
      } else {
        expect(resolved.kind).toBe("hub");
      }
    }
  });

  it("derives membership from learner-safe index kind mapping", () => {
    for (const hub of hubs.hubs) {
      const expectedKinds = new Set(HUB_KIND_MEMBERSHIP[hub.id]);
      const independent = new Set<string>();
      for (const kind of expectedKinds) {
        for (const id of indexes.byKind.get(kind) ?? []) {
          independent.add(id);
        }
      }
      expect(hub.itemCount).toBe(independent.size);
      expect(new Set(hub.items.map((item) => item.id))).toEqual(independent);
      for (const item of hub.items) {
        expect(expectedKinds.has(item.kind)).toBe(true);
        expect(item.publicationStatus).toBe("published");
        expect(indexes.byId.get(item.id)?.publicationStatus).toBe("published");
      }
    }
  });

  it("matches generated learner-hubs artifact ID sets exactly", () => {
    const artifact = JSON.parse(readFileSync(generatedHubsPath, "utf8")) as {
      hubs: Array<{ id: string; items: Array<{ id: string }> }>;
      hubsById: Record<string, { items: Array<{ id: string }> }>;
    };
    const independent = independentHubIdSets(indexes);

    for (const hubId of LEARNER_HUB_IDS) {
      const projected = new Set(hubs.hubsById[hubId].items.map((item) => item.id));
      const fromArtifact = new Set(
        (artifact.hubsById[hubId]?.items ?? []).map((item) => item.id),
      );
      expect(projected).toEqual(independent[hubId]);
      expect(fromArtifact).toEqual(independent[hubId]);
      expect(projected.size).toBe(hubs.hubsById[hubId].itemCount);
    }
  });

  it("keeps every projected hub record published and excludes known review-only IDs recursively", () => {
    const serialized = serializeHubProjectionDeterministic(hubs);
    const parsed = JSON.parse(serialized);
    const strings: string[] = [];
    const keys: string[] = [];
    collectStrings(parsed, strings);
    collectKeys(parsed, keys);
    const blob = strings.join("\n");
    const keyBlob = keys.join("\n");

    for (const id of KNOWN_REVIEW_ONLY_IDS) {
      expect(blob).not.toContain(id);
    }
    for (const id of LEARNER_REVIEW_ONLY_ACTIVITY_IDS) {
      expect(blob).not.toContain(id);
    }

    expect(blob).not.toMatch(/\bassert:/);
    expect(blob).not.toMatch(/\.mp3\b/i);
    expect(blob).not.toMatch(/https?:\/\/[^\s"]+\.mp3/i);
    expect(blob).not.toMatch(/"publicationStatus"\s*:\s*"(review|draft|blocked)"/);
    expect(blob.toLowerCase()).not.toContain("teacher collection");
    expect(blob).not.toMatch(/[A-Za-z]:\\/);
    expect(blob).not.toMatch(/\/Users\//);
    expect(blob).not.toMatch(/E:\\claude-cursor/i);
    expect(blob).not.toMatch(/resources\/original/i);

    for (const fragment of FORBIDDEN_KEY_FRAGMENTS) {
      expect(keyBlob.toLowerCase()).not.toContain(fragment.toLowerCase());
      expect(blob.toLowerCase()).not.toContain(`"${fragment.toLowerCase()}"`);
    }
    expect(keys).not.toContain("Source");
    expect(keys).not.toContain("sources");
    expect(keys).not.toContain("assertions");
    expect(keys).not.toContain("sourceAssertions");

    for (const [id, status] of author.publicationStatusById) {
      if (status === "review" || status === "draft" || status === "blocked") {
        expect(blob).not.toContain(id);
      }
    }
  });

  it("recursively leak-scans on-disk learner-hubs.json bytes independently of the in-memory serializer", () => {
    const independent = independentHubIdSets(indexes);
    const diskBytes = readFileSync(generatedHubsPath);
    const diskText = diskBytes.toString("utf8");
    const artifact = JSON.parse(diskText) as {
      schemaVersion: string;
      projectionKind: string;
      hubCount: number;
      hubs: Array<{
        id: string;
        kinds: string[];
        itemCount: number;
        items: Array<{
          id: string;
          kind: string;
          publicationStatus: string;
        }>;
      }>;
      hubsById: Record<
        string,
        {
          id: string;
          kinds: string[];
          itemCount: number;
          items: Array<{
            id: string;
            kind: string;
            publicationStatus: string;
          }>;
        }
      >;
    };

    expect(artifact.schemaVersion).toBe("1.0.0");
    expect(artifact.projectionKind).toBe("learner-hubs");
    expect(artifact.hubCount).toBe(6);
    expect(artifact.hubs.map((hub) => hub.id)).toEqual([...LEARNER_HUB_IDS]);

    const diskStrings: string[] = [];
    const diskKeys: string[] = [];
    collectStrings(artifact, diskStrings);
    collectKeys(artifact, diskKeys);
    const diskBlob = diskStrings.join("\n");
    const diskKeyBlob = diskKeys.join("\n");

    for (const hubId of LEARNER_HUB_IDS) {
      const hub = artifact.hubsById[hubId];
      expect(hub).toBeDefined();
      if (!hub) {
        throw new Error(`missing on-disk hub ${hubId}`);
      }
      expect(hub.id).toBe(hubId);
      expect(hub.itemCount).toBe(hub.items.length);
      expect(new Set(hub.items.map((item) => item.id))).toEqual(independent[hubId]);
      expect(new Set(hub.kinds)).toEqual(new Set(HUB_KIND_MEMBERSHIP[hubId]));
      for (const item of hub.items) {
        expect(item.publicationStatus).toBe("published");
        expect(HUB_KIND_MEMBERSHIP[hubId]).toContain(item.kind as never);
      }
    }

    for (const id of KNOWN_REVIEW_ONLY_IDS) {
      expect(diskBlob).not.toContain(id);
      expect(diskText).not.toContain(id);
    }
    for (const id of LEARNER_REVIEW_ONLY_ACTIVITY_IDS) {
      expect(diskBlob).not.toContain(id);
      expect(diskText).not.toContain(id);
    }

    expect(diskText).not.toMatch(/\bassert:/);
    expect(diskText).not.toMatch(/\.mp3\b/i);
    expect(diskText).not.toMatch(/https?:\/\/[^\s"]+\.mp3/i);
    expect(diskText).not.toMatch(
      /"publicationStatus"\s*:\s*"(review|draft|blocked)"/,
    );
    expect(diskBlob.toLowerCase()).not.toContain("teacher collection");
    expect(diskText).not.toMatch(/[A-Za-z]:\\/);
    expect(diskText).not.toMatch(/\/Users\//);
    expect(diskText).not.toMatch(/E:\\claude-cursor/i);
    expect(diskText).not.toMatch(/resources\/original/i);

    for (const fragment of FORBIDDEN_KEY_FRAGMENTS) {
      expect(diskKeyBlob.toLowerCase()).not.toContain(fragment.toLowerCase());
      expect(diskText.toLowerCase()).not.toContain(`"${fragment.toLowerCase()}"`);
    }
    expect(diskKeys).not.toContain("Source");
    expect(diskKeys).not.toContain("sources");
    expect(diskKeys).not.toContain("assertions");
    expect(diskKeys).not.toContain("sourceAssertions");

    for (const [id, status] of author.publicationStatusById) {
      if (status === "review" || status === "draft" || status === "blocked") {
        expect(diskBlob).not.toContain(id);
        expect(diskText).not.toContain(id);
      }
    }
  });

  it("matches independent learner index filters without prose count literals", () => {
    const vocab = hubs.hubsById.vocabulary.itemCount;
    const verbs = hubs.hubsById.verbs.itemCount;
    const grammar = hubs.hubsById.grammar.itemCount;
    const phrases = hubs.hubsById.phrases.itemCount;
    const listening = hubs.hubsById.listening.itemCount;
    const concepts = hubs.hubsById.concepts.itemCount;

    expect(vocab).toBe((indexes.byKind.get("Lexeme") ?? []).length);
    expect(verbs).toBe((indexes.byKind.get("Verb") ?? []).length);
    expect(grammar).toBe((indexes.byKind.get("GrammarConcept") ?? []).length);
    expect(phrases).toBe(
      (indexes.byKind.get("PhrasePattern") ?? []).length +
        (indexes.byKind.get("QAPair") ?? []).length,
    );
    expect(listening).toBe(
      (indexes.byKind.get("Dialogue") ?? []).length +
        (indexes.byKind.get("ListeningAsset") ?? []).length,
    );
    expect(concepts).toBe((indexes.byKind.get("Collection") ?? []).length);

    expect(vocab).toBeGreaterThan(0);
    expect(phrases).toBeGreaterThan(0);
    expect(hubs.hubsById.vocabulary.items.some((item) =>
      item.lessonIds.includes("lesson:02"),
    )).toBe(true);

    const hubProjectSource = readFileSync(
      join(webRoot, "lib/content/hub-project.ts"),
      "utf8",
    );
    expect(hubProjectSource).not.toMatch(/\bitemCount:\s*\d+/);
    expect(hubProjectSource).not.toMatch(/\b69\b/);
    expect(hubProjectSource).not.toMatch(/\b44\b/);
  });

  it("is byte-identical across two projection runs with stable SHA-256", () => {
    const first = serializeHubProjectionDeterministic(
      projectPublishedLearnerHubs(publishedDir),
    );
    const second = serializeHubProjectionDeterministic(
      projectPublishedLearnerHubs(publishedDir),
    );
    expect(first).toBe(second);
    expect(sha256(first)).toBe(sha256(second));
    expect(first.length).toBeGreaterThan(0);
  });

  it("rejects unimplemented hub detail aliases as not-found", () => {
    const cases = [
      "/vocabulary/lex:ingenieur",
      "/verbs/verb:heissen",
      "/phrases/phrase:identity-q",
      "/hubs/extra",
      "/concepts/collection:teacher-professions",
    ];
    for (const path of cases) {
      const resolved = resolveLearnerRoute(path, lessonProjection);
      expect(resolved.kind).toBe("not-found");
      expect(resolved.kind).not.toBe("dashboard");
    }
  });

  it("preserves P3A lesson and activity route resolution", () => {
    expect(resolveLearnerRoute("/", lessonProjection).kind).toBe("dashboard");
    expect(resolveLearnerRoute("/lessons", lessonProjection).kind).toBe("lessons");
    expect(resolveLearnerRoute("/lessons/01", lessonProjection).kind).toBe("lesson");
    expect(resolveLearnerRoute("/lessons/02", lessonProjection).kind).toBe("lesson");
    expect(resolveLearnerRoute("/lessons/03", lessonProjection).kind).toBe("not-found");

    const sample = lessonProjection.activities[0];
    expect(sample).toBeDefined();
    const activity = resolveLearnerRoute(sample!.canonicalPath, lessonProjection);
    expect(activity.kind).toBe("activity");

    const reviewOnly = resolveLearnerRoute(
      "/lessons/02/activity/activity%3Alesson-02-teacher-professions-deck",
      lessonProjection,
    );
    expect(reviewOnly.kind).toBe("not-found");
  });
});

describe("P3B hub search and filters", () => {
  const hubs = projectPublishedLearnerHubs(publishedDir);
  const vocabulary = hubs.hubsById.vocabulary;
  const grammar = hubs.hubsById.grammar;

  it("matches canonical German text and umlaut aliases without changing displayed orthography", () => {
    const arzt = vocabulary.items.find((item) => item.id === "lex:arzt");
    expect(arzt).toBeDefined();

    const canonical = filterHubRecords(vocabulary.items, {
      q: "Arzt",
      lesson: "all",
      category: null,
    });
    expect(canonical.items.some((item) => item.id === "lex:arzt")).toBe(true);
    expect(canonical.items.find((item) => item.id === "lex:arzt")?.displayLabel).toBe(
      arzt!.displayLabel,
    );

    const aerztin = vocabulary.items.find((item) => item.id === "lex:aerztin");
    expect(aerztin).toBeDefined();
    expect(aerztin!.displayLabel).toMatch(/Ä|ä|ö|ü|ß/);

    const aliasHits = filterHubRecords(vocabulary.items, {
      q: "Aerztin",
      lesson: "all",
      category: null,
    });
    expect(aliasHits.items.some((item) => item.id === "lex:aerztin")).toBe(true);
    expect(
      aliasHits.items.find((item) => item.id === "lex:aerztin")?.displayLabel,
    ).toBe(aerztin!.displayLabel);
    expect(aliasHits.items.find((item) => item.id === "lex:aerztin")?.displayLabel.includes("Ae")).toBe(
      false,
    );
  });

  it("supports lesson and category filters, combinations, clear state, no matches, and empty hubs", () => {
    const lesson2 = filterHubRecords(vocabulary.items, {
      q: "",
      lesson: "02",
      category: null,
    });
    expect(lesson2.items.length).toBeGreaterThan(0);
    expect(
      lesson2.items.every((item) => item.lessonIds.includes("lesson:02")),
    ).toBe(true);

    const category = vocabulary.categories[0];
    expect(category).toBeTruthy();
    const byCategory = filterHubRecords(vocabulary.items, {
      q: "",
      lesson: "all",
      category: category as string,
    });
    expect(byCategory.items.length).toBeGreaterThan(0);
    expect(byCategory.items.every((item) => item.category === category)).toBe(
      true,
    );

    const combined = filterHubRecords(vocabulary.items, {
      q: "zzzz-no-such-lexeme",
      lesson: "02",
      category: category as string,
    });
    expect(combined.items).toHaveLength(0);
    expect(combined.hasActiveFilters).toBe(true);

    const cleared = parseHubSearchParams(
      { q: "", lesson: "all", category: "all", bogus: "<script>" },
      vocabulary.categories,
    );
    expect(cleared).toEqual({ q: "", lesson: "all", category: null });

    const unknownCategory = parseHubSearchParams(
      { category: "not-a-real-category", lesson: "99", q: "ok" },
      vocabulary.categories,
    );
    expect(unknownCategory.lesson).toBe("all");
    expect(unknownCategory.category).toBeNull();
    expect(unknownCategory.q).toBe("ok");

    expect(grammar.itemCount).toBe(0);
    const emptyFiltered = filterHubRecords(grammar.items, {
      q: "sein",
      lesson: "01",
      category: null,
    });
    expect(emptyFiltered.items).toHaveLength(0);
  });

  it("adversarially bounds query parsing without unsafe reflection", () => {
    const duplicateQ = parseHubSearchParams(
      { q: ["Arzt", "<script>alert(1)</script>"], lesson: ["02", "99"] },
      vocabulary.categories,
    );
    expect(duplicateQ.q).toBe("Arzt");
    expect(duplicateQ.lesson).toBe("02");
    expect(duplicateQ.q).not.toContain("<");
    expect(duplicateQ.q).not.toContain("script");

    const html = parseHubSearchParams(
      { q: '<img src=x onerror="alert(1)">Arzt', lesson: "01" },
      vocabulary.categories,
    );
    expect(html.q).not.toMatch(/[<>]/);
    expect(html.q).toContain("Arzt");
    expect(hubFilterSummary(html).join(" ")).not.toMatch(/[<>]/);

    const controls = parseHubSearchParams(
      { q: "Ar\u0000zt\u0007\u001b[31m", lesson: "all" },
      vocabulary.categories,
    );
    expect(controls.q).toBe("Arzt[31m");
    expect(controls.q).not.toMatch(/[\u0000-\u001f\u007f]/);

    const longRaw = `A${"x".repeat(HUB_QUERY_MAX_LENGTH + 80)}`;
    const long = parseHubSearchParams({ q: longRaw }, vocabulary.categories);
    expect(long.q.length).toBe(HUB_QUERY_MAX_LENGTH);
    expect(sanitizeHubQueryText(longRaw).length).toBe(HUB_QUERY_MAX_LENGTH);

    const malformed = parseHubSearchParams(
      {
        q: "%zz%not-encoding\uD800",
        lesson: "lesson:01" as unknown as string,
        category: ["all", "jobs"],
      },
      vocabulary.categories,
    );
    expect(malformed.lesson).toBe("all");
    expect(malformed.q).not.toContain("\uD800");
    expect(malformed.category).toBeNull();

    const unknown = parseHubSearchParams(
      { lesson: "03", category: "../../etc/passwd", q: "ok" },
      vocabulary.categories,
    );
    expect(unknown).toEqual({ q: "ok", lesson: "all", category: null });

    // Sanitized values may appear in summary text only after stripping markup delimiters.
    const reflected = hubFilterSummary(
      parseHubSearchParams(
        { q: "<script>evil</script>", lesson: "02" },
        vocabulary.categories,
      ),
    );
    const reflectedText = reflected.join(" ");
    expect(reflectedText).not.toMatch(/[<>]/);
    expect(reflectedText).not.toContain("<script>");
    expect(reflected.some((part) => part.startsWith("Search:"))).toBe(true);
  });
});
