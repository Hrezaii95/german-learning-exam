/**
 * Deterministic learner-safe detail projection for every published Lexeme,
 * Verb, GrammarConcept, and QAPair. The three P3D representatives retain their richer views.
 * Uses validated publication + public learner indexes only — never author indexes.
 */
import {
  buildContentIndexes,
  type ContentBundle,
  type ContentIndexes,
  type GrammarConcept,
  type Lexeme,
  type PhrasePattern,
  type QAPair,
  type TextToken,
  type Verb,
} from "@german-learning/content";
import { loadValidatedBundleOrThrow } from "./project";
import {
  DETAIL_PLURAL_GAP_MESSAGE,
  DETAIL_VERB_PARADIGM_NOTE,
  VERB_SEIN_PRESENT_CANONICAL,
  VOCAB_ARCHITEKT_CANONICAL,
} from "./detail-canonical-contract";
import {
  DETAIL_REPRESENTATIVE_IDS,
  detailCanonicalPath,
  type DetailRepresentativeId,
  type LearnerDetailProjection,
  type LearnerDetailRecord,
  type LearnerGender,
  type LearnerGrammarDetail,
  type LearnerPersonFormRelation,
  type LearnerQaDetail,
  type LearnerQaRepresentative,
  type LearnerVerbDetail,
  type LearnerVerbRepresentative,
  type LearnerVerbPersonKey,
  type LearnerVerbPresentForm,
  type LearnerVocabularyDetail,
  type LearnerVocabularyRepresentative,
} from "./detail-types";
import { resolveMediaAvailability } from "./media-availability";
import {
  CONVERSATION_LEVEL_IDS,
  assertExactConversationLevelIds,
} from "../conversation/level-ids";

export class DetailProjectionError extends Error {
  readonly code = "DETAIL_PROJECTION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "DetailProjectionError";
  }
}

const EXPECTED_SEIN_PERSONS: readonly LearnerVerbPersonKey[] =
  VERB_SEIN_PRESENT_CANONICAL.map((row) => row.person);

const PERSON_LABELS: Readonly<Record<LearnerVerbPersonKey, string>> = Object.freeze({
  ich: "ich",
  du: "du",
  er_sie_es: "er/sie/es",
  wir: "wir",
  ihr: "ihr",
  sie_plural: "sie (plural)",
  Sie_formal: "Sie (formal)",
});

function isGender(value: string): value is LearnerGender {
  return value === "masculine" || value === "feminine" || value === "neuter";
}

function isVerbPersonKey(value: string): value is LearnerVerbPersonKey {
  return (EXPECTED_SEIN_PERSONS as readonly string[]).includes(value);
}

function requirePublishedLexeme(
  bundle: ContentBundle,
  id: string,
): Lexeme {
  const lexeme = bundle.lexemes.find((item) => item.id === id);
  if (!lexeme) {
    throw new DetailProjectionError(`Missing lexeme ${id}`);
  }
  if (lexeme.publication.status !== "published") {
    throw new DetailProjectionError(`Lexeme ${id} is not published`);
  }
  return lexeme;
}

function requirePublishedVerb(bundle: ContentBundle, id: string): Verb {
  const verb = bundle.verbs.find((item) => item.id === id);
  if (!verb) {
    throw new DetailProjectionError(`Missing verb ${id}`);
  }
  if (verb.publication.status !== "published") {
    throw new DetailProjectionError(`Verb ${id} is not published`);
  }
  return verb;
}

function requirePublishedQa(bundle: ContentBundle, id: string): QAPair {
  const qa = bundle.qaPairs.find((item) => item.id === id);
  if (!qa) {
    throw new DetailProjectionError(`Missing QA pair ${id}`);
  }
  if (qa.publication.status !== "published") {
    throw new DetailProjectionError(`QA pair ${id} is not published`);
  }
  return qa;
}

function requirePublishedPhrase(
  bundle: ContentBundle,
  id: string,
): PhrasePattern {
  const phrase = bundle.phrasePatterns.find((item) => item.id === id);
  if (!phrase) {
    throw new DetailProjectionError(`Missing phrase pattern ${id}`);
  }
  if (phrase.publication.status !== "published") {
    throw new DetailProjectionError(`Phrase pattern ${id} is not published`);
  }
  return phrase;
}

function plainTokensText(tokens: readonly TextToken[]): string {
  return tokens
    .map((token) => {
      if (token.type === "gap") return token.label;
      return token.text;
    })
    .join("");
}

function phraseRealization(phrase: PhrasePattern): string {
  const fixed = plainTokensText(phrase.fixedTokens.tokens);
  if (fixed.length > 0) return fixed;
  const first = phrase.acceptedRealizations[0];
  if (!first) {
    throw new DetailProjectionError(
      `Phrase ${phrase.id} has no published realization`,
    );
  }
  return plainTokensText(first.tokens);
}

function indexLessonIds(indexes: ContentIndexes, id: string): readonly string[] {
  const rec = indexes.byId.get(id);
  if (!rec || rec.publicationStatus !== "published") {
    throw new DetailProjectionError(`Indexed entity ${id} is not published`);
  }
  return Object.freeze([...rec.lessonIds].sort((a, b) => a.localeCompare(b)));
}

function indexSourcePriority(
  indexes: ContentIndexes,
  id: string,
): 1 | 2 | 3 | 4 | null {
  const prio = indexes.sourcePriorityById.get(id) ?? null;
  if (prio === 1 || prio === 2 || prio === 3 || prio === 4 || prio === null) {
    return prio;
  }
  throw new DetailProjectionError(`Unexpected source priority for ${id}`);
}

/**
 * Derive shared stem + feminine -in suffix from the published lemma pair only.
 * Fails closed if the pair does not support a transparent suffix operation.
 */
function personFormFromPublishedPair(
  masculine: Lexeme,
  feminine: Lexeme,
): LearnerPersonFormRelation {
  if (!masculine.noun || !feminine.noun) {
    throw new DetailProjectionError("Person-form lexemes must be nouns");
  }
  if (masculine.noun.gender !== "masculine") {
    throw new DetailProjectionError("Expected masculine base for person-form");
  }
  if (feminine.noun.gender !== "feminine") {
    throw new DetailProjectionError("Expected feminine related person-form");
  }

  const stem = masculine.lemma;
  const fem = feminine.lemma;
  if (!fem.startsWith(stem)) {
    throw new DetailProjectionError(
      "Feminine lemma does not share the published masculine stem",
    );
  }
  const suffix = fem.slice(stem.length);
  if (suffix !== "in") {
    throw new DetailProjectionError(
      "Published person-form pair is not a transparent -in operation",
    );
  }

  const meaning =
    feminine.meanings[0]?.glossEn ??
    masculine.meanings[0]?.glossEn ??
    "";
  if (!meaning) {
    throw new DetailProjectionError("Person-form meaning is missing");
  }

  return Object.freeze({
    relatedId: feminine.id,
    relatedDisplayText: `${feminine.noun.article} ${feminine.lemma}`,
    relatedArticle: feminine.noun.article,
    relatedGender: "feminine",
    relatedLemma: feminine.lemma,
    relatedMeaningEn: meaning,
    sharedStem: stem,
    feminineSuffix: suffix,
    operationLabel: `Add feminine -${suffix}`,
  });
}

function requirePublishedGrammar(
  bundle: ContentBundle,
  id: string,
): GrammarConcept {
  const grammar = bundle.grammarConcepts.find((item) => item.id === id);
  if (!grammar) throw new DetailProjectionError(`Missing grammar concept ${id}`);
  if (grammar.publication.status !== "published") {
    throw new DetailProjectionError(`Grammar concept ${id} is not published`);
  }
  return grammar;
}

function publishedPersonForm(
  bundle: ContentBundle,
  lexeme: Lexeme,
): LearnerPersonFormRelation | null {
  const edge = bundle.relationships.find(
    (relation) =>
      relation.type === "person-form-of" &&
      (relation.fromId === lexeme.id || relation.toId === lexeme.id),
  );
  if (!edge) return null;
  const from = requirePublishedLexeme(bundle, edge.fromId);
  const to = requirePublishedLexeme(bundle, edge.toId);
  const masculine = from.noun?.gender === "masculine" ? from : to;
  const feminine = from.noun?.gender === "feminine" ? from : to;
  if (
    masculine.id !== lexeme.id ||
    masculine.noun?.gender !== "masculine" ||
    feminine.noun?.gender !== "feminine" ||
    !feminine.lemma.startsWith(masculine.lemma) ||
    feminine.lemma.slice(masculine.lemma.length) !== "in"
  ) {
    return null;
  }
  return personFormFromPublishedPair(masculine, feminine);
}

function projectAnyVocabulary(
  bundle: ContentBundle,
  indexes: ContentIndexes,
  id: string,
): LearnerVocabularyDetail {
  if (id === "lex:architekt") return projectVocabulary(bundle, indexes);
  const lexeme = requirePublishedLexeme(bundle, id);
  const meaningEn = lexeme.meanings[0]?.glossEn;
  if (!meaningEn) throw new DetailProjectionError(`Lexeme ${id} is missing English meaning`);
  const noun = lexeme.noun;
  if (noun && !isGender(noun.gender)) {
    throw new DetailProjectionError(`Lexeme ${id} has unexpected gender`);
  }
  const plurals = Object.freeze(
    (noun?.plurals ?? []).map((entry) => entry.form).filter((form) => form.length > 0),
  );
  const displayText = noun ? `${noun.article} ${lexeme.lemma}` : lexeme.lemma;
  return Object.freeze({
    kind: "Lexeme",
    id,
    hubSegment: "vocabulary",
    displayText,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    lemma: lexeme.lemma,
    meaningEn,
    article: noun?.article ?? null,
    gender: noun?.gender ?? null,
    singular: noun?.singular ?? lexeme.lemma,
    plurals,
    pluralGapMessage:
      noun && plurals.length === 0 ? DETAIL_PLURAL_GAP_MESSAGE : null,
    personForm: publishedPersonForm(bundle, lexeme),
    media: resolveMediaAvailability({
      conceptIds: [id],
      spokenTexts: [displayText, lexeme.lemma],
    }),
    canonicalPath: detailCanonicalPath("vocabulary", id),
  });
}

function projectVocabulary(
  bundle: ContentBundle,
  indexes: ContentIndexes,
): LearnerVocabularyRepresentative {
  const id = "lex:architekt" as const;
  const lexeme = requirePublishedLexeme(bundle, id);
  if (!lexeme.noun) {
    throw new DetailProjectionError(`${id} is missing noun forms`);
  }
  if (!isGender(lexeme.noun.gender)) {
    throw new DetailProjectionError(`${id} has unexpected gender`);
  }

  // Published person-form-of: from feminine → to masculine.
  const edge = bundle.relationships.find(
    (rel) =>
      rel.type === "person-form-of" &&
      rel.toId === id &&
      rel.fromId === "lex:architektin",
  );
  if (!edge) {
    throw new DetailProjectionError(
      "Missing published person-form relation for lex:architekt",
    );
  }
  const related = requirePublishedLexeme(bundle, edge.fromId);
  const personForm = personFormFromPublishedPair(lexeme, related);

  const plurals = Object.freeze(
    lexeme.noun.plurals.map((entry) => entry.form).filter((form) => form.length > 0),
  );
  // Only the glossary-published plural may appear — never an invented form.
  if (
    plurals.length !== VOCAB_ARCHITEKT_CANONICAL.plurals.length ||
    plurals.some((form, index) => form !== VOCAB_ARCHITEKT_CANONICAL.plurals[index])
  ) {
    throw new DetailProjectionError(
      `${id} published plurals diverge from the canonical contract`,
    );
  }

  const meaningEn = lexeme.meanings[0]?.glossEn;
  if (!meaningEn) {
    throw new DetailProjectionError(`${id} is missing English meaning`);
  }

  const displayText = `${lexeme.noun.article} ${lexeme.lemma}`;
  const media = resolveMediaAvailability({
    conceptIds: [id, "profession:architekt"],
    spokenTexts: [displayText, lexeme.lemma],
  });

  return Object.freeze({
    kind: "Lexeme",
    id,
    hubSegment: "vocabulary",
    displayText,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    lemma: lexeme.lemma,
    meaningEn,
    article: lexeme.noun.article,
    gender: lexeme.noun.gender,
    singular: lexeme.noun.singular,
    plurals,
    pluralGapMessage: plurals.length === 0 ? DETAIL_PLURAL_GAP_MESSAGE : null,
    personForm,
    media,
    canonicalPath: detailCanonicalPath("vocabulary", id),
  });
}

function projectVerb(
  bundle: ContentBundle,
  indexes: ContentIndexes,
): LearnerVerbRepresentative {
  const id = "verb:sein" as const;
  const verb = requirePublishedVerb(bundle, id);
  const meaningEn = verb.meanings[0]?.glossEn;
  if (!meaningEn) {
    throw new DetailProjectionError(`${id} is missing English meaning`);
  }

  if (verb.present.length !== 7) {
    throw new DetailProjectionError(
      `${id} must publish exactly seven present forms`,
    );
  }

  const byPerson = new Map(verb.present.map((row) => [row.person, row.form]));
  const present: LearnerVerbPresentForm[] = [];
  for (const expected of VERB_SEIN_PRESENT_CANONICAL) {
    const form = byPerson.get(expected.person);
    if (form == null || form !== expected.form || !isVerbPersonKey(expected.person)) {
      throw new DetailProjectionError(
        `${id} missing or mismatched present form for ${expected.person}`,
      );
    }
    present.push(
      Object.freeze({
        person: expected.person,
        form: expected.form,
        personLabel: PERSON_LABELS[expected.person],
      }),
    );
  }

  const media = resolveMediaAvailability({
    conceptIds: [id],
    spokenTexts: [verb.infinitive],
  });

  return Object.freeze({
    kind: "Verb",
    id,
    hubSegment: "verbs",
    displayText: verb.infinitive,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    infinitive: verb.infinitive,
    meaningEn,
    present: Object.freeze(present),
    paradigmNote: DETAIL_VERB_PARADIGM_NOTE,
    media,
    canonicalPath: detailCanonicalPath("verbs", id),
  });
}

function projectAnyVerb(
  bundle: ContentBundle,
  indexes: ContentIndexes,
  id: string,
): LearnerVerbDetail {
  if (id === "verb:sein") return projectVerb(bundle, indexes);
  const verb = requirePublishedVerb(bundle, id);
  const meaningEn = verb.meanings[0]?.glossEn;
  if (!meaningEn) throw new DetailProjectionError(`Verb ${id} is missing English meaning`);
  const present = Object.freeze(
    verb.present.map((row) => {
      if (!isVerbPersonKey(row.person)) {
        throw new DetailProjectionError(`Verb ${id} has unexpected person key`);
      }
      return Object.freeze({
        person: row.person,
        form: row.form,
        personLabel: PERSON_LABELS[row.person],
      });
    }),
  );
  return Object.freeze({
    kind: "Verb",
    id,
    hubSegment: "verbs",
    displayText: verb.infinitive,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    infinitive: verb.infinitive,
    meaningEn,
    present,
    paradigmNote:
      present.length > 0
        ? "Only the confirmed present-tense forms are shown."
        : "Present-tense forms are not available yet for this verb.",
    media: resolveMediaAvailability({ conceptIds: [id], spokenTexts: [verb.infinitive] }),
    canonicalPath: detailCanonicalPath("verbs", id),
  });
}

const QA_CONVERSATION_LEVEL_COPY: Readonly<
  Record<
    (typeof CONVERSATION_LEVEL_IDS)[number],
    { readonly title: string; readonly description: string }
  >
> = Object.freeze({
  model: Object.freeze({
    title: "Model",
    description: "Study the question and answer patterns.",
  }),
  "guided-recognition": Object.freeze({
    title: "Guided recognition",
    description: "Choose among the accepted answer patterns.",
  }),
  substitution: Object.freeze({
    title: "Substitution",
    description:
      "Build one complete answer using only the fragments given here.",
  }),
  "independent-construction": Object.freeze({
    title: "Independent construction",
    description:
      "Type only the fixed patterns taught here; sentences with a profession filled in are not accepted.",
  }),
  "spoken-role-play": Object.freeze({
    title: "Spoken role-play",
    description:
      "Record, play back, and self-check. Self-rating is reflection only.",
  }),
});

function buildQaConversationLevels(): LearnerQaDetail["conversationLevels"] {
  const levels = CONVERSATION_LEVEL_IDS.map((id) => {
    const copy = QA_CONVERSATION_LEVEL_COPY[id];
    return Object.freeze({
      id,
      title: copy.title,
      status: "available" as const,
      description: copy.description,
    });
  });
  assertExactConversationLevelIds(levels.map((level) => level.id));
  return Object.freeze(levels);
}

function projectQa(
  bundle: ContentBundle,
  indexes: ContentIndexes,
): LearnerQaRepresentative {
  const id = "qa:profession-casual-main" as const;
  const qa = requirePublishedQa(bundle, id);
  if (qa.register !== "informal") {
    throw new DetailProjectionError(`${id} register must be informal`);
  }

  const questionPhrase = requirePublishedPhrase(bundle, qa.questionPatternId);
  const questionText = phraseRealization(questionPhrase);
  const answers = qa.answerPatternIds.map((answerId) => {
    const phrase = requirePublishedPhrase(bundle, answerId);
    return Object.freeze({
      id: answerId,
      realization: phraseRealization(phrase),
      role: "answer" as const,
    });
  });

  if (answers.length !== 3) {
    throw new DetailProjectionError(`${id} must have three published answers`);
  }

  const acceptedRealizations = Object.freeze([
    questionText,
    ...answers.map((a) => a.realization),
  ]);

  const media = resolveMediaAvailability({
    conceptIds: [id, "qa:profession-casual"],
    spokenTexts: [questionText],
  });

  return Object.freeze({
    kind: "QAPair",
    id,
    hubSegment: "phrases",
    displayText: questionText,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    intent: qa.intent,
    register: "informal",
    question: Object.freeze({
      id: questionPhrase.id,
      realization: questionText,
      role: "question",
    }),
    answers: Object.freeze(answers),
    acceptedRealizations,
    conversationLevels: buildQaConversationLevels(),
    media,
    canonicalPath: detailCanonicalPath("phrases", id),
  });
}

function projectAnyQa(
  bundle: ContentBundle,
  indexes: ContentIndexes,
  id: string,
): LearnerQaDetail {
  if (id === "qa:profession-casual-main") return projectQa(bundle, indexes);
  const qa = requirePublishedQa(bundle, id);
  const questionPhrase = requirePublishedPhrase(bundle, qa.questionPatternId);
  const questionText = phraseRealization(questionPhrase);
  const answers = Object.freeze(
    qa.answerPatternIds.map((answerId) => {
      const phrase = requirePublishedPhrase(bundle, answerId);
      return Object.freeze({
        id: answerId,
        realization: phraseRealization(phrase),
        role: "answer" as const,
      });
    }),
  );
  if (answers.length === 0) {
    throw new DetailProjectionError(`QA pair ${id} has no published answers`);
  }
  return Object.freeze({
    kind: "QAPair",
    id,
    hubSegment: "phrases",
    displayText: questionText,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    intent: qa.intent,
    register: qa.register,
    question: Object.freeze({
      id: questionPhrase.id,
      realization: questionText,
      role: "question",
    }),
    answers,
    acceptedRealizations: Object.freeze([
      questionText,
      ...answers.map((answer) => answer.realization),
    ]),
    conversationLevels: Object.freeze([]),
    media: resolveMediaAvailability({ conceptIds: [id], spokenTexts: [questionText] }),
    canonicalPath: detailCanonicalPath("phrases", id),
  });
}

function projectGrammar(
  bundle: ContentBundle,
  indexes: ContentIndexes,
  id: string,
): LearnerGrammarDetail {
  const grammar = requirePublishedGrammar(bundle, id);
  const titleDe = grammar.titleDe?.trim();
  if (!titleDe) throw new DetailProjectionError(`Grammar concept ${id} is missing German title`);
  if (grammar.ruleSteps.length === 0) {
    throw new DetailProjectionError(`Grammar concept ${id} has no published rule steps`);
  }
  const prerequisiteLabels = Object.freeze(
    grammar.prerequisiteIds.map((prerequisiteId) => {
      const prerequisite = requirePublishedGrammar(bundle, prerequisiteId);
      return prerequisite.titleDe?.trim() || prerequisite.titleEn;
    }),
  );
  const record = indexes.byId.get(id);
  if (!record || record.kind !== "GrammarConcept") {
    throw new DetailProjectionError(`Grammar concept ${id} is missing from learner index`);
  }
  const models = grammar.ruleSteps
    .map((step) => (step.model ? plainTokensText(step.model.tokens) : ""))
    .filter(Boolean);
  return Object.freeze({
    kind: "GrammarConcept",
    id,
    hubSegment: "grammar",
    displayText: titleDe,
    publicationStatus: "published",
    lessonIds: indexLessonIds(indexes, id),
    sourcePriority: indexSourcePriority(indexes, id),
    titleDe,
    titleEn: grammar.titleEn,
    notice: plainTokensText(grammar.noticeTarget.tokens),
    ruleSteps: Object.freeze(
      grammar.ruleSteps.map((step) => Object.freeze({
        id: step.id,
        notice: plainTokensText(step.notice.tokens),
        model: step.model ? plainTokensText(step.model.tokens) : null,
      })),
    ),
    prerequisiteIds: Object.freeze([...grammar.prerequisiteIds]),
    prerequisiteLabels,
    commonErrorTags: Object.freeze([...grammar.commonErrorTags]),
    activityIds: Object.freeze([...record.activityIds]),
    media: resolveMediaAvailability({
      conceptIds: [id],
      spokenTexts: [titleDe, ...models],
    }),
    canonicalPath: detailCanonicalPath("grammar", id),
  });
}

export function projectLearnerDetailProjection(
  bundle: ContentBundle,
): LearnerDetailProjection {
  const indexes = buildContentIndexes(bundle);
  const vocabulary = projectVocabulary(bundle, indexes);
  const verb = projectVerb(bundle, indexes);
  const qa = projectQa(bundle, indexes);

  const byId = Object.freeze({
    "lex:architekt": vocabulary,
    "verb:sein": verb,
    "qa:profession-casual-main": qa,
  }) as LearnerDetailProjection["representativesById"];

  for (const id of DETAIL_REPRESENTATIVE_IDS) {
    if (byId[id].id !== id) {
      throw new DetailProjectionError(`Representative id mismatch for ${id}`);
    }
  }

  const publishedIds = (kind: "Lexeme" | "Verb" | "GrammarConcept" | "QAPair") =>
    [...(indexes.byKind.get(kind) ?? [])].sort((a, b) => a.localeCompare(b));
  const details = Object.freeze([
    ...publishedIds("Lexeme").map((id) =>
      id === vocabulary.id ? vocabulary : projectAnyVocabulary(bundle, indexes, id)),
    ...publishedIds("Verb").map((id) =>
      id === verb.id ? verb : projectAnyVerb(bundle, indexes, id)),
    ...publishedIds("GrammarConcept").map((id) =>
      projectGrammar(bundle, indexes, id)),
    ...publishedIds("QAPair").map((id) =>
      id === qa.id ? qa : projectAnyQa(bundle, indexes, id)),
  ]);
  const detailsById = Object.freeze(
    Object.fromEntries(details.map((detail) => [detail.id, detail])),
  ) as Readonly<Record<string, LearnerDetailRecord>>;
  if (Object.keys(detailsById).length !== details.length) {
    throw new DetailProjectionError("Duplicate learner detail id");
  }

  const representativeDetailsById = Object.freeze({
    "lex:architekt": detailsById["lex:architekt"]!,
    "verb:sein": detailsById["verb:sein"]!,
    "qa:profession-casual-main": detailsById["qa:profession-casual-main"]!,
  }) as LearnerDetailProjection["representativesById"];
  const representatives = Object.freeze([
    representativeDetailsById["lex:architekt"],
    representativeDetailsById["verb:sein"],
    representativeDetailsById["qa:profession-casual-main"],
  ] as const);

  return Object.freeze({
    schemaVersion: "1.0.0",
    projectionKind: "learner-details",
    representativeCount: 3,
    representatives,
    representativesById: representativeDetailsById,
    detailCount: details.length,
    details,
    detailsById,
  });
}

export function projectPublishedLearnerDetails(
  publishedDir: string,
): LearnerDetailProjection {
  const bundle = loadValidatedBundleOrThrow(publishedDir);
  return projectLearnerDetailProjection(bundle);
}

export function serializeDetailProjectionDeterministic(
  projection: LearnerDetailProjection,
): string {
  return `${stableStringify(projection)}\n`;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value != null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of entries) {
      out[key] = sortValue(nested);
    }
    return out;
  }
  return value;
}

export function getDetailById(
  projection: LearnerDetailProjection,
  id: string,
): LearnerDetailRecord | null {
  return projection.detailsById[id] ?? null;
}
