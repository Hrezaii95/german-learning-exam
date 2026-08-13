import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildContentIndexes,
  loadAndValidatePublication,
  openAuthorIndexes,
  searchContent,
} from "@german-learning/content";
import {
  assertLearnerSearchProjection,
  GENERATED_SEARCH_PROJECTION_PATH,
} from "../../apps/web/lib/content/access.js";
import {
  projectPublishedLearnerSearch,
  serializeSearchProjectionDeterministic,
} from "../../apps/web/lib/content/search-project.js";
import {
  groupSearchHits,
  parseSearchQueryParam,
  sanitizeSearchQueryText,
  SEARCH_QUERY_MAX_LENGTH,
  searchLearnerContent,
} from "../../apps/web/lib/content/search-query.js";
import {
  appendNavigationContext,
  backHrefFromContext,
  buildHubNavigationContext,
  buildLessonNavigationContext,
  buildSearchNavigationContext,
  isSafeNavigationPath,
  parseNavigationContextParam,
  parseNavigationSearchParams,
  resolveBackHref,
  serializeNavigationContext,
} from "../../apps/web/lib/content/navigation-context.js";
import { LEARNER_REVIEW_ONLY_ACTIVITY_IDS } from "../../apps/web/lib/content/learner-publication-policy.js";
import {
  listCanonicalActivityPaths,
  listCanonicalHubPaths,
  resolveLearnerRoute,
} from "../../apps/web/lib/content/routes.js";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import type { LearnerSearchProjection } from "../../apps/web/lib/content/search-types.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const webRoot = join(platformRoot, "apps", "web");
const generatedSearchPath = join(webRoot, "generated", "learner-search.json");
const webTestsDir = join(platformRoot, "tests", "web");

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

function cloneProjection(
  projection: LearnerSearchProjection,
): LearnerSearchProjection {
  return JSON.parse(JSON.stringify(projection)) as LearnerSearchProjection;
}

describe("P3C typed global search projection", () => {
  const lessonProjection = projectPublishedLearnerWeb(publishedDir);
  const searchProjection = projectPublishedLearnerSearch(publishedDir);
  const publication = loadAndValidatePublication({ publishedDir });
  if (!publication.ok || !publication.bundle) {
    throw new Error("publication must validate");
  }
  const indexes = buildContentIndexes(publication.bundle);
  const author = openAuthorIndexes(indexes);

  it("projects only published searchable documents with stable counts", () => {
    expect(searchProjection.schemaVersion).toBe("1.0.0");
    expect(searchProjection.projectionKind).toBe("learner-search");
    expect(searchProjection.documentCount).toBe(searchProjection.documents.length);
    expect(searchProjection.documentCount).toBeGreaterThan(0);
    for (const doc of searchProjection.documents) {
      expect(doc.publicationStatus).toBe("published");
      expect(searchProjection.documentsById[doc.id]?.id).toBe(doc.id);
      expect("path" in doc.hubDestination).toBe(false);
    }
  });

  it("matches independent learner searchContent IDs and ranking for canonical, alias, multi-token, and intent", () => {
    const queries = [
      "heißen",
      "heissen",
      "sein",
      "Ingenieur",
      "Gaertner",
      "Wie heißen Sie?",
      "name-formal",
    ];
    for (const q of queries) {
      const independent = searchContent(indexes, q).map((h) => h.id);
      const web = searchLearnerContent(searchProjection, q).map((h) => h.id);
      expect(web).toEqual(independent);
    }
    const intentHits = searchLearnerContent(searchProjection, "name-formal");
    expect(intentHits.some((h) => h.id === "qa:name-formal")).toBe(true);
  });

  it("keeps empty / whitespace queries empty and groups nonempty hits by kind", () => {
    expect(searchLearnerContent(searchProjection, "")).toEqual([]);
    expect(searchLearnerContent(searchProjection, "   ")).toEqual([]);
    expect(searchLearnerContent(searchProjection, "zzzz-no-such-term-xyz")).toEqual(
      [],
    );

    const hits = searchLearnerContent(searchProjection, "sein");
    expect(hits.length).toBeGreaterThan(0);
    const groups = groupSearchHits(hits);
    expect(groups.length).toBeGreaterThan(0);
    const flat = groups.flatMap((g) => g.hits.map((h) => h.id));
    expect(flat).toEqual(hits.map((h) => h.id));
    for (const group of groups) {
      for (const hit of group.hits) {
        expect(hit.kind).toBe(group.kind);
      }
    }
  });

  it("bounds and sanitizes adversarial query params", () => {
    expect(sanitizeSearchQueryText("a".repeat(500)).length).toBe(
      SEARCH_QUERY_MAX_LENGTH,
    );
    expect(sanitizeSearchQueryText("hi<script>")).toBe("hiscript");
    expect(sanitizeSearchQueryText("a\u0000b\u0007c")).toBe("abc");
    expect(
      parseSearchQueryParam({ q: ["first", "second"] }),
    ).toBe("first");
    expect(parseSearchQueryParam({ q: "%00%3Cmarkup%3E" })).not.toMatch(/[<>]/);
  });

  it("displays canonical orthography and safe match metadata only", () => {
    const aliasHits = searchLearnerContent(searchProjection, "heissen");
    expect(aliasHits.length).toBeGreaterThan(0);
    for (const h of aliasHits) {
      expect(h.displayLabel.includes("heissen")).toBe(false);
      expect(h.match.field).toBeTruthy();
      expect(h.match.reason).toBeTruthy();
    }
    const canonical = searchLearnerContent(searchProjection, "heißen");
    expect(canonical.map((h) => h.id)).toEqual(
      searchContent(indexes, "heißen").map((h) => h.id),
    );
  });

  it("never includes review/draft/blocked/private/audio/secret material", () => {
    const serialized = serializeSearchProjectionDeterministic(searchProjection);
    const strings: string[] = [];
    const keys: string[] = [];
    collectStrings(searchProjection, strings);
    collectKeys(searchProjection, keys);

    for (const id of KNOWN_REVIEW_ONLY_IDS) {
      expect(searchProjection.documentsById[id]).toBeUndefined();
      expect(serialized.includes(id)).toBe(false);
    }
    for (const id of LEARNER_REVIEW_ONLY_ACTIVITY_IDS) {
      expect(searchProjection.documentsById[id]).toBeUndefined();
    }

    const reviewIds = new Set<string>();
    for (const doc of author.searchDocuments) {
      if (doc.publicationStatus !== "published") reviewIds.add(doc.id);
    }
    for (const id of reviewIds) {
      expect(searchProjection.documentsById[id]).toBeUndefined();
    }

    for (const key of keys) {
      for (const frag of FORBIDDEN_KEY_FRAGMENTS) {
        expect(key.toLowerCase().includes(frag.toLowerCase())).toBe(false);
      }
    }
    const joined = strings.join("\n");
    expect(joined).not.toMatch(/assert:/i);
    expect(joined).not.toMatch(/\.mp3\b/i);
    expect(joined).not.toMatch(/resources\/original/i);
    expect(joined).not.toMatch(/[A-Z]:\\/);
    expect(joined).not.toMatch(/\/Users\//);
  });

  it("requires on-disk artifact bytes equal deterministic projection", () => {
    const expected = serializeSearchProjectionDeterministic(searchProjection);
    const expectedHash = sha256(expected);

    // Disk artifact is mandatory — no try/catch absence waiver.
    expect(GENERATED_SEARCH_PROJECTION_PATH).toBe(generatedSearchPath);
    const disk = readFileSync(generatedSearchPath, "utf8");
    expect(disk).toBe(expected);
    expect(sha256(disk)).toBe(expectedHash);

    const parsed = JSON.parse(disk) as LearnerSearchProjection;
    expect(() => assertLearnerSearchProjection(parsed)).not.toThrow();
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.projectionKind).toBe("learner-search");
    expect(parsed.documentCount).toBe(searchProjection.documentCount);
    expect(parsed.documents.map((d) => d.id)).toEqual(
      searchProjection.documents.map((d) => d.id),
    );

    for (const id of KNOWN_REVIEW_ONLY_IDS) {
      expect(disk.includes(id)).toBe(false);
    }
    expect(disk).not.toMatch(/SourceAssertion/);
    expect(disk).not.toMatch(/assert:/i);
    expect(disk).not.toMatch(/\.mp3\b/i);
    expect(disk).not.toMatch(/"path"\s*:/);
  });

  it("rejects tampered artifact hrefs, paths, and forbidden fields fail-closed", () => {
    expect(() => assertLearnerSearchProjection(searchProjection)).not.toThrow();

    const hostileHrefs = [
      "https://evil.example/phish",
      "//evil.example",
      "/\\evil",
      "/lessons/../secrets",
      "/lessons/%2e%2e/secrets",
      "javascript:alert(1)",
      "/unknown-root",
      "/search/extra",
    ];
    for (const href of hostileHrefs) {
      const tampered = cloneProjection(searchProjection);
      const first = tampered.documents[0]!;
      const mutated = {
        ...first,
        canonicalHref: href,
      };
      const nextDocs = [...tampered.documents];
      nextDocs[0] = mutated;
      const nextById = { ...tampered.documentsById, [mutated.id]: mutated };
      const projection = {
        ...tampered,
        documents: nextDocs,
        documentsById: nextById,
      } as LearnerSearchProjection;
      expect(() => assertLearnerSearchProjection(projection)).toThrow(
        /canonicalHref failed allowlist|invalid or incomplete|unexpected top-level|forbidden/,
      );
      try {
        assertLearnerSearchProjection(projection);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(message).not.toContain(href);
        expect(message).not.toContain("evil");
      }
    }

    const withPathBase = cloneProjection(searchProjection);
    const pathDoc = {
      ...withPathBase.documents[0]!,
      hubDestination: {
        hub: withPathBase.documents[0]!.hubDestination.hub,
        path: "/lessons/activity/activity:raw-colon",
      },
    };
    const withPath = {
      ...withPathBase,
      documents: [pathDoc, ...withPathBase.documents.slice(1)],
      documentsById: {
        ...withPathBase.documentsById,
        [pathDoc.id]: pathDoc,
      },
    } as unknown as LearnerSearchProjection;
    expect(() => assertLearnerSearchProjection(withPath)).toThrow(
      /hubDestination must omit path/,
    );

    const withSecret = {
      ...cloneProjection(searchProjection),
      apiKey: "leak",
    } as unknown as LearnerSearchProjection;
    expect(() => assertLearnerSearchProjection(withSecret)).toThrow(
      /unexpected top-level shape|forbidden key/,
    );

    const draftBase = cloneProjection(searchProjection);
    const draftDoc = {
      ...draftBase.documents[0]!,
      publicationStatus: "review",
    };
    const draft = {
      ...draftBase,
      documents: [draftDoc, ...draftBase.documents.slice(1)],
      documentsById: {
        ...draftBase.documentsById,
        [draftDoc.id]: draftDoc,
      },
    } as unknown as LearnerSearchProjection;
    expect(() => assertLearnerSearchProjection(draft)).toThrow(
      /not published/,
    );
  });

  it("marks only implemented lesson/activity/representative-detail routes as linkable", () => {
    const detailIds = new Set([
      "lex:architekt",
      "verb:sein",
      "qa:profession-casual-main",
    ]);
    for (const doc of searchProjection.documents) {
      if (doc.kind === "Lesson") {
        expect(doc.canonicalHref).toMatch(/^\/lessons\/(01|02)$/);
        expect(isSafeNavigationPath(doc.canonicalHref!)).toBe(true);
      } else if (doc.kind === "LearningActivity") {
        expect(doc.canonicalHref).toBe(
          lessonProjection.ownershipByActivityId[doc.id]?.canonicalPath ?? null,
        );
        if (doc.canonicalHref) {
          expect(isSafeNavigationPath(doc.canonicalHref)).toBe(true);
          const resolved = resolveLearnerRoute(doc.canonicalHref, lessonProjection);
          expect(resolved.kind).toBe("activity");
        }
      } else if (detailIds.has(doc.id)) {
        expect(doc.canonicalHref).toMatch(
          /^\/(vocabulary|verbs|phrases)\/id-[0-9a-f]+$/,
        );
        expect(isSafeNavigationPath(doc.canonicalHref!)).toBe(true);
      } else {
        expect(doc.canonicalHref).toBeNull();
      }
    }
  });

  it("preserves prior activity, hub, and detail-404 route boundaries", () => {
    expect(listCanonicalActivityPaths(lessonProjection)).toHaveLength(23);
    expect(listCanonicalHubPaths()).toHaveLength(7);
    expect(resolveLearnerRoute("/search", lessonProjection).kind).toBe("search");
    expect(resolveLearnerRoute("/search/extra", lessonProjection).kind).toBe(
      "not-found",
    );
    expect(
      resolveLearnerRoute("/vocabulary/lex:ingenieur", lessonProjection).kind,
    ).toBe("not-found");
    const teacher =
      "/lessons/02/activity/" +
      encodeURIComponent("activity:lesson-02-teacher-professions-deck");
    expect(resolveLearnerRoute(teacher, lessonProjection).kind).toBe("not-found");
  });

  it("covers every web TS test via dedicated web-tests typecheck project", () => {
    const webTests = readdirSync(webTestsDir).filter((name) =>
      name.endsWith(".test.ts"),
    );
    expect(webTests.length).toBeGreaterThan(0);

    const rootTs = JSON.parse(
      readFileSync(join(platformRoot, "tsconfig.json"), "utf8"),
    ) as { exclude?: string[] };
    const webTestsTs = JSON.parse(
      readFileSync(join(webRoot, "tsconfig.tests.json"), "utf8"),
    ) as { include?: string[]; extends?: string };

    expect(webTestsTs.extends ?? "").toContain("tsconfig.json");
    expect(
      (webTestsTs.include ?? []).some((pattern) =>
        pattern.includes("tests/web"),
      ),
    ).toBe(true);

    for (const name of webTests) {
      const relative = `tests/web/${name}`;
      const excludedFromRoot = (rootTs.exclude ?? []).some((pattern) =>
        pattern.replace(/\\/g, "/").endsWith(name),
      );
      // Root may exclude JSX/Next UI/behavior tests; dedicated config must still cover all.
      if (excludedFromRoot) {
        expect(name).toMatch(
          /-ui\.test\.ts$|-behavior\.test\.ts$|p3ar2-proxy\.test\.ts$/,
        );
      }
      expect(relative.startsWith("tests/web/")).toBe(true);
    }
  });
});

describe("P3C navigation context", () => {
  it("roundtrips lesson, hub, and search contexts", () => {
    const search = buildSearchNavigationContext("heißen", "lex:ingenieur");
    const hub = buildHubNavigationContext({
      hubId: "vocabulary",
      q: "Beruf",
      lesson: "02",
      category: "noun",
    });
    const lesson = buildLessonNavigationContext("01");

    for (const ctx of [search, hub, lesson]) {
      const encoded = serializeNavigationContext(ctx);
      const parsed = parseNavigationContextParam(encoded);
      expect(parsed).not.toBeNull();
      expect(backHrefFromContext(parsed!)).toBe(backHrefFromContext(ctx));
    }

    expect(backHrefFromContext(search)).toBe(
      `/search?q=${encodeURIComponent("heißen")}`,
    );
    expect(backHrefFromContext(hub)).toContain("/vocabulary?");
    expect(backHrefFromContext(hub)).toContain("q=Beruf");
    expect(backHrefFromContext(hub)).toContain("lesson=02");
    expect(backHrefFromContext(lesson)).toBe("/lessons/01");
  });

  it("rejects malicious return paths and falls back safely", () => {
    const malicious = [
      "https://evil.example/phish",
      "//evil.example",
      "/\\evil",
      "/lessons/../secrets",
      "/lessons/%2e%2e/secrets",
      "javascript:alert(1)",
      "/unknown-root",
      "/search/extra",
      "relative",
      "/lessons/01/",
      "/lessons/01//activity/x",
      "\\\\server\\share",
    ];
    for (const path of malicious) {
      expect(isSafeNavigationPath(path)).toBe(false);
      const parsed = parseNavigationContextParam(
        JSON.stringify({ entryContext: "lesson", returnPath: path }),
      );
      if (parsed) {
        expect(isSafeNavigationPath(parsed.returnPath)).toBe(true);
      }
      expect(resolveBackHref(parsed, "hub")).toMatch(/^\//);
      expect(resolveBackHref(parsed, "hub")).not.toMatch(/^[a-z]+:/i);
      expect(resolveBackHref(parsed, "hub")).not.toContain("://");
    }

    expect(
      parseNavigationContextParam('{"entryContext":"search","returnPath":"/search","q":"' + "x".repeat(600) + '"}'),
    ).toBeNull();
    expect(parseNavigationSearchParams({ nav: ["a", "b"] })).toBeNull();
    expect(
      parseNavigationContextParam(
        encodeURIComponent(encodeURIComponent('{"entryContext":"lesson","returnPath":"/lessons/01"}')),
      ),
    ).toBeNull();
  });

  it("appends nav context without inventing unfinished detail links", () => {
    const ctx = buildSearchNavigationContext("sein");
    const href = appendNavigationContext("/lessons/01", ctx);
    expect(href.startsWith("/lessons/01?")).toBe(true);
    expect(href).toContain("nav=");
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    const roundtrip = parseNavigationContextParam(params.get("nav"));
    expect(roundtrip?.entryContext).toBe("search");
    expect(roundtrip?.q).toBe("sein");

    expect(appendNavigationContext("https://example.com", ctx)).toBe(
      "https://example.com",
    );
    expect(appendNavigationContext("//evil", ctx)).toBe("//evil");
  });
});
