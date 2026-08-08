/** Learner-safe hub list projection types (P3B). */

export const LEARNER_HUB_IDS = [
  "vocabulary",
  "verbs",
  "grammar",
  "phrases",
  "listening",
  "concepts",
] as const;

export type LearnerHubId = (typeof LEARNER_HUB_IDS)[number];

export type LearnerHubEntityKind =
  | "Lexeme"
  | "Verb"
  | "GrammarConcept"
  | "PhrasePattern"
  | "QAPair"
  | "Dialogue"
  | "ListeningAsset"
  | "Collection";

export type LearnerHubSearchField = {
  field: string;
  /** Canonical learner-facing text (NFC). Never a folded alias. */
  displayText: string;
  /** Match keys only — umlaut digraph/base folds for query matching. */
  matchKeys: readonly string[];
};

export type LearnerHubDestination = {
  hub: LearnerHubId;
  /** Future detail path; not linked in this slice. */
  path: string;
};

export type LearnerHubRecord = {
  id: string;
  kind: LearnerHubEntityKind;
  publicationStatus: "published";
  displayLabel: string;
  category: string | null;
  lessonIds: readonly string[];
  sourcePriority: 1 | 2 | 3 | 4 | null;
  hubDestination: LearnerHubDestination;
  searchFields: readonly LearnerHubSearchField[];
};

export type LearnerHubDefinition = {
  id: LearnerHubId;
  path: string;
  title: string;
  description: string;
  kinds: readonly LearnerHubEntityKind[];
  itemCount: number;
  categories: readonly string[];
  items: readonly LearnerHubRecord[];
};

export type LearnerHubProjection = {
  schemaVersion: "1.0.0";
  projectionKind: "learner-hubs";
  hubCount: 6;
  hubs: readonly LearnerHubDefinition[];
  hubsById: Readonly<Record<LearnerHubId, LearnerHubDefinition>>;
};
