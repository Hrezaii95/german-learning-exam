import type { ContentPack, DifficultyProfile, LanguageProfile, PackAudio, PackItem, PackPrompt, PackQuestion } from "../../../content/src/types/packs.js";
import { gradeTextAnswer } from "../normalization.js";
import { shuffle } from "../random.js";
import type { GeneratedTask, GradeResult, RandomSource, TaskAnswer, TaskOption, TaskTemplate } from "../tasks.js";
function promptText(prompt: PackPrompt): string {
    if (typeof prompt === "string")
        return prompt;
    return [prompt.instruction, prompt.stem].filter(Boolean).map(part => part!.tokens.map(token => token.type === "gap" ? "___" : token.text).join("")).join(" ");
}
const clip = (audio: PackAudio | undefined): PackAudio | undefined => audio ? { src: audio.src, review: audio.review } : undefined;
const textOf = (item: PackItem): string => item.type === "lexeme" ? item.lemma : item.type === "sentence" ? item.text : item.type === "text" ? item.body : "";
function feedback(item: PackItem) {
    const modelAnswers = item.type === "speakingPrompt" || item.type === "writingPrompt" ? item.modelAnswers : undefined;
    return { answer: item.type === "lexeme" ? item.lemma : item.type === "sentence" ? item.text : item.type === "text" ? item.title : "Your response", summary: "Compare your response with the source and check your work.", ...(modelAnswers?.length ? { modelAnswers: [...modelAnswers] } : {}), ...(item.audio ? { audio: { ...item.audio } } : {}), ...(item.sourceRef?.href ? { sourceHref: item.sourceRef.href } : {}) };
}
function task(item: PackItem, pack: ContentPack, profile: LanguageProfile, id: string, mechanic: GeneratedTask["mechanic"], skill: string, dimension: string): GeneratedTask {
    return { id: `${id}:${item.id}`, templateId: id, itemId: item.id, packId: pack.id, skill, mechanic, dimension, format: "recognition", testedDimensions: [dimension], revealFields: [...(item.revealFields ?? []), "modelAnswers", "solution", "audio.text"], question: { instruction: "Complete the task.", options: [], input: "choice", lang: profile.locale, helperKeys: [...profile.helperKeys] }, solution: {}, feedback: feedback(item) };
}
function authoredReadingChoices(question: PackQuestion, profile: LanguageProfile): Array<{ id: string; text: string }> {
    if (question.choices) return question.choices.map(choice => ({ id: choice.id, text: choice.label }));
    return question.type === "trueFalseNotGiven"
        ? ["true", "false", "not-given"].map(id => ({ id, text: profile.grammarLabels[id] ?? id.replaceAll("-", " ") })) : [];
}
function correctReadingChoices(question: PackQuestion, profile: LanguageProfile): Array<{ id: string; text: string }> {
    const accepted = question.answer.type === "exact" ? question.answer.accepted : question.answer.type === "choice" ? question.answer.correctIds : [];
    return authoredReadingChoices(question, profile).filter(choice => accepted.some(value => value === choice.id
        || (question.answer.type === "exact" && gradeTextAnswer(choice.text, [value], profile, "").outcome === "correct")));
}
function readingAnswers(question: PackQuestion, profile: LanguageProfile): string[] {
    const labels = correctReadingChoices(question, profile).map(choice => choice.text);
    const accepted = question.answer.type === "exact" ? [...question.answer.accepted, ...labels] : labels;
    return [...new Set(accepted.filter(value => value.trim()).map(value => value.normalize("NFC")))];
}
function questionChoices(question: PackQuestion, profile: LanguageProfile, random: RandomSource, limit: number): {
    options: TaskOption[]; correctIds: string[];
} | null {
    const choices = authoredReadingChoices(question, profile);
    const correct = correctReadingChoices(question, profile);
    if (choices.length < 2 || !correct.length || correct.length === choices.length) return null;
    // Preserve every authored correct option; an ambiguous reduction is unavailable.
    if (!Number.isFinite(limit)) return null;
    const count = Math.min(choices.length, Math.max(2, Math.floor(limit)));
    if (correct.length >= count) return null;
    const wrong = choices.filter(choice => !correct.some(value => value.id === choice.id)
        && !correct.some(value => gradeTextAnswer(choice.text, [value.text], profile, "").outcome !== "incorrect"));
    if (!wrong.length) return null;
    const selected = [...correct, ...shuffle(wrong, random).slice(0, count - correct.length)];
    const shuffled = shuffle(selected, random);
    return { options: shuffled.map((choice, index) => ({ id: `option-${index + 1}`, text: choice.text })),
        correctIds: shuffled.flatMap((choice, index) => correct.some(value => value.id === choice.id) ? [`option-${index + 1}`] : []) };
}
function matchTask(item: PackItem, pack: ContentPack, profile: LanguageProfile, random: RandomSource, headline: boolean): GeneratedTask | null {
    const candidates = shuffle(pack.items.filter(candidate => headline ? candidate.type === "text" : candidate.type === "lexeme"), random);
    const selected: PackItem[] = [];
    const seenLeft = new Set<string>();
    const seenRight = new Set<string>();
    const pair = (value: PackItem): [
        string,
        string
    ] => value.type === "lexeme" ? [value.lemma, value.meaning] : value.type === "text" ? [value.title, value.body] : ["", ""];
    for (const candidate of [item, ...candidates.filter(candidate => candidate.id !== item.id)]) {
        const [left, right] = pair(candidate);
        const l = left.normalize("NFC").toLocaleLowerCase(profile.locale);
        const r = right.normalize("NFC").toLocaleLowerCase(profile.locale);
        if (!left || !right || seenLeft.has(l) || seenRight.has(r))
            continue;
        seenLeft.add(l);
        seenRight.add(r);
        selected.push(candidate);
        if (selected.length === 6)
            break;
    }
    if (selected.length < 6)
        return null;
    const left = shuffle(selected, random);
    const right = shuffle(selected, random);
    const generated = task(item, pack, profile, headline ? "match.headline" : "match.meaning", "match", headline ? "reading" : "vocabulary", headline ? "reading" : "meaning");
    generated.question.instruction = "Match each card on the left with a card on the right.";
    generated.question.input = "sequence";
    generated.question.tokens = left.map((value, index) => ({ id: `left-${index + 1}`, text: pair(value)[0] }));
    generated.question.options = right.map((value, index) => ({ id: `right-${index + 1}`, text: pair(value)[1] }));
    generated.solution.order = left.map(value => `right-${right.findIndex(candidate => candidate.id === value.id) + 1}`);
    generated.feedback = { ...generated.feedback, answer: "Pairs reviewed", forms: left.map(value => pair(value).join(" — ")), summary: "Check every pair before continuing." };
    return generated;
}
export type LiteracyGeneration = {
    templateId: string;
    item: PackItem;
    pack: ContentPack;
    profile: LanguageProfile;
    difficulty: DifficultyProfile;
    random: RandomSource;
};
export function generateLiteracyTask({ templateId: id, item, pack, profile, difficulty, random }: LiteracyGeneration): GeneratedTask | null {
    const baseId = id === "read.quick.reduced" || id === "read.quick.recall" ? "read.quick" : id;
    const definition = definitions.find(value => value.id === baseId);
    if (!definition?.requires(item))
        return null;
    if (id === "match.meaning" || id === "match.headline")
        return matchTask(item, pack, profile, random, id === "match.headline");
    const generated = task(item, pack, profile, id, definition.mechanic, definition.skill, definition.dimension);
    if (baseId === "read.quick" && item.type === "text") {
        const format = id.endsWith(".recall") ? "recall" : id.endsWith(".reduced") ? "reduced-cues" : "recognition";
        const limit = format === "reduced-cues" ? 2 : difficulty.optionsCount;
        const questions = shuffle(item.questions ?? [], random);
        const question = questions.find(value => format === "recall" ? readingAnswers(value, profile).length > 0
            : questionChoices(value, profile, () => 0.5, limit) !== null);
        if (!question || item.body.length > difficulty.maxPassageLength) return null;
        const accepted = readingAnswers(question, profile);
        generated.format = format;
        generated.question = { ...generated.question, instruction: promptText(question.prompt), passage: item.body, options: [] };
        generated.solution = { accepted, pos: "" };
        if (format === "recall") {
            generated.mechanic = "write";
            generated.question.input = "text";
            generated.feedback = { ...generated.feedback, answer: accepted.join(" · "), summary: "Check your answer against the source passage." };
        } else {
            const choices = questionChoices(question, profile, random, limit)!;
            generated.question.options = choices.options;
            generated.solution.optionIds = choices.correctIds;
            generated.feedback = { ...generated.feedback, answer: choices.options.filter(option => choices.correctIds.includes(option.id)).map(option => option.text).join(" · "), summary: "Read the source again to check the answer." };
        }
        return generated;
    }
    if (id === "read.tap" && item.type === "text") {
        generated.question = { ...generated.question, instruction: "Tap an unfamiliar word to add it to your personal deck. Then finish reading.", passage: item.body, input: "self-check" };
        generated.solution.selfCheck = true;
        return generated;
    }
    if (id === "read.paragraph-order" && item.type === "text") {
        const paragraphs = item.body.split(/\n\s*\n/u).map(value => value.trim()).filter(Boolean);
        if (paragraphs.length < 2)
            return null;
        const shuffled = shuffle(paragraphs.map((text, index) => ({ text, original: index })), random);
        generated.question = { ...generated.question, instruction: "Put the paragraphs in order.", text: item.title, input: "sequence", tokens: shuffled.map((value, index) => ({ id: `token-${index + 1}`, text: value.text })) };
        generated.solution.order = paragraphs.map((_, original) => `token-${shuffled.findIndex(value => value.original === original) + 1}`);
        generated.format = "recall";
        return generated;
    }
    if (id === "write.dictation") {
        const text = textOf(item);
        if (!text || !item.audio)
            return null;
        generated.question = { ...generated.question, instruction: "Listen and type what you hear.", input: "text", audio: clip(item.audio)! };
        generated.solution = { accepted: [text], pos: item.type === "lexeme" ? item.pos : "" };
        generated.format = "recall";
        generated.feedback.answer = text;
        return generated;
    }
    if (id === "write.sentence" && item.type === "sentence") {
        generated.question = { ...generated.question, instruction: "Write the sentence from its meaning.", text: item.translation, input: "text" };
        generated.solution = { accepted: [item.text], pos: "" };
        generated.format = "recall";
        return generated;
    }
    if ((id === "write.prompt" && item.type === "writingPrompt") || (definition.mechanic === "record")) {
        const production = item.type === "speakingPrompt" || item.type === "writingPrompt";
        generated.question = { ...generated.question, instruction: id === "record.echo" ? "Listen, record your response, then compare and self-check." : id === "record.read" ? "Read aloud, play back your recording, then self-check." : production ? promptText(item.prompt) : "Record your response, then compare and self-check.", input: "self-check", ...(production && item.checklist ? { checklist: [...item.checklist] } : {}), ...(id === "record.read" ? { passage: textOf(item) } : {}), ...(clip(item.audio) ? { audio: clip(item.audio)! } : {}) };
        if (id === "record.picture" && item.image)
            generated.question.options = [{ id: "picture", image: item.image }];
        generated.solution.selfCheck = true;
        generated.format = "recall";
        return generated;
    }
    return null;
}
export function gradeLiteracyTask(task: GeneratedTask, answer: TaskAnswer, profile: LanguageProfile): GradeResult {
    const list = typeof answer === "string" ? [answer] : answer;
    if (task.solution.selfCheck) {
        const checked = list[0] === "self:complete";
        return { outcome: checked ? "correct" : "incorrect", correct: checked, hinted: true, normalizedAnswer: list.slice(1).join(" "), assessment: "self" };
    }
    if (task.solution.order) {
        const correct = list.length === task.solution.order.length && list.every((value, index) => value === task.solution.order![index]);
        return { outcome: correct ? "correct" : "incorrect", correct, hinted: false, normalizedAnswer: list.join(" ") };
    }
    if (task.solution.optionIds) {
        const correct = list.length === 1 && task.solution.optionIds.includes(list[0]!);
        return { outcome: correct ? "correct" : "incorrect", correct, hinted: false, normalizedAnswer: list.join(" ") };
    }
    const grade = gradeTextAnswer(list.join(" "), task.solution.accepted ?? [], profile, task.solution.pos ?? "");
    return { outcome: grade.outcome, correct: grade.outcome === "correct", hinted: grade.outcome === "almost", normalizedAnswer: grade.normalized };
}
const definitions = [
    { id: "match.meaning", mechanic: "match", skill: "vocabulary", dimension: "meaning", requires: (item: PackItem) => item.type === "lexeme" && !!item.meaning },
    { id: "match.headline", mechanic: "match", skill: "reading", dimension: "reading", requires: (item: PackItem) => item.type === "text" && !!item.title && !!item.body },
    { id: "read.quick", mechanic: "hotspot", skill: "reading", dimension: "reading", requires: (item: PackItem) => item.type === "text" && !!item.questions?.length },
    { id: "read.tap", mechanic: "hotspot", skill: "reading", dimension: "reading", requires: (item: PackItem) => item.type === "text" && !!item.body },
    { id: "read.paragraph-order", mechanic: "order", skill: "reading", dimension: "order", requires: (item: PackItem) => item.type === "text" && item.body.split(/\n\s*\n/u).filter(Boolean).length > 1 },
    { id: "write.dictation", mechanic: "write", skill: "listening", dimension: "listening", requires: (item: PackItem) => !!item.audio && (item.type === "lexeme" || item.type === "sentence") },
    { id: "write.sentence", mechanic: "write", skill: "writing", dimension: "writing", requires: (item: PackItem) => item.type === "sentence" && !!item.translation },
    { id: "write.prompt", mechanic: "write", skill: "writing", dimension: "writing", requires: (item: PackItem) => item.type === "writingPrompt" },
    { id: "record.echo", mechanic: "record", skill: "speaking", dimension: "speaking", requires: (item: PackItem) => !!item.audio && (item.type === "lexeme" || item.type === "sentence") },
    { id: "record.answer", mechanic: "record", skill: "speaking", dimension: "speaking", requires: (item: PackItem) => item.type === "speakingPrompt" && !!item.audio },
    { id: "record.picture", mechanic: "record", skill: "speaking", dimension: "speaking", requires: (item: PackItem) => item.type === "speakingPrompt" && !!item.image },
    { id: "record.prompt", mechanic: "record", skill: "speaking", dimension: "speaking", requires: (item: PackItem) => item.type === "speakingPrompt" },
    { id: "record.read", mechanic: "record", skill: "speaking", dimension: "speaking", requires: (item: PackItem) => item.type === "sentence" || item.type === "text" },
] as const;
export const LITERACY_TEMPLATES: readonly TaskTemplate[] = definitions.flatMap(definition => {
    const formats = definition.id === "read.quick" ? ["recognition", "reduced-cues", "recall"] as const
        : [definition.mechanic === "record" || definition.mechanic === "write" || definition.id === "read.paragraph-order" ? "recall" : "recognition"] as const;
    return formats.map(format => {
        const id = definition.id + (definition.id === "read.quick" ? format === "recall" ? ".recall" : format === "reduced-cues" ? ".reduced" : "" : "");
        return { ...definition, id, format, mechanic: definition.id === "read.quick" && format === "recall" ? "write" : definition.mechanic,
            params: (difficulty: DifficultyProfile) => ({ optionsCount: format === "recall" ? 0 : format === "reduced-cues" ? 2 : difficulty.optionsCount }),
            generate: (item: PackItem, pack: ContentPack, profile: LanguageProfile, difficulty: DifficultyProfile, random: RandomSource) => generateLiteracyTask({ templateId: id, item, pack, profile, difficulty, random }), grade: gradeLiteracyTask };
    });
});
export const getLiteracyTemplate = (id: string): TaskTemplate | undefined => LITERACY_TEMPLATES.find(template => template.id === id);
