import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourceNote = resolve("resources/original/learner-notes/Notes_260730_040559.txt");
const authoredExamplesFile = resolve("media/generated/authored-examples-v1/examples.json");
const output = resolve("content/alpha-content.json");

const slug = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const stripArticle = (value) => value.replace(/^(der|die|das)\s+/, "");
const splitAlternatives = (value) => value.split(" / ").map((item) => item.trim());

function parseTeacherProfessions(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const start = lines.indexOf("Electrician");
  const end = lines.findIndex((line) => line.startsWith("Would you like"));
  const body = lines.slice(start, end < 0 ? undefined : end);
  if (body.length % 5 !== 0) throw new Error(`Teacher profession note has ${body.length} data lines, expected groups of five.`);
  const entries = [];
  for (let index = 0; index < body.length; index += 5) {
    const [meaningEn, masculineSingular, masculinePlural, feminineSingular, femininePlural] = body.slice(index, index + 5);
    entries.push({
      sourceRow: index / 5 + 1,
      meaningEn,
      masculineSingular,
      masculinePlural,
      feminineSingular,
      femininePlural,
      alternatives: {
        masculine: splitAlternatives(stripArticle(masculineSingular)),
        feminine: splitAlternatives(stripArticle(feminineSingular)),
      },
    });
  }
  return entries;
}

// Plurals verified against the official glossary (src:glossary:9e35984302ede169) pp. 3–4:
// "-" = plural same as singular, "-e"/"-en"/"-nen" suffixes, "..e" = umlaut plural (der Arzt, ..e → Ärzte).
const coreProfessions = [
  ["Paketzusteller", "Paketzustellerin", "parcel delivery agent", "Paketzusteller", "Paketzustellerinnen"], ["Friseur", "Friseurin", "hairdresser", "Friseure", "Friseurinnen"],
  ["Kellner", "Kellnerin", "waiter / waitress", "Kellner", "Kellnerinnen"], ["Ingenieur", "Ingenieurin", "engineer", "Ingenieure", "Ingenieurinnen"],
  ["Kfz-Mechatroniker", "Kfz-Mechatronikerin", "automotive mechatronics engineer", "Kfz-Mechatroniker", "Kfz-Mechatronikerinnen"], ["Student", "Studentin", "university student", "Studenten", "Studentinnen"],
  ["Journalist", "Journalistin", "journalist", "Journalisten", "Journalistinnen"], ["Architekt", "Architektin", "architect", "Architekten", "Architektinnen"],
  ["Arzt", "Ärztin", "doctor", "Ärzte", "Ärztinnen"], ["Lehrer", "Lehrerin", "teacher", "Lehrer", "Lehrerinnen"], ["Verkäufer", "Verkäuferin", "shop assistant", "Verkäufer", "Verkäuferinnen"],
  ["Schüler", "Schülerin", "school student", "Schüler", "Schülerinnen"], ["Rentner", "Rentnerin", "pensioner", "Rentner", "Rentnerinnen"],
].map(([masculine, feminine, meaningEn, masculinePlural, femininePlural]) => ({ id: `profession:${slug(masculine)}`, masculine, feminine, meaningEn, masculinePlural, femininePlural, priority: 1 }));

// Standalone taught patterns, transcribed verbatim from the official sources.
//
// These are PhrasePatterns, not Lexemes: the app renders a phrase pattern as
// German only, so no English gloss is stored for them and none is needed. That
// matters for one entry in particular — "Und Ihnen?" is printed in the workbook
// but appears nowhere in the English glossary, so a glossed vocabulary entry
// would have required an English half no source publishes.
//
// `source` names the document the German was read from and `page` is that
// document's own printed page number.
const lesson1Phrases = [
  { id: "phrase:identity-und-wer-bist-du", intent: "identity-question-casual", register: "casual", de: "Und wer bist du?", source: "glossary", page: 1, exercise: "Lektion 01, 1" },
  { id: "phrase:identity-wer-sind-sie", intent: "identity-question-formal", register: "formal", de: "Wer sind Sie?", source: "glossary", page: 2, exercise: "Lektion 01, 8" },
  { id: "phrase:name-answer-ich-bin", intent: "name-answer", register: "neutral", de: "Ich bin …", source: "glossary", page: 1, exercise: "Lektion 01, 1" },
  { id: "phrase:wellbeing-und-ihnen", intent: "wellbeing-follow-up-formal", register: "formal", de: "Und Ihnen?", source: "workbook", page: 9, exercise: "Lektion 01, Übung zu Kursbuch 8" },
];

const lesson2Phrases = [
  { id: "phrase:status-keine-kinder", intent: "status-children-none", register: "neutral", de: "keine Kinder", source: "glossary", page: 3, exercise: "Lektion 02, 1" },
  { id: "phrase:work-job-stelle-haben", intent: "work-statement-job-or-position", register: "neutral", de: "Ich habe eine Stelle / einen Job als …", source: "coursebook", page: 18, exercise: "Lektion 02, 6" },
  { id: "phrase:work-ausbildung-praktikum", intent: "work-statement-training-or-internship", register: "neutral", de: "Ich mache eine Ausbildung / ein Praktikum als … / bei …", source: "coursebook", page: 18, exercise: "Lektion 02, 6" },
];

const lesson1 = {
  id: "lesson:01", number: 1, titleDe: "Ich heiße Miriam.", titleEn: "Greetings and introductions", cefr: "A1",
  sourcePages: { coursebookPrinted: [10, 14], workbookPrinted: [6, 9], glossaryPdf: [1, 2] },
  goals: ["greet and say goodbye", "ask and answer names", "spell a name", "ask and say origin", "ask and answer wellbeing", "choose du or formal Sie"],
  vocabulary: {
    greetings: [["Hallo", "Hello"], ["Guten Tag", "Good day / Hello"], ["Guten Morgen", "Good morning"], ["Guten Abend", "Good evening"], ["Gute Nacht", "Good night"], ["Tschüs", "Bye"], ["Auf Wiedersehen", "Goodbye"]],
    // Third element = glossary page, where the entry falls past the page break.
    // Lektion 01 exercise 3 starts on p.1 and its last two entries — "Und dir? —
    // What about you?" and "Auch super. — Great as well." — are printed at the
    // top of p.2, both in the roman (core) style.
    wellbeing: [["Super!", "Great!"], ["Sehr gut, danke.", "Very well, thank you."], ["Gut, danke.", "Fine, thank you."], ["Es geht.", "Not too bad."], ["Nicht so gut.", "Not so well."], ["Und dir?", "What about you?", 2], ["Auch super.", "Great as well.", 2]],
    // Glossary p.1, Lektion 01 exercise 2 — German and English both quoted as
    // printed, trailing full stops included, exactly like the wellbeing block.
    courtesy: [["Entschuldigung.", "Sorry."], ["Wie bitte?", "Pardon?"], ["Danke.", "Thank you."]],
    // Glossary pp.1–2: ich/du are exercise 1 entries, er/sie exercise 4, formal
    // Sie exercise 8. The third element is an id suffix, needed only because
    // "sie" (she) and "Sie" (you, formal) slug identically.
    pronouns: [["ich", "I", null, 1], ["du", "you", null, 1], ["er", "he", null, 2], ["sie", "she", null, 2], ["Sie", "you (formal)", "sie-formal", 2]],
    countries: [["Deutschland", "Germany", null], ["Eritrea", "Eritrea", null], ["Österreich", "Austria", null], ["Spanien", "Spain", null], ["Frankreich", "France", null], ["Schweiz", "Switzerland", "die"], ["Türkei", "Turkey", "die"], ["USA", "USA", "die-plural"]],
    identity: [["der Name", "name", "die Namen"], ["der Vorname", "first name", "die Vornamen"], ["der Familienname", "last name", "die Familiennamen"], ["der Herr", "Mr / gentleman", "die Herren"], ["die Frau", "Ms / Mrs / woman", "die Frauen"]],
  },
  phrases: lesson1Phrases,
  verbs: [
    { id: "verb:sein", infinitive: "sein", meaningEn: "to be", forms: { ich: "bin", du: "bist", "er/sie": "ist", Sie: "sind" }, pattern: "irregular" },
    { id: "verb:heissen", infinitive: "heißen", meaningEn: "to be called", forms: { ich: "heiße", du: "heißt", "er/sie": "heißt", Sie: "heißen" }, pattern: "special-orthography" },
    { id: "verb:kommen", infinitive: "kommen", meaningEn: "to come", forms: { ich: "komme", du: "kommst", "er/sie": "kommt", Sie: "kommen" }, pattern: "regular" },
    { id: "verb:lernen", infinitive: "lernen", meaningEn: "to learn", forms: { ich: "lerne", du: "lernst", "er/sie": "lernt", Sie: "lernen" }, pattern: "regular" },
  ],
  qa: [
    { id: "qa:name-casual", register: "casual", question: "Wie heißt du?", answers: ["Ich heiße …", "Mein Name ist …"] },
    { id: "qa:name-formal", register: "formal", question: "Wie heißen Sie?", answers: ["Ich heiße …", "Mein Name ist …"] },
    { id: "qa:identity", register: "neutral", question: "Wer ist das?", answers: ["Das ist …"] },
    { id: "qa:origin-casual", register: "casual", question: "Woher kommst du?", answers: ["Ich komme aus …"] },
    { id: "qa:origin-formal", register: "formal", question: "Woher kommen Sie?", answers: ["Ich komme aus …"] },
    { id: "qa:wellbeing-casual", register: "casual", question: "Wie geht’s dir?", answers: ["Super!", "Sehr gut, danke.", "Gut, danke.", "Es geht.", "Nicht so gut."] },
    { id: "qa:wellbeing-formal", register: "formal", question: "Wie geht’s Ihnen?", answers: ["Sehr gut, danke.", "Gut, danke.", "Es geht.", "Nicht so gut."] },
  ],
};

const fullForms = {
  wohnen: ["wohne", "wohnst", "wohnt", "wohnen", "wohnt", "wohnen"], leben: ["lebe", "lebst", "lebt", "leben", "lebt", "leben"],
  haben: ["habe", "hast", "hat", "haben", "habt", "haben"], sein: ["bin", "bist", "ist", "sind", "seid", "sind"],
  arbeiten: ["arbeite", "arbeitest", "arbeitet", "arbeiten", "arbeitet", "arbeiten"], machen: ["mache", "machst", "macht", "machen", "macht", "machen"],
  studieren: ["studiere", "studierst", "studiert", "studieren", "studiert", "studieren"],
};
// English glosses verified verbatim against the official glossary (src:glossary:9e35984302ede169):
// wohnen p.3, haben p.2, arbeiten p.3, machen p.3, studieren p.4, sein p.3 ("sein — to be").
// leben has no standalone glossary entry; "to live" is derived from the p.3 entries
// "zusammen|leben — to live together" and "Lebt ihr zusammen? — Do you live together?".
const fullFormGlosses = {
  wohnen: "to live (reside)", leben: "to live", haben: "to have", sein: "to be",
  arbeiten: "to work", machen: "to do", studieren: "to study",
};
const pronouns = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const lesson2 = {
  id: "lesson:02", number: 2, titleDe: "Was macht ihr beruflich?", titleEn: "Personal details and professions", cefr: "A1",
  sourcePages: { coursebookPrinted: [15, 18], workbookPrinted: [10, 13], glossaryPdf: [2, 4] },
  goals: ["give a personal profile", "understand and say numbers 0–100", "talk about relationship and children", "ask and answer about work", "use full present-tense person forms", "form profession person forms"],
  coreProfessions,
  // Third element = glossary plural (pp. 2–4); null = glossary marks the noun (Sg.) or lists no plural.
  // Fourth element = part of speech, only where it is not derivable from the article.
  // Fifth element = the exact glossary page, where it is known for that entry.
  //
  // The last three entries close spec gaps against the official glossary:
  //   das Interview, -s — interview        (p.3, Lektion 02 ex.2)
  //   zusammen|leben — to live together    (p.3, Lektion 02 ex.2; the pipe is
  //     the glossary's separable-prefix marker, so the lemma is zusammenleben)
  //   der Text, -e — text                  (p.4, Lektion 02 ex.7, printed in
  //     the italic style the glossary reserves for non-core words; docs/11
  //     nevertheless names Text a core Lesson 2 noun, and the divergence is
  //     recorded as a content gap rather than silently resolved either way)
  profileVocabulary: [["das Jahr", "year", "die Jahre"], ["das Kind", "child", "die Kinder"], ["verheiratet", "married"], ["geschieden", "divorced"], ["der Single", "single person", "die Singles"], ["allein", "alone"], ["der Wohnort", "place of residence", "die Wohnorte"], ["die Herkunft", "origin"], ["das Alter", "age"], ["der Familienstand", "marital status"], ["das Studium", "studies"], ["der Beruf", "profession", "die Berufe"], ["der Job", "job", "die Jobs"], ["die Stelle", "position/job", "die Stellen"], ["die Ausbildung", "apprenticeship/training", "die Ausbildungen"], ["das Praktikum", "internship", "die Praktika"], ["die Firma", "company", "die Firmen"], ["das Interview", "interview", "die Interviews", null, 3], ["zusammenleben", "to live together", null, "verb", 3], ["der Text", "text", "die Texte", null, 4]],
  // Glossary p.3, Lektion 02 ex.2: "der Partner, - / die Partnerin, -nen —
  // partner (m./f.)". docs/11 requires slash alternatives to become separate
  // linked lexemes, so the pair is stored exactly the way profession pairs are.
  personPairs: [
    { masculine: "Partner", masculinePlural: "Partner", feminine: "Partnerin", femininePlural: "Partnerinnen", meaningEn: "partner (m./f.)", page: 3 },
  ],
  phrases: lesson2Phrases,
  verbs: Object.entries(fullForms).map(([infinitive, forms]) => ({ id: `verb:${slug(infinitive)}`, infinitive, meaningEn: fullFormGlosses[infinitive], forms: Object.fromEntries(pronouns.map((pronoun, index) => [pronoun, forms[index]])), pattern: infinitive === "sein" || infinitive === "haben" ? "irregular" : infinitive === "arbeiten" ? "spelling-adjustment" : "regular" })),
  qa: [
    { id: "qa:profession-casual", register: "casual", question: "Was bist du von Beruf?", answers: ["Ich bin … von Beruf.", "Ich bin …", "Ich arbeite als …"] },
    { id: "qa:profession-formal", register: "formal", question: "Was sind Sie von Beruf?", answers: ["Ich bin … von Beruf.", "Ich bin …", "Ich arbeite als …"] },
    // Casual question verbatim from glossary p.3 Lektion 02 ex.5 ("Was macht ihr beruflich? — What do you do for a living?");
    // answers mirror the published formal sibling's evidenced answer set.
    { id: "qa:work-casual", register: "casual", question: "Was macht ihr beruflich?", answers: ["Ich arbeite als …", "Ich arbeite bei …", "Ich studiere …", "Ich arbeite im Moment nicht."] },
    { id: "qa:work-formal", register: "formal", question: "Was machen Sie beruflich?", answers: ["Ich arbeite als …", "Ich arbeite bei …", "Ich studiere …", "Ich arbeite im Moment nicht."] },
    { id: "qa:age", register: "variable", question: "Wie alt bist du / sind Sie?", answers: ["Ich bin … Jahre alt."] },
    { id: "qa:residence", register: "variable", question: "Wo wohnst du / wohnen Sie?", answers: ["Ich wohne in …"] },
  ],
};

// Usage examples transcribed VERBATIM from the official Momente A1.1 Kursbuch
// glossary Deutsch–Englisch (src:glossary:9e35984302ede169). Both halves are
// quoted from the same printed line pair — the German exactly as it appears and
// the publisher's own English beside it. Nothing here is composed, translated
// or paraphrased, and `page` is the PDF page the pair was read from.
//
// The glossary lists Lektion 01–02 on PDF pages 1–4 only. Most of its example
// sentences illustrate verbs and function words (heißen, sein, kommen, ihr),
// which are not Lexemes, so only the six lexemes below have one. Every other
// Lesson 1–2 lexeme is printed as a bare headword with no example anywhere in
// the official sources, and therefore gets none.
const glossaryExamples = [
  { lexemeId: "lex:name", de: "Mein Name ist …", en: "My name is …", page: 1, exercise: "Lektion 01, 2" },
  { lexemeId: "lex:schweiz", de: "Er kommt aus der Schweiz.", en: "He is from Switzerland.", page: 2, exercise: "Lektion 01, 4" },
  { lexemeId: "lex:jahr", de: "… Jahre alt", en: "… years old", page: 2, exercise: "Lektion 02, 1" },
  { lexemeId: "lex:kind", de: "keine Kinder", en: "no children", page: 3, exercise: "Lektion 02, 1" },
  { lexemeId: "lex:geschieden", de: "geschieden sein", en: "to be divorced", page: 3, exercise: "Lektion 02, 4" },
  { lexemeId: "lex:beruf", de: "von Beruf", en: "by profession", page: 4, exercise: "Lektion 02, 6" },
].map((item) => ({
  ...item,
  sourceFileId: "src:glossary:9e35984302ede169",
  documentTitle: "Momente A1.1 KB Glossar Deutsch–Englisch",
}));
if (new Set(glossaryExamples.map((item) => item.lexemeId)).size !== glossaryExamples.length) {
  throw new Error("Each lexeme may carry at most one transcribed glossary example.");
}

// Example sentences WRITTEN FOR THIS APP — the opposite provenance to the block
// above. Nothing here is quoted from Momente or any other source, no page can
// be cited for it, and no qualified German speaker has checked it yet. The
// encoder therefore stores them with origin "app-authored" and the review state
// that says so, and the vocabulary page tells the learner the same thing.
//
// The lemma is carried, not a lexeme id: id slugs are the encoder's business
// (Ärztin → lex:aerztin), and duplicating that rule here is how the two would
// drift apart. Where a lemma also has a transcribed glossary example the
// glossary keeps it — a quotation always outranks a sentence we wrote.
const authoredLemmaKey = (value) => value.normalize("NFC").replace(/^(der|die|das)\s+/i, "").trim().toLowerCase();
const rawAuthoredExamples = JSON.parse(await readFile(authoredExamplesFile, "utf8"));
if (!Array.isArray(rawAuthoredExamples) || rawAuthoredExamples.length === 0) {
  throw new Error(`${authoredExamplesFile} must hold a non-empty array of authored examples.`);
}
const appAuthoredExamples = rawAuthoredExamples.map((item, index) => {
  for (const field of ["lemma", "de", "en", "confidence"]) {
    if (typeof item?.[field] !== "string" || item[field].trim().length === 0) {
      throw new Error(`Authored example ${index} is missing a usable "${field}".`);
    }
  }
  if (item.confidence !== "high" && item.confidence !== "check") {
    throw new Error(`Authored example ${index} (${item.lemma}) has unknown confidence "${item.confidence}".`);
  }
  // A "check" flag is a question for the reviewer, so it must arrive with the
  // question attached — a flag with no note tells the reviewer nothing.
  if (item.confidence === "check" && (typeof item.note !== "string" || item.note.trim().length === 0)) {
    throw new Error(`Authored example ${index} (${item.lemma}) is flagged for checking but carries no note.`);
  }
  return {
    lemma: item.lemma,
    de: item.de,
    en: item.en,
    ...(typeof item.note === "string" && item.note.trim().length > 0 ? { reviewerNote: item.note.trim() } : {}),
  };
});
if (new Set(appAuthoredExamples.map((item) => authoredLemmaKey(item.lemma))).size !== appAuthoredExamples.length) {
  throw new Error("Each lemma may carry at most one app-authored example.");
}

const teacherProfessions = parseTeacherProfessions(await readFile(sourceNote, "utf8")).map((item) => ({ id: `teacher-job:${slug(item.alternatives.masculine[0])}`, ...item, priority: 3, lessonIds: ["lesson:02"], sourceId: "src:learner-note:professions", validationStatus: "candidate-needs-german-review" }));
if (teacherProfessions.length !== 48) throw new Error(`Expected 48 teacher jobs, found ${teacherProfessions.length}.`);

const content = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: { lessons: ["lesson:01", "lesson:02"], teacherCollections: ["collection:teacher-professions"] },
  sourcePriority: { 1: "official glossary/core", 2: "coursebook/workbook context", 3: "teacher assigned", 4: "personal enrichment" },
  lessons: [lesson1, lesson2],
  glossaryExamples,
  appAuthoredExamples,
  collections: [{ id: "collection:teacher-professions", titleDe: "Berufe — Lehrermaterial", titleEn: "Teacher professions", lessonIds: ["lesson:02"], priority: 3, memberIds: teacherProfessions.map((item) => item.id) }],
  teacherProfessions,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(content, null, 2)}\n`);
console.log(`Built Lessons 1–2 content with ${teacherProfessions.length} teacher jobs, ${glossaryExamples.length} transcribed glossary examples and ${appAuthoredExamples.length} app-authored examples awaiting German review into ${output}.`);
