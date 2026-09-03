export type WordForm = {
  text: string;
  label: string;
  tone: "male" | "female" | "neuter" | "plural" | "plain";
  audio: string | null;
};
export type WordRow = { label: string; meaning: string; singular: WordForm; plurals: WordForm[]; usage: string };
export type WordCard = {
  id: string;
  path: string;
  aliases: string[];
  sourceIds: string[];
  teacherRows: number[];
  title: string;
  category: string;
  lessons: string[];
  priorities: string[];
  rows: WordRow[];
  pattern: string[];
  tip: string;
  examples: { de: string; en: string; audio: string | null }[];
  note: string;
  sources: string[];
  image: { path: string; alt: string } | null;
  visual: string;
  prompts: { question: string; answers: string[]; hint: string }[];
  searchText: string;
};
export type WordCardCatalog = {
  version: 1;
  sourcePdfSha256: string;
  vocabularyCount: number;
  numberCount: number;
  spellingCount: number;
  teacherRowCount: number;
  cards: WordCard[];
};

/** Preserve distinctions such as sie/Sie in prompts; tolerate case only with feedback. */
export function normalizeCardAnswer(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

export function wordCardSearchKey(text: string): string {
  return text.toLocaleLowerCase("de-DE").replace(/ä/g, "ae").replace(/ö/g, "oe")
    .replace(/ü/g, "ue").replace(/ß/g, "ss");
}
