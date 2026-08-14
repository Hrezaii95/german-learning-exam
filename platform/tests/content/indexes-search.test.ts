import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertIndexPlaintext,
  buildContentIndexes,
  caseFoldNfc,
  entitiesForLesson,
  filterIndexedEntities,
  filterMembershipIds,
  foldUmlautDigraph,
  germanMatchKeys,
  getEntityRecord,
  getIndexedEntity,
  loadAndValidatePublication,
  membersOfCollection,
  nfc,
  openAuthorIndexes,
  plainTextFromStructured,
  reviewableConceptsForAudience,
  searchContent,
  type ContentBundle,
  type ContentIndexes,
} from "@german-learning/content";

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_PUBLISHED_DIR = join(HERE, "../../content/published");
const POSITIVE_FIXTURE_DIR = join(
  HERE,
  "fixtures/publication-package/positive",
);

function loadRealIndexes(): { bundle: ContentBundle; indexes: ContentIndexes } {
  const result = loadAndValidatePublication({ publishedDir: REAL_PUBLISHED_DIR });
  expect(result.ok).toBe(true);
  expect(result.bundle).not.toBeNull();
  const bundle = result.bundle!;
  const indexes = buildContentIndexes(bundle);
  return { bundle, indexes };
}

describe("C2A typed indexes and search (real publication)", () => {
  const { bundle, indexes } = loadRealIndexes();
  const author = openAuthorIndexes(indexes);

  it("derives counts from the real manifest (no hardcoded totals)", () => {
    // Learner counts = published projections only.
    expect(indexes.counts.activityCount).toBe(
      [...indexes.byId.values()].filter((r) => r.kind === "LearningActivity")
        .length,
    );
    expect(indexes.counts.relationshipEdgeCount).toBe(
      [...indexes.relationships.byType.values()].reduce(
        (n, edges) => n + edges.length,
        0,
      ),
    );
    expect(indexes.counts.entitiesByKind.Lexeme).toBe(
      indexes.byKind.get("Lexeme")?.length,
    );
    expect(indexes.counts.entitiesByKind.Verb).toBe(
      indexes.byKind.get("Verb")?.length,
    );
    expect(indexes.counts.entitiesByKind.QAPair).toBe(
      indexes.byKind.get("QAPair")?.length,
    );
    expect(indexes.counts.entitiesByKind.PhrasePattern).toBe(
      indexes.byKind.get("PhrasePattern")?.length,
    );
    expect(indexes.counts.entitiesByKind.Collection).toBe(
      indexes.byKind.get("Collection")?.length ?? 0,
    );
    expect(indexes.counts.entitiesByKind.ListeningAsset).toBe(
      indexes.byKind.get("ListeningAsset")?.length ?? 0,
    );
    expect(indexes.counts.entitiesByKind.Lesson).toBe(bundle.lessons.length);
    expect(indexes.counts.searchableDocumentCount).toBe(
      indexes.searchDocuments.length,
    );
    expect(indexes.counts.entitiesByPublicationStatus.review).toBeUndefined();
    expect(indexes.counts.entitiesByPublicationStatus.draft).toBeUndefined();
    expect(indexes.counts.entitiesByPublicationStatus.blocked).toBeUndefined();
    expect(indexes.counts).not.toHaveProperty("authorReviewableConceptCount");
    expect(indexes.counts).not.toHaveProperty("reviewSearchableCount");
    expect(indexes.counts.reviewableConceptCount).toBe(
      indexes.reviewableConceptIds.size,
    );
    expect(indexes.counts.activityCount).toBeGreaterThan(0);
    expect(indexes.counts.entitiesByKind.Lexeme).toBeGreaterThan(0);

    // Author counts via explicit capability (includes review; never blocked).
    expect(author.counts.activityCount).toBe(bundle.learningActivities.length);
    expect(author.counts.searchableDocumentCount).toBe(
      author.searchDocuments.length,
    );
    expect(author.counts.publishedSearchableCount).toBe(
      indexes.searchDocuments.length,
    );
    expect(author.counts.reviewSearchableCount).toBe(
      author.searchDocuments.filter(
        (d: { publicationStatus: string }) =>
          d.publicationStatus === "review" || d.publicationStatus === "draft",
      ).length,
    );
    expect(author.counts.collectionMembershipCount).toBe(
      author.collectionMembers.get("collection:teacher-professions")?.length,
    );
    expect(author.counts.authorReviewableConceptCount).toBe(
      author.authorReviewableConceptIds.size,
    );
    expect(author.counts.entitiesByKind.Lexeme).toBe(bundle.lexemes.length);
    expect(author.counts.relationshipEdgeCount).toBeGreaterThanOrEqual(
      indexes.counts.relationshipEdgeCount,
    );
    expect(indexes.counts.relationshipEdgeCount).toBeLessThan(
      bundle.relationships.length,
    );
  });

  it("indexes by id/kind, lesson membership, adjacency, priority, status, media, examples, collections, activities, reviewables", () => {
    expect(indexes.byId.get("verb:heissen")?.kind).toBe("Verb");
    expect(indexes.byId.get("lex:ingenieur")?.kind).toBe("Lexeme");
    expect(indexes.byKind.get("Verb")).toContain("verb:sein");
    expect(indexes.entityLessons.get("verb:heissen")).toContain("lesson:01");
    expect(indexes.entityLessons.get("lex:ingenieur")).toContain("lesson:02");
    expect(indexes.lessonMembership.get("lesson:01")).toContain("verb:heissen");
    expect(indexes.lessonMembership.get("lesson:02")).toContain("lex:ingenieur");

    const intro = indexes.relationships.byType.get("introduced-in") ?? [];
    expect(intro.some((e) => e.fromId === "lex:ingenieur" && e.toId === "lesson:02")).toBe(
      true,
    );
    const person = indexes.relationships.outgoing.get("lex:ingenieurin") ?? [];
    expect(
      person.some(
        (e) => e.type === "person-form-of" && e.toId === "lex:ingenieur",
      ),
    ).toBe(true);

    expect(indexes.sourcePriorityById.get("verb:heissen")).toBe(1);
    expect(author.sourcePriorityById.get("lex:elektriker")).toBe(3);
    expect(indexes.publicationStatusById.get("lex:ingenieur")).toBe("published");
    expect(author.publicationStatusById.get("lex:elektriker")).toBe("review");
    expect(author.publicationStatusById.get("collection:teacher-professions")).toBe(
      "review",
    );

    expect(
      author.collectionMembers.get("collection:teacher-professions"),
    ).toContain("lex:ingenieur");
    expect(author.entityCollections.get("lex:ingenieur")).toContain(
      "collection:teacher-professions",
    );
    expect(indexes.activitiesByLesson.get("lesson:01")?.length).toBe(12);
    // Lesson 02 public activity count excludes review deck; author sees all 12.
    expect(author.activitiesByLesson.get("lesson:02")?.length).toBe(12);
    expect(
      author.activitiesByConcept.get("collection:teacher-professions"),
    ).toContain("activity:lesson-02-teacher-professions-deck");
    // Learner reviewable = published only; author set only on openAuthorIndexes.
    expect(indexes.reviewableConceptIds.has("lex:ingenieur")).toBe(true);
    expect(indexes.reviewableConceptIds.has("lex:elektriker")).toBe(false);
    expect(indexes).not.toHaveProperty("authorReviewableConceptIds");
    expect(author.authorReviewableConceptIds.has("lex:elektriker")).toBe(true);
    expect(author.authorReviewableConceptIds.has("lex:ingenieur")).toBe(true);
    expect(indexes.tagsByEntityId.get("lex:ingenieurin")).toEqual(
      expect.arrayContaining(["rel:person-form-of"]),
    );
    expect(indexes.mediaByEntityId.size).toBeGreaterThanOrEqual(0);
    expect(indexes.examplesByEntityId.size).toBe(
      [...indexes.examplesByEntityId.keys()].length,
    );
  });

  it("representative search: heißen, sein, Ingenieur, formal Q&A intent", () => {
    const heissen = searchContent(indexes, "heißen");
    expect(heissen.length).toBeGreaterThan(0);
    expect(heissen[0]!.id).toBe("verb:heissen");
    expect(heissen[0]!.displayLabel).toBe("heißen");
    expect(heissen[0]!.match.field).toMatch(/infinitive|label|form/);
    expect(heissen[0]!.match.reason).toBe("exact");
    expect(heissen[0]!.publicationStatus).toBe("published");
    expect(heissen[0]!.hubDestination).toEqual({
      hub: "verbs",
      path: "/verbs/verb:heissen",
    });

    const sein = searchContent(indexes, "sein");
    expect(sein.some((h) => h.id === "verb:sein")).toBe(true);
    const seinHit = sein.find((h) => h.id === "verb:sein")!;
    expect(seinHit.displayLabel).toBe("sein");
    expect(seinHit.kind).toBe("Verb");

    const ing = searchContent(indexes, "Ingenieur");
    expect(ing.some((h) => h.id === "lex:ingenieur")).toBe(true);
    const ingHit = ing.find((h) => h.id === "lex:ingenieur")!;
    expect(ingHit.displayLabel).toContain("Ingenieur");
    expect(ingHit.lessonIds).toContain("lesson:02");
    expect(ingHit.sourcePriority).toBe(1);
    expect(ingHit.hubDestination.path).toBe("/vocabulary/lex:ingenieur");

    const formalQa = searchContent(indexes, "Wie heißen Sie?");
    expect(formalQa.some((h) => h.id === "qa:name-formal" || h.id === "phrase:name-formal-q")).toBe(
      true,
    );
    const intentHits = searchContent(indexes, "name-formal");
    expect(intentHits.some((h) => h.id === "qa:name-formal")).toBe(true);
    const qaHit = intentHits.find((h) => h.id === "qa:name-formal")!;
    expect(qaHit.kind).toBe("QAPair");
    expect(qaHit.hubDestination.hub).toBe("phrases");
    expect(qaHit.match.field).toMatch(/intent|realization|label/);
  });

  it("default search excludes review teacher members and teacher deck; includeReview exposes them", () => {
    const defaultElektriker = searchContent(indexes, "Elektriker");
    expect(defaultElektriker.some((h) => h.id === "lex:elektriker")).toBe(false);

    const defaultDeck = searchContent(indexes, "Teacher professions");
    expect(
      defaultDeck.some((h) => h.id === "collection:teacher-professions"),
    ).toBe(false);

    const defaultTeacherActivity = searchContent(
      indexes,
      "Teacher-professions assignment deck",
    );
    expect(
      defaultTeacherActivity.some(
        (h) => h.id === "activity:lesson-02-teacher-professions-deck",
      ),
    ).toBe(false);

    const reviewTeacherActivity = searchContent(
      indexes,
      "Teacher-professions assignment deck",
      { audience: "review" },
    );
    expect(
      reviewTeacherActivity.some(
        (h) => h.id === "activity:lesson-02-teacher-professions-deck",
      ),
    ).toBe(true);
    expect(
      reviewTeacherActivity.find(
        (h) => h.id === "activity:lesson-02-teacher-professions-deck",
      )!.publicationStatus,
    ).toBe("review");

    const reviewElektriker = searchContent(indexes, "Elektriker", {
      includeReview: true,
    });
    expect(reviewElektriker.some((h) => h.id === "lex:elektriker")).toBe(true);
    const el = reviewElektriker.find((h) => h.id === "lex:elektriker")!;
    expect(el.publicationStatus).toBe("review");
    expect(el.sourcePriority).toBe(3);
    expect(el.backContext.includeReview).toBe(true);

    const reviewDeck = searchContent(indexes, "Teacher professions", {
      audience: "review",
    });
    expect(
      reviewDeck.some((h) => h.id === "collection:teacher-professions"),
    ).toBe(true);
    expect(
      reviewDeck.find((h) => h.id === "collection:teacher-professions")!
        .publicationStatus,
    ).toBe("review");

    expect(
      searchContent(indexes, "Ingenieur").some((h) => h.id === "lex:ingenieur"),
    ).toBe(true);
  });

  it("representative concept resolves consistently from lesson, collection, adjacency, and search", () => {
    const id = "lex:ingenieur";
    const rec = indexes.byId.get(id)!;
    expect(rec.lessonIds).toContain("lesson:02");
    expect(indexes.lessonMembership.get("lesson:02")).toContain(id);
    expect(
      openAuthorIndexes(indexes).collectionMembers.get(
        "collection:teacher-professions",
      ),
    ).toContain(id);
    expect(
      openAuthorIndexes(indexes).entityCollections.get(id),
    ).toContain("collection:teacher-professions");
    // Learner projection must not reveal teacher-collection membership via IDs or edges.
    expect(rec.collectionIds).not.toContain("collection:teacher-professions");
    expect(indexes.entityCollections.get(id)).toBeUndefined();
    const learnerMemberEdges = indexes.relationships.outgoing.get(id) ?? [];
    expect(
      learnerMemberEdges.some(
        (e) =>
          e.type === "member-of-collection" &&
          e.toId === "collection:teacher-professions",
      ),
    ).toBe(false);
    const authorMemberEdges =
      openAuthorIndexes(indexes).relationships.outgoing.get(id) ?? [];
    expect(
      authorMemberEdges.some(
        (e) =>
          e.type === "member-of-collection" &&
          e.toId === "collection:teacher-professions",
      ),
    ).toBe(true);
    const intro = (indexes.relationships.outgoing.get(id) ?? []).concat(
      indexes.relationships.incoming.get(id) ?? [],
    );
    expect(
      intro.some((e) => e.type === "introduced-in" && e.toId === "lesson:02") ||
        (indexes.relationships.outgoing.get(id) ?? []).some(
          (e) => e.type === "introduced-in" && e.toId === "lesson:02",
        ),
    ).toBe(true);

    const hit = searchContent(indexes, "Ingenieur").find((h) => h.id === id)!;
    expect(hit.lessonIds).toEqual(rec.lessonIds);
    expect(hit.publicationStatus).toBe(rec.publicationStatus);
    expect(hit.sourcePriority).toBe(rec.sourcePriority);
    expect(hit.hubDestination.path).toBe(`/vocabulary/${id}`);
  });

  it("NFC/case/umlaut/ß normalization, deterministic ordering, safe back-context, no assertion leakage, empty query", () => {
    expect(nfc("a\u0308")).toBe("\u00e4");
    expect(caseFoldNfc("HEI\u00dfEN")).toBe("hei\u00dfen");
    expect(foldUmlautDigraph("hei\u00dfen")).toBe("heissen");
    expect(germanMatchKeys("G\u00e4rtner")).toEqual(
      expect.arrayContaining(["g\u00e4rtner", "gaertner", "gartner"]),
    );
    expect(germanMatchKeys("Stra\u00dfe")).toEqual(
      expect.arrayContaining(["stra\u00dfe", "strasse"]),
    );

    // Default excludes review Gärtner; explicit review audience returns umlaut display.
    expect(searchContent(indexes, "Gaertner").some((h) => h.id === "lex:gaertner")).toBe(
      false,
    );
    const ko = searchContent(indexes, "Gaertner", { audience: "review" });
    const gaertner = ko.find((h) => h.id === "lex:gaertner");
    expect(gaertner).toBeDefined();
    expect(gaertner!.displayLabel).toContain("G\u00e4rtner");
    expect(gaertner!.displayLabel.includes("ae")).toBe(false);
    expect(gaertner!.match.reason).toBe("normalized-alias");

    const gartnerAlias = searchContent(indexes, "GARTNER", { audience: "review" }).find(
      (h) => h.id === "lex:gaertner",
    );
    expect(gartnerAlias).toBeDefined();
    expect(gartnerAlias!.match.reason).toBe("normalized-alias");

    const ss = searchContent(indexes, "heissen");
    expect(ss.some((h) => h.id === "verb:heissen")).toBe(true);
    const ssHit = ss.find((h) => h.id === "verb:heissen")!;
    expect(ssHit.displayLabel).toBe("hei\u00dfen");
    expect(ssHit.match.reason).toBe("normalized-alias");

    const canonical = searchContent(indexes, "hei\u00dfen").find(
      (h) => h.id === "verb:heissen",
    )!;
    expect(canonical.match.reason).toBe("exact");

    const a = searchContent(indexes, "sein").map((h) => h.id);
    const b = searchContent(indexes, "sein").map((h) => h.id);
    expect(a).toEqual(b);

    const hit = searchContent(indexes, "hei\u00dfen")[0]!;
    expect(hit.backContext).toEqual({
      entryContext: "search",
      query: "hei\u00dfen",
      includeReview: false,
      resultId: hit.id,
      resultKind: hit.kind,
    });

    const serialized = JSON.stringify(hit);
    expect(serialized).not.toMatch(/"value"\s*:/);
    expect(serialized.toLowerCase()).not.toContain("<html");
    expect(serialized).not.toContain("assert:verb-heissen-infinitive");

    for (const doc of indexes.searchDocuments) {
      const blob = JSON.stringify(doc);
      expect(blob).not.toMatch(/<\/?[a-z][^>]*>/i);
    }

    expect(searchContent(indexes, "")).toEqual([]);
    expect(searchContent(indexes, "   ")).toEqual([]);
    expect(searchContent(indexes, "zzzz-no-such-term-xyz")).toEqual([]);
  });

  it("hub filter primitives: lesson, learned/all-ready, priority, kind, relationship, mastery/due projections", () => {
    const lesson2 = filterIndexedEntities(indexes, "all-searchable", {
      lessonIds: ["lesson:02"],
      kinds: ["Lexeme"],
    });
    expect(lesson2).toContain("lex:ingenieur");
    expect(lesson2).not.toContain("lex:elektriker");
    expect(lesson2.every((id) => indexes.byId.get(id)!.lessonIds.includes("lesson:02"))).toBe(
      true,
    );

    const learnedOnly = filterIndexedEntities(indexes, ["lex:ingenieur", "lex:elektriker"], {
      learnedScope: "learned",
      audience: "review",
      projections: { learnedIds: new Set(["lex:ingenieur"]) },
    });
    expect(learnedOnly).toEqual(["lex:ingenieur"]);

    const allReady = filterIndexedEntities(indexes, ["lex:ingenieur", "lex:elektriker"], {
      learnedScope: "all-ready",
      audience: "review",
      projections: { readyIds: new Set(["lex:elektriker"]) },
    });
    expect(allReady).toEqual(["lex:elektriker"]);

    const allReadyMissing = filterIndexedEntities(
      indexes,
      ["lex:ingenieur", "lex:elektriker"],
      {
        learnedScope: "all-ready",
        audience: "review",
        projections: { learnedIds: new Set(["lex:ingenieur", "lex:elektriker"]) },
      },
    );
    expect(allReadyMissing).toEqual([]);

    const prio3 = filterIndexedEntities(indexes, "all-searchable", {
      priorities: [3],
      audience: "review",
      kinds: ["Lexeme"],
    });
    expect(prio3).toContain("lex:elektriker");
    expect(
      prio3.every(
        (id) => openAuthorIndexes(indexes).sourcePriorityById.get(id) === 3,
      ),
    ).toBe(true);

    const related = filterIndexedEntities(indexes, ["lex:ingenieur", "lex:ingenieurin"], {
      relationshipTypes: ["person-form-of"],
      relatedToId: "lex:ingenieur",
    });
    expect(related).toContain("lex:ingenieurin");

    const statusProj = new Map([
      ["lex:ingenieur", "strong"],
      ["verb:sein", "new"],
    ]);
    const strengthProj = new Map([
      ["lex:ingenieur", "weak"],
      ["verb:sein", "strong"],
    ]);
    const masteryStatus = filterIndexedEntities(indexes, ["lex:ingenieur", "verb:sein"], {
      masteryKey: "status",
      projections: {
        masteryProjections: new Map([
          ["status", statusProj],
          ["strength", strengthProj],
        ]),
        masteryAllowed: new Set(["strong"]),
      },
    });
    expect(masteryStatus).toEqual(["lex:ingenieur"]);

    const masteryStrength = filterIndexedEntities(indexes, ["lex:ingenieur", "verb:sein"], {
      masteryKey: "strength",
      projections: {
        masteryProjections: new Map([
          ["status", statusProj],
          ["strength", strengthProj],
        ]),
        masteryAllowed: new Set(["strong"]),
      },
    });
    expect(masteryStrength).toEqual(["verb:sein"]);

    const masteryMissingKey = filterIndexedEntities(indexes, ["lex:ingenieur", "verb:sein"], {
      masteryKey: "does-not-exist",
      projections: {
        masteryProjections: new Map([["status", statusProj]]),
        masteryAllowed: new Set(["strong"]),
      },
    });
    expect(masteryMissingKey).toEqual([]);

    const due = filterIndexedEntities(indexes, ["lex:ingenieur", "verb:sein"], {
      dueKey: true,
      projections: { dueIds: new Set(["verb:sein"]) },
    });
    expect(due).toEqual(["verb:sein"]);

    const tagged = filterIndexedEntities(indexes, ["lex:ingenieur", "lex:ingenieurin"], {
      tags: ["rel:person-form-of"],
    });
    expect(tagged).toContain("lex:ingenieurin");

    const learnerTagged = filterIndexedEntities(indexes, ["lex:ingenieur", "verb:sein"], {
      tags: ["runtime:focus"],
      projections: {
        learnerTagsById: new Map([["lex:ingenieur", ["runtime:focus"]]]),
      },
    });
    expect(learnerTagged).toEqual(["lex:ingenieur"]);
  });

  it("throws on duplicate IDs and unresolved index inputs even if validation is bypassed", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    clone.lexemes = [...clone.lexemes, { ...clone.lexemes[0]!, id: clone.lexemes[0]!.id }];
    expect(() => buildContentIndexes(clone)).toThrow(/Duplicate ID/);

    const brokenRel = structuredClone(bundle) as ContentBundle;
    brokenRel.relationships = [
      ...brokenRel.relationships,
      {
        kind: "Relationship",
        id: "rel:unresolved-c2a",
        type: "related-concept",
        fromId: "lex:ingenieur",
        toId: "lex:does-not-exist-c2a",
      },
    ];
    expect(() => buildContentIndexes(brokenRel)).toThrow(/Unresolved index input/);

    const brokenMember = structuredClone(bundle) as ContentBundle;
    const coll = brokenMember.collections.find(
      (c) => c.id === "collection:teacher-professions",
    )!;
    if (coll.membership.mode === "static") {
      coll.membership.memberIds = [
        ...coll.membership.memberIds,
        "lex:missing-member-c2a",
      ];
    }
    expect(() => buildContentIndexes(brokenMember)).toThrow(/Unresolved index input/);
  });

  it("search hit contract excludes assertion values and includes required fields", () => {
    const hit = searchContent(indexes, "hei\u00dfen")[0]!;
    expect(hit).toMatchObject({
      id: expect.any(String),
      kind: expect.any(String),
      displayLabel: expect.any(String),
      lessonIds: expect.any(Array),
      publicationStatus: "published",
      hubDestination: {
        hub: expect.any(String),
        path: expect.any(String),
      },
      backContext: {
        entryContext: "search",
      },
      score: expect.any(Number),
      match: {
        field: expect.any(String),
        reason: expect.any(String),
      },
    });
    expect(hit).not.toHaveProperty("value");
    expect(hit).not.toHaveProperty("sourceAssertionIds");
    expect(Object.keys(hit).sort()).toEqual(
      [
        "backContext",
        "displayLabel",
        "hubDestination",
        "id",
        "kind",
        "lessonIds",
        "match",
        "publicationStatus",
        "score",
        "sourcePriority",
      ].sort(),
    );
  });
});

describe("C2AR1 learner-safety and filter completion", () => {
  const { bundle, indexes } = loadRealIndexes();

  it("fail-closed helpers exclude teacher review content while exposing released workbook listening", () => {
    const allSearchable = filterIndexedEntities(indexes, "all-searchable", {});
    expect(allSearchable).not.toContain("lex:elektriker");
    expect(allSearchable).not.toContain("collection:teacher-professions");
    expect(allSearchable).not.toContain(
      "activity:lesson-02-teacher-professions-deck",
    );
    expect(
      allSearchable.every(
        (id) => indexes.byId.get(id)!.publicationStatus === "published",
      ),
    ).toBe(true);

    const lesson2 = entitiesForLesson(indexes, "lesson:02");
    expect(lesson2).toContain("lex:ingenieur");
    expect(lesson2).not.toContain("lex:elektriker");
    expect(lesson2).not.toContain("lex:gaertner");

    const lesson2Review = entitiesForLesson(indexes, "lesson:02", {
      audience: "review",
    });
    expect(lesson2Review).toContain("lex:elektriker");

    const teacherMembers = membersOfCollection(
      indexes,
      "collection:teacher-professions",
    );
    expect(teacherMembers).toContain("lex:ingenieur");
    expect(teacherMembers).not.toContain("lex:elektriker");

    const teacherMembersReview = membersOfCollection(
      indexes,
      "collection:teacher-professions",
      { audience: "review" },
    );
    expect(teacherMembersReview).toContain("lex:elektriker");

    // ADR-015/016 released the Lessons 1–2 workbook listening set, so it is
    // learner content the public barrel must now return. Fail-closed behaviour
    // is still proven by the teacher lexeme, collection and deck above.
    const listeningId = bundle.listeningAssets[0]?.id;
    expect(listeningId).toBeDefined();
    expect(indexes.byId.get(listeningId!)?.publicationStatus).toBe("published");
    const learnerListening = filterIndexedEntities(indexes, "all-searchable", {
      kinds: ["ListeningAsset"],
    });
    expect(learnerListening).toHaveLength(15);
    expect(learnerListening).toContain(listeningId);
    expect(
      filterIndexedEntities(indexes, "all-searchable", {
        kinds: ["ListeningAsset"],
        audience: "review",
      }),
    ).toEqual(learnerListening);

    expect(indexes.reviewableConceptIds.has("lex:elektriker")).toBe(false);
    expect(
      reviewableConceptsForAudience(indexes).has("lex:elektriker"),
    ).toBe(false);
    expect(
      reviewableConceptsForAudience(indexes, { audience: "review" }).has(
        "lex:elektriker",
      ),
    ).toBe(true);
  });

  it("blocked entities never appear in learner or review helpers (synthetic)", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    const lex = clone.lexemes.find((l) => l.id === "lex:ingenieur")!;
    lex.publication.status = "blocked";
    const blockedIndexes = buildContentIndexes(clone);

    expect(
      searchContent(blockedIndexes, "Ingenieur").some((h) => h.id === "lex:ingenieur"),
    ).toBe(false);
    expect(
      searchContent(blockedIndexes, "Ingenieur", { audience: "review" }).some(
        (h) => h.id === "lex:ingenieur",
      ),
    ).toBe(false);
    expect(
      filterIndexedEntities(blockedIndexes, "all-searchable", {}).includes(
        "lex:ingenieur",
      ),
    ).toBe(false);
    expect(
      filterIndexedEntities(blockedIndexes, "all-searchable", {
        audience: "review",
      }).includes("lex:ingenieur"),
    ).toBe(false);
    expect(
      entitiesForLesson(blockedIndexes, "lesson:02").includes("lex:ingenieur"),
    ).toBe(false);
    expect(
      entitiesForLesson(blockedIndexes, "lesson:02", { audience: "review" }).includes(
        "lex:ingenieur",
      ),
    ).toBe(false);
    expect(
      membersOfCollection(blockedIndexes, "collection:teacher-professions").includes(
        "lex:ingenieur",
      ),
    ).toBe(false);
    expect(
      membersOfCollection(blockedIndexes, "collection:teacher-professions", {
        audience: "review",
      }).includes("lex:ingenieur"),
    ).toBe(false);
    expect(blockedIndexes.reviewableConceptIds.has("lex:ingenieur")).toBe(false);
    expect(
      openAuthorIndexes(blockedIndexes).authorReviewableConceptIds.has(
        "lex:ingenieur",
      ),
    ).toBe(false);
  });

  it("exported indexes are mutation-resistant at runtime", () => {
    const byIdAny = indexes.byId as unknown as {
      set?: unknown;
      delete?: unknown;
      clear?: unknown;
      size: number;
    };
    expect(typeof byIdAny.set).toBe("undefined");
    expect(typeof byIdAny.delete).toBe("undefined");
    expect(typeof byIdAny.clear).toBe("undefined");
    const sizeBefore = indexes.byId.size;
    expect(() => {
      (indexes.byId as unknown as { set: (k: string, v: unknown) => void }).set(
        "lex:mut",
        {},
      );
    }).toThrow();
    expect(indexes.byId.size).toBe(sizeBefore);
    expect(indexes.byId.has("lex:mut")).toBe(false);

    const reviewableAny = indexes.reviewableConceptIds as unknown as {
      add?: unknown;
      delete?: unknown;
      clear?: unknown;
      size: number;
    };
    expect(typeof reviewableAny.add).toBe("undefined");
    expect(typeof reviewableAny.delete).toBe("undefined");
    expect(typeof reviewableAny.clear).toBe("undefined");
    const setSize = indexes.reviewableConceptIds.size;
    expect(() => {
      (indexes.reviewableConceptIds as unknown as { add: (v: string) => void }).add(
        "lex:mut",
      );
    }).toThrow();
    expect(indexes.reviewableConceptIds.size).toBe(setSize);

    const members = openAuthorIndexes(indexes).collectionMembers.get(
      "collection:teacher-professions",
    )!;
    const memberCount = members.length;
    expect(() => {
      (members as unknown as string[]).push("lex:mut");
    }).toThrow();
    expect(members.length).toBe(memberCount);
  });

  it("rejects contradictory static membership vs member-of-collection edges", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    const coll = clone.collections.find(
      (c) => c.id === "collection:teacher-professions",
    )!;
    if (coll.membership.mode === "static") {
      coll.membership.memberIds = coll.membership.memberIds.filter(
        (id) => id !== "lex:elektriker",
      );
    }
    expect(() => buildContentIndexes(clone)).toThrow(
      /INDEX_CONTRADICTORY_MEMBERSHIP/,
    );
  });

  it("rejects contradictory activity lesson ownership across stages", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    const lesson01 = clone.lessons.find((l) => l.id === "lesson:01")!;
    const stage = lesson01.stages[0]!;
    stage.activityIds = [
      ...stage.activityIds,
      "activity:lesson-02-teacher-professions-deck",
    ];
    expect(() => buildContentIndexes(clone)).toThrow(
      /INDEX_CONTRADICTORY_ACTIVITY_OWNERSHIP/,
    );
  });

  it("materializes dynamic collections for type/lessonId/tags; rejects unsupported queries", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    clone.collections.push({
      kind: "Collection",
      id: "collection:c2ar1-dynamic-verbs",
      titleEn: "Dynamic verbs L1",
      membership: {
        mode: "dynamic",
        query: { type: "Verb", lessonId: "lesson:01" },
      },
      lessonLinks: [{ lessonId: "lesson:01", sourcePriority: 1, required: false }],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    const dyn = buildContentIndexes(clone);
    const members = openAuthorIndexes(dyn).collectionMembers.get(
      "collection:c2ar1-dynamic-verbs",
    )!;
    expect(members).toContain("verb:heissen");
    expect(members).toContain("verb:sein");
    expect(
      members.every(
        (id: string) => openAuthorIndexes(dyn).byId.get(id)!.kind === "Verb",
      ),
    ).toBe(true);
    expect(
      members.every((id: string) =>
        openAuthorIndexes(dyn).byId.get(id)!.lessonIds.includes("lesson:01"),
      ),
    ).toBe(true);

    const emptyQuery = structuredClone(bundle) as ContentBundle;
    emptyQuery.collections.push({
      kind: "Collection",
      id: "collection:c2ar1-empty-query",
      titleEn: "Bad dynamic",
      membership: { mode: "dynamic", query: {} },
      lessonLinks: [],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    expect(() => buildContentIndexes(emptyQuery)).toThrow(
      /INDEX_DYNAMIC_COLLECTION_UNSUPPORTED/,
    );

    const badType = structuredClone(bundle) as ContentBundle;
    badType.collections.push({
      kind: "Collection",
      id: "collection:c2ar1-bad-type",
      titleEn: "Bad type",
      membership: { mode: "dynamic", query: { type: "NotAKind" } },
      lessonLinks: [],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    expect(() => buildContentIndexes(badType)).toThrow(
      /INDEX_DYNAMIC_COLLECTION_UNSUPPORTED/,
    );
  });

  it("unknown candidate IDs throw; plainTextFromStructured rejects malformed raw strings", () => {
    expect(() =>
      filterIndexedEntities(indexes, ["lex:ingenieur", "lex:does-not-exist"]),
    ).toThrow(/INDEX_UNKNOWN_CANDIDATE/);

    expect(() => plainTextFromStructured("<b>heißen</b>")).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(() => plainTextFromStructured("assert:verb-heissen-infinitive")).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(() => plainTextFromStructured('{"value":"leak"}')).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(() => plainTextFromStructured("plain bypass")).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(
      plainTextFromStructured({ tokens: [{ type: "text", text: "heißen" }] }),
    ).toBe("heißen");
  });
});

describe("C2AR2 opaque boundary and dynamic query correctness", () => {
  const { bundle, indexes } = loadRealIndexes();

  it("public barrel cannot retrieve review/draft/blocked without explicit author/review scope", () => {
    expect(indexes.byId.get("lex:elektriker")).toBeUndefined();
    expect(getEntityRecord(indexes, "lex:elektriker")).toBeUndefined();
    expect(getIndexedEntity(indexes, "lex:elektriker")).toBeUndefined();
    expect(
      indexes.collectionMembers.get("collection:teacher-professions"),
    ).toBeUndefined();
    expect(
      indexes.searchDocuments.some((d) => d.id === "lex:elektriker"),
    ).toBe(false);
    expect(
      indexes.lessonMembership.get("lesson:02")?.includes("lex:elektriker"),
    ).toBe(false);

    expect(
      indexes.byId.get("activity:lesson-02-teacher-professions-deck"),
    ).toBeUndefined();
    expect(
      getEntityRecord(indexes, "activity:lesson-02-teacher-professions-deck"),
    ).toBeUndefined();

    // Released by ADR-015/016 — the public barrel is expected to hand this back.
    const listeningId = bundle.listeningAssets[0]?.id;
    expect(listeningId).toBeDefined();
    expect(indexes.byId.get(listeningId!)?.publicationStatus).toBe("published");
    expect(getEntityRecord(indexes, listeningId!)?.publicationStatus).toBe(
      "published",
    );

    const author = openAuthorIndexes(indexes);
    expect(author.byId.get("lex:elektriker")?.publicationStatus).toBe("review");
    expect(
      getEntityRecord(indexes, "lex:elektriker", { audience: "review" })
        ?.publicationStatus,
    ).toBe("review");
    expect(
      getIndexedEntity(indexes, "lex:elektriker", { audience: "review" })
        ?.publicationStatus,
    ).toBe("review");
    expect(
      author.collectionMembers.get("collection:teacher-professions"),
    ).toContain("lex:elektriker");
    expect(author.byId.get(listeningId!)).toBeDefined();

    const clone = structuredClone(bundle) as ContentBundle;
    const lex = clone.lexemes.find((l) => l.id === "lex:ingenieur")!;
    lex.publication.status = "blocked";
    const blockedIndexes = buildContentIndexes(clone);
    expect(getEntityRecord(blockedIndexes, "lex:ingenieur")).toBeUndefined();
    expect(
      getEntityRecord(blockedIndexes, "lex:ingenieur", { audience: "review" }),
    ).toBeUndefined();
    expect(
      openAuthorIndexes(blockedIndexes).byId.get("lex:ingenieur"),
    ).toBeUndefined();
  });

  it("explicit audience learner is never widened by includeReview true (Elektriker)", () => {
    expect(() =>
      searchContent(indexes, "Elektriker", {
        audience: "learner",
        includeReview: true,
      }),
    ).toThrow(/INDEX_AUDIENCE_CONFLICT/);
    expect(
      searchContent(indexes, "Elektriker", { audience: "learner" }).some(
        (h) => h.id === "lex:elektriker",
      ),
    ).toBe(false);
  });

  it("dynamic lesson query matches finalized Lesson 2 lexemes; negatives for lesson:99 and lex:ingenieur", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    clone.collections.push({
      kind: "Collection",
      id: "collection:c2ar2-lesson2-lexemes",
      titleEn: "Lesson 2 lexemes dynamic",
      membership: {
        mode: "dynamic",
        query: { type: "Lexeme", lessonId: "lesson:02" },
      },
      lessonLinks: [{ lessonId: "lesson:02", sourcePriority: 1, required: false }],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    const dyn = buildContentIndexes(clone);
    const author = openAuthorIndexes(dyn);
    const members = author.collectionMembers.get(
      "collection:c2ar2-lesson2-lexemes",
    )!;
    const lesson2Lexemes = [...author.byId.values()]
      .filter(
        (r) => r.kind === "Lexeme" && r.lessonIds.includes("lesson:02"),
      )
      .map((r) => r.id)
      .sort((a, b) => a.localeCompare(b));
    expect([...members].sort((a, b) => a.localeCompare(b))).toEqual(
      lesson2Lexemes,
    );
    expect(members.length).toBe(lesson2Lexemes.length);
    expect(members).toContain("lex:ingenieur");
    expect(members).not.toContain("lex:does-not-exist");

    const unresolved = structuredClone(bundle) as ContentBundle;
    unresolved.collections.push({
      kind: "Collection",
      id: "collection:c2ar2-lesson99",
      titleEn: "Bad lesson",
      membership: {
        mode: "dynamic",
        query: { type: "Lexeme", lessonId: "lesson:99" },
      },
      lessonLinks: [],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    expect(() => buildContentIndexes(unresolved)).toThrow(
      /INDEX_DYNAMIC_LESSON_UNRESOLVED/,
    );

    const wrongKind = structuredClone(bundle) as ContentBundle;
    wrongKind.collections.push({
      kind: "Collection",
      id: "collection:c2ar2-wrong-kind-lesson",
      titleEn: "Wrong kind lessonId",
      membership: {
        mode: "dynamic",
        query: { type: "Lexeme", lessonId: "lex:ingenieur" as never },
      },
      lessonLinks: [],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    expect(() => buildContentIndexes(wrongKind)).toThrow(
      /INDEX_DYNAMIC_LESSON_WRONG_KIND/,
    );

    const lesson1Only = structuredClone(bundle) as ContentBundle;
    lesson1Only.collections.push({
      kind: "Collection",
      id: "collection:c2ar2-lesson1-lexemes",
      titleEn: "Lesson 1 lexemes",
      membership: {
        mode: "dynamic",
        query: { type: "Lexeme", lessonId: "lesson:01" },
      },
      lessonLinks: [],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    const l1 = buildContentIndexes(lesson1Only);
    const l1Members = openAuthorIndexes(l1).collectionMembers.get(
      "collection:c2ar2-lesson1-lexemes",
    )!;
    expect(l1Members).not.toContain("lex:ingenieur");
  });

  it("rejects unknown dynamic query keys and plain-string search/label adversaries", () => {
    const extraKey = structuredClone(bundle) as ContentBundle;
    extraKey.collections.push({
      kind: "Collection",
      id: "collection:c2ar2-extra-key",
      titleEn: "Extra key",
      membership: {
        mode: "dynamic",
        query: { type: "Verb", priority: 1 } as {
          type?: string;
          lessonId?: never;
          tags?: string[];
        },
      },
      lessonLinks: [],
      sourcePriority: 1,
      relationIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    expect(() => buildContentIndexes(extraKey)).toThrow(
      /INDEX_DYNAMIC_COLLECTION_UNSUPPORTED/,
    );

    expect(() => assertIndexPlaintext("<b>Ingenieur</b>", "lemma")).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(() =>
      assertIndexPlaintext("assert:verb-heissen-infinitive", "intent"),
    ).toThrow(/INDEX_PLAINTEXT_REJECTED/);
    expect(() => assertIndexPlaintext('{"value":"x"}', "title")).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(() => assertIndexPlaintext("<script>x</script>", "gloss")).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
    expect(() => assertIndexPlaintext("KB 2.1", "exerciseRef")).not.toThrow();

    const badLemma = structuredClone(bundle) as ContentBundle;
    const lex = badLemma.lexemes.find((l) => l.id === "lex:ingenieur")!;
    lex.lemma = "<b>Ingenieur</b>";
    expect(() => buildContentIndexes(badLemma)).toThrow(
      /INDEX_PLAINTEXT_REJECTED/,
    );
  });

  it("membership filtering rejects unknown/stale IDs for lesson and collection", () => {
    expect(() =>
      filterMembershipIds(indexes, ["lex:ingenieur", "lex:stale-missing"], {}, "lesson:02"),
    ).toThrow(/INDEX_MEMBERSHIP_INTEGRITY/);
    expect(() =>
      filterMembershipIds(
        indexes,
        ["lex:ingenieur", "lex:ghost"],
        { audience: "review" },
        "collection:teacher-professions",
      ),
    ).toThrow(/INDEX_MEMBERSHIP_INTEGRITY/);
    expect(
      filterMembershipIds(indexes, ["lex:ingenieur"], {}, "lesson:02"),
    ).toEqual(["lex:ingenieur"]);
  });
});

describe("C2AR3 complete learner-safe projection", () => {
  const { bundle, indexes } = loadRealIndexes();
  const author = openAuthorIndexes(indexes);
  // Workbook listening ids are deliberately absent: ADR-015/016 released them,
  // so they are learner content and must appear in the learner projection.
  const FORBIDDEN_LEARNER_IDS = [
    "lex:elektriker",
    "lex:gaertner",
    "collection:teacher-professions",
    "activity:lesson-02-teacher-professions-deck",
  ] as const;

  function collectStrings(value: unknown, out: string[]): void {
    if (typeof value === "string") {
      out.push(value);
      return;
    }
    if (value == null || typeof value !== "object") return;
    if (value instanceof Map) {
      for (const [k, v] of value.entries()) {
        collectStrings(k, out);
        collectStrings(v, out);
      }
      return;
    }
    if (value instanceof Set) {
      for (const v of value.values()) collectStrings(v, out);
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) collectStrings(v, out);
      return;
    }
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }

  it("relationship filters use audience-projected graphs (teacher collection + blocked)", () => {
    const learnerTeacher = filterIndexedEntities(
      indexes,
      ["lex:ingenieur", "lex:elektriker"],
      {
        relationshipTypes: ["member-of-collection"],
        relatedToId: "collection:teacher-professions",
      },
    );
    expect(learnerTeacher).toEqual([]);

    const reviewTeacher = filterIndexedEntities(
      indexes,
      ["lex:ingenieur", "lex:elektriker"],
      {
        audience: "review",
        relationshipTypes: ["member-of-collection"],
        relatedToId: "collection:teacher-professions",
      },
    );
    expect(reviewTeacher).toEqual(["lex:elektriker", "lex:ingenieur"]);

    expect(
      (indexes.relationships.byType.get("member-of-collection") ?? []).some(
        (e) => e.toId === "collection:teacher-professions",
      ),
    ).toBe(false);
    expect(
      (author.relationships.byType.get("member-of-collection") ?? []).some(
        (e) => e.toId === "collection:teacher-professions",
      ),
    ).toBe(true);

    const clone = structuredClone(bundle) as ContentBundle;
    const lex = clone.lexemes.find((l) => l.id === "lex:ingenieur")!;
    lex.publication.status = "blocked";
    const blockedIndexes = buildContentIndexes(clone);
    const blockedAuthor = openAuthorIndexes(blockedIndexes);

    expect(
      (blockedIndexes.relationships.outgoing.get("lex:ingenieurin") ?? []).some(
        (e) => e.type === "person-form-of" && e.toId === "lex:ingenieur",
      ),
    ).toBe(false);
    expect(
      (blockedAuthor.relationships.outgoing.get("lex:ingenieurin") ?? []).some(
        (e) => e.type === "person-form-of" && e.toId === "lex:ingenieur",
      ),
    ).toBe(false);
    expect(
      filterIndexedEntities(blockedIndexes, ["lex:ingenieurin"], {
        relationshipTypes: ["person-form-of"],
        relatedToId: "lex:ingenieur",
      }),
    ).toEqual([]);
    expect(
      filterIndexedEntities(blockedIndexes, ["lex:ingenieurin"], {
        audience: "review",
        relationshipTypes: ["person-form-of"],
        relatedToId: "lex:ingenieur",
      }),
    ).toEqual([]);
  });

  it("recursive walk of public learner projection excludes review and synthetic blocked IDs", () => {
    const found: string[] = [];
    collectStrings(indexes, found);
    for (const id of FORBIDDEN_LEARNER_IDS) {
      expect(found).not.toContain(id);
    }
    expect(found).not.toContain("blocked");
    expect(indexes).not.toHaveProperty("authorReviewableConceptIds");

    const clone = structuredClone(bundle) as ContentBundle;
    const blockedId = "lex:synthetic-blocked-c2ar3";
    clone.lexemes.push({
      ...clone.lexemes.find((l) => l.id === "lex:ingenieur")!,
      id: blockedId,
      lemma: "BlockedSynth",
      publication: { status: "blocked", publishedFields: [] },
    });
    clone.relationships.push({
      kind: "Relationship",
      id: "rel:c2ar3-blocked-intro",
      type: "introduced-in",
      fromId: blockedId,
      toId: "lesson:02",
    });
    const blockedIndexes = buildContentIndexes(clone);
    const blockedFound: string[] = [];
    collectStrings(blockedIndexes, blockedFound);
    expect(blockedFound).not.toContain(blockedId);
    expect(blockedFound).not.toContain("lex:elektriker");
    expect(blockedFound).not.toContain("collection:teacher-professions");
    expect(
      openAuthorIndexes(blockedIndexes).byId.has(blockedId),
    ).toBe(false);
  });
});

describe("C2AR4 nested link, lesson, and tag projection", () => {
  const { bundle, indexes } = loadRealIndexes();
  const author = openAuthorIndexes(indexes);

  function collectStrings(value: unknown, out: string[]): void {
    if (typeof value === "string") {
      out.push(value);
      return;
    }
    if (value == null || typeof value !== "object") return;
    if (value instanceof Map) {
      for (const [k, v] of value.entries()) {
        collectStrings(k, out);
        collectStrings(v, out);
      }
      return;
    }
    if (value instanceof Set) {
      for (const v of value.values()) collectStrings(v, out);
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) collectStrings(v, out);
      return;
    }
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }

  it("getEntityRecord/getIndexedEntity match projected byId for published lex:ingenieur and lesson:02", () => {
    const byIdLex = indexes.byId.get("lex:ingenieur")!;
    const helperLex = getEntityRecord(indexes, "lex:ingenieur")!;
    const indexedLex = getIndexedEntity(indexes, "lex:ingenieur")!;
    expect(helperLex).toEqual(byIdLex);
    expect(indexedLex).toEqual(byIdLex);
    expect(helperLex.collectionIds).not.toContain("collection:teacher-professions");
    expect(helperLex.lessonIds).toContain("lesson:02");
    expect(helperLex.tags).toContain("rel:person-form-of");
    expect(helperLex.tags).toContain("rel:introduced-in");
    expect(helperLex.tags).not.toContain("rel:member-of-collection");

    const byIdLesson = indexes.byId.get("lesson:02")!;
    expect(getEntityRecord(indexes, "lesson:02")).toEqual(byIdLesson);
    expect(getIndexedEntity(indexes, "lesson:02")).toEqual(byIdLesson);

    const reviewLex = getEntityRecord(indexes, "lex:ingenieur", {
      audience: "review",
    })!;
    expect(reviewLex).toEqual(author.byId.get("lex:ingenieur"));
    expect(reviewLex.collectionIds).toContain("collection:teacher-professions");
    expect(reviewLex.tags).toContain("rel:member-of-collection");

    const clone = structuredClone(bundle) as ContentBundle;
    const blockedMediaId = "media:synthetic-blocked-c2ar4";
    clone.mediaAssets.push({
      ...clone.mediaAssets[0]!,
      id: blockedMediaId,
      publication: { status: "blocked", publishedFields: [] },
    });
    const lex = clone.lexemes.find((l) => l.id === "lex:ingenieur")!;
    lex.mediaIds = [...lex.mediaIds, blockedMediaId];
    const blockedIndexes = buildContentIndexes(clone);
    const projected = getEntityRecord(blockedIndexes, "lex:ingenieur")!;
    expect(projected.mediaIds).not.toContain(blockedMediaId);
    expect(blockedIndexes.byId.get("lex:ingenieur")!.mediaIds).not.toContain(
      blockedMediaId,
    );
    expect(
      getEntityRecord(blockedIndexes, "lex:ingenieur", { audience: "review" })!
        .mediaIds,
    ).not.toContain(blockedMediaId);

    const helperFound: string[] = [];
    collectStrings(projected, helperFound);
    expect(helperFound).not.toContain(blockedMediaId);
  });

  it("blocked lesson:02 identity is absent from every named learner and author surface", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    const lesson = clone.lessons.find((l) => l.id === "lesson:02")!;
    lesson.publication.status = "blocked";
    const blockedIndexes = buildContentIndexes(clone);
    const blockedAuthor = openAuthorIndexes(blockedIndexes);
    const lid = "lesson:02";

    for (const surface of [blockedIndexes, blockedAuthor] as const) {
      expect(surface.byId.has(lid)).toBe(false);
      expect(surface.lessonMembership.has(lid)).toBe(false);
      expect(surface.activitiesByLesson.has(lid)).toBe(false);
      expect(surface.counts.lessonMembershipCounts).not.toHaveProperty(lid);
      for (const lessons of surface.entityLessons.values()) {
        expect(lessons).not.toContain(lid);
      }
      for (const rec of surface.byId.values()) {
        expect(rec.lessonIds).not.toContain(lid);
      }
      for (const doc of surface.searchDocuments) {
        expect(doc.lessonIds).not.toContain(lid);
      }
    }

    expect(entitiesForLesson(blockedIndexes, lid)).toEqual([]);
    expect(
      entitiesForLesson(blockedIndexes, lid, { audience: "review" }),
    ).toEqual([]);
    expect(
      filterIndexedEntities(blockedIndexes, ["lex:ingenieur"], {
        lessonIds: [lid],
      }),
    ).toEqual([]);
    expect(
      filterIndexedEntities(blockedIndexes, ["lex:ingenieur"], {
        audience: "review",
        lessonIds: [lid],
      }),
    ).toEqual([]);

    const hit = searchContent(blockedIndexes, "Ingenieur").find(
      (h) => h.id === "lex:ingenieur",
    );
    expect(hit).toBeDefined();
    expect(hit!.lessonIds).not.toContain(lid);
    const reviewHit = searchContent(blockedIndexes, "Ingenieur", {
      audience: "review",
    }).find((h) => h.id === "lex:ingenieur");
    expect(reviewHit!.lessonIds).not.toContain(lid);

    const helperRec = getEntityRecord(blockedIndexes, "lex:ingenieur")!;
    expect(helperRec.lessonIds).not.toContain(lid);
    expect(
      getEntityRecord(blockedIndexes, "lex:ingenieur", { audience: "review" })!
        .lessonIds,
    ).not.toContain(lid);
  });

  it("relationship tags come from audience-projected graph (teacher collection + blocked edge)", () => {
    expect(indexes.tagsByEntityId.get("lex:ingenieur")).not.toContain(
      "rel:member-of-collection",
    );
    expect(indexes.byId.get("lex:ingenieur")!.tags).not.toContain(
      "rel:member-of-collection",
    );
    expect(
      filterIndexedEntities(indexes, ["lex:ingenieur"], {
        tags: ["rel:member-of-collection"],
      }),
    ).toEqual([]);
    expect(
      filterIndexedEntities(indexes, ["lex:ingenieur"], {
        audience: "review",
        tags: ["rel:member-of-collection"],
      }),
    ).toEqual(["lex:ingenieur"]);
    expect(author.byId.get("lex:ingenieur")!.tags).toContain(
      "rel:member-of-collection",
    );

    // Non-relationship grammar tags survive even when all relationship edges are stripped.
    const cloneGrammar = structuredClone(bundle) as ContentBundle;
    cloneGrammar.grammarConcepts.push({
      kind: "GrammarConcept",
      id: "gram:c2ar4-common-error",
      titleDe: "Testfehler",
      titleEn: "Test error",
      prerequisiteIds: [],
      noticeTarget: { tokens: [{ type: "plain", text: "notice" }] },
      ruleSteps: [],
      commonErrorTags: ["case-confusion", "article-gender"],
      exampleIds: [],
      activityTemplateIds: [],
      relationIds: [],
      mediaIds: [],
      sourceAssertionIds: [],
      publication: { status: "published", publishedFields: [] },
    });
    const grammarIndexes = buildContentIndexes(cloneGrammar);
    expect(grammarIndexes.byId.get("gram:c2ar4-common-error")!.tags).toEqual(
      ["article-gender", "case-confusion"],
    );

    const clone = structuredClone(bundle) as ContentBundle;
    const blockedLexId = "lex:c2ar4-blocked-tag-endpoint";
    clone.lexemes.push({
      ...clone.lexemes.find((l) => l.id === "lex:ingenieur")!,
      id: blockedLexId,
      lemma: "BlockedTagEndpoint",
      publication: { status: "blocked", publishedFields: [] },
    });
    // Keep only a blocked-endpoint person-form-of edge for ingenieurin.
    clone.relationships = clone.relationships.filter(
      (r) =>
        !(
          r.type === "person-form-of" &&
          (r.fromId === "lex:ingenieurin" || r.toId === "lex:ingenieurin")
        ),
    );
    clone.relationships.push({
      kind: "Relationship",
      id: "rel:c2ar4-blocked-person-form",
      type: "person-form-of",
      fromId: "lex:ingenieurin",
      toId: blockedLexId,
    });
    const onlyBlocked = buildContentIndexes(clone);
    expect(onlyBlocked.byId.get("lex:ingenieurin")!.tags).not.toContain(
      "rel:person-form-of",
    );
    expect(
      filterIndexedEntities(onlyBlocked, ["lex:ingenieurin"], {
        tags: ["rel:person-form-of"],
      }),
    ).toEqual([]);
    expect(
      filterIndexedEntities(onlyBlocked, ["lex:ingenieurin"], {
        audience: "review",
        tags: ["rel:person-form-of"],
      }),
    ).toEqual([]);
  });

  it("recursive leak scan covers helper records and search hits for review and blocked IDs", () => {
    const FORBIDDEN_LEARNER = [
      "lex:elektriker",
      "collection:teacher-professions",
      "activity:lesson-02-teacher-professions-deck",
    ] as const;

    const learnerHelpers = [
      getEntityRecord(indexes, "lex:ingenieur"),
      getIndexedEntity(indexes, "lex:ingenieur"),
      getEntityRecord(indexes, "lesson:02"),
      ...searchContent(indexes, "Ingenieur"),
      ...searchContent(indexes, "heißen"),
    ];
    for (const value of learnerHelpers) {
      const found: string[] = [];
      collectStrings(value, found);
      for (const id of FORBIDDEN_LEARNER) {
        expect(found).not.toContain(id);
      }
    }

    const clone = structuredClone(bundle) as ContentBundle;
    const blockedId = "lex:synthetic-blocked-c2ar4-leak";
    clone.lexemes.push({
      ...clone.lexemes.find((l) => l.id === "lex:ingenieur")!,
      id: blockedId,
      lemma: "BlockedLeak",
      publication: { status: "blocked", publishedFields: [] },
    });
    clone.relationships.push({
      kind: "Relationship",
      id: "rel:c2ar4-leak-intro",
      type: "introduced-in",
      fromId: blockedId,
      toId: "lesson:02",
    });
    const blockedIndexes = buildContentIndexes(clone);
    const learnerSurfaces = [
      blockedIndexes,
      getEntityRecord(blockedIndexes, "lex:ingenieur"),
      getIndexedEntity(blockedIndexes, "lex:ingenieur"),
      ...searchContent(blockedIndexes, "Ingenieur"),
    ];
    for (const value of learnerSurfaces) {
      const found: string[] = [];
      collectStrings(value, found);
      expect(found).not.toContain(blockedId);
      expect(found).not.toContain("lex:elektriker");
      expect(found).not.toContain("collection:teacher-professions");
    }
    const reviewSurfaces = [
      getEntityRecord(blockedIndexes, "lex:ingenieur", { audience: "review" }),
      getIndexedEntity(blockedIndexes, "lex:ingenieur", { audience: "review" }),
      ...searchContent(blockedIndexes, "Ingenieur", { audience: "review" }),
    ];
    for (const value of reviewSurfaces) {
      const found: string[] = [];
      collectStrings(value, found);
      expect(found).not.toContain(blockedId);
    }
  });

  it("relationship edge lessonId is nulled when Lesson is blocked (learner and author)", () => {
    const clone = structuredClone(bundle) as ContentBundle;
    const edgeId = "rel:c2ar5-related-with-lesson-meta";
    clone.relationships.push({
      kind: "Relationship",
      id: edgeId,
      type: "related-concept",
      fromId: "lex:ingenieur",
      toId: "lex:arzt",
      lessonId: "lesson:02",
    });

    const visibleIndexes = buildContentIndexes(clone);
    const visibleEdge = [
      ...(visibleIndexes.relationships.outgoing.get("lex:ingenieur") ?? []),
    ].find((e) => e.id === edgeId);
    expect(visibleEdge).toBeDefined();
    expect(visibleEdge!.lessonId).toBe("lesson:02");
    expect(
      openAuthorIndexes(visibleIndexes)
        .relationships.outgoing.get("lex:ingenieur")
        ?.find((e) => e.id === edgeId)?.lessonId,
    ).toBe("lesson:02");

    const lesson = clone.lessons.find((l) => l.id === "lesson:02")!;
    lesson.publication.status = "blocked";
    const blockedIndexes = buildContentIndexes(clone);
    const blockedAuthor = openAuthorIndexes(blockedIndexes);
    const lid = "lesson:02";

    for (const surface of [blockedIndexes, blockedAuthor] as const) {
      const edge = [
        ...(surface.relationships.outgoing.get("lex:ingenieur") ?? []),
      ].find((e) => e.id === edgeId);
      expect(edge).toBeDefined();
      expect(edge!.fromId).toBe("lex:ingenieur");
      expect(edge!.toId).toBe("lex:arzt");
      expect(edge!.lessonId).toBeNull();

      for (const edges of surface.relationships.byType.values()) {
        for (const e of edges) {
          expect(e.lessonId).not.toBe(lid);
        }
      }
      for (const edges of surface.relationships.outgoing.values()) {
        for (const e of edges) {
          expect(e.lessonId).not.toBe(lid);
        }
      }
      for (const edges of surface.relationships.incoming.values()) {
        for (const e of edges) {
          expect(e.lessonId).not.toBe(lid);
        }
      }

      const found: string[] = [];
      collectStrings(surface.relationships, found);
      expect(found).not.toContain(lid);
    }
  });

  it("rejects unresolved or wrong-kind relationship lessonId in the index builder", () => {
    const unresolved = structuredClone(bundle) as ContentBundle;
    unresolved.relationships.push({
      kind: "Relationship",
      id: "rel:c2ar5-unresolved-lesson",
      type: "related-concept",
      fromId: "lex:ingenieur",
      toId: "lex:arzt",
      lessonId: "lesson:99",
    });
    expect(() => buildContentIndexes(unresolved)).toThrow(
      /INDEX_RELATIONSHIP_LESSON_UNRESOLVED/,
    );

    const wrongKind = structuredClone(bundle) as ContentBundle;
    wrongKind.relationships.push({
      kind: "Relationship",
      id: "rel:c2ar5-wrong-kind-lesson",
      type: "related-concept",
      fromId: "lex:ingenieur",
      toId: "lex:arzt",
      lessonId: "lex:ingenieur",
    });
    expect(() => buildContentIndexes(wrongKind)).toThrow(
      /INDEX_RELATIONSHIP_LESSON_WRONG_KIND/,
    );
  });
});

describe("C2A indexes also build on positive publication fixture", () => {
  it("builds indexes from fixture package without throw", () => {
    const result = loadAndValidatePublication({
      publishedDir: POSITIVE_FIXTURE_DIR,
      allowMissingAuthorityForTests: true,
    });
    expect(result.ok).toBe(true);
    const indexes = buildContentIndexes(result.bundle!);
    const author = openAuthorIndexes(indexes);
    expect(author.counts.activityCount).toBe(
      result.bundle!.learningActivities.length,
    );
    expect(indexes.counts.activityCount).toBe(
      [...indexes.byId.values()].filter((r) => r.kind === "LearningActivity")
        .length,
    );
    expect(author.byId.size).toBeGreaterThan(0);
  });
});

describe("C2A normalize helpers", () => {
  it("does not corrupt displayed text when producing match keys", () => {
    const original = "hei\u00dfen";
    const keys = germanMatchKeys(original);
    expect(original).toBe("hei\u00dfen");
    expect(keys).toContain("hei\u00dfen");
    expect(keys).toContain("heissen");
    const raw = readFileSync(join(REAL_PUBLISHED_DIR, "lesson-01.json"), "utf8");
    expect(raw).toContain("hei\u00dfen");
  });
});
