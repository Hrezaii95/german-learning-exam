/**
 * Stable ID prefixes and branded ID types for teachable content objects.
 * IDs are lowercase ASCII slugs: prefix + ":" + slug.
 */

export const ID_PREFIXES = {
  lesson: "lesson",
  activity: "activity",
  lex: "lex",
  verb: "verb",
  gram: "gram",
  phrase: "phrase",
  qa: "qa",
  dialogue: "dialogue",
  listen: "listen",
  collection: "collection",
  source: "source",
  assert: "assert",
  media: "media",
  rel: "rel",
  gap: "gap",
  meaning: "meaning",
  example: "example",
  approval: "approval",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

export type LessonId = `lesson:${string}`;
export type ActivityId = `activity:${string}`;
export type LexemeId = `lex:${string}`;
export type VerbId = `verb:${string}`;
export type GrammarConceptId = `gram:${string}`;
export type PhrasePatternId = `phrase:${string}`;
export type QAPairId = `qa:${string}`;
export type DialogueId = `dialogue:${string}`;
export type ListeningAssetId = `listen:${string}`;
export type CollectionId = `collection:${string}`;
export type SourceId = `source:${string}`;
export type SourceAssertionId = `assert:${string}`;
export type MediaAssetId = `media:${string}`;
export type RelationshipId = `rel:${string}`;
export type ContentGapId = `gap:${string}`;
export type MeaningId = `meaning:${string}`;
export type ExampleId = `example:${string}`;
export type ApprovalId = `approval:${string}`;

/** Any teachable or provenance object ID used in the content graph. */
export type ContentObjectId =
  | LessonId
  | ActivityId
  | LexemeId
  | VerbId
  | GrammarConceptId
  | PhrasePatternId
  | QAPairId
  | DialogueId
  | ListeningAssetId
  | CollectionId
  | SourceId
  | SourceAssertionId
  | MediaAssetId
  | RelationshipId
  | ContentGapId
  | MeaningId
  | ExampleId
  | ApprovalId;

export type EntityKind =
  | "Lesson"
  | "LessonStage"
  | "LearningActivity"
  | "Lexeme"
  | "Verb"
  | "GrammarConcept"
  | "PhrasePattern"
  | "QAPair"
  | "Dialogue"
  | "ListeningAsset"
  | "Collection"
  | "Source"
  | "SourceAssertion"
  | "MediaAsset"
  | "Relationship"
  | "ContentGap";

const PREFIX_TO_KIND: Record<IdPrefix, EntityKind | "Meaning" | "Example" | "Approval"> = {
  lesson: "Lesson",
  activity: "LearningActivity",
  lex: "Lexeme",
  verb: "Verb",
  gram: "GrammarConcept",
  phrase: "PhrasePattern",
  qa: "QAPair",
  dialogue: "Dialogue",
  listen: "ListeningAsset",
  collection: "Collection",
  source: "Source",
  assert: "SourceAssertion",
  media: "MediaAsset",
  rel: "Relationship",
  gap: "ContentGap",
  meaning: "Meaning",
  example: "Example",
  approval: "Approval",
};

const ID_PATTERN = /^[a-z]+:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isPrefixedId(value: unknown, prefix: IdPrefix): boolean {
  if (typeof value !== "string") return false;
  if (!value.startsWith(`${prefix}:`)) return false;
  return ID_PATTERN.test(value);
}

export function parseIdPrefix(id: string): IdPrefix | null {
  const colon = id.indexOf(":");
  if (colon <= 0) return null;
  const prefix = id.slice(0, colon) as IdPrefix;
  if (!(prefix in PREFIX_TO_KIND)) return null;
  if (!ID_PATTERN.test(id)) return null;
  return prefix;
}

export function kindForId(id: string): string | null {
  const prefix = parseIdPrefix(id);
  if (!prefix) return null;
  return PREFIX_TO_KIND[prefix];
}

export function assertPrefixedId(value: string, prefix: IdPrefix, location: string): void {
  if (!isPrefixedId(value, prefix)) {
    throw new Error(`Invalid ${prefix} ID at ${location}: expected ${prefix}:<slug>`);
  }
}
