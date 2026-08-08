import type { Lesson } from "./lesson.js";
import type { Lexeme, ExampleSentence } from "./lexeme.js";
import type { Verb } from "./verb.js";
import type { GrammarConcept } from "./grammar.js";
import type { PhrasePattern, QAPair } from "./phrase.js";
import type { Dialogue, ListeningAsset } from "./dialogue.js";
import type { Collection, LearningActivity } from "./collection.js";
import type { Source, SourceAssertion } from "./source.js";
import type { MediaAsset } from "./media.js";
import type { Relationship } from "./relationship.js";
import type { ContentGap } from "./gap.js";
import type { ContentSchemaVersion } from "./common.js";

/**
 * Canonical content bundle contract for validation.
 * Not the compact evidence shape in content/alpha-content.json.
 */
export type ContentBundle = {
  schemaVersion: ContentSchemaVersion;
  meta?: {
    label?: string;
    generatedFor?: "fixture" | "publication";
  };
  sources: Source[];
  sourceAssertions: SourceAssertion[];
  mediaAssets: MediaAsset[];
  lessons: Lesson[];
  lexemes: Lexeme[];
  verbs: Verb[];
  grammarConcepts: GrammarConcept[];
  phrasePatterns: PhrasePattern[];
  qaPairs: QAPair[];
  dialogues: Dialogue[];
  listeningAssets: ListeningAsset[];
  collections: Collection[];
  learningActivities: LearningActivity[];
  examples?: ExampleSentence[];
  relationships: Relationship[];
  contentGaps: ContentGap[];
};

export type TeachableEntity =
  | Lesson
  | Lexeme
  | Verb
  | GrammarConcept
  | PhrasePattern
  | QAPair
  | Dialogue
  | ListeningAsset
  | Collection
  | LearningActivity
  | MediaAsset;
