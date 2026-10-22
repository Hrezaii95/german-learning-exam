import type { ContentPack, DifficultyProfile, LanguageProfile, PackAudio, PackItem } from "../../content/src/types/packs.js";
import type { Mechanic } from "./capabilities.js";

export type TaskFormat = "recognition" | "reduced-cues" | "recall";
export type TaskAnswer = string | string[];
export type RandomSource = () => number;
export type TaskOption = { id: string; text?: string; image?: string; audio?: PackAudio };
/** Only this projection is rendered while the learner is answering. */
export type TaskQuestion = {
  instruction: string; text?: string; audio?: PackAudio; options: TaskOption[]; hintsAllowed?: boolean;
  input: "choice" | "text" | "sequence" | "self-check"; passage?: string; checklist?: string[]; tokens?: TaskOption[]; audioSequence?: PackAudio[]; audioRates?: number[]; lang: string; helperKeys: string[];
};
export type TaskFeedback = {
  answer: string; summary: string; modelAnswers?: string[]; meaning?: string; forms?: string[];
  image?: string; audio?: PackAudio; toneToken?: string; sourceHref?: string;
};
export type GeneratedTask = {
  id: string; templateId: string; itemId: string; packId: string;
  skill: string; mechanic: Mechanic; dimension: string; format: TaskFormat;
  testedDimensions: string[]; revealFields: string[];
  question: TaskQuestion;
  solution: { selfCheck?: boolean; pos?: string; optionIds?: string[]; accepted?: string[]; order?: string[] };
  feedback: TaskFeedback;
};
export type GradeResult = {
  outcome: "correct" | "almost" | "incorrect"; correct: boolean;
  hinted: boolean; normalizedAnswer: string; assessment?: "self";
};
export type TaskTemplate = {
  id: string; skill: string; mechanic: Mechanic; dimension: string; format: TaskFormat;
  requires(item: PackItem): boolean;
  params(difficulty: DifficultyProfile): { optionsCount: number };
  generate(item: PackItem, pack: ContentPack, profile: LanguageProfile,
    difficulty: DifficultyProfile, random: RandomSource): GeneratedTask | null;
  grade(task: GeneratedTask, answer: TaskAnswer, profile: LanguageProfile): GradeResult;
};
