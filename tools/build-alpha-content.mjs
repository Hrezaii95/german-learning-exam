import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourceNote = resolve("resources/original/learner-notes/Notes_260730_040559.txt");
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

const lesson1 = {
  id: "lesson:01", number: 1, titleDe: "Ich heiße Miriam.", titleEn: "Greetings and introductions", cefr: "A1",
  sourcePages: { coursebookPrinted: [10, 14], workbookPrinted: [6, 9], glossaryPdf: [1, 2] },
  goals: ["greet and say goodbye", "ask and answer names", "spell a name", "ask and say origin", "ask and answer wellbeing", "choose du or formal Sie"],
  vocabulary: {
    greetings: [["Hallo", "Hello"], ["Guten Tag", "Good day / Hello"], ["Guten Morgen", "Good morning"], ["Guten Abend", "Good evening"], ["Gute Nacht", "Good night"], ["Tschüs", "Bye"], ["Auf Wiedersehen", "Goodbye"]],
    wellbeing: [["Super!", "Great!"], ["Sehr gut, danke.", "Very well, thank you."], ["Gut, danke.", "Fine, thank you."], ["Es geht.", "Not too bad."], ["Nicht so gut.", "Not so well."], ["Auch super.", "Great as well."]],
    countries: [["Deutschland", "Germany", null], ["Eritrea", "Eritrea", null], ["Österreich", "Austria", null], ["Spanien", "Spain", null], ["Frankreich", "France", null], ["Schweiz", "Switzerland", "die"], ["Türkei", "Turkey", "die"], ["USA", "USA", "die-plural"]],
    identity: [["der Name", "name", "die Namen"], ["der Vorname", "first name", "die Vornamen"], ["der Familienname", "last name", "die Familiennamen"], ["der Herr", "Mr / gentleman", "die Herren"], ["die Frau", "Ms / Mrs / woman", "die Frauen"]],
  },
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
  profileVocabulary: [["das Jahr", "year", "die Jahre"], ["das Kind", "child", "die Kinder"], ["verheiratet", "married"], ["geschieden", "divorced"], ["der Single", "single person", "die Singles"], ["allein", "alone"], ["der Wohnort", "place of residence", "die Wohnorte"], ["die Herkunft", "origin"], ["das Alter", "age"], ["der Familienstand", "marital status"], ["das Studium", "studies"], ["der Beruf", "profession", "die Berufe"], ["der Job", "job", "die Jobs"], ["die Stelle", "position/job", "die Stellen"], ["die Ausbildung", "apprenticeship/training", "die Ausbildungen"], ["das Praktikum", "internship", "die Praktika"], ["die Firma", "company", "die Firmen"]],
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

const teacherProfessions = parseTeacherProfessions(await readFile(sourceNote, "utf8")).map((item) => ({ id: `teacher-job:${slug(item.alternatives.masculine[0])}`, ...item, priority: 3, lessonIds: ["lesson:02"], sourceId: "src:learner-note:professions", validationStatus: "candidate-needs-german-review" }));
if (teacherProfessions.length !== 48) throw new Error(`Expected 48 teacher jobs, found ${teacherProfessions.length}.`);

const content = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: { lessons: ["lesson:01", "lesson:02"], teacherCollections: ["collection:teacher-professions"] },
  sourcePriority: { 1: "official glossary/core", 2: "coursebook/workbook context", 3: "teacher assigned", 4: "personal enrichment" },
  lessons: [lesson1, lesson2],
  collections: [{ id: "collection:teacher-professions", titleDe: "Berufe — Lehrermaterial", titleEn: "Teacher professions", lessonIds: ["lesson:02"], priority: 3, memberIds: teacherProfessions.map((item) => item.id) }],
  teacherProfessions,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(content, null, 2)}\n`);
console.log(`Built Lessons 1–2 content with ${teacherProfessions.length} teacher jobs into ${output}.`);
