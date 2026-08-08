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
  parseHubSearchParams,
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

  it("keeps every projected hub record published and excludes known review-only IDs recursively", () => {
    const serialized = serializeHubProjectionDeterministic(hubs);
    const strings: string[] = [];
    collectStrings(JSON.parse(serialized), strings);
    const blob = strings.join("\n");

    for (const id of KNOWN_REVIEW_ONLY_IDS) {
      expect(blob).not.toContain(id);
    }
    for (const id of LEARNER_REVIEW_ONLY_ACTIVITY_IDS) {
      expect(blob).not.toContain(id);
    }

    expect(blob).not.toMatch(/\bassert:/);
    expect(blob).not.toMatch(/\.mp3\b/i);
    expect(blob).not.toMatch(/"publicationStatus"\s*:\s*"(review|draft|blocked)"/);
    expect(blob.toLowerCase()).not.toContain("teacher collection");

    for (const [id, status] of author.publicationStatusById) {
      if (status === "review" || status === "draft" || status === "blocked") {
        expect(blob).not.toContain(id);
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

  it("is deterministic across two projection runs", () => {
    const first = serializeHubProjectionDeterministic(
      projectPublishedLearnerHubs(publishedDir),
    );
    const second = serializeHubProjectionDeterministic(
      projectPublishedLearnerHubs(publishedDir),
    );
    expect(first).toBe(second);
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
});
