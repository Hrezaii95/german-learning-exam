import type {
  ExampleId,
  LexemeId,
  MeaningId,
  MediaAssetId,
  RelationshipId,
  SourceAssertionId,
} from "../ids/index.js";
import type {
  Article,
  Gender,
  PronunciationRef,
  PublicationState,
  StructuredText,
} from "./common.js";

export type NounForms = {
  gender: Gender;
  article: Article;
  singular: string;
  plurals: Array<{ form: string; patternIds: string[] }>;
  /** Shared group key for masculine/feminine person-form pairs; forms remain separate lexemes. */
  personFormGroupId?: string;
};

export type Meaning = {
  id: MeaningId;
  glossEn: string;
  glossEs?: string;
  notes?: string;
};

/**
 * Lexeme — one canonical concept. Profession M/F forms are separate lexemes
 * linked by relationship type `person-form-of`. Lemma must not contain slash alternatives.
 */
export type Lexeme = {
  kind: "Lexeme";
  id: LexemeId;
  lemma: string;
  partOfSpeech: string;
  noun?: NounForms;
  meanings: Meaning[];
  pronunciation: PronunciationRef;
  exampleIds: ExampleId[];
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  mediaIds: MediaAssetId[];
  cardTemplateIds: string[];
  publication: PublicationState;
};

export type ExampleSentence = {
  kind: "Example";
  id: ExampleId;
  text: StructuredText;
  translationEn?: StructuredText;
  audioId?: MediaAssetId;
  sourceAssertionIds: SourceAssertionId[];
};
