import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadWordCards } from "../content/word-cards";
import { lessonFourWords, lessonFourVerbs, lessonFourPhrases } from "./lesson-four";
import type { BookManifest, DictionaryEntry } from "./types";
import type { LearnerQaDetail } from "../content/detail-types";
import { phraseMeanings, bookPhraseMeanings } from "./phrase-meanings";
import { phraseKey } from "./lookup";
import { countries, countryName, countryFrom, countryOriginMeaning, countryGroups, languageMeanings } from "./countries";
import { bookTranscript } from "../audio/listening-transcripts";
const generated = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../generated",
);

export function loadBook(): BookManifest {
  const raw = JSON.parse(
    readFileSync(join(generated, "interactive-book.json"), "utf8"),
  ) as BookManifest;
  // Only reading data crosses the server/client boundary. Source paths and
  // checksums stay in the build manifest for release verification.
  return {
    version: raw.version,
    credit: "Momente A1 · © Hueber Verlag.",
    pages: raw.pages,
    audio: raw.audio.map(
      ({ id, lesson, kind, exercise, label, src, pageId }) => ({
        id,
        lesson,
        kind,
        exercise,
        label,
        src,
        pageId,
        transcript: bookTranscript(id)!,
      }),
    ),
  };
}
export function loadStudySpeech(): Record<string, string> {
  return JSON.parse(
    readFileSync(join(generated, "study-speech.json"), "utf8"),
  ) as Record<string, string>;
}
export function loadCountrySpeech(): Record<string,string> {
  return JSON.parse(readFileSync(join(generated,"country-speech.json"),"utf8")) as Record<string,string>;
}
export function loadDictionary(): DictionaryEntry[] {
  const entries: DictionaryEntry[] = loadWordCards().cards.map((card) => ({
    id: card.id,
    de: card.rows.map((r) => r.singular.text).join(" / "),
    en: card.title,
    forms: card.rows.flatMap((r) => [
      r.singular.text,
      ...r.plurals.map((p) => p.text),
    ]),
    example: card.examples[0]?.de ?? "",
    translation: card.examples[0]?.en ?? "",
    href: card.path,
    audio: card.rows[0]?.singular.audio ?? null,
    kind: "word",
    displayForms: card.rows.flatMap(row => [row.singular, ...row.plurals].map(form => ({
      text: form.text,
      tone: form.tone,
      label: { male: "Masculine · der", female: "Feminine · die", neuter: "Neuter · das", plural: "Plural · die", plain: form.label }[form.tone],
    }))),
  }));
  for (const word of lessonFourWords) {
    const verb = lessonFourVerbs.find((v) => v.verb === word.de);
    const entry = entries.find((item) => item.id === word.id)!;
    entry.forms = [...entry.forms, ...(verb?.forms ?? [])];
  }
  const instructions: [string, string, string[]][] = [
    ["lesen", "to read", ["Lesen", "lies", "liest"]],
    ["hören", "to listen / hear", ["Hören", "hört"]],
    ["ergänzen", "to fill in / complete", ["Ergänzen"]],
    ["zuordnen", "to match / assign", ["ordnen", "Ordnen"]],
    ["verbinden", "to connect / match", ["Verbinden"]],
    ["ankreuzen", "to tick / mark with a cross", ["kreuzen", "Kreuzen"]],
    ["markieren", "to highlight / mark", ["Markieren"]],
    ["vergleichen", "to compare", ["Vergleichen"]],
    ["notieren", "to note down", ["Notieren"]],
    ["schreiben", "to write", ["Schreiben", "schreibt"]],
    ["sehen", "to see / look", ["Sehen", "siehst", "sieht"]],
    ["richtig", "correct / right", []],
    ["falsch", "wrong / incorrect", []],
    ["Gespräch", "conversation", ["Gespräche", "Gesprächen"]],
    ["Wort", "word", ["Wörter", "Wörtern"]],
    ["Satz", "sentence", ["Sätze", "Sätzen"]],
    ["Frage", "question", ["Fragen"]],
    ["Antwort", "answer", ["Antworten"]],
    ["welcher", "which", ["welche", "welches", "welchen"]],
    ["sein", "to be", ["bin", "bist", "ist", "sind", "seid"]],
    ["haben", "to have", ["habe", "hast", "hat", "habt"]],
    ["sprechen", "to speak", ["spreche", "sprichst", "spricht", "sprecht"]],
    ["er", "he / it (masculine noun)", []],
    ["es", "it (neuter noun)", []],
    ["sie", "she / they; formal Sie = you", []],
    ["der", "the (masculine nominative)", []],
    ["das", "the (neuter nominative); that", []],
    ["die", "the (feminine or plural nominative)", []],
  ];
  instructions.forEach(([de, en, forms], index) =>
    entries.push({
      id: `instruction-${index}`,
      de,
      en,
      forms,
      example: "",
      translation: "",
      href: "/book",
      audio: null,
    }),
  );
  const speech = loadStudySpeech();
  // Reuse every translated card example, not just the first example on a card.
  for (const card of loadWordCards().cards) {
    card.examples.forEach((example, index) => {
      if (!example.de || !example.en) return;
      entries.push({ id: `example-${card.id}-${index}`, de: example.de, en: example.en,
        forms: [], example: "", translation: "", kind: "sentence", href: card.path,
        audio: example.audio ?? speech[example.de] ?? null });
    });
  }
  const details = JSON.parse(readFileSync(join(generated, "learner-details.json"), "utf8")) as {
    details: { kind: string }[];
  };
  for (const detail of details.details) {
    if (detail.kind !== "QAPair") continue;
    const qa = detail as LearnerQaDetail;
    qa.acceptedRealizations.forEach((de, index) => {
      const en = phraseMeanings[de];
      if (!en) throw new Error(`Missing phrase meaning: ${de}`);
      entries.push({ id: `${qa.id}-${index}`, de, en, forms: [], example: "", translation: "",
        kind: "phrase", href: qa.canonicalPath, audio: speech[de] ?? null });
    });
  }
  lessonFourPhrases.forEach(([de, en], index) => entries.push({
    id: `l4-phrase-${index}`, saveId: `l4-phrase-${index}`, de, en, forms: [],
    example: "", translation: "", kind: "phrase", href: "/lessons/04#phrases",
    audio: speech[de] ?? null,
  }));
  const pages = loadBook().pages;
  Object.entries(bookPhraseMeanings).forEach(([de, en], index) => {
    const page = pages.find(p => p.lines.some(line => phraseKey(line.text).includes(phraseKey(de))));
    entries.push({ id: `book-meaning-${index}`, de, en, forms: [], example: "", translation: "",
      kind: "sentence", href: `/book?page=${page?.id ?? "coursebook-30"}`, audio: speech[de] ?? null });
  });
  const countrySpeech = loadCountrySpeech();
  for (const country of countries) {
    const de = countryName(country);
    const existing = entries.find(entry => entry.kind === "word" && entry.de === de);
    const displayForms = [{text:de,tone:country.group,label:countryGroups[country.group].label}];
    if (existing) {
      existing.displayForms = displayForms;
      if (country.dative) existing.forms.push(country.dative);
    } else entries.push({id:`country-${country.id}`,de,en:country.en,forms:[country.name,country.dative??country.name],
      example:`Ich komme ${countryFrom(country)}.`,translation:countryOriginMeaning(country),href:`/cheat-sheets#country-${country.id}`,
      audio:countrySpeech[de]??null,kind:"word",displayForms});
    entries.push({id:`country-origin-${country.id}`,de:`Ich komme ${countryFrom(country)}.`,en:countryOriginMeaning(country),forms:[],example:"",translation:"",
      href:`/cheat-sheets#country-${country.id}`,kind:"sentence",audio:countrySpeech[`Ich komme ${countryFrom(country)}.`]??null});
  }
  for (const [de,en] of Object.entries(languageMeanings)) {
    if (entries.some(entry=>entry.kind==="word"&&entry.de===de)) continue;
    entries.push({id:`language-${de}`,de,en,forms:de==="Persisch"?["Farsi"]:[],example:`Ich spreche ${de}.`,translation:`I speak ${en.split(" / ")[0]}.`,
      href:"/cheat-sheets",kind:"word",audio:countrySpeech[de]??null,displayForms:[{text:de,tone:"neuter",label:"Language · normally no article"}]});
  }
  return entries;
}
