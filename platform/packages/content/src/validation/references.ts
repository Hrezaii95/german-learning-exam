import { kindForId, parseIdPrefix } from "../ids/index.js";
import type { EntityKind } from "../ids/index.js";
import type { ContentBundle } from "../types/bundle.js";
import {
  RELATIONSHIP_ENDPOINTS,
  RELATIONSHIP_TYPES,
  type RelationshipType,
} from "../types/relationship.js";
import { issue, type ValidationIssue } from "./errors.js";

const CONCEPT_KINDS = [
  "Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair",
  "Dialogue", "ListeningAsset", "Collection",
] as const;

function asObject(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function idOf(value: Record<string, unknown> | null | undefined): string | undefined {
  return typeof value?.id === "string" ? value.id : undefined;
}

export function collectObjectIndex(bundle: ContentBundle): Map<string, EntityKind | string> {
  const index = new Map<string, EntityKind | string>();

  const add = (id: string, kind: string) => {
    index.set(id, kind);
  };

  for (const s of bundle.sources ?? []) {
    const obj = asObject(s);
    const id = idOf(obj);
    if (id) add(id, "Source");
  }
  for (const a of bundle.sourceAssertions ?? []) {
    const obj = asObject(a);
    const id = idOf(obj);
    if (id) add(id, "SourceAssertion");
  }
  for (const m of bundle.mediaAssets ?? []) {
    const obj = asObject(m);
    const id = idOf(obj);
    if (id) add(id, "MediaAsset");
  }
  for (const l of bundle.lessons ?? []) {
    const obj = asObject(l);
    const id = idOf(obj);
    if (id) add(id, "Lesson");
  }
  for (const x of bundle.lexemes ?? []) {
    const obj = asObject(x);
    const id = idOf(obj);
    if (!id || !obj) continue;
    add(id, "Lexeme");
    const meanings = obj.meanings;
    if (Array.isArray(meanings)) {
      for (const meaning of meanings) {
        const m = asObject(meaning);
        const mid = idOf(m);
        if (mid) add(mid, "Meaning");
      }
    }
  }
  for (const v of bundle.verbs ?? []) {
    const obj = asObject(v);
    const id = idOf(obj);
    if (id) add(id, "Verb");
  }
  for (const g of bundle.grammarConcepts ?? []) {
    const obj = asObject(g);
    const id = idOf(obj);
    if (id) add(id, "GrammarConcept");
  }
  for (const p of bundle.phrasePatterns ?? []) {
    const obj = asObject(p);
    const id = idOf(obj);
    if (id) add(id, "PhrasePattern");
  }
  for (const q of bundle.qaPairs ?? []) {
    const obj = asObject(q);
    const id = idOf(obj);
    if (id) add(id, "QAPair");
  }
  for (const d of bundle.dialogues ?? []) {
    const obj = asObject(d);
    const id = idOf(obj);
    if (id) add(id, "Dialogue");
  }
  for (const li of bundle.listeningAssets ?? []) {
    const obj = asObject(li);
    const id = idOf(obj);
    if (id) add(id, "ListeningAsset");
  }
  for (const c of bundle.collections ?? []) {
    const obj = asObject(c);
    const id = idOf(obj);
    if (id) add(id, "Collection");
  }
  for (const a of bundle.learningActivities ?? []) {
    const obj = asObject(a);
    const id = idOf(obj);
    if (id) add(id, "LearningActivity");
  }
  for (const r of bundle.relationships ?? []) {
    const obj = asObject(r);
    const id = idOf(obj);
    if (id) add(id, "Relationship");
  }
  for (const g of bundle.contentGaps ?? []) {
    const obj = asObject(g);
    const id = idOf(obj);
    if (id) add(id, "ContentGap");
  }
  for (const e of bundle.examples ?? []) {
    const obj = asObject(e);
    const id = idOf(obj);
    if (id) add(id, "Example");
  }

  return index;
}

export function validateUniqueIds(bundle: ContentBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>();

  const check = (id: string, context: string) => {
    if (seen.has(id)) {
      issues.push(
        issue("DUPLICATE_ID", `Duplicate ID also declared as ${seen.get(id)}`, {
          objectId: id,
          field: "id",
        }),
      );
    } else {
      seen.set(id, context);
    }
  };

  for (const s of bundle.sources ?? []) {
    const id = idOf(asObject(s));
    if (id) check(id, "sources");
  }
  for (const a of bundle.sourceAssertions ?? []) {
    const id = idOf(asObject(a));
    if (id) check(id, "sourceAssertions");
  }
  for (const m of bundle.mediaAssets ?? []) {
    const id = idOf(asObject(m));
    if (id) check(id, "mediaAssets");
  }
  for (const l of bundle.lessons ?? []) {
    const id = idOf(asObject(l));
    if (id) check(id, "lessons");
  }
  for (const x of bundle.lexemes ?? []) {
    const obj = asObject(x);
    const id = idOf(obj);
    if (!id || !obj) continue;
    check(id, "lexemes");
    const meanings = obj.meanings;
    if (Array.isArray(meanings)) {
      for (const meaning of meanings) {
        const mid = idOf(asObject(meaning));
        if (mid) check(mid, `lexemes.${id}.meanings`);
      }
    }
  }
  for (const v of bundle.verbs ?? []) {
    const id = idOf(asObject(v));
    if (id) check(id, "verbs");
  }
  for (const g of bundle.grammarConcepts ?? []) {
    const id = idOf(asObject(g));
    if (id) check(id, "grammarConcepts");
  }
  for (const p of bundle.phrasePatterns ?? []) {
    const id = idOf(asObject(p));
    if (id) check(id, "phrasePatterns");
  }
  for (const q of bundle.qaPairs ?? []) {
    const id = idOf(asObject(q));
    if (id) check(id, "qaPairs");
  }
  for (const d of bundle.dialogues ?? []) {
    const id = idOf(asObject(d));
    if (id) check(id, "dialogues");
  }
  for (const li of bundle.listeningAssets ?? []) {
    const id = idOf(asObject(li));
    if (id) check(id, "listeningAssets");
  }
  for (const c of bundle.collections ?? []) {
    const id = idOf(asObject(c));
    if (id) check(id, "collections");
  }
  for (const a of bundle.learningActivities ?? []) {
    const id = idOf(asObject(a));
    if (id) check(id, "learningActivities");
  }
  for (const r of bundle.relationships ?? []) {
    const id = idOf(asObject(r));
    if (id) check(id, "relationships");
  }
  for (const g of bundle.contentGaps ?? []) {
    const id = idOf(asObject(g));
    if (id) check(id, "contentGaps");
  }
  for (const e of bundle.examples ?? []) {
    const id = idOf(asObject(e));
    if (id) check(id, "examples");
  }

  return issues;
}

function refIssue(objectId: string, field: string, ref: string): ValidationIssue {
  return issue("UNRESOLVED_REFERENCE", `Unresolved reference ${ref}`, {
    objectId,
    field,
  });
}

function refKindIssue(
  objectId: string,
  field: string,
  actual: string,
  expected: readonly string[],
): ValidationIssue {
  return issue(
    "REFERENCE_KIND_MISMATCH",
    `Reference resolves to ${actual}; expected ${expected.join("|")}`,
    { objectId, field },
  );
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function validateReferences(bundle: ContentBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const index = collectObjectIndex(bundle);
  const expect = (
    objectId: string,
    field: string,
    id: string,
    expected: readonly string[],
  ) => {
    const actual = index.get(id);
    if (!actual) issues.push(refIssue(objectId, field, id));
    else if (!expected.includes(actual)) {
      issues.push(refKindIssue(objectId, field, actual, expected));
    }
  };

  for (const raw of bundle.sourceAssertions ?? []) {
    const a = asObject(raw);
    const id = idOf(a);
    if (!a || !id) continue;
    if (typeof a.sourceId === "string") expect(id, "sourceId", a.sourceId, ["Source"]);
    if (typeof a.subjectId === "string" && !index.has(a.subjectId)) {
      issues.push(refIssue(id, "subjectId", a.subjectId));
    }
  }

  for (const raw of bundle.mediaAssets ?? []) {
    const m = asObject(raw);
    const id = idOf(m);
    if (!m || !id) continue;
    if (typeof m.parentTrackId === "string") expect(id, "parentTrackId", m.parentTrackId, ["MediaAsset"]);
    for (const sid of stringList(m.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const cid of stringList(m.linkedConceptIds)) {
      expect(id, "linkedConceptIds", cid, CONCEPT_KINDS);
    }
  }

  for (const raw of bundle.lessons ?? []) {
    const lesson = asObject(raw);
    const id = idOf(lesson);
    if (!lesson || !id) continue;
    for (const pre of stringList(lesson.prerequisiteLessonIds)) {
      expect(id, "prerequisiteLessonIds", pre, ["Lesson"]);
    }
    if (Array.isArray(lesson.stages)) {
      for (const stageRaw of lesson.stages) {
        const stage = asObject(stageRaw);
        if (!stage) continue;
        const stageId = typeof stage.id === "string" ? stage.id : "?";
        for (const aid of stringList(stage.activityIds)) {
          expect(id, `stages.${stageId}.activityIds`, aid, ["LearningActivity"]);
        }
      }
    }
    if (Array.isArray(lesson.collections)) {
      for (const linkRaw of lesson.collections) {
        const link = asObject(linkRaw);
        if (!link) continue;
        if (typeof link.collectionId === "string") expect(id, "collections.collectionId", link.collectionId, ["Collection"]);
      }
    }
    if (typeof lesson.summaryInfographicId === "string") expect(id, "summaryInfographicId", lesson.summaryInfographicId, ["MediaAsset"]);
    for (const sid of stringList(lesson.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const rid of stringList(lesson.relationIds)) {
      expect(id, "relationIds", rid, ["Relationship"]);
    }
  }

  for (const raw of bundle.lexemes ?? []) {
    const lex = asObject(raw);
    const id = idOf(lex);
    if (!lex || !id) continue;
    for (const sid of stringList(lex.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const mid of stringList(lex.mediaIds)) {
      expect(id, "mediaIds", mid, ["MediaAsset"]);
    }
    for (const rid of stringList(lex.relationIds)) {
      expect(id, "relationIds", rid, ["Relationship"]);
    }
    for (const eid of stringList(lex.exampleIds)) {
      expect(id, "exampleIds", eid, ["Example"]);
    }
    const pronunciation = asObject(lex.pronunciation);
    if (pronunciation && typeof pronunciation.audioId === "string") expect(id, "pronunciation.audioId", pronunciation.audioId, ["MediaAsset"]);
  }

  for (const raw of bundle.verbs ?? []) {
    const verb = asObject(raw);
    const id = idOf(verb);
    if (!verb || !id) continue;
    for (const sid of stringList(verb.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const mid of stringList(verb.mediaIds)) {
      expect(id, "mediaIds", mid, ["MediaAsset"]);
    }
    for (const gid of stringList(verb.grammarIds)) {
      expect(id, "grammarIds", gid, ["GrammarConcept"]);
    }
    for (const rid of stringList(verb.relationIds)) {
      expect(id, "relationIds", rid, ["Relationship"]);
    }
    for (const eid of stringList(verb.exampleIds)) {
      expect(id, "exampleIds", eid, ["Example"]);
    }
    const pronunciation = asObject(verb.pronunciation);
    if (pronunciation && typeof pronunciation.audioId === "string") expect(id, "pronunciation.audioId", pronunciation.audioId, ["MediaAsset"]);
    if (Array.isArray(verb.present)) {
      for (let i = 0; i < verb.present.length; i++) {
        const form = asObject(verb.present[i]);
        if (form && typeof form.audioId === "string") expect(id, `present[${i}].audioId`, form.audioId, ["MediaAsset"]);
      }
    }
  }

  for (const raw of bundle.grammarConcepts ?? []) {
    const g = asObject(raw);
    const id = idOf(g);
    if (!g || !id) continue;
    for (const sid of stringList(g.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const pre of stringList(g.prerequisiteIds)) {
      expect(id, "prerequisiteIds", pre, ["GrammarConcept"]);
    }
    if (typeof g.infographicId === "string") expect(id, "infographicId", g.infographicId, ["MediaAsset"]);
    for (const eid of stringList(g.exampleIds)) {
      expect(id, "exampleIds", eid, ["Example"]);
    }
    for (const mid of stringList(g.mediaIds)) expect(id, "mediaIds", mid, ["MediaAsset"]);
    for (const rid of stringList(g.relationIds)) expect(id, "relationIds", rid, ["Relationship"]);
  }

  for (const raw of bundle.phrasePatterns ?? []) {
    const p = asObject(raw);
    const id = idOf(p);
    if (!p || !id) continue;
    for (const sid of stringList(p.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const aid of stringList(p.audioIds)) {
      expect(id, "audioIds", aid, ["MediaAsset"]);
    }
    for (const gid of stringList(p.grammarIds)) expect(id, "grammarIds", gid, ["GrammarConcept"]);
    for (const rid of stringList(p.relationIds)) expect(id, "relationIds", rid, ["Relationship"]);
    if (Array.isArray(p.slots)) {
      for (let i = 0; i < p.slots.length; i++) {
        const slot = asObject(p.slots[i]);
        for (const cid of stringList(slot?.acceptsConceptIds)) expect(id, `slots[${i}].acceptsConceptIds`, cid, CONCEPT_KINDS);
      }
    }
  }

  for (const raw of bundle.qaPairs ?? []) {
    const q = asObject(raw);
    const id = idOf(q);
    if (!q || !id) continue;
    if (typeof q.questionPatternId === "string") expect(id, "questionPatternId", q.questionPatternId, ["PhrasePattern"]);
    for (const aid of stringList(q.answerPatternIds)) {
      expect(id, "answerPatternIds", aid, ["PhrasePattern"]);
    }
    for (const sid of stringList(q.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const gid of stringList(q.grammarIds)) expect(id, "grammarIds", gid, ["GrammarConcept"]);
    for (const aid of stringList(q.audioIds)) expect(id, "audioIds", aid, ["MediaAsset"]);
    for (const rid of stringList(q.relationIds)) expect(id, "relationIds", rid, ["Relationship"]);
    if (Array.isArray(q.substitutionSets)) {
      for (let i = 0; i < q.substitutionSets.length; i++) {
        const set = asObject(q.substitutionSets[i]);
        for (const cid of stringList(set?.conceptIds)) expect(id, `substitutionSets[${i}].conceptIds`, cid, CONCEPT_KINDS);
      }
    }
  }

  for (const raw of bundle.dialogues ?? []) {
    const d = asObject(raw);
    const id = idOf(d);
    if (!d || !id) continue;
    for (const sid of stringList(d.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const mid of stringList(d.mediaIds)) {
      expect(id, "mediaIds", mid, ["MediaAsset"]);
    }
    for (const rid of stringList(d.relationIds)) expect(id, "relationIds", rid, ["Relationship"]);
    if (Array.isArray(d.turns)) {
      for (let i = 0; i < d.turns.length; i++) {
        const turn = asObject(d.turns[i]);
        if (turn && typeof turn.audioSegmentId === "string") expect(id, `turns[${i}].audioSegmentId`, turn.audioSegmentId, ["MediaAsset"]);
        for (const cid of stringList(turn?.linkedConceptIds)) expect(id, `turns[${i}].linkedConceptIds`, cid, CONCEPT_KINDS);
      }
    }
  }

  for (const raw of bundle.listeningAssets ?? []) {
    const li = asObject(raw);
    const id = idOf(li);
    if (!li || !id) continue;
    if (typeof li.mediaId === "string") expect(id, "mediaId", li.mediaId, ["MediaAsset"]);
    if (typeof li.parentTrackMediaId === "string") expect(id, "parentTrackMediaId", li.parentTrackMediaId, ["MediaAsset"]);
    for (const sid of stringList(li.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const rid of stringList(li.relationIds)) expect(id, "relationIds", rid, ["Relationship"]);
    if (Array.isArray(li.transcriptSegments)) {
      for (let i = 0; i < li.transcriptSegments.length; i++) {
        const segment = asObject(li.transcriptSegments[i]);
        for (const cid of stringList(segment?.linkedConceptIds)) expect(id, `transcriptSegments[${i}].linkedConceptIds`, cid, CONCEPT_KINDS);
      }
    }
  }

  for (const raw of bundle.collections ?? []) {
    const c = asObject(raw);
    const id = idOf(c);
    if (!c || !id) continue;
    if (Array.isArray(c.lessonLinks)) {
      for (const linkRaw of c.lessonLinks) {
        const link = asObject(linkRaw);
        if (!link) continue;
        if (typeof link.lessonId === "string") expect(id, "lessonLinks.lessonId", link.lessonId, ["Lesson"]);
      }
    }
    const membership = asObject(c.membership);
    if (membership?.mode === "static") {
      for (const mid of stringList(membership.memberIds)) {
        expect(id, "membership.memberIds", mid, [...CONCEPT_KINDS, "LearningActivity"]);
      }
    }
    for (const sid of stringList(c.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const rid of stringList(c.relationIds)) {
      expect(id, "relationIds", rid, ["Relationship"]);
    }
  }

  for (const raw of bundle.learningActivities ?? []) {
    const a = asObject(raw);
    const id = idOf(a);
    if (!a || !id) continue;
    if (typeof a.lessonId === "string") expect(id, "lessonId", a.lessonId, ["Lesson"]);
    for (const cid of stringList(a.conceptIds)) {
      expect(id, "conceptIds", cid, CONCEPT_KINDS);
    }
    for (const sid of stringList(a.sourceAssertionIds)) {
      expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    }
    for (const rid of stringList(a.relationIds)) {
      expect(id, "relationIds", rid, ["Relationship"]);
    }
  }

  for (const raw of bundle.contentGaps ?? []) {
    const gap = asObject(raw);
    const id = idOf(gap);
    if (!gap || !id) continue;
    if (typeof gap.objectId === "string" && !index.has(gap.objectId)) {
      issues.push(
        issue("UNRESOLVED_REFERENCE", `Gap objectId does not resolve`, {
          objectId: id,
          field: "objectId",
          gapId: id,
          severity: "warning",
        }),
      );
    }
  }

  for (const raw of bundle.relationships ?? []) {
    const rel = asObject(raw);
    const id = idOf(rel);
    if (!rel || !id) continue;
    if (typeof rel.fromId === "string" && !index.has(rel.fromId)) {
      issues.push(refIssue(id, "fromId", rel.fromId));
    }
    if (typeof rel.toId === "string" && !index.has(rel.toId)) {
      issues.push(refIssue(id, "toId", rel.toId));
    }
    if (typeof rel.sourceAssertionId === "string") expect(id, "sourceAssertionId", rel.sourceAssertionId, ["SourceAssertion"]);
    if (typeof rel.lessonId === "string") expect(id, "lessonId", rel.lessonId, ["Lesson"]);
  }

  for (const raw of bundle.examples ?? []) {
    const example = asObject(raw);
    const id = idOf(example);
    if (!example || !id) continue;
    for (const sid of stringList(example.sourceAssertionIds)) expect(id, "sourceAssertionIds", sid, ["SourceAssertion"]);
    if (typeof example.audioId === "string") expect(id, "audioId", example.audioId, ["MediaAsset"]);
  }

  return issues;
}

export function validateRelationshipEndpoints(bundle: ContentBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const index = collectObjectIndex(bundle);
  const allowedTypes = new Set<string>(RELATIONSHIP_TYPES);

  for (const raw of bundle.relationships ?? []) {
    const rel = asObject(raw);
    const id = idOf(rel);
    if (!rel || !id) continue;

    if (typeof rel.type !== "string") continue;
    if (!allowedTypes.has(rel.type)) {
      issues.push(
        issue("RELATIONSHIP_TYPE", `Unknown relationship type`, {
          objectId: id,
          field: "type",
        }),
      );
      continue;
    }

    const constraint = RELATIONSHIP_ENDPOINTS[rel.type as RelationshipType];
    const fromId = typeof rel.fromId === "string" ? rel.fromId : "";
    const toId = typeof rel.toId === "string" ? rel.toId : "";
    const fromKind = (index.get(fromId) ?? kindForId(fromId)) as string | undefined;
    const toKind = (index.get(toId) ?? kindForId(toId)) as string | undefined;

    if (fromKind && !constraint.from.includes(fromKind as EntityKind)) {
      issues.push(
        issue(
          "RELATIONSHIP_ENDPOINT",
          `from endpoint kind ${fromKind} not allowed for ${rel.type}`,
          { objectId: id, field: "fromId" },
        ),
      );
    }
    if (toKind && !constraint.to.includes(toKind as EntityKind)) {
      issues.push(
        issue(
          "RELATIONSHIP_ENDPOINT",
          `to endpoint kind ${toKind} not allowed for ${rel.type}`,
          { objectId: id, field: "toId" },
        ),
      );
    }

    if (!parseIdPrefix(fromId) || !parseIdPrefix(toId)) {
      issues.push(
        issue("INVALID_ID", `Relationship endpoint ID failed prefix/slug rules`, {
          objectId: id,
          field: "fromId|toId",
        }),
      );
    }
  }

  return issues;
}
