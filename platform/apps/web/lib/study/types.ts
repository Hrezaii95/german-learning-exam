export type SavedItem = {
  id: string;
  title: string;
  meaning: string;
  kind: "word" | "concept" | "line" | "phrase";
  href: string;
  lesson?: number;
  savedAt?: string;
  due?: string;
  interval?: number;
  note?: string;
  audio?: string | null;
};
export type StudyState = {
  version: 1;
  saved: Record<string, SavedItem>;
  bookmarks: string[];
  completedPages: string[];
  resume: string | null;
};
export type DictionaryEntry = {
  id: string;
  de: string;
  en: string;
  forms: string[];
  example: string;
  translation: string;
  href: string;
  audio: string | null;
};
export type BookLine = { id: string; text: string; box: number[] };
export type ListeningTranscript = {
  lines: { speaker: string | null; text: string }[];
  sourceTrack: string;
  sourcePages: number[];
  sourceTitle: string;
  credit: string;
};
export type BookPage = {
  id: string;
  kind: string;
  lesson: number;
  printedPage: number;
  pdfPage: number;
  image: string;
  width: number;
  height: number;
  lines: BookLine[];
  audioIds: string[];
};
export type BookTrack = {
  id: string;
  lesson: number;
  kind: string;
  exercise: number;
  label: string;
  src: string;
  pageId: string;
  transcript?: ListeningTranscript;
};
export type BookManifest = {
  version: number;
  credit: string;
  pages: BookPage[];
  audio: BookTrack[];
};
