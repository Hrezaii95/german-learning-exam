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
 * Where one usage example was transcribed from, so a learner-facing example is
 * traceable back to the exact page it came from.
 */
export type LexemeExampleSourceRef = {
  /** Source-manifest id of the document, e.g. `src:glossary:…`. */
  sourceFileId: string;
  /** Title as printed on the document itself. */
  documentTitle: string;
  /** 1-based page of that document. */
  page: number;
  /** Numbered exercise on that page, when the document prints one. */
  exercise?: string;
};

/**
 * One usage example for a lexeme, transcribed verbatim from an official source.
 *
 * Both halves are quoted, never composed: `de` is the German exactly as the
 * source prints it and `translationEn` is that source's own published English.
 * A lexeme whose sources print no example simply has no `example` — an honest
 * gap is always correct, an invented sentence never is.
 */
export type LexemeExample = {
  de: string;
  translationEn: string;
  sourceRef: LexemeExampleSourceRef;
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
  /**
   * Optional source-transcribed usage example. Present only when an official
   * source prints the word in use together with its own English translation.
   */
  example?: LexemeExample;
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
