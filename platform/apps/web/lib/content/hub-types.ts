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
  /** Aggregated vocabulary preview; the complete teaching card opens on its detail route. */
  wordFamily?: import("./word-card-types").WordCard;
  id: string;
  kind: LearnerHubEntityKind;
  publicationStatus: "published";
  displayLabel: string;
  category: string | null;
  lessonIds: readonly string[];
  sourcePriority: 1 | 2 | 3 | 4 | null;
  hubDestination: LearnerHubDestination;
  /**
   * One published German worked model for hubs whose card anatomy shows one
   * (grammar). Absent — never an empty string or a placeholder — when the
   * source record publishes no model.
   */
  model?: string;
  searchFields: readonly LearnerHubSearchField[];
};

/** Canonical learner activity action used by derived hub experiences. */
export type LearnerHubActivityAction = {
  activityId: string;
  label: string;
  lessonId: "lesson:01" | "lesson:02";
  path: string;
};

/** Approved workbook audio metadata. The public media filename stays in the audio registry. */
export type LearnerListeningTrack = {
  id: string;
  trackId: string;
  lessonId: "lesson:01" | "lesson:02";
  exercise: string;
  purpose: string;
  durationSeconds: number;
};

export type LearnerListeningGroup = {
  id: string;
  lessonId: "lesson:01" | "lesson:02";
  lessonLabel: string;
  exercise: string;
  purpose: string;
  activity: LearnerHubActivityAction;
  tracks: readonly LearnerListeningTrack[];
};

export type LearnerListeningHubExperience = {
  kind: "listening";
  itemCount: number;
  groups: readonly LearnerListeningGroup[];
};

export type LearnerConceptHubAction = {
  label: string;
  path: string;
};

/**
 * Cross-domain topic assembled only from learner-published source entities and
 * activities. Source IDs are retained so projection tests can prove provenance.
 */
export type LearnerConceptTopic = {
  id: string;
  publicationStatus: "published";
  displayLabel: string;
  summary: string;
  lessonIds: readonly ("lesson:01" | "lesson:02")[];
  sourceEntityIds: readonly string[];
  activities: readonly LearnerHubActivityAction[];
  hubActions: readonly LearnerConceptHubAction[];
};

export type LearnerConceptsHubExperience = {
  kind: "concepts";
  itemCount: number;
  topics: readonly LearnerConceptTopic[];
};

export type LearnerHubExperience =
  | LearnerListeningHubExperience
  | LearnerConceptsHubExperience;

export type LearnerHubDefinition = {
  id: LearnerHubId;
  path: string;
  title: string;
  description: string;
  kinds: readonly LearnerHubEntityKind[];
  itemCount: number;
  categories: readonly string[];
  items: readonly LearnerHubRecord[];
  /** Derived learner-safe experiences for hubs not represented by source collections. */
  experience: LearnerHubExperience | null;
};

export type LearnerHubProjection = {
  schemaVersion: "1.0.0";
  projectionKind: "learner-hubs";
  hubCount: 6;
  hubs: readonly LearnerHubDefinition[];
  hubsById: Readonly<Record<LearnerHubId, LearnerHubDefinition>>;
};
