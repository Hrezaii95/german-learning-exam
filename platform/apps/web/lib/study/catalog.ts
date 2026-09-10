import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadWordCards } from "../content/word-cards";
import { lessonFourWords, lessonFourVerbs } from "./lesson-four";
import type { BookManifest, DictionaryEntry } from "./types";
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
  return entries;
}
