/**
 * Centralized learner-visible canonical pins for P3D representatives.
 * Derived from validated publication/projection constants only — never review
 * plurals, TTS paths, assertion values, or other private source fields.
 * Runtime assert and write-time checks bind the artifact to these pins.
 */
import {
  DETAIL_HUB_BY_ID,
  DETAIL_KIND_BY_ID,
  DETAIL_REPRESENTATIVE_IDS,
  detailCanonicalPath,
  type DetailRepresentativeId,
  type LearnerVerbPersonKey,
} from "./detail-types";

export const DETAIL_PLURAL_GAP_MESSAGE =
  "Plural awaiting content approval" as const;

export const DETAIL_VERB_PARADIGM_NOTE =
  "This paradigm is irregular and must be learned as forms." as const;

/** Exact vocabulary representative pins (`lex:architekt`). */
export const VOCAB_ARCHITEKT_CANONICAL = Object.freeze({
  id: "lex:architekt" as const,
  kind: DETAIL_KIND_BY_ID["lex:architekt"],
  hubSegment: DETAIL_HUB_BY_ID["lex:architekt"],
  displayText: "der Architekt",
  lemma: "Architekt",
  article: "der",
  gender: "masculine" as const,
  singular: "Architekt",
  meaningEn: "architect",
  plurals: Object.freeze([] as readonly string[]),
  pluralGapMessage: DETAIL_PLURAL_GAP_MESSAGE,
  personForm: Object.freeze({
    relatedId: "lex:architektin",
    relatedDisplayText: "die Architektin",
    relatedArticle: "die",
    relatedGender: "feminine" as const,
    relatedLemma: "Architektin",
    relatedMeaningEn: "architect",
    sharedStem: "Architekt",
    feminineSuffix: "in",
    operationLabel: "Add feminine -in",
  }),
  canonicalPath: detailCanonicalPath(
    DETAIL_HUB_BY_ID["lex:architekt"],
    "lex:architekt",
  ),
});

/** Exact seven `(person, form)` pairs for `verb:sein` in canonical order. */
export const VERB_SEIN_PRESENT_CANONICAL = Object.freeze([
  Object.freeze({ person: "ich" as const, form: "bin" }),
  Object.freeze({ person: "du" as const, form: "bist" }),
  Object.freeze({ person: "er_sie_es" as const, form: "ist" }),
  Object.freeze({ person: "wir" as const, form: "sind" }),
  Object.freeze({ person: "ihr" as const, form: "seid" }),
  Object.freeze({ person: "sie_plural" as const, form: "sind" }),
  Object.freeze({ person: "Sie_formal" as const, form: "sind" }),
] as const satisfies ReadonlyArray<{
  readonly person: LearnerVerbPersonKey;
  readonly form: string;
}>);

export const VERB_SEIN_CANONICAL = Object.freeze({
  id: "verb:sein" as const,
  kind: DETAIL_KIND_BY_ID["verb:sein"],
  hubSegment: DETAIL_HUB_BY_ID["verb:sein"],
  displayText: "sein",
  infinitive: "sein",
  meaningEn: "to be",
  present: VERB_SEIN_PRESENT_CANONICAL,
  paradigmNote: DETAIL_VERB_PARADIGM_NOTE,
  canonicalPath: detailCanonicalPath(DETAIL_HUB_BY_ID["verb:sein"], "verb:sein"),
});

/** Exact informal Q&A question + three answer realizations. */
export const QA_PROFESSION_CASUAL_CANONICAL = Object.freeze({
  id: "qa:profession-casual-main" as const,
  kind: DETAIL_KIND_BY_ID["qa:profession-casual-main"],
  hubSegment: DETAIL_HUB_BY_ID["qa:profession-casual-main"],
  displayText: "Was bist du von Beruf?",
  register: "informal" as const,
  questionRealization: "Was bist du von Beruf?",
  answerRealizations: Object.freeze([
    "Ich bin … von Beruf.",
    "Ich bin …",
    "Ich arbeite als …",
  ] as const),
  canonicalPath: detailCanonicalPath(
    DETAIL_HUB_BY_ID["qa:profession-casual-main"],
    "qa:profession-casual-main",
  ),
});

/** Exact representative id set + kind + canonical path map. */
export const DETAIL_REPRESENTATIVE_CONTRACT = Object.freeze({
  ids: DETAIL_REPRESENTATIVE_IDS,
  byId: Object.freeze({
    "lex:architekt": Object.freeze({
      kind: VOCAB_ARCHITEKT_CANONICAL.kind,
      canonicalPath: VOCAB_ARCHITEKT_CANONICAL.canonicalPath,
    }),
    "verb:sein": Object.freeze({
      kind: VERB_SEIN_CANONICAL.kind,
      canonicalPath: VERB_SEIN_CANONICAL.canonicalPath,
    }),
    "qa:profession-casual-main": Object.freeze({
      kind: QA_PROFESSION_CASUAL_CANONICAL.kind,
      canonicalPath: QA_PROFESSION_CASUAL_CANONICAL.canonicalPath,
    }),
  } satisfies Record<
    DetailRepresentativeId,
    { readonly kind: string; readonly canonicalPath: string }
  >),
});

/** Deterministic structural JSON for deep equality (array↔byId integrity). */
export function stableStringifyDetailValue(value: unknown): string {
  return JSON.stringify(sortDetailValue(value));
}

function sortDetailValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDetailValue);
  }
  if (value != null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of entries) {
      out[key] = sortDetailValue(nested);
    }
    return out;
  }
  return value;
}
