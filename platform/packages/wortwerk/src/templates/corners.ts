import type { ContentPack, DifficultyProfile, LanguageProfile, PackAudio, PackItem, PackLexeme } from "../../../content/src/types/packs.js";
import type { GeneratedTask, GradeResult, RandomSource, TaskAnswer, TaskFormat, TaskOption, TaskTemplate } from "../tasks.js";
import { chooseDistractors, comparisonKey } from "../distractors.js";
import { gradeTextAnswer } from "../normalization.js";
import { shuffle } from "../random.js";

type Kind = "meaning" | "reverse" | "gender" | "plural" | "plural-pattern" | "picture" | "listen";
type Definition = { id: string; kind: Kind; dimension: string; instruction: string; requires(item: PackItem): boolean };
const lexeme = (item: PackItem): item is PackLexeme => item.type === "lexeme";
const definitions: readonly Definition[] = [
  { id: "corners.meaning", kind: "meaning", dimension: "meaning", instruction: "Choose the meaning.", requires: i => lexeme(i) && !!i.meaning },
  { id: "corners.reverse", kind: "reverse", dimension: "meaning", instruction: "Choose the word.", requires: i => lexeme(i) && !!i.meaning },
  { id: "corners.gender", kind: "gender", dimension: "gender", instruction: "Choose the group.", requires: i => lexeme(i) && !!i.gender && !!i.article },
  { id: "corners.plural", kind: "plural", dimension: "plural", instruction: "Choose the form.", requires: i => lexeme(i) && !!i.forms?.plural?.length },
  { id: "corners.plural-pattern", kind: "plural-pattern", dimension: "plural", instruction: "Choose the pattern.", requires: i => lexeme(i) && !!i.forms?.pluralPattern?.length },
  { id: "corners.picture", kind: "picture", dimension: "meaning", instruction: "Choose the picture.", requires: i => lexeme(i) && !!i.image },
  { id: "listen.pick", kind: "listen", dimension: "listening", instruction: "Listen, then choose the picture.", requires: i => lexeme(i) && !!i.audio && !!i.image },
];

function audioWithoutCaption(audio: PackAudio | undefined): PackAudio | undefined {
  return audio ? { src: audio.src, review: audio.review } : undefined;
}
function wordForms(item: PackLexeme): string[] {
  return [...new Set([item.lemma, ...(item.forms?.singular ?? [])])];
}
function acceptedFor(kind: Kind, item: PackLexeme, profile: LanguageProfile): string[] {
  if (kind === "meaning") return [item.meaning, ...(item.forms?.meaning ?? [])];
  if (kind === "plural") return item.forms?.plural ?? [];
  if (kind === "gender") {
    const gender = profile.genders.find(g => g.id === item.gender);
    return gender ? [gender.article, gender.label] : [];
  }
  if (kind === "plural-pattern") {
    const patterns = profile.pluralPatterns.filter(pattern => item.forms?.pluralPattern?.includes(pattern.id));
    return [...patterns.map(pattern => pattern.label), ...patterns.map(pattern => pattern.id)];
  }
  return wordForms(item);
}
function eligibleCandidate(kind: Kind, item: PackLexeme, candidate: PackItem, profile: LanguageProfile): string[] {
  if (!lexeme(candidate)) return [];
  // A synonym can also answer a reverse question, even if its lemma is different.
  if ((kind === "reverse" || kind === "picture" || kind === "listen") && comparisonKey(candidate.meaning, profile) === comparisonKey(item.meaning, profile)) return [];
  if (kind === "picture" || kind === "listen") return candidate.image ? [candidate.image, ...wordForms(candidate)] : [];
  return acceptedFor(kind, candidate, profile);
}
function labelFor(kind: Kind, item: PackLexeme): string {
  if (kind === "meaning") return item.meaning;
  if (kind === "plural") return item.forms?.plural?.[0] ?? "";
  return item.lemma;
}

type Choice = { text?: string; image?: string; correct: boolean };
function choicesFor(kind: Kind, item: PackLexeme, pack: ContentPack, profile: LanguageProfile, count: number, random: RandomSource): Choice[] | null {
  if (kind === "gender") {
    if (!profile.genders.some(gender => gender.id === item.gender)) return null;
    const all = profile.genders.map(gender => ({ text: `${gender.article} · ${gender.label}`, correct: gender.id === item.gender }));
    const correct = all.find(choice => choice.correct)!;
    return [correct, ...shuffle(all.filter(choice => !choice.correct), random).slice(0, Math.min(count, all.length) - 1)];
  }
  if (kind === "plural-pattern") {
    const patterns = item.forms?.pluralPattern ?? [];
    const correct = profile.pluralPatterns.filter(pattern => patterns.includes(pattern.id));
    if (!correct.length) return null;
    const wrong = shuffle(profile.pluralPatterns.filter(pattern => !patterns.includes(pattern.id)), random).slice(0, count - 1);
    if (wrong.length < Math.min(count, profile.pluralPatterns.length - correct.length + 1) - 1) return null;
    return [{ text: correct[0]!.label, correct: true }, ...wrong.map(pattern => ({ text: pattern.label, correct: false }))];
  }
  const accepted = kind === "picture" || kind === "listen" ? [item.image!, ...wordForms(item)] : acceptedFor(kind, item, profile);
  const candidates = chooseDistractors(item, pack, profile, candidate => eligibleCandidate(kind, item, candidate, profile), accepted, count - 1, random);
  if (candidates.length < count - 1) return null;
  const asChoice = (candidate: PackLexeme, correct: boolean): Choice => kind === "picture" || kind === "listen" ? { image: candidate.image!, correct } : { text: labelFor(kind, candidate), correct };
  return [asChoice(item, true), ...candidates.map(candidate => asChoice(candidate as PackLexeme, false))];
}

export type CornersGeneration = {
  templateId: string; item: PackItem; pack: ContentPack; profile: LanguageProfile;
  difficulty: DifficultyProfile; random: RandomSource; format?: TaskFormat;
};

export function generateCornersTask({ templateId, item, pack, profile, difficulty, random, format }: CornersGeneration): GeneratedTask | null {
  const baseId = templateId.replace(/\.(?:reduced|recall)$/u, "");
  const definition = definitions.find(entry => entry.id === baseId);
  if (!definition || !definition.requires(item) || !lexeme(item)) return null;
  const taskFormat = format ?? (templateId.endsWith(".recall") ? "recall" : templateId.endsWith(".reduced") ? "reduced-cues" : "recognition");
  const kind = definition.kind;
  // A picture prompt is not part of the question contract: do not turn a word→picture
  // task into a trivial word→same-word recall task.
  if (kind === "picture" && taskFormat === "recall") return null;
  if (kind === "gender" && item.article && item.lemma.startsWith(`${item.article} `)) return null;
  const accepted = acceptedFor(kind, item, profile);
  if (!accepted.length) return null;
  const count = taskFormat === "reduced-cues" ? 2 : Math.max(2, Math.min(8, Math.trunc(difficulty.optionsCount)));
  const choices = taskFormat === "recall" ? [] : choicesFor(kind, item, pack, profile, count, random);
  if (!choices || (taskFormat !== "recall" && choices.length < 2)) return null;
  const shuffled = shuffle(choices, random);
  const options: TaskOption[] = shuffled.map(({ text, image }, index) => ({ id: `option-${index + 1}`, ...(text !== undefined ? { text } : {}), ...(image !== undefined ? { image } : {}) }));
  const optionIds = options.filter((_, index) => shuffled[index]!.correct).map(option => option.id);
  const gender = profile.genders.find(entry => entry.id === item.gender);
  const text = kind === "listen" ? undefined : kind === "reverse" ? item.meaning : item.lemma;
  const audio = kind === "meaning" || kind === "picture" || kind === "listen" ? audioWithoutCaption(item.audio) : undefined;
  const answer = kind === "gender" ? `${gender!.article} ${item.lemma}` : kind === "plural" ? accepted[0]! : kind === "plural-pattern" ? accepted[0]! : kind === "meaning" ? item.meaning : item.lemma;
  return {
    id: `${templateId}:${item.id}`, templateId, itemId: item.id, packId: pack.id,
    skill: kind === "listen" ? "listening" : "vocabulary", mechanic: kind === "listen" ? "listen" : "corners", dimension: definition.dimension, format: taskFormat,
    testedDimensions: [definition.dimension], revealFields: [...new Set([...(item.revealFields ?? []), ...(kind === "gender" ? ["article", "gender", "forms", "image", "audio"] : kind === "plural" || kind === "plural-pattern" ? ["forms", "pluralAudio", "image"] : kind === "meaning" ? ["meaning", "image"] : kind === "listen" ? ["lemma", "meaning", "audio.text"] : ["lemma", "audio", "image"])])],
    question: { ...(kind === "meaning" && difficulty.hintsAllowed && item.image ? { hintsAllowed: true } : {}), instruction: taskFormat === "recall" ? "Type your answer." : definition.instruction, ...(text !== undefined ? { text } : {}), ...(audio ? { audio } : {}), options, input: taskFormat === "recall" ? "text" : "choice", lang: profile.locale, helperKeys: [...profile.helperKeys] },
    solution: { ...(optionIds.length ? { optionIds } : {}), accepted, pos: kind === "meaning" || kind === "gender" || kind === "plural-pattern" ? "" : item.pos },
    feedback: { answer, summary: profile.grammarLabels[definition.dimension] ?? definition.dimension, meaning: item.meaning, ...(item.forms?.plural?.length ? { forms: [...item.forms.plural] } : {}), ...(item.image ? { image: item.image } : {}), ...(item.audio ? { audio: { ...item.audio } } : {}), ...(kind === "gender" && gender ? { toneToken: gender.toneToken } : {}), ...(item.sourceRef?.href ? { sourceHref: item.sourceRef.href } : {}) },
  };
}

export function gradeCornersTask(task: GeneratedTask, answer: TaskAnswer, profile: LanguageProfile): GradeResult {
  const single = typeof answer === "string" ? answer : answer.length === 1 ? answer[0]! : "";
  if (task.question.input === "choice") {
    const correct = !!single && !!task.solution.optionIds?.includes(single);
    return { outcome: correct ? "correct" : "incorrect", correct, hinted: false, normalizedAnswer: single };
  }
  const graded = gradeTextAnswer(single, task.solution.accepted ?? [], profile, task.solution.pos ?? "");
  return { outcome: graded.outcome, correct: graded.outcome === "correct", hinted: graded.outcome === "almost", normalizedAnswer: graded.normalized };
}

export const CORNERS_TEMPLATES: readonly TaskTemplate[] = definitions.flatMap(definition => (["recognition", "reduced-cues", "recall"] as const).filter(format => definition.kind !== "picture" || format !== "recall").map(format => {
  const id = definition.id + (format === "recall" ? ".recall" : format === "reduced-cues" ? ".reduced" : "");
  return {
    id, skill: definition.kind === "listen" ? "listening" : "vocabulary", mechanic: definition.kind === "listen" ? "listen" as const : "corners" as const,
    dimension: definition.dimension, format, minItems: format === "recognition" ? 8 : 1, requires: definition.requires,
    params: (difficulty: DifficultyProfile) => ({ optionsCount: format === "recall" ? 0 : format === "reduced-cues" ? 2 : difficulty.optionsCount }),
    generate: (item: PackItem, pack: ContentPack, profile: LanguageProfile, difficulty: DifficultyProfile, random: RandomSource) => generateCornersTask({ templateId: id, item, pack, profile, difficulty, random, format }),
    grade: gradeCornersTask,
  };
}));

export function getCornersTemplate(id: string): TaskTemplate | undefined {
  return CORNERS_TEMPLATES.find(template => template.id === id);
}
