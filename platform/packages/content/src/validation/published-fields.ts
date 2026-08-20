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
  // A glossary example is a source quote: if one is stored it must map to a
  // verified assertion, so the page it was transcribed from is provable. An
  // app-authored example is deliberately excluded — it has no source to assert,
  // and {@link forbiddenPublishedFieldsFor} keeps it out of publishedFields
  // entirely rather than letting it borrow a source field's authority.
  if (kind === "Lexeme" && exampleOrigin(entity) === "glossary") {
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

/**
 * Fields this entity must NOT declare as source-backed published fields.
 *
 * `publishedFields` means "a verified source assertion supplies this value".
 * An app-authored example has no source, so declaring it there would dress a
 * model-written sentence in a coursebook's provenance. Naming the field here
 * makes that a validation error instead of an easy mistake.
 */
export function forbiddenPublishedFieldsFor(
  kind: PublishableKind,
  entity: Record<string, unknown>,
): string[] {
  if (kind === "Lexeme" && exampleOrigin(entity) === "app-authored") {
    return ["example"];
  }
  return [];
}

function exampleOrigin(entity: Record<string, unknown>): string | null {
  const example = entity["example"];
  if (example == null || typeof example !== "object" || Array.isArray(example)) {
    return null;
  }
  const origin = (example as Record<string, unknown>)["origin"];
  return typeof origin === "string" ? origin : null;
}

export function isPublishableKind(kind: string): kind is PublishableKind {
  return Object.prototype.hasOwnProperty.call(MINIMUM_PUBLISHED_FIELDS, kind);
}
