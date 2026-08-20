import { isPrefixedId, type IdPrefix } from "../ids/index.js";
import type { ContentBundle } from "../types/bundle.js";
import { CONTENT_SCHEMA_VERSION, LOOP_MODES } from "../types/common.js";
import { issue, type ValidationIssue } from "./errors.js";

const HTML_PATTERN = /<\s*\/?\s*[a-zA-Z][^>]*>/;
const LOOP_MODE_SET = new Set<string>(LOOP_MODES);
const TOKEN_TYPES = new Set(["plain", "emphasis", "gender", "morph", "gap"]);
const PUBLICATION_STATUSES = new Set(["draft", "review", "published", "blocked"]);
const CEFR_LEVELS = new Set(["A1"]);
const LESSON_STAGE_KINDS = new Set([
  "overview",
  "learn",
  "listen",
  "practise",
  "check",
  "review",
  "summary",
]);
const GENDERS = new Set(["masculine", "feminine", "neuter", "plural"]);
const MORPH_TAGS = new Set(["REG", "SPELL", "IRR", "STEM", "SUFFIX"]);

function requireString(
  issues: ValidationIssue[],
  objectId: string,
  field: string,
  value: unknown,
): value is string {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(
      issue("REQUIRED_FIELD", `Missing or empty required field`, { objectId, field }),
    );
    return false;
  }
  return true;
}

function requireId(
  issues: ValidationIssue[],
  objectId: string,
  field: string,
  value: unknown,
  prefix: IdPrefix,
): void {
  if (typeof value !== "string" || !isPrefixedId(value, prefix)) {
    issues.push(
      issue("INVALID_ID", `Expected ${prefix}:<slug>`, { objectId, field }),
    );
  }
}

function rejectHtml(
  issues: ValidationIssue[],
  objectId: string,
  field: string,
  value: unknown,
): void {
  if (typeof value === "string" && HTML_PATTERN.test(value)) {
    issues.push(
      issue("HTML_CONTENT", `Raw HTML is not allowed in content fields`, {
        objectId,
        field,
      }),
    );
  }
}

function checkStructuredText(
  issues: ValidationIssue[],
  objectId: string,
  field: string,
  value: unknown,
  opts?: { required?: boolean },
): void {
  const required = opts?.required ?? true;
  if (value == null) {
    if (required) {
      issues.push(issue("REQUIRED_FIELD", `StructuredText required`, { objectId, field }));
    }
    return;
  }
  if (typeof value !== "object") {
    issues.push(issue("REQUIRED_FIELD", `StructuredText required`, { objectId, field }));
    return;
  }
  const tokens = (value as { tokens?: unknown }).tokens;
  if (!Array.isArray(tokens)) {
    issues.push(issue("REQUIRED_FIELD", `StructuredText.tokens required`, { objectId, field }));
    return;
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] as { type?: string; text?: string; label?: string };
    if (!t || typeof t !== "object" || typeof t.type !== "string") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Token discriminant missing`, {
          objectId,
          field: `${field}.tokens[${i}]`,
        }),
      );
      continue;
    }
    if (!TOKEN_TYPES.has(t.type)) {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Unknown StructuredText token type`, {
          objectId,
          field: `${field}.tokens[${i}].type`,
        }),
      );
      continue;
    }
    const tokenField = `${field}.tokens[${i}]`;
    if (t.type === "gap") {
      requireString(issues, objectId, `${tokenField}.label`, t.label);
    } else {
      requireString(issues, objectId, `${tokenField}.text`, t.text);
    }
    if (t.type === "gender" && !GENDERS.has(String((t as Record<string, unknown>).gender))) {
      issues.push(issue("INVALID_DISCRIMINANT", `Unknown gender token value`, {
        objectId,
        field: `${tokenField}.gender`,
      }));
    }
    if (t.type === "morph" && !MORPH_TAGS.has(String((t as Record<string, unknown>).tag))) {
      issues.push(issue("INVALID_DISCRIMINANT", `Unknown morph token tag`, {
        objectId,
        field: `${tokenField}.tag`,
      }));
    }
    if ("text" in t) rejectHtml(issues, objectId, `${tokenField}.text`, t.text);
    if ("label" in t) rejectHtml(issues, objectId, `${tokenField}.label`, t.label);
  }
}

function requirePublication(
  issues: ValidationIssue[],
  objectId: string,
  publication: unknown,
): void {
  if (publication == null || typeof publication !== "object") {
    issues.push(
      issue("REQUIRED_FIELD", `publication object required`, {
        objectId,
        field: "publication",
      }),
    );
    return;
  }
  const pub = publication as { status?: unknown; publishedFields?: unknown };
  if (typeof pub.status !== "string" || pub.status.length === 0) {
    issues.push(
      issue("REQUIRED_FIELD", `publication.status required`, {
        objectId,
        field: "publication.status",
      }),
    );
  } else if (!PUBLICATION_STATUSES.has(pub.status)) {
    issues.push(issue("INVALID_DISCRIMINANT", `Unknown publication status`, {
      objectId,
      field: "publication.status",
    }));
  }
  if (pub.publishedFields !== undefined && !Array.isArray(pub.publishedFields)) {
    issues.push(
      issue("REQUIRED_FIELD", `publication.publishedFields must be an array`, {
        objectId,
        field: "publication.publishedFields",
      }),
    );
  }
}

function checkPrompt(
  issues: ValidationIssue[],
  objectId: string,
  prompt: unknown,
): void {
  if (!prompt || typeof prompt !== "object") {
    issues.push(
      issue("REQUIRED_FIELD", `prompt required`, { objectId, field: "prompt" }),
    );
    return;
  }
  const p = prompt as {
    instruction?: unknown;
    stem?: unknown;
    choices?: Array<{ id?: string; label?: unknown }>;
  };
  checkStructuredText(issues, objectId, "prompt.instruction", p.instruction);
  if (p.stem != null) {
    checkStructuredText(issues, objectId, "prompt.stem", p.stem);
  }
  if (p.choices != null) {
    if (!Array.isArray(p.choices)) {
      issues.push(
        issue("REQUIRED_FIELD", `prompt.choices must be an array`, {
          objectId,
          field: "prompt.choices",
        }),
      );
    } else {
      for (let i = 0; i < p.choices.length; i++) {
        const choice = p.choices[i];
        checkStructuredText(issues, objectId, `prompt.choices[${i}].label`, choice?.label);
      }
    }
  }
}

/**
 * Reject raw HTML in every string payload of every AnswerSpec variant.
 */
function checkAnswerSpec(
  issues: ValidationIssue[],
  objectId: string,
  answerSpec: unknown,
): void {
  if (answerSpec == null) return;
  if (typeof answerSpec !== "object" || Array.isArray(answerSpec)) {
    issues.push(
      issue("INVALID_DISCRIMINANT", `answerSpec must be an object`, {
        objectId,
        field: "answerSpec",
      }),
    );
    return;
  }
  const spec = answerSpec as {
    type?: unknown;
    accepted?: unknown;
    acceptedTokenSets?: unknown;
    correctIds?: unknown;
    correctOrder?: unknown;
  };
  if (typeof spec.type !== "string") {
    issues.push(
      issue("INVALID_DISCRIMINANT", `answerSpec.type required`, {
        objectId,
        field: "answerSpec.type",
      }),
    );
    return;
  }

  if (spec.type === "exact") {
    if (!Array.isArray(spec.accepted)) {
      issues.push(
        issue("REQUIRED_FIELD", `answerSpec.accepted required`, {
          objectId,
          field: "answerSpec.accepted",
        }),
      );
      return;
    }
    for (let i = 0; i < spec.accepted.length; i++) {
      rejectHtml(issues, objectId, `answerSpec.accepted[${i}]`, spec.accepted[i]);
    }
    return;
  }

  if (spec.type === "tokens") {
    if (!Array.isArray(spec.acceptedTokenSets)) {
      issues.push(
        issue("REQUIRED_FIELD", `answerSpec.acceptedTokenSets required`, {
          objectId,
          field: "answerSpec.acceptedTokenSets",
        }),
      );
      return;
    }
    for (let i = 0; i < spec.acceptedTokenSets.length; i++) {
      const set = spec.acceptedTokenSets[i];
      if (!Array.isArray(set)) {
        issues.push(
          issue("REQUIRED_FIELD", `answerSpec.acceptedTokenSets entry must be an array`, {
            objectId,
            field: `answerSpec.acceptedTokenSets[${i}]`,
          }),
        );
        continue;
      }
      for (let j = 0; j < set.length; j++) {
        rejectHtml(
          issues,
          objectId,
          `answerSpec.acceptedTokenSets[${i}][${j}]`,
          set[j],
        );
      }
    }
    return;
  }

  if (spec.type === "choice") {
    if (!Array.isArray(spec.correctIds)) {
      issues.push(
        issue("REQUIRED_FIELD", `answerSpec.correctIds required`, {
          objectId,
          field: "answerSpec.correctIds",
        }),
      );
      return;
    }
    for (let i = 0; i < spec.correctIds.length; i++) {
      rejectHtml(issues, objectId, `answerSpec.correctIds[${i}]`, spec.correctIds[i]);
    }
    return;
  }

  if (spec.type === "order") {
    if (!Array.isArray(spec.correctOrder)) {
      issues.push(
        issue("REQUIRED_FIELD", `answerSpec.correctOrder required`, {
          objectId,
          field: "answerSpec.correctOrder",
        }),
      );
      return;
    }
    for (let i = 0; i < spec.correctOrder.length; i++) {
      rejectHtml(issues, objectId, `answerSpec.correctOrder[${i}]`, spec.correctOrder[i]);
    }
    return;
  }

  issues.push(
    issue("INVALID_DISCRIMINANT", `Unknown answerSpec.type`, {
      objectId,
      field: "answerSpec.type",
    }),
  );
}

/** Emit a stable element-level issue for null/non-object array members; never throw. */
/**
 * A lexeme usage example must be a verbatim source quote that can be traced
 * back to a page: German, that source's own English, and the document + page.
 * Anything partial is rejected rather than shipped as an untraceable example.
 */
function checkLexemeExample(
  issues: ValidationIssue[],
  objectId: string,
  value: unknown,
): void {
  if (value == null) return;
  if (typeof value !== "object" || Array.isArray(value)) {
    issues.push(
      issue("INVALID_TYPE", `example must be an object`, { objectId, field: "example" }),
    );
    return;
  }
  const example = value as Record<string, unknown>;
  requireString(issues, objectId, "example.de", example.de);
  rejectHtml(issues, objectId, "example.de", example.de);
  requireString(issues, objectId, "example.translationEn", example.translationEn);
  rejectHtml(issues, objectId, "example.translationEn", example.translationEn);

  const ref = example.sourceRef;
  if (ref == null || typeof ref !== "object" || Array.isArray(ref)) {
    issues.push(
      issue("REQUIRED_FIELD", `example.sourceRef required`, {
        objectId,
        field: "example.sourceRef",
      }),
    );
    return;
  }
  const sourceRef = ref as Record<string, unknown>;
  requireString(issues, objectId, "example.sourceRef.sourceFileId", sourceRef.sourceFileId);
  requireString(issues, objectId, "example.sourceRef.documentTitle", sourceRef.documentTitle);
  rejectHtml(issues, objectId, "example.sourceRef.documentTitle", sourceRef.documentTitle);
  if (
    typeof sourceRef.page !== "number" ||
    !Number.isSafeInteger(sourceRef.page) ||
    sourceRef.page < 1
  ) {
    issues.push(
      issue("REQUIRED_FIELD", `example.sourceRef.page must be a positive page number`, {
        objectId,
        field: "example.sourceRef.page",
      }),
    );
  }
  if ("exercise" in sourceRef) {
    requireString(issues, objectId, "example.sourceRef.exercise", sourceRef.exercise);
    rejectHtml(issues, objectId, "example.sourceRef.exercise", sourceRef.exercise);
  }
}

function requireObjectElement(
  issues: ValidationIssue[],
  arrayField: string,
  index: number,
  value: unknown,
): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    issues.push(
      issue("INVALID_TYPE", `Bundle.${arrayField}[${index}] must be an object`, {
        field: `${arrayField}[${index}]`,
      }),
    );
    return false;
  }
  return true;
}

/**
 * Required fields, discriminants, ID prefixes, lemma slash rule, no HTML.
 * Malformed shapes yield stable issues — never throws.
 */
export function validateSchemaShape(bundle: unknown): {
  issues: ValidationIssue[];
  bundle?: ContentBundle;
} {
  const issues: ValidationIssue[] = [];

  if (!bundle || typeof bundle !== "object") {
    return {
      issues: [issue("INVALID_TYPE", `Bundle must be an object`)],
    };
  }

  const b = bundle as ContentBundle;

  if (b.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    issues.push(
      issue("SCHEMA_VERSION", `Expected schemaVersion ${CONTENT_SCHEMA_VERSION}`, {
        field: "schemaVersion",
      }),
    );
  }

  const arrays: Array<keyof ContentBundle> = [
    "sources",
    "sourceAssertions",
    "mediaAssets",
    "lessons",
    "lexemes",
    "verbs",
    "grammarConcepts",
    "phrasePatterns",
    "qaPairs",
    "dialogues",
    "listeningAssets",
    "collections",
    "learningActivities",
    "relationships",
    "contentGaps",
  ];

  const bag = b as unknown as Record<string, unknown>;
  for (const key of arrays) {
    if (!Array.isArray(bag[key as string])) {
      issues.push(
        issue("REQUIRED_FIELD", `Bundle.${String(key)} must be an array`, {
          field: String(key),
        }),
      );
    }
  }

  if (issues.some((i) => i.code === "REQUIRED_FIELD" && !i.objectId)) {
    return { issues };
  }

  const sources = b.sources ?? [];
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!requireObjectElement(issues, "sources", i, s)) continue;
    const objectId = String(s.id ?? "unknown");
    if (s.kind !== "Source") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Source`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", s.id, "source");
    requireString(issues, objectId, "title", s.title);
  }

  const sourceAssertions = b.sourceAssertions ?? [];
  for (let i = 0; i < sourceAssertions.length; i++) {
    const a = sourceAssertions[i];
    if (!requireObjectElement(issues, "sourceAssertions", i, a)) continue;
    const objectId = String(a.id ?? "unknown");
    if (a.kind !== "SourceAssertion") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind SourceAssertion`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", a.id, "assert");
    requireString(issues, objectId, "subjectId", a.subjectId);
    requireString(issues, objectId, "field", a.field);
    if (typeof a.confidence !== "number" || a.confidence < 0 || a.confidence > 1) {
      issues.push(
        issue("REQUIRED_FIELD", `confidence must be 0..1`, {
          objectId,
          field: "confidence",
        }),
      );
    }
  }

  const mediaAssets = b.mediaAssets ?? [];
  for (let i = 0; i < mediaAssets.length; i++) {
    const m = mediaAssets[i];
    if (!requireObjectElement(issues, "mediaAssets", i, m)) continue;
    const objectId = String(m.id ?? "unknown");
    if (m.kind !== "MediaAsset") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind MediaAsset`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", m.id, "media");
    if (!Array.isArray(m.variants) || m.variants.length === 0) {
      issues.push(
        issue("REQUIRED_FIELD", `variants required`, { objectId, field: "variants" }),
      );
    }
    if (typeof m.spokenText === "string") {
      rejectHtml(issues, objectId, "spokenText", m.spokenText);
    }
    requirePublication(issues, objectId, m.publication);
  }

  const lessons = b.lessons ?? [];
  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    if (!requireObjectElement(issues, "lessons", i, lesson)) continue;
    const objectId = String(lesson.id ?? "unknown");
    if (lesson.kind !== "Lesson") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Lesson`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", lesson.id, "lesson");
    requireString(issues, objectId, "titleDe", lesson.titleDe);
    requireString(issues, objectId, "titleEn", lesson.titleEn);
    rejectHtml(issues, objectId, "titleDe", lesson.titleDe);
    rejectHtml(issues, objectId, "titleEn", lesson.titleEn);
    if (!CEFR_LEVELS.has(String(lesson.cefr))) {
      issues.push(issue("INVALID_DISCRIMINANT", `Unsupported CEFR level`, {
        objectId,
        field: "cefr",
      }));
    }
    if (typeof lesson.number !== "number") {
      issues.push(
        issue("REQUIRED_FIELD", `number required`, { objectId, field: "number" }),
      );
    }
    if (!Array.isArray(lesson.communicativeGoals)) {
      issues.push(
        issue("REQUIRED_FIELD", `communicativeGoals required`, {
          objectId,
          field: "communicativeGoals",
        }),
      );
    } else {
      for (let g = 0; g < lesson.communicativeGoals.length; g++) {
        rejectHtml(
          issues,
          objectId,
          `communicativeGoals[${g}]`,
          lesson.communicativeGoals[g],
        );
      }
    }
    if (!Array.isArray(lesson.stages)) {
      issues.push(
        issue("REQUIRED_FIELD", `stages required`, { objectId, field: "stages" }),
      );
    } else {
      for (const stage of lesson.stages) {
        if (!stage || typeof stage !== "object") continue;
        requireString(issues, objectId, `stages.${stage.id ?? "?"}.id`, stage.id);
        if (!LESSON_STAGE_KINDS.has(String(stage.kind))) {
          issues.push(
            issue("INVALID_DISCRIMINANT", `Unknown LessonStage.kind`, {
              objectId,
              field: `stages.${stage.id ?? "?"}.kind`,
            }),
          );
        }
      }
    }
    requirePublication(issues, objectId, lesson.publication);
  }

  const lexemes = b.lexemes ?? [];
  for (let i = 0; i < lexemes.length; i++) {
    const lex = lexemes[i];
    if (!requireObjectElement(issues, "lexemes", i, lex)) continue;
    const objectId = String(lex.id ?? "unknown");
    if (lex.kind !== "Lexeme") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Lexeme`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", lex.id, "lex");
    requireString(issues, objectId, "lemma", lex.lemma);
    requireString(issues, objectId, "partOfSpeech", lex.partOfSpeech);
    rejectHtml(issues, objectId, "lemma", lex.lemma);

    if (typeof lex.lemma === "string" && lex.lemma.includes("/")) {
      issues.push(
        issue(
          "SLASH_LEMMA",
          `Canonical lemma must not contain slash alternatives; use separate lexemes + related-concept`,
          { objectId, field: "lemma" },
        ),
      );
    }

    if (!Array.isArray(lex.meanings) || lex.meanings.length === 0) {
      issues.push(
        issue("REQUIRED_FIELD", `meanings required`, { objectId, field: "meanings" }),
      );
    } else {
      for (let mi = 0; mi < lex.meanings.length; mi++) {
        const meaning = lex.meanings[mi];
        if (!meaning || typeof meaning !== "object") {
          issues.push(
            issue("INVALID_TYPE", `meanings entry must be an object`, {
              objectId,
              field: `meanings[${mi}]`,
            }),
          );
          continue;
        }
        requireId(issues, objectId, `meanings[${mi}].id`, meaning.id, "meaning");
        requireString(issues, objectId, `meanings[${mi}].glossEn`, meaning.glossEn);
        rejectHtml(issues, objectId, `meanings[${mi}].glossEn`, meaning.glossEn);
        if ("glossEs" in meaning) {
          rejectHtml(issues, objectId, `meanings[${mi}].glossEs`, meaning.glossEs);
        }
        if ("notes" in meaning) {
          rejectHtml(issues, objectId, `meanings[${mi}].notes`, meaning.notes);
        }
      }
    }
    if (!lex.pronunciation || typeof lex.pronunciation !== "object") {
      issues.push(
        issue("REQUIRED_FIELD", `pronunciation required`, {
          objectId,
          field: "pronunciation",
        }),
      );
    }
    if ("example" in lex) {
      checkLexemeExample(issues, objectId, lex.example);
    }
    requirePublication(issues, objectId, lex.publication);
  }

  const verbs = b.verbs ?? [];
  for (let i = 0; i < verbs.length; i++) {
    const verb = verbs[i];
    if (!requireObjectElement(issues, "verbs", i, verb)) continue;
    const objectId = String(verb.id ?? "unknown");
    if (verb.kind !== "Verb") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Verb`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", verb.id, "verb");
    requireString(issues, objectId, "infinitive", verb.infinitive);
    rejectHtml(issues, objectId, "infinitive", verb.infinitive);
    if (typeof verb.infinitive === "string" && verb.infinitive.includes("/")) {
      issues.push(
        issue("SLASH_LEMMA", `Canonical infinitive must not contain slash alternatives`, {
          objectId,
          field: "infinitive",
        }),
      );
    }
    if (!Array.isArray(verb.meanings) || verb.meanings.length === 0) {
      issues.push(
        issue("REQUIRED_FIELD", `meanings required`, { objectId, field: "meanings" }),
      );
    } else {
      for (let mi = 0; mi < verb.meanings.length; mi++) {
        const meaning = verb.meanings[mi];
        if (!meaning || typeof meaning !== "object") {
          issues.push(
            issue("INVALID_TYPE", `meanings entry must be an object`, {
              objectId,
              field: `meanings[${mi}]`,
            }),
          );
          continue;
        }
        requireString(issues, objectId, `meanings[${mi}].glossEn`, meaning.glossEn);
        rejectHtml(issues, objectId, `meanings[${mi}].glossEn`, meaning.glossEn);
        if ("useNote" in meaning) {
          rejectHtml(issues, objectId, `meanings[${mi}].useNote`, meaning.useNote);
        }
      }
    }
    if (!Array.isArray(verb.present)) {
      issues.push(
        issue("REQUIRED_FIELD", `present paradigm required`, {
          objectId,
          field: "present",
        }),
      );
    } else {
      for (let pi = 0; pi < verb.present.length; pi++) {
        const form = verb.present[pi];
        if (!form || typeof form !== "object") continue;
        rejectHtml(issues, objectId, `present[${pi}].form`, form.form);
      }
    }
    if (Array.isArray(verb.collocations)) {
      for (let ci = 0; ci < verb.collocations.length; ci++) {
        checkStructuredText(issues, objectId, `collocations[${ci}]`, verb.collocations[ci]);
      }
    }
    requirePublication(issues, objectId, verb.publication);
  }

  const grammarConcepts = b.grammarConcepts ?? [];
  for (let i = 0; i < grammarConcepts.length; i++) {
    const g = grammarConcepts[i];
    if (!requireObjectElement(issues, "grammarConcepts", i, g)) continue;
    const objectId = String(g.id ?? "unknown");
    if (g.kind !== "GrammarConcept") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind GrammarConcept`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", g.id, "gram");
    requireString(issues, objectId, "titleEn", g.titleEn);
    rejectHtml(issues, objectId, "titleEn", g.titleEn);
    checkStructuredText(issues, objectId, "noticeTarget", g.noticeTarget);
    if (!Array.isArray(g.ruleSteps)) {
      issues.push(
        issue("REQUIRED_FIELD", `ruleSteps required`, { objectId, field: "ruleSteps" }),
      );
    } else {
      for (let si = 0; si < g.ruleSteps.length; si++) {
        const step = g.ruleSteps[si];
        if (!step || typeof step !== "object") continue;
        checkStructuredText(issues, objectId, `ruleSteps[${si}].notice`, step.notice);
        if (step.model != null) {
          checkStructuredText(issues, objectId, `ruleSteps[${si}].model`, step.model);
        }
      }
    }
    requirePublication(issues, objectId, g.publication);
  }

  const phrasePatterns = b.phrasePatterns ?? [];
  for (let i = 0; i < phrasePatterns.length; i++) {
    const p = phrasePatterns[i];
    if (!requireObjectElement(issues, "phrasePatterns", i, p)) continue;
    const objectId = String(p.id ?? "unknown");
    if (p.kind !== "PhrasePattern") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind PhrasePattern`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", p.id, "phrase");
    checkStructuredText(issues, objectId, "fixedTokens", p.fixedTokens);
    if (!Array.isArray(p.acceptedRealizations)) {
      issues.push(
        issue("REQUIRED_FIELD", `acceptedRealizations required`, {
          objectId,
          field: "acceptedRealizations",
        }),
      );
    } else {
      for (let ri = 0; ri < p.acceptedRealizations.length; ri++) {
        checkStructuredText(
          issues,
          objectId,
          `acceptedRealizations[${ri}]`,
          p.acceptedRealizations[ri],
        );
      }
    }
    requirePublication(issues, objectId, p.publication);
  }

  const qaPairs = b.qaPairs ?? [];
  for (let i = 0; i < qaPairs.length; i++) {
    const q = qaPairs[i];
    if (!requireObjectElement(issues, "qaPairs", i, q)) continue;
    const objectId = String(q.id ?? "unknown");
    if (q.kind !== "QAPair") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind QAPair`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", q.id, "qa");
    requirePublication(issues, objectId, q.publication);
  }

  const dialogues = b.dialogues ?? [];
  for (let i = 0; i < dialogues.length; i++) {
    const d = dialogues[i];
    if (!requireObjectElement(issues, "dialogues", i, d)) continue;
    const objectId = String(d.id ?? "unknown");
    if (d.kind !== "Dialogue") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Dialogue`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", d.id, "dialogue");
    if (!Array.isArray(d.turns)) {
      issues.push(
        issue("REQUIRED_FIELD", `turns required`, { objectId, field: "turns" }),
      );
    } else {
      for (let ti = 0; ti < d.turns.length; ti++) {
        const turn = d.turns[ti];
        if (!turn || typeof turn !== "object") continue;
        checkStructuredText(issues, objectId, `turns[${ti}].textDe`, turn.textDe);
        if (turn.translationEn != null) {
          checkStructuredText(
            issues,
            objectId,
            `turns[${ti}].translationEn`,
            turn.translationEn,
          );
        }
        if (turn.taskPrompt != null) {
          checkStructuredText(issues, objectId, `turns[${ti}].taskPrompt`, turn.taskPrompt);
        }
      }
    }
    requirePublication(issues, objectId, d.publication);
  }

  const listeningAssets = b.listeningAssets ?? [];
  for (let i = 0; i < listeningAssets.length; i++) {
    const li = listeningAssets[i];
    if (!requireObjectElement(issues, "listeningAssets", i, li)) continue;
    const objectId = String(li.id ?? "unknown");
    if (li.kind !== "ListeningAsset") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind ListeningAsset`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", li.id, "listen");
    if (!Array.isArray(li.transcriptSegments)) {
      issues.push(
        issue("REQUIRED_FIELD", `transcriptSegments required`, {
          objectId,
          field: "transcriptSegments",
        }),
      );
    } else {
      for (let si = 0; si < li.transcriptSegments.length; si++) {
        const seg = li.transcriptSegments[si];
        if (!seg || typeof seg !== "object") continue;
        checkStructuredText(
          issues,
          objectId,
          `transcriptSegments[${si}].textDe`,
          seg.textDe,
        );
      }
    }
    requirePublication(issues, objectId, li.publication);
  }

  const collections = b.collections ?? [];
  for (let i = 0; i < collections.length; i++) {
    const c = collections[i];
    if (!requireObjectElement(issues, "collections", i, c)) continue;
    const objectId = String(c.id ?? "unknown");
    if (c.kind !== "Collection") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Collection`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", c.id, "collection");
    const membership = c.membership as { mode?: string } | undefined;
    if (
      !membership ||
      typeof membership !== "object" ||
      (membership.mode !== "static" && membership.mode !== "dynamic")
    ) {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Collection.membership.mode must be static|dynamic`, {
          objectId,
          field: "membership.mode",
        }),
      );
    }
    requirePublication(issues, objectId, c.publication);
  }

  const learningActivities = b.learningActivities ?? [];
  for (let i = 0; i < learningActivities.length; i++) {
    const a = learningActivities[i];
    if (!requireObjectElement(issues, "learningActivities", i, a)) continue;
    const objectId = String(a.id ?? "unknown");
    if (a.kind !== "LearningActivity") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind LearningActivity`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", a.id, "activity");
    requireString(issues, objectId, "renderer", a.renderer);
    if (typeof a.mode !== "string" || !LOOP_MODE_SET.has(a.mode)) {
      issues.push(
        issue("INVALID_DISCRIMINANT", `LearningActivity.mode must be a LoopMode`, {
          objectId,
          field: "mode",
        }),
      );
    }
    checkPrompt(issues, objectId, a.prompt);
    checkAnswerSpec(issues, objectId, a.answerSpec);
    requirePublication(issues, objectId, a.publication);
  }

  const examples = b.examples ?? [];
  for (let i = 0; i < examples.length; i++) {
    const e = examples[i];
    if (!requireObjectElement(issues, "examples", i, e)) continue;
    const objectId = String(e.id ?? "unknown");
    if (e.kind !== "Example") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Example`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", e.id, "example");
    checkStructuredText(issues, objectId, "text", e.text);
    if (e.translationEn != null) {
      checkStructuredText(issues, objectId, "translationEn", e.translationEn);
    }
  }

  const relationships = b.relationships ?? [];
  for (let i = 0; i < relationships.length; i++) {
    const r = relationships[i];
    if (!requireObjectElement(issues, "relationships", i, r)) continue;
    const objectId = String(r.id ?? "unknown");
    if (r.kind !== "Relationship") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind Relationship`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", r.id, "rel");
    requireString(issues, objectId, "type", r.type);
    requireString(issues, objectId, "fromId", r.fromId);
    requireString(issues, objectId, "toId", r.toId);
  }

  const contentGaps = b.contentGaps ?? [];
  for (let i = 0; i < contentGaps.length; i++) {
    const g = contentGaps[i];
    if (!requireObjectElement(issues, "contentGaps", i, g)) continue;
    const objectId = String(g.id ?? "unknown");
    if (g.kind !== "ContentGap") {
      issues.push(
        issue("INVALID_DISCRIMINANT", `Expected kind ContentGap`, {
          objectId,
          field: "kind",
        }),
      );
    }
    requireId(issues, objectId, "id", g.id, "gap");
    requireString(issues, objectId, "objectId", g.objectId);
    requireString(issues, objectId, "field", g.field);
    requireString(issues, objectId, "reason", g.reason);
  }

  return { issues, bundle: b };
}
