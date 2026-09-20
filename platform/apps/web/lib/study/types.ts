export type SavedItem = {
  id: string;
  title: string;
  meaning: string;
  kind: "word" | "concept" | "line" | "phrase";
  href: string;
  lesson?: number;
  studyTags?: import("./scope").StudyTags;
  savedAt?: string;
  due?: string;
  interval?: number;
  note?: string;
  audio?: string | null;
};
export type LessonSession = {
  tab: "Words" | "Grammar" | "Verbs" | "Phrases" | "Practice";
  position: number;
  answers: string[];
  quizKey: string;
};
export type StudyState = {
  version: 1;
  saved: Record<string, SavedItem>;
  bookmarks: string[];
  completedPages: string[];
  resume: string | null;
  lastLesson?: number;
  lessonSessions?: Record<string, LessonSession>;
  reviewedProfessions?: string[];
};
export type DictionaryEntry = {
  studyTags?: import("./scope").StudyTags;
  id: string;
  de: string;
  en: string;
  forms: string[];
  example: string;
  translation: string;
  href: string;
  audio: string | null;
  kind?: "word" | "phrase" | "sentence";
  saveId?: string;
  displayForms?: {
    text: string;
    tone: "male" | "female" | "neuter" | "plural" | "plain";
    label: string;
  }[];
};
export type BookLine = { id: string; text: string; box: number[] };
export type BookAnswer = {
  id: string;
  pageId: string;
  exercise: string;
  text: string;
  kind: "solution" | "sample";
  source: "coursebook-key" | "workbook-key" | "workbook-transcript";
  sourceTitle: string;
  sourcePage: number;
  note: string;
};
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
  lessons?: number[];
  printedPage: number;
  pdfPage: number;
  image: string;
  width: number;
  height: number;
  lines: BookLine[];
  audioIds: string[];
  section?: string;
  pageLabel?: string;
  answers?: BookAnswer[];
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
