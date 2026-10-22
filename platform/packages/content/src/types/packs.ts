import type { AnswerSpec, CefrLevel, StructuredPrompt, TextToken } from "./common.js";

/** Book pages are printed coursebook pages, never inferred glossary/PDF offsets. */
export type BookRef = { book: string; lesson: number; page?: number; exercise?: string };
export type PackReview = {
  status: "pending-german-review" | "reviewed";
  reviewer?: string;
  reviewedAt?: string;
};
export type PackAudio = { src: string; review: "preview" | "reviewed"; text?: string };
export type PackExample = { text: string; translation?: string; audio?: PackAudio };
/** Keep the canonical prompt anatomy, with gender values owned by the profile. */
export type PackStructuredText = { tokens: Array<Exclude<TextToken, { type: "gender" }> | { type: "gender"; text: string; gender: string }> };
export type PackStructuredPrompt = Omit<StructuredPrompt, "instruction" | "stem" | "choices"> & {
  instruction: PackStructuredText;
  stem?: PackStructuredText;
  choices?: Array<{ id: string; label: PackStructuredText }>;
};
export type PackPrompt = string | PackStructuredPrompt;
export type PackSource = "course" | "teacher-extra" | "study-extra";
export type PackSourceRef = {
  cardId: string; href: string; lessons: number[]; sources: string[];
  sourceLessons?: Partial<Record<PackSource, number[]>>;
  sourceIds?: string[]; citations?: string[]; teacherRows?: number[];
};
export type PackItemBase = {
  id: string;
  unitId: string;
  bookRef: BookRef;
  source: PackSource;
  tags: string[];
  review?: PackReview;
  /** Feedback-only values that must never leak through question-state metadata. */
  revealFields?: string[];
  audio?: PackAudio;
  image?: string;
  sourceRef?: PackSourceRef;
  display?: { text: string; category: string; tone: string; patterns: string[]; note: string };
  pluralAudio?: Record<string, PackAudio>;
};
export type PackLexeme = PackItemBase & {
  type: "lexeme";
  lemma: string;
  pos: string;
  meaning: string;
  gender?: string;
  article?: string;
  forms?: Record<string, string[]>;
  examples?: PackExample[];
  frequencyRank?: number;
};
export type PackGrammarPoint = PackItemBase & {
  type: "grammarPoint";
  title: string;
  explanation: string;
  examples: PackExample[];
  drills?: string[];
};
export type PackDrillType = "sort" | "gap" | "order" | "transform" | "errorHunt" | "build";
export type PackDrill = PackItemBase & {
  type: "drill";
  grammarPoint: string;
  drillType: PackDrillType;
  prompt: PackPrompt;
  answer: AnswerSpec;
  buckets?: Array<{ id: string; label: string }>;
  distractors?: string[];
};
export type PackSentence = PackItemBase & {
  type: "sentence";
  text: string;
  translation: string;
  tokens?: string[];
  grammarTags?: string[];
};
export type PackQuestion = {
  id: string;
  type: "trueFalseNotGiven" | "multipleChoice";
  prompt: PackPrompt;
  answer: AnswerSpec;
  choices?: Array<{ id: string; label: string }>;
};
export type PackDialogue = PackItemBase & {
  type: "dialogue";
  turns: Array<{ speaker: string; text: string; audio?: PackAudio }>;
  questions?: PackQuestion[];
};
export type PackText = PackItemBase & {
  type: "text";
  title: string;
  body: string;
  questions?: PackQuestion[];
  glossary?: Record<string, string>;
};
export type PackProductionPrompt = PackItemBase & {
  type: "speakingPrompt" | "writingPrompt";
  prompt: PackPrompt;
  checklist?: string[];
  modelAnswers?: string[];
};
export type PackExamTask = PackItemBase & {
  type: "examTask";
  section: string;
  /** Seconds, as authored by the pack. */
  timing: number;
  itemRefs: string[];
  instructions?: string;
  scoring?: { maxScore: number; pointsPerItem?: number; passRatio?: number };
};
export type PackItem = PackLexeme | PackGrammarPoint | PackDrill | PackSentence |
  PackDialogue | PackText | PackProductionPrompt | PackExamTask;
export type PackManifest = {
  schemaVersion: 1;
  id: string;
  language: string;
  cefr: CefrLevel;
  title: string;
  units: Array<{
    id: string;
    title: string;
    canDo: string[];
    bookRef?: { book: string; lesson: number; pageStart?: number; pageEnd?: number };
  }>;
  maps: Array<{ id: string; title: string; rows: string; cols: string }>;
  difficulty: string;
  review: PackReview;
  itemFiles?: string[];
  story?: string;
  exam?: string;
};
/** The same hydrated shape is used by installed packs and signed-in overlays. */
export type ContentPack = PackManifest & { items: PackItem[] };
export type LanguageProfile = {
  schemaVersion: 1;
  id: string;
  label: string;
  locale: string;
  genders: Array<{ id: string; label: string; article: string; toneToken: string }>;
  pluralPatterns: Array<{ id: string; label: string }>;
  cases: string[];
  prepositionsByCase: Record<string, string[]>;
  separablePrefixes: string[];
  helperKeys: string[];
  normalization: {
    caseSensitivePos: string[];
    equivalences: Array<{ from: string; to: string; match: "accepted" | "hint" }>;
  };
  ttsVoices: string[];
  grammarLabels: Record<string, string>;
};
export type DifficultyProfile = {
  schemaVersion: 1;
  id: string;
  optionsCount: number;
  timerSeconds: number;
  audioSpeedRange: [number, number];
  hintsAllowed: boolean;
  maxPassageLength: number;
  distractorCloseness: number;
  typedAnswerRatio: number;
};
