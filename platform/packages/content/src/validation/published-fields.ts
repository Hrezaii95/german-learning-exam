/**
 * Deterministic minimum published-field policy per entity kind (C0R1).
 * Published objects must map every required field to a verified assertion;
 * validators cite field/assertion IDs only — never value bodies.
 */

export type PublishableKind =
  | "Lesson"
  | "Lexeme"
  | "Verb"
  | "GrammarConcept"
  | "PhrasePattern"
  | "QAPair"
  | "Dialogue"
  | "ListeningAsset"
  | "Collection"
  | "LearningActivity"
  | "MediaAsset";

/**
 * Base required published fields when status === "published".
 * Conditional extras (example, answerSpec, spokenText) are added by
 * {@link requiredPublishedFieldsFor} when those properties are present.
 */
export const MINIMUM_PUBLISHED_FIELDS: Readonly<
  Record<PublishableKind, readonly string[]>
> = {
  Lesson: ["titleDe", "communicativeGoals"],
  Lexeme: ["lemma", "meanings"],
  Verb: ["infinitive", "meanings", "present"],
  GrammarConcept: ["noticeTarget", "ruleSteps"],
  PhrasePattern: ["fixedTokens", "acceptedRealizations"],
  QAPair: ["questionPatternId", "answerPatternIds"],
  Dialogue: ["turns"],
  ListeningAsset: ["transcriptSegments"],
  Collection: ["membership"],
  LearningActivity: ["prompt"],
  MediaAsset: ["variants"],
};

/**
 * Returns the deterministic minimum published-field list for an entity instance.
 */
export function requiredPublishedFieldsFor(
  kind: PublishableKind,
  entity: Record<string, unknown>,
): string[] {
  const fields = [...MINIMUM_PUBLISHED_FIELDS[kind]];
  // A learner-visible example is a source quote: if one is stored it must map
  // to a verified assertion, so the page it was transcribed from is provable.
  if (kind === "Lexeme" && entity["example"] != null) {
    fields.push("example");
  }
  if (kind === "LearningActivity" && entity["answerSpec"] != null) {
    fields.push("answerSpec");
  }
  if (
    kind === "MediaAsset" &&
    typeof entity["spokenText"] === "string" &&
    entity["spokenText"].length > 0
  ) {
    fields.push("spokenText");
  }
  return fields;
}

export function isPublishableKind(kind: string): kind is PublishableKind {
  return Object.prototype.hasOwnProperty.call(MINIMUM_PUBLISHED_FIELDS, kind);
}
