import { describe, it, expect } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackItem, PackLexeme } from "../../packages/content/src/types/packs.js";
import profileData from "../fixtures/languages/xx.json";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import { seededRng } from "../../packages/wortwerk/src/random.js";
import { generateLiteracyTask, gradeLiteracyTask, LITERACY_TEMPLATES } from "../../packages/wortwerk/src/templates/literacy.js";
const profile = profileData as LanguageProfile;
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "sample", optionsCount: 4, timerSeconds: 0, audioSpeedRange: [0.8, 1], hintsAllowed: true, maxPassageLength: 500, distractorCloseness: 1, typedAnswerRatio: 0.5 };
const common = { unitId: "u1", bookRef: { book: "sample", lesson: 1 }, source: "course" as const, tags: ["sample"] };
const text: PackItem = { ...common, type: "text", id: "text", title: "Headline", body: "First paragraph.\n\nSecond paragraph.", questions: [{ id: "q", type: "multipleChoice", prompt: "Which detail?", answer: { type: "choice", correctIds: ["yes"] }, choices: [{ id: "yes", label: "First" }, { id: "no", label: "Third" }] }] };
const writing: PackItem = { ...common, type: "writingPrompt", id: "writing", prompt: "Write a reply.", checklist: ["One detail"], modelAnswers: ["MODEL SECRET"] };
const speaking: PackItem = { ...common, type: "speakingPrompt", id: "speaking", prompt: "Describe something.", audio: { src: "/audio/source.mp3", review: "preview", text: "HIDDEN CAPTION" }, image: "/image/source.svg", modelAnswers: ["MODEL SECRET"] };
const headlines: PackItem[] = Array.from({ length: 6 }, (_, index) => ({ ...common, type: "text", id: `news-${index}`, title: `Headline ${index}`, body: `Different passage ${index}.` }));
const pack = { ...fixture, items: [...fixtureItems, ...headlines, text, writing, speaking] } as ContentPack;
const generate = (id: string, item: PackItem) => generateLiteracyTask({ templateId: id, item, pack, profile, difficulty, random: seededRng(`${id}:${item.id}`) });
describe("Wortwerk literacy templates", () => {
    it("generates eligible fixtures and grades authored solutions", () => {
        const generatedIds = new Set<string>();
        for (const item of pack.items)
            for (const template of LITERACY_TEMPLATES) {
                const task = template.generate(item, pack, profile, difficulty, seededRng(item.id + template.id));
                if (!task)
                    continue;
                generatedIds.add(template.id);
                expect(task.format).toBe(template.format);
                expect(task.mechanic).toBe(template.mechanic);
                expect(task.templateId).toBe(template.id);
                const answer = task.solution.selfCheck ? ["self:complete", "My response"] : task.solution.order ?? task.solution.optionIds?.[0] ?? task.solution.accepted?.[0];
                expect(answer).toBeDefined();
                expect(template.grade(task, answer!, profile).correct).toBe(true);
                expect(JSON.stringify(task.question)).not.toContain("MODEL SECRET");
                expect(JSON.stringify(task.question)).not.toContain("HIDDEN CAPTION");
            }
        expect([...generatedIds].sort()).toEqual(LITERACY_TEMPLATES.map(template => template.id).sort());
    });
    it("offers reduced reading choices and typed recall with authored labels", () => {
        const reduced = generate("read.quick.reduced", text)!;
        const recall = generate("read.quick.recall", text)!;
        expect(reduced).toMatchObject({ format: "reduced-cues", mechanic: "hotspot" });
        expect(reduced.question.options).toHaveLength(2);
        expect(recall).toMatchObject({ format: "recall", mechanic: "write", solution: { accepted: ["First"] } });
        expect(recall.question.input).toBe("text");
        expect(recall.question.options).toEqual([]);
        expect(gradeLiteracyTask(recall, "First", profile).correct).toBe(true);
        expect(gradeLiteracyTask(recall, "yes", profile).correct).toBe(false);
    });
    it("preserves every authored exact-answer variant in all reading formats", () => {
        const variantText = { ...text, questions: [{ id: "q", type: "multipleChoice" as const, prompt: "Which detail?",
            answer: { type: "exact" as const, accepted: ["First", "Initial"] },
            choices: [{ id: "one", label: "First" }, { id: "two", label: "Third" }, { id: "three", label: "Fourth" }] }] };
        for (const id of ["read.quick", "read.quick.reduced", "read.quick.recall"]) {
            const task = generate(id, variantText)!;
            expect(task.solution.accepted).toEqual(["First", "Initial"]);
            if (task.format === "recall") expect(gradeLiteracyTask(task, "Initial", profile).correct).toBe(true);
        }
    });
    it("does not drop a correct option merely to reach two reduced choices", () => {
        const multiple = { ...text, questions: [{ id: "q", type: "multipleChoice" as const, prompt: "Which detail?",
            answer: { type: "choice" as const, correctIds: ["one", "two"] },
            choices: [{ id: "one", label: "First" }, { id: "two", label: "Initial" }, { id: "three", label: "Third" }] }] };
        expect(generate("read.quick.reduced", multiple)).toBeNull();
        expect(generate("read.quick", multiple)!.solution.optionIds).toHaveLength(2);
        const recall = generate("read.quick.recall", multiple)!;
        expect(recall.solution.accepted).toEqual(["First", "Initial"]);
        expect(gradeLiteracyTask(recall, "Initial", profile).correct).toBe(true);
        expect(gradeLiteracyTask(recall, "two", profile).correct).toBe(false);
    });
    it("recalls profile true-false labels and exact authored answers without options", () => {
        const localized = { ...profile, grammarLabels: { ...profile.grammarLabels, "not-given": "Not in the passage" } };
        const tf = { ...text, questions: [{ id: "q", type: "trueFalseNotGiven" as const, prompt: "Is the detail stated?", answer: { type: "choice" as const, correctIds: ["not-given"] } }] };
        const task = generateLiteracyTask({ templateId: "read.quick.recall", item: tf, pack, profile: localized, difficulty, random: seededRng(1) })!;
        expect(task.solution.accepted).toEqual(["Not in the passage"]);
        expect(gradeLiteracyTask(task, "Not in the passage", localized).correct).toBe(true);
        const free = { ...text, questions: [{ id: "q", type: "multipleChoice" as const, prompt: "Name the detail.", answer: { type: "exact" as const, accepted: ["An authored answer", "A source variant"] } }] };
        expect(generate("read.quick", free)).toBeNull();
        expect(generate("read.quick.recall", free)!.solution.accepted).toEqual(["An authored answer", "A source variant"]);
    });
    it("keeps objective recall separate from self-assessed production", () => {
        const task = generate("write.prompt", writing)!;
        const result = gradeLiteracyTask(task, ["self:complete", "my reply"], profile);
        expect(result).toMatchObject({ correct: true, hinted: true, assessment: "self", normalizedAnswer: "my reply" });
        expect(gradeLiteracyTask(task, ["self:practise", "my reply"], profile).correct).toBe(false);
        expect(gradeLiteracyTask(task, "MODEL SECRET", profile).correct).toBe(false);
    });
    it("uses opaque shuffled matching IDs and excludes ambiguous pairs", () => {
        const item = pack.items.find(value => value.type === "lexeme")!;
        const task = generate("match.meaning", item)!;
        expect(task.question.tokens).toHaveLength(6);
        expect(task.question.options).toHaveLength(6);
        expect(task.solution.order).toHaveLength(6);
        expect(task.question.options.every(option => /^right-\d$/u.test(option.id))).toBe(true);
        expect(gradeLiteracyTask(task, ["wrong"], profile).correct).toBe(false);
        const tooSmall = { ...pack, items: pack.items.filter(value => value.type === "lexeme").slice(0, 5) };
        expect(generateLiteracyTask({ templateId: "match.meaning", item, pack: tooSmall, profile, difficulty, random: seededRng(1) })).toBeNull();
    });
    it("recognises reading choices and rejects unsolvable authored questions", () => {
        const task = generate("read.quick", text)!;
        expect(task.question.passage).toBe(text.body);
        expect(task.solution.optionIds).toHaveLength(1);
        expect(task.question.options.map(option => option.id)).toEqual(["option-1", "option-2"]);
        const broken = { ...text, questions: [{ id: "q", type: "multipleChoice" as const, prompt: "Q", answer: { type: "choice" as const, correctIds: ["absent"] }, choices: [{ id: "one", label: "A" }, { id: "two", label: "B" }] }] };
        expect(generate("read.quick", broken)).toBeNull();
    });
    it("shuffles paragraph order without leaking order IDs", () => {
        const task = generate("read.paragraph-order", text)!;
        expect(task.question.tokens).toHaveLength(2);
        expect(gradeLiteracyTask(task, task.solution.order!, profile).correct).toBe(true);
    });
    it("dictation hides the transcript and preserves noun case", () => {
        const item: PackItem = { ...common, type: "lexeme", id: "word", lemma: "Søl", pos: "noun", meaning: "sun", audio: { src: "/word.mp3", review: "preview", text: "Søl" } };
        const task = generate("write.dictation", item)!;
        expect(JSON.stringify(task.question)).not.toContain("Søl");
        expect(gradeLiteracyTask(task, "Søl", profile).outcome).toBe("correct");
        expect(gradeLiteracyTask(task, "søl", profile).correct).toBe(false);
        expect(gradeLiteracyTask(task, "Soel", profile).outcome).toBe("almost");
    });
    it("grades the full authored source-clip transcript instead of dropping its spoken article", () => {
        const source = pack.items.find((item): item is PackLexeme => item.type === "lexeme" && !!item.audio?.text && item.audio.text !== item.lemma)!;
        const task = generate("write.dictation", source)!;
        expect(task.solution.accepted).toEqual([source.audio!.text]);
        expect(task.question.audio?.text).toBeUndefined();
        expect(JSON.stringify(task.question)).not.toContain(source.audio!.text);
        expect(gradeLiteracyTask(task, source.audio!.text!, profile)).toMatchObject({ correct: true, hinted: false });
        expect(gradeLiteracyTask(task, source.lemma, profile).correct).toBe(false);
        expect(task.feedback.answer).toBe(source.audio!.text);
        const withoutTranscript = { ...source, audio: { src: source.audio!.src, review: source.audio!.review } };
        expect(generate("write.dictation", withoutTranscript)!.solution.accepted).toEqual([source.lemma]);
    });
    it("balances reading choice positions across1000 deterministic tasks", () => {
        const count = [0, 0];
        for (let seed = 0; seed < 1000; seed++) {
            const task = generateLiteracyTask({ templateId: "read.quick", item: text, pack, profile, difficulty, random: seededRng(seed) })!;
            const position = task.question.options.findIndex(option => task.solution.optionIds?.includes(option.id));
            count[position] = (count[position] ?? 0) + 1;
        }
        expect(count.every(value => value > 400 && value < 600)).toBe(true);
    });
});
