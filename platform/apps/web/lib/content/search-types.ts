/** Learner-safe global search projection types (P3C). */

export type LearnerSearchableKind =
  | "Lesson"
  | "LearningActivity"
  | "Lexeme"
  | "Verb"
  | "GrammarConcept"
  | "PhrasePattern"
  | "QAPair"
  | "Dialogue"
  | "ListeningAsset"
  | "Collection";

export type LearnerSearchMatchField =
  | "label"
  | "lemma"
  | "infinitive"
  | "meaning"
  | "intent"
  | "title"
  | "realization"
  | "form"
  | "category";

export type LearnerSearchMatchReason =
  | "exact"
  | "prefix"
  | "token"
  | "substring"
  | "normalized-alias";

export type LearnerSearchHubName =
  | "vocabulary"
  | "verbs"
  | "grammar"
  | "phrases"
  | "listening"
  | "concepts"
  | "lessons"
  | "review";

export type LearnerSearchDestination = {
  /** Semantic hub/type only — non-canonical index paths are omitted. */
  hub: LearnerSearchHubName;
};

export type LearnerSearchField = {
  field: LearnerSearchMatchField;
  /** Canonical learner-facing text (NFC). Never a folded alias. */
  displayText: string;
  /** Match keys only — umlaut digraph/base folds for query matching. */
  matchKeys: readonly string[];
};

export type LearnerSearchDocument = {
  id: string;
  kind: LearnerSearchableKind;
  displayLabel: string;
  publicationStatus: "published";
  sourcePriority: 1 | 2 | 3 | 4 | null;
  lessonIds: readonly string[];
  category: string | null;
  hubDestination: LearnerSearchDestination;
  fields: readonly LearnerSearchField[];
  /**
   * Implemented learner route for this result, or null when detail is deferred.
   * Never a folded spelling and never an author/private path.
   */
  canonicalHref: string | null;
};

export type LearnerSearchMatch = {
  field: LearnerSearchMatchField;
  reason: LearnerSearchMatchReason;
};

export type LearnerSearchHit = {
  id: string;
  kind: LearnerSearchableKind;
  displayLabel: string;
  lessonIds: readonly string[];
  sourcePriority: 1 | 2 | 3 | 4 | null;
  hubDestination: LearnerSearchDestination;
  canonicalHref: string | null;
  score: number;
  match: LearnerSearchMatch;
};

export type LearnerSearchProjection = {
  schemaVersion: "1.0.0";
  projectionKind: "learner-search";
  documentCount: number;
  documents: readonly LearnerSearchDocument[];
  documentsById: Readonly<Record<string, LearnerSearchDocument>>;
};
