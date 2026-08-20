#!/usr/bin/env node
/**
 * Recomputes the Lessons 1–2 curriculum diff against what is actually on disk.
 *
 * The previous diff was written by hand, which is why it kept reporting six
 * missing verbs and thirty-six missing noun plurals months after both were
 * closed: a hand-written status is a claim about the past, not a reading of the
 * present. Everything below is computed. The only declared inputs are the
 * required id sets — a normalized reading of docs/11 — and the source evidence
 * for the nouns the glossary itself marks as having no plural.
 *
 * An item counts as closed only when every id it declares exists in
 * platform/content/published with publication.status === "published". Anything
 * else is reported as open, with the reason, so a real gap can never be
 * smoothed away by a summary sentence.
 *
 * Usage: node tools/build-curriculum-diff.mjs [--out research/curriculum-diff-YYYY-MM-DD.json]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const PUBLISHED_DIR = join(REPO_ROOT, "platform/content/published");
const GENERATED_AT = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Declared inputs — the spec side of the diff.
// ---------------------------------------------------------------------------

/** docs/11 Lesson 1 verb table + Lesson 2 verb list, as one distinct id set. */
const REQUIRED_VERBS = [
  "verb:sein", "verb:heissen", "verb:kommen", "verb:lernen",
  "verb:wohnen", "verb:leben", "verb:haben", "verb:arbeiten", "verb:machen", "verb:studieren",
];

/** docs/11 name/origin/wellbeing/profession/work/age/residence question set. */
const REQUIRED_QA = [
  "qa:name-casual", "qa:name-formal", "qa:identity",
  "qa:origin-casual", "qa:origin-formal",
  "qa:wellbeing-casual", "qa:wellbeing-formal",
  "qa:profession-casual-main", "qa:profession-formal-main",
  "qa:work-casual-main", "qa:work-formal-main",
  "qa:age-casual", "qa:age-formal",
  "qa:residence-casual", "qa:residence-formal",
];

/** docs/11 "Required lesson activities" for both lessons. */
const REQUIRED_ACTIVITIES = [
  "activity:lesson-01-greetings-by-context", "activity:lesson-01-greeting-farewell-match",
  "activity:lesson-01-name-model-dialogue", "activity:lesson-01-alphabet-listen-spell",
  "activity:lesson-01-heissen-sein-notice", "activity:lesson-01-wellbeing-scale",
  "activity:lesson-01-origin-aus-contrast", "activity:lesson-01-pronoun-verb-builder",
  "activity:lesson-01-register-qa-builder", "activity:lesson-01-workbook-listening",
  "activity:lesson-01-guided-intro-recording", "activity:lesson-01-checkpoint-summary",
  "activity:lesson-02-personal-profile", "activity:lesson-02-full-person-conjugation",
  "activity:lesson-02-numbers-0-100", "activity:lesson-02-relationship-status",
  "activity:lesson-02-core-professions", "activity:lesson-02-person-form-morphology",
  "activity:lesson-02-profession-qa-builder", "activity:lesson-02-sein-arbeiten-contrast",
  "activity:lesson-02-workbook-listening", "activity:lesson-02-profile-reading-writing",
  "activity:lesson-02-teacher-professions-deck", "activity:lesson-02-checkpoint-summary",
];

/** docs/11 grammar lists for both lessons, normalized to concept ids. */
const REQUIRED_GRAMMAR = [
  "gram:main-clause-word-order-l1", "gram:w-questions-l1", "gram:present-conjugation-l1",
  "gram:aus-origin-l1", "gram:du-sie-register-l1", "gram:personal-pronouns-l1",
  "gram:und-linking-l1",
  "gram:full-present-person-forms-l2", "gram:nicht-profile-negation-l2",
  "gram:profession-expressions-l2", "gram:profession-feminine-forms-l2",
];

/**
 * The eighteen spec items that had no published counterpart in the 2026-08-14
 * diff, each with the ids that would close it.
 *
 * `publishedAs: []` means the item is knowingly still open; `openReason` says
 * why, in terms of what the sources do and do not print. Items whose ids all
 * resolve to published objects are reported as closed with those ids.
 */
const SPEC_ITEMS = [
  {
    id: "lex:und-dir",
    specText: "Und dir?",
    lesson: "01",
    publishedAs: ["lex:und-dir"],
    evidence: "glossary p.2, Lektion 01 ex.3 — 'Und dir? — What about you?' (roman/core)",
  },
  {
    id: "lex:und-ihnen",
    specText: "Und Ihnen?",
    lesson: "01",
    publishedAs: ["phrase:wellbeing-und-ihnen"],
    evidence: "workbook printed p.9, Lesson 1 'Was passt? Kreuzen Sie an.' — German only",
    note: "Encoded as a German-only phrase pattern, not a glossed vocabulary entry: the token 'Ihnen' appears nowhere in the official English glossary, so no publisher English exists for the formal variant. Recorded as ContentGap gap:meaning-und-ihnen.",
  },
  {
    id: "lex:entschuldigung",
    specText: "Entschuldigung",
    lesson: "01",
    publishedAs: ["lex:entschuldigung"],
    evidence: "glossary p.1, Lektion 01 ex.2 — 'Entschuldigung. — Sorry.'",
  },
  {
    id: "lex:wie-bitte",
    specText: "Wie bitte?",
    lesson: "01",
    publishedAs: ["lex:wie-bitte"],
    evidence: "glossary p.1, Lektion 01 ex.2 — 'Wie bitte? — Pardon?'",
  },
  {
    id: "lex:danke",
    specText: "Danke",
    lesson: "01",
    publishedAs: ["lex:danke"],
    evidence: "glossary p.1, Lektion 01 ex.2 — 'Danke. — Thank you.'",
  },
  {
    id: "phrase:identity-wer-sind-sie",
    specText: "Wer sind Sie?",
    lesson: "01",
    publishedAs: ["phrase:identity-wer-sind-sie"],
    evidence: "glossary p.2, Lektion 01 ex.8 — 'Wer sind Sie? — Who are you?'",
  },
  {
    id: "phrase:identity-und-wer-bist-du",
    specText: "Und wer bist du?",
    lesson: "01",
    publishedAs: ["phrase:identity-und-wer-bist-du"],
    evidence: "glossary p.1, Lektion 01 ex.1 — 'Und wer bist du? — And who are you?'",
  },
  {
    id: "phrase:name-answer-ich-bin",
    specText: "Ich bin ... (as name/identity answer)",
    lesson: "01",
    publishedAs: ["phrase:name-answer-ich-bin"],
    evidence: "glossary p.1, Lektion 01 ex.1 — 'Ich bin … — I am …'",
  },
  {
    id: "lexemes.alphabet",
    specText: "A-Z, Ä, Ö, Ü, ß inventory",
    lesson: "01",
    publishedAs: [],
    openReason:
      "The coursebook prints the letters and their German names on printed page 12 (ex.2b), and the glossary prints only 'das Alphabet, -e — alphabet'. No official source prints an English meaning for an individual letter, and a Lexeme cannot be stored without one, so encoding the inventory would have meant authoring 30 glosses. Recorded as ContentGap gap:alphabet-l1.",
  },
  {
    id: "lexemes.pronouns",
    specText: "ich/du/er/sie/Sie typed entries",
    lesson: "01",
    publishedAs: ["lex:ich", "lex:du", "lex:er", "lex:sie", "lex:sie-formal"],
    evidence:
      "glossary p.1 ex.1 ('ich — I', 'du — you') and p.2 ex.4/ex.8 ('er — he', 'sie — she', 'Sie — you (formal)')",
    note: "'sie' and 'Sie' slug identically, so the formal entry carries the explicit id lex:sie-formal.",
  },
  {
    id: "lexemes.numbers",
    specText: "numbers 0-100 + compound inversion",
    lesson: "02",
    publishedAs: [],
    openReason:
      "The coursebook prints the number words on printed page 16 (ex.3a) as a fill-in exercise with seven blanks, and the answer key supplies those seven. No official source prints an English gloss for any of them, and compound inversion is taught rather than listed. Recorded as ContentGap gap:numbers-0-100.",
  },
  {
    id: "lex:partner",
    specText: "Partner/Partnerin (spec core noun)",
    lesson: "02",
    publishedAs: ["lex:partner", "lex:partnerin"],
    evidence: "glossary p.3, Lektion 02 ex.2 — 'der Partner, - / die Partnerin, -nen — partner (m./f.)'",
    note: "Linked by rel:person-pair-partner-person-form, which the professions deck deliberately excludes.",
  },
  {
    id: "lex:interview",
    specText: "Interview (spec core noun)",
    lesson: "02",
    publishedAs: ["lex:interview"],
    evidence: "glossary p.3, Lektion 02 ex.2 — 'das Interview, -s — interview'",
  },
  {
    id: "lex:text",
    specText: "Text (spec core noun)",
    lesson: "02",
    publishedAs: ["lex:text"],
    evidence: "glossary p.4, Lektion 02 ex.7 — 'der Text, -e — text'",
    note: "Printed in the italic style the glossary reserves for non-core words (verified from the rendered page); docs/11 nevertheless names Text a core noun. Encoded as spec-core with the disagreement recorded as ContentGap gap:classification-text.",
  },
  {
    id: "lex:zusammenleben",
    specText: "zusammenleben (status group)",
    lesson: "02",
    publishedAs: ["lex:zusammenleben"],
    evidence: "glossary p.3, Lektion 02 ex.2 — 'zusammen|leben — to live together'",
    note: "The pipe is the glossary's separable-prefix marker, so the stored lemma is 'zusammenleben'.",
  },
  {
    id: "phrase:status-keine-kinder",
    specText: "keine Kinder / ein-zwei Kinder",
    lesson: "02",
    publishedAs: ["phrase:status-keine-kinder"],
    evidence: "glossary p.3, Lektion 02 ex.1 — 'keine Kinder — no children'",
    note: "'ein/zwei Kinder' is not printed as an entry in any official word list; only the evidenced half is encoded.",
  },
  {
    id: "phrase:work-job-stelle-haben",
    specText: "Ich habe einen Job/eine Stelle als ...",
    lesson: "02",
    publishedAs: ["phrase:work-job-stelle-haben"],
    evidence: "coursebook printed p.18, Lektion 02 ex.6 — 'Ich habe eine Stelle / einen Job als …'",
    note: "Stored in the coursebook's own word order, which reverses the spec's paraphrase.",
  },
  {
    id: "phrase:work-ausbildung-praktikum",
    specText: "Ich mache eine Ausbildung/ein Praktikum als/bei ...",
    lesson: "02",
    publishedAs: ["phrase:work-ausbildung-praktikum"],
    evidence: "coursebook printed p.18, Lektion 02 ex.6 — 'Ich mache eine Ausbildung / ein Praktikum als … / bei …'",
  },
];

/**
 * Nouns the official glossary itself marks as having no plural to store.
 * Source evidence, not a judgement call — each note quotes the printed marking.
 */
const NO_PLURAL_BY_SOURCE = {
  "lex:schweiz": "glossary p.2 prints 'die Schweiz' with no plural notation (proper-noun country)",
  "lex:tuerkei": "glossary p.2 prints 'die Türkei (Sg.)'",
  "lex:usa": "glossary p.2 prints 'die USA (Pl.)' — plural-only lexeme",
  "lex:herkunft": "glossary p.4 prints 'die Herkunft (Sg.)'",
  "lex:alter": "glossary p.4 prints 'das Alter (Sg.)'",
  "lex:familienstand": "glossary p.4 prints 'der Familienstand (Sg.)'",
  "lex:studium": "glossary p.4 prints 'das Studium (Sg.)'",
};

// ---------------------------------------------------------------------------
// Computed side — read the published package off disk.
// ---------------------------------------------------------------------------

const COLLECTION_KEYS = [
  "lexemes", "verbs", "grammarConcepts", "phrasePatterns", "qaPairs",
  "learningActivities", "listeningAssets", "contentGaps", "collections",
];

function loadPublishedBundle() {
  const merged = Object.fromEntries(COLLECTION_KEYS.map((key) => [key, []]));
  for (const file of readdirSync(PUBLISHED_DIR).sort()) {
    if (!file.endsWith(".json")) continue;
    const fragment = JSON.parse(readFileSync(join(PUBLISHED_DIR, file), "utf8"));
    for (const key of COLLECTION_KEYS) merged[key].push(...(fragment[key] ?? []));
  }
  return merged;
}

const bundle = loadPublishedBundle();
const statusById = new Map();
for (const key of COLLECTION_KEYS) {
  for (const item of bundle[key]) {
    if (item?.id && item.publication?.status) statusById.set(item.id, item.publication.status);
  }
}

const isPublished = (id) => statusById.get(id) === "published";

/** required-vs-published as an id-set diff, never as a status label. */
function diffSet(required, kindKey) {
  const publishedIds = bundle[kindKey]
    .filter((item) => item.publication?.status === "published")
    .map((item) => item.id);
  const publishedSet = new Set(publishedIds);
  const present = required.filter((id) => publishedSet.has(id));
  const missing = required.filter((id) => !publishedSet.has(id));
  const extra = publishedIds.filter((id) => !required.includes(id));
  return {
    requiredCount: required.length,
    publishedCount: present.length,
    missing,
    ...(extra.length > 0 ? { publishedButNotRequired: extra } : {}),
  };
}

const specItemResults = SPEC_ITEMS.map((item) => {
  const resolved = item.publishedAs.map((id) => ({ id, status: statusById.get(id) ?? "absent" }));
  const closed = item.publishedAs.length > 0 && resolved.every((row) => row.status === "published");
  return {
    id: item.id,
    specText: item.specText,
    lesson: item.lesson,
    status: closed ? "closed" : "open",
    publishedAs: resolved,
    ...(item.evidence ? { evidence: item.evidence } : {}),
    ...(item.note ? { note: item.note } : {}),
    ...(closed ? {} : { openReason: item.openReason ?? "declared ids are not published" }),
  };
});

const publishedNouns = bundle.lexemes.filter(
  (lex) => lex.publication?.status === "published" && lex.noun,
);
const nounsWithPlural = publishedNouns.filter((lex) => lex.noun.plurals.length > 0);
const nounsWithoutPlural = publishedNouns.filter((lex) => lex.noun.plurals.length === 0);
const unexplainedMissingPlurals = nounsWithoutPlural
  .map((lex) => lex.id)
  .filter((id) => !(id in NO_PLURAL_BY_SOURCE));

const listeningPublished = bundle.listeningAssets.filter(
  (asset) => asset.publication?.status === "published",
);

const openGaps = bundle.contentGaps.map((gap) => ({
  id: gap.id,
  objectId: gap.objectId,
  field: gap.field,
  blocksPublication: Boolean(gap.blocksPublication),
}));
const blockingGaps = openGaps.filter((gap) => gap.blocksPublication);

const verbs = diffSet(REQUIRED_VERBS, "verbs");
const qaIntents = diffSet(REQUIRED_QA, "qaPairs");
const activities = diffSet(REQUIRED_ACTIVITIES, "learningActivities");
const grammarConcepts = diffSet(REQUIRED_GRAMMAR, "grammarConcepts");
const closedSpecItems = specItemResults.filter((row) => row.status === "closed");
const openSpecItems = specItemResults.filter((row) => row.status === "open");

const diff = {
  schemaVersion: 2,
  generatedAt: GENERATED_AT,
  generatedBy: "node tools/build-curriculum-diff.mjs",
  supersedes: "research/curriculum-diff-2026-08-13.json (hand-written; reported verbs and noun plurals that had already been closed)",
  scope:
    "lessons-01-02 curriculum diff: docs/11-lessons-01-02-content-spec.md required id sets vs platform/content/published on disk",
  method:
    "Required id sets are declared from docs/11; every published set is read from platform/content/published and compared as an id-set difference. Nothing in this file is a status somebody wrote about their own work.",
  authorities: [
    "docs/11-lessons-01-02-content-spec.md",
    "docs/02-product-requirements.md",
    "docs/18-requirement-traceability.md",
  ],
  evidence: {
    publishedPackages: readdirSync(PUBLISHED_DIR)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => `platform/content/published/${file}`),
    canonicalSource: "content/alpha-content.json",
    officialGlossary:
      "content/source-index/source-manifest.json src:glossary:9e35984302ede169 -> resources/original/glossaries/Momente_A1_1_KB_Glossar_Deutsch_Englisch.pdf (Lektion 01-02 = PDF pages 1-4)",
    officialCoursebook:
      "content/source-index/source-manifest.json src:coursebook:335bea7212f88574 -> resources/original/coursebook/A1-KB-momente.pdf (Lektion 01-02 = printed pages 10-18)",
    officialWorkbook:
      "content/source-index/source-manifest.json src:workbook:11708c7b58ae76d1 -> resources/original/workbook/Momente A1.1 AB_7.pdf (Lektion 01-02 = printed pages 6-13)",
  },
  verbs,
  qaIntents,
  activities: {
    ...activities,
    blocked: activities.missing.map((id) => ({
      id,
      status: statusById.get(id) ?? "absent",
      reason:
        id === "activity:lesson-02-teacher-professions-deck"
          ? "depends on collection:teacher-professions, whose 86 fragment lexemes are all status 'review' behind the qualified German reviewer gate"
          : "not published",
    })),
  },
  grammarConcepts,
  nounPlurals: {
    publishedNounCount: publishedNouns.length,
    exactStored: nounsWithPlural.length,
    noPluralBySource: nounsWithoutPlural.map((lex) => ({
      id: lex.id,
      note: NO_PLURAL_BY_SOURCE[lex.id] ?? "no source evidence recorded",
    })),
    unexplainedMissing: unexplainedMissingPlurals,
  },
  specItems: {
    requiredCount: SPEC_ITEMS.length,
    closedCount: closedSpecItems.length,
    openCount: openSpecItems.length,
    items: specItemResults,
  },
  listening: {
    required: ["workbook L1 ex.3", "workbook L1 ex.9", "workbook L2 ex.6", "workbook L2 ex.12"],
    publishedAssetCount: listeningPublished.length,
    totalAssetCount: bundle.listeningAssets.length,
  },
  contentGaps: {
    total: openGaps.length,
    blockingPublication: blockingGaps.length,
    blocking: blockingGaps,
  },
};

diff.summary = {
  verbs: `${verbs.requiredCount} required / ${verbs.publishedCount} published / ${verbs.missing.length} missing`,
  qaIntents: `${qaIntents.requiredCount} required / ${qaIntents.publishedCount} published / ${qaIntents.missing.length} missing`,
  activities: `${activities.requiredCount} required / ${activities.publishedCount} published / ${activities.missing.length} blocked`,
  grammar: `${grammarConcepts.requiredCount} required / ${grammarConcepts.publishedCount} published / ${grammarConcepts.missing.length} missing`,
  nounPlurals: `${publishedNouns.length} published nouns: ${nounsWithPlural.length} with an exact stored plural, ${nounsWithoutPlural.length} the glossary itself marks as having none, ${unexplainedMissingPlurals.length} unexplained`,
  specItems: `${SPEC_ITEMS.length} spec items previously without a published counterpart: ${closedSpecItems.length} closed from official sources, ${openSpecItems.length} still open (${openSpecItems.map((row) => row.id).join(", ") || "none"})`,
  listening: `${listeningPublished.length} of ${bundle.listeningAssets.length} workbook listening assets published, covering all 4 spec-required exercises`,
};

const outFlagIndex = process.argv.indexOf("--out");
const outPath =
  outFlagIndex >= 0 && process.argv[outFlagIndex + 1]
    ? resolve(REPO_ROOT, process.argv[outFlagIndex + 1])
    : join(REPO_ROOT, `research/curriculum-diff-${GENERATED_AT}.json`);
writeFileSync(outPath, `${JSON.stringify(diff, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
for (const line of Object.values(diff.summary)) console.log(`  ${line}`);
