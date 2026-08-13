/**
 * Representative practice prompts — only P3D published learner-visible fields.
 * Never invent German distractors; choices are drawn from canonical pins only.
 */

import {
  QA_PROFESSION_CASUAL_CANONICAL,
  VERB_SEIN_CANONICAL,
  VOCAB_ARCHITEKT_CANONICAL,
} from "../content/detail-canonical-contract";
import type { DetailRepresentativeId } from "../content/detail-types";
import {
  PRACTICE_GAME_IDS,
  type PracticeGameId,
} from "./game-ids";
import {
  AUDIO_MATCH_UNAVAILABLE_REASON,
  type PracticeGameMeta,
} from "./game-types";

export type FlashcardPrompt = {
  readonly gameId: "flashcards";
  readonly conceptId: "lex:architekt";
  readonly frontDe: string;
  readonly backEn: string;
  readonly relatedDe: string;
};

export type PictureWordMatchPrompt = {
  readonly gameId: "picture-word-match";
  readonly conceptId: "lex:architekt";
  readonly promptLabel: string;
  readonly semanticNote: string;
  readonly targetGender: "masculine" | "feminine";
  readonly targetDisplayText: string;
  readonly choices: readonly {
    readonly id: string;
    readonly displayText: string;
    readonly gender: "masculine" | "feminine";
  }[];
};

export type ArticleChoicePrompt = {
  readonly gameId: "article-choice";
  readonly conceptId: "lex:architekt";
  readonly lemma: string;
  readonly correctArticle: string;
  readonly choices: readonly string[];
};

export type AudioMatchPrompt = {
  readonly gameId: "audio-match";
  readonly conceptId: "lex:architekt";
  readonly unavailableReason: string;
};

export type WordOrderPrompt = {
  readonly gameId: "word-order";
  readonly conceptId: "qa:profession-casual-main";
  readonly sourceSentence: string;
  /** Tokens in canonical published order (whitespace split of published question). */
  readonly canonicalTokens: readonly string[];
};

export type VerbBuilderPrompt = {
  readonly gameId: "verb-builder";
  readonly conceptId: "verb:sein";
  readonly infinitive: string;
  readonly person: string;
  readonly personLabel: string;
  readonly expectedForm: string;
  readonly formChoices: readonly string[];
};

export type MorphologyPuzzlePrompt = {
  readonly gameId: "morphology-puzzle";
  readonly conceptId: "lex:architekt";
  readonly sharedStem: string;
  readonly feminineSuffix: string;
  readonly operationLabel: string;
  readonly expectedLemma: string;
};

export type PracticePrompt =
  | FlashcardPrompt
  | PictureWordMatchPrompt
  | ArticleChoicePrompt
  | AudioMatchPrompt
  | WordOrderPrompt
  | VerbBuilderPrompt
  | MorphologyPuzzlePrompt;

export function practiceActivityId(gameId: PracticeGameId): string {
  return `activity:practice-${gameId}`;
}

export function buildPracticeGameCatalog(): readonly PracticeGameMeta[] {
  return Object.freeze(
    PRACTICE_GAME_IDS.map((id) => metaForGame(id)),
  );
}

function metaForGame(id: PracticeGameId): PracticeGameMeta {
  switch (id) {
    case "flashcards":
      return Object.freeze({
        id,
        title: "Flashcards",
        description: "Self-rate recall of the published vocabulary card.",
        availability: "enabled",
        unavailableReason: null,
        conceptId: "lex:architekt",
        taskFamily: "flashcard",
        measuredDimension: "recall",
      });
    case "picture-word-match":
      return Object.freeze({
        id,
        title: "Picture–word match",
        description:
          "Match the semantic gender visual to the published person form.",
        availability: "enabled",
        unavailableReason: null,
        conceptId: "lex:architekt",
        taskFamily: "pictureRecognition",
        measuredDimension: "recognition",
      });
    case "article-choice":
      return Object.freeze({
        id,
        title: "Article choice",
        description: "Choose the published article for the lemma.",
        availability: "enabled",
        unavailableReason: null,
        conceptId: "lex:architekt",
        taskFamily: "multipleChoice",
        measuredDimension: "recognition",
      });
    case "audio-match":
      return Object.freeze({
        id,
        title: "Audio match",
        description: "Match spoken audio to a published form.",
        availability: "unavailable",
        unavailableReason: AUDIO_MATCH_UNAVAILABLE_REASON,
        conceptId: "lex:architekt",
        taskFamily: null,
        measuredDimension: null,
      });
    case "word-order":
      return Object.freeze({
        id,
        title: "Word order",
        description: "Rebuild the published informal question token order.",
        availability: "enabled",
        unavailableReason: null,
        conceptId: "qa:profession-casual-main",
        taskFamily: "sentenceOrder",
        measuredDimension: "form",
      });
    case "verb-builder":
      return Object.freeze({
        id,
        title: "Verb builder",
        description: "Supply the published present form for a person.",
        availability: "enabled",
        unavailableReason: null,
        conceptId: "verb:sein",
        taskFamily: "formManipulation",
        measuredDimension: "form",
      });
    case "morphology-puzzle":
      return Object.freeze({
        id,
        title: "Morphology puzzle",
        description: "Apply the published stem + -in person-form operation.",
        availability: "enabled",
        unavailableReason: null,
        conceptId: "lex:architekt",
        taskFamily: "formManipulation",
        measuredDimension: "form",
      });
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function buildFlashcardPrompt(): FlashcardPrompt {
  return Object.freeze({
    gameId: "flashcards",
    conceptId: VOCAB_ARCHITEKT_CANONICAL.id,
    frontDe: VOCAB_ARCHITEKT_CANONICAL.displayText,
    backEn: VOCAB_ARCHITEKT_CANONICAL.meaningEn,
    relatedDe: VOCAB_ARCHITEKT_CANONICAL.personForm.relatedDisplayText,
  });
}

export function buildPictureWordMatchPrompt(
  targetGender: "masculine" | "feminine" = "masculine",
): PictureWordMatchPrompt {
  const pf = VOCAB_ARCHITEKT_CANONICAL.personForm;
  const choices = Object.freeze([
    Object.freeze({
      id: VOCAB_ARCHITEKT_CANONICAL.id,
      displayText: VOCAB_ARCHITEKT_CANONICAL.displayText,
      gender: "masculine" as const,
    }),
    Object.freeze({
      id: pf.relatedId,
      displayText: pf.relatedDisplayText,
      gender: "feminine" as const,
    }),
  ]);
  const target =
    targetGender === "masculine"
      ? choices[0]!
      : choices[1]!;
  return Object.freeze({
    gameId: "picture-word-match",
    conceptId: VOCAB_ARCHITEKT_CANONICAL.id,
    promptLabel: "Semantic gender visual (not a profession photograph)",
    semanticNote:
      "Match the gender badge shape and token to the published person form. This is a semantic visual cue, not a photo.",
    targetGender,
    targetDisplayText: target.displayText,
    choices,
  });
}

export function buildArticleChoicePrompt(
  which: "masculine" | "feminine" = "masculine",
): ArticleChoicePrompt {
  const pf = VOCAB_ARCHITEKT_CANONICAL.personForm;
  const lemma =
    which === "masculine"
      ? VOCAB_ARCHITEKT_CANONICAL.lemma
      : pf.relatedLemma;
  const correctArticle =
    which === "masculine"
      ? VOCAB_ARCHITEKT_CANONICAL.article
      : pf.relatedArticle;
  // Published articles only — never invent distractors.
  const choices = Object.freeze(
    [
      VOCAB_ARCHITEKT_CANONICAL.article,
      pf.relatedArticle,
    ].slice().sort((a, b) => a.localeCompare(b)),
  );
  return Object.freeze({
    gameId: "article-choice",
    conceptId: VOCAB_ARCHITEKT_CANONICAL.id,
    lemma,
    correctArticle,
    choices,
  });
}

export function buildAudioMatchPrompt(): AudioMatchPrompt {
  return Object.freeze({
    gameId: "audio-match",
    conceptId: VOCAB_ARCHITEKT_CANONICAL.id,
    unavailableReason: AUDIO_MATCH_UNAVAILABLE_REASON,
  });
}

export function buildWordOrderPrompt(): WordOrderPrompt {
  const source = QA_PROFESSION_CASUAL_CANONICAL.questionRealization;
  const canonicalTokens = Object.freeze(source.split(/\s+/).filter(Boolean));
  return Object.freeze({
    gameId: "word-order",
    conceptId: QA_PROFESSION_CASUAL_CANONICAL.id,
    sourceSentence: source,
    canonicalTokens,
  });
}

const VERB_PERSON_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ich: "ich",
  du: "du",
  er_sie_es: "er/sie/es",
  wir: "wir",
  ihr: "ihr",
  sie_plural: "sie (plural)",
  Sie_formal: "Sie (formal)",
});

export function buildVerbBuilderPrompt(
  personIndex = 0,
): VerbBuilderPrompt {
  const row =
    VERB_SEIN_CANONICAL.present[
      Math.max(0, Math.min(personIndex, VERB_SEIN_CANONICAL.present.length - 1))
    ]!;
  const formChoices = Object.freeze(
    VERB_SEIN_CANONICAL.present.map((p) => p.form),
  );
  return Object.freeze({
    gameId: "verb-builder",
    conceptId: VERB_SEIN_CANONICAL.id,
    infinitive: VERB_SEIN_CANONICAL.infinitive,
    person: row.person,
    personLabel: VERB_PERSON_LABELS[row.person] ?? row.person,
    expectedForm: row.form,
    formChoices,
  });
}

export function buildMorphologyPuzzlePrompt(): MorphologyPuzzlePrompt {
  const pf = VOCAB_ARCHITEKT_CANONICAL.personForm;
  return Object.freeze({
    gameId: "morphology-puzzle",
    conceptId: VOCAB_ARCHITEKT_CANONICAL.id,
    sharedStem: pf.sharedStem,
    feminineSuffix: pf.feminineSuffix,
    operationLabel: pf.operationLabel,
    expectedLemma: pf.relatedLemma,
  });
}

export function buildPromptForGame(gameId: PracticeGameId): PracticePrompt {
  switch (gameId) {
    case "flashcards":
      return buildFlashcardPrompt();
    case "picture-word-match":
      return buildPictureWordMatchPrompt("masculine");
    case "article-choice":
      return buildArticleChoicePrompt("masculine");
    case "audio-match":
      return buildAudioMatchPrompt();
    case "word-order":
      return buildWordOrderPrompt();
    case "verb-builder":
      return buildVerbBuilderPrompt(0);
    case "morphology-puzzle":
      return buildMorphologyPuzzlePrompt();
    default: {
      const _exhaustive: never = gameId;
      return _exhaustive;
    }
  }
}

export function conceptIdForGame(gameId: PracticeGameId): DetailRepresentativeId {
  return metaForGame(gameId).conceptId;
}
