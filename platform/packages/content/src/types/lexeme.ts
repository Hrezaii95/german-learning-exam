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
 * Where a usage example came from. The discriminator is required because the
 * two origins carry different, mutually exclusive obligations — a reader (or a
 * validator) must never have to guess which kind of sentence it is holding.
 */
export type LexemeExampleOrigin = "glossary" | "app-authored";

/**
 * Review state for a sentence nobody has checked yet. There is exactly one
 * state today: the app wrote it and a qualified German speaker has not seen it.
 * A checked sentence does not become a different review state — it becomes a
 * different kind of example, or it is corrected and stays here until reviewed.
 */
export type LexemeExampleReviewState = "pending-german-review";

/**
 * One usage example for a lexeme, transcribed verbatim from an official source.
 *
 * Both halves are quoted, never composed: `de` is the German exactly as the
 * source prints it and `translationEn` is that source's own published English.
 * The `sourceRef` is mandatory — this is the only example kind a learner may
 * be told a book and page for.
 */
export type GlossaryLexemeExample = {
  origin: "glossary";
  de: string;
  translationEn: string;
  sourceRef: LexemeExampleSourceRef;
};

/**
 * One usage example written for this app, not quoted from any source.
 *
 * It is deliberately unable to carry a `sourceRef`: an app-authored sentence
 * has no page, and letting it name one would let model-written German pass
 * itself off as coursebook material. What it carries instead is the honest
 * fact about it — that no qualified German speaker has checked it yet — plus
 * the optional note explaining what specifically needs a second opinion.
 */
export type AppAuthoredLexemeExample = {
  origin: "app-authored";
  de: string;
  translationEn: string;
  reviewState: LexemeExampleReviewState;
  /** What the reviewer should look at, when the author flagged something. */
  reviewerNote?: string;
};

/**
 * A lexeme whose sources print no example and for which the app has written
 * none simply has no `example` — an honest gap is always correct, an invented
 * sentence dressed up as a quotation never is.
 */
export type LexemeExample = GlossaryLexemeExample | AppAuthoredLexemeExample;

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
   * Optional usage example. Either transcribed from an official source (and
   * then traceable to a page) or written for this app (and then openly marked
   * as awaiting German review). Absent when neither exists.
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
