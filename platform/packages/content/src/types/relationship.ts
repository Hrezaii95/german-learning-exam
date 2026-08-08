import type { RelationshipId, SourceAssertionId } from "../ids/index.js";
import type { EntityKind } from "../ids/index.js";

/**
 * Required relationship vocabulary (docs/07).
 * Edges carry optional provenance and lesson context.
 */
export const RELATIONSHIP_TYPES = [
  "introduced-in",
  "practised-in",
  "source-of",
  "person-form-of",
  "plural-of",
  "conjugation-of",
  "uses-grammar",
  "answer-to",
  "slot-accepts",
  "example-of",
  "appears-in-dialogue",
  "appears-in-audio",
  "related-concept",
  "prerequisite-of",
  "member-of-collection",
  "review-card-for",
  "infographic-for",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type EndpointKindConstraint = {
  from: EntityKind[];
  to: EntityKind[];
};

/** Typed endpoints per relationship type. */
export const RELATIONSHIP_ENDPOINTS: Record<RelationshipType, EndpointKindConstraint> = {
  "introduced-in": {
    from: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair", "Dialogue", "ListeningAsset", "Collection"],
    to: ["Lesson"],
  },
  "practised-in": {
    from: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair", "Dialogue", "ListeningAsset"],
    to: ["Lesson", "LearningActivity"],
  },
  "source-of": {
    from: ["Source", "SourceAssertion"],
    to: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair", "Dialogue", "ListeningAsset", "Lesson", "Collection"],
  },
  "person-form-of": {
    from: ["Lexeme"],
    to: ["Lexeme"],
  },
  "plural-of": {
    from: ["Lexeme"],
    to: ["Lexeme"],
  },
  "conjugation-of": {
    from: ["Lexeme"],
    to: ["Verb"],
  },
  "uses-grammar": {
    from: ["Lexeme", "Verb", "PhrasePattern", "QAPair", "Dialogue"],
    to: ["GrammarConcept"],
  },
  "answer-to": {
    from: ["PhrasePattern", "QAPair"],
    to: ["PhrasePattern", "QAPair"],
  },
  "slot-accepts": {
    from: ["PhrasePattern", "QAPair"],
    to: ["Lexeme", "Verb", "GrammarConcept", "Collection"],
  },
  "example-of": {
    from: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern"],
    to: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair"],
  },
  "appears-in-dialogue": {
    from: ["Lexeme", "Verb", "PhrasePattern", "QAPair"],
    to: ["Dialogue"],
  },
  "appears-in-audio": {
    from: ["Lexeme", "Verb", "PhrasePattern", "QAPair", "Dialogue"],
    to: ["ListeningAsset", "MediaAsset"],
  },
  "related-concept": {
    from: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair"],
    to: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair"],
  },
  "prerequisite-of": {
    from: ["Lesson", "GrammarConcept", "LearningActivity"],
    to: ["Lesson", "GrammarConcept", "LearningActivity"],
  },
  "member-of-collection": {
    from: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair", "Dialogue", "ListeningAsset"],
    to: ["Collection"],
  },
  "review-card-for": {
    from: ["LearningActivity"],
    to: ["Lexeme", "Verb", "GrammarConcept", "PhrasePattern", "QAPair"],
  },
  "infographic-for": {
    from: ["MediaAsset"],
    to: ["Lesson", "Lexeme", "Verb", "GrammarConcept", "Collection"],
  },
};

export type Relationship = {
  kind: "Relationship";
  id: RelationshipId;
  type: RelationshipType;
  fromId: string;
  toId: string;
  sourceAssertionId?: SourceAssertionId;
  lessonId?: string;
  order?: number;
  strength?: number;
  note?: string;
};
