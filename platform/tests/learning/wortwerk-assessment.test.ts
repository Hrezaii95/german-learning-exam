import { describe, expect, it } from "vitest";
import { deriveProgress, summarizeProgress } from "../../packages/learning/src/wortwerk/progress.js";
import { createDailyRun } from "../../packages/learning/src/wortwerk/daily-run.js";
import { deriveReadiness, deriveSkillStrength, deriveUnitProgress } from "../../packages/learning/src/wortwerk/engagement-depth.js";
import type { LearningAnswer, LearningCapability } from "../../packages/learning/src/wortwerk/types.js";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import { playableCapabilities } from "../../apps/web/lib/wortwerk/runtime.js";
import { CORNERS_TEMPLATES } from "../../packages/wortwerk/src/templates/corners.js";
import { LITERACY_TEMPLATES } from "../../packages/wortwerk/src/templates/literacy.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import profile from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";

const pack = { ...manifest, items } as unknown as ContentPack;
const capabilities = playableCapabilities(pack, profile as LanguageProfile, difficulty as DifficultyProfile, { v: 1 }, [...CORNERS_TEMPLATES, ...LITERACY_TEMPLATES]);
const noun = capabilities.find(capability => capability.templates.some(template => template.id === "record.echo"))!;
const prompt = capabilities.find(capability => pack.items.find(item => item.id === capability.itemId)?.type === "speakingPrompt")!;
const at = (day: number) => new Date(Date.UTC(2026, 0, 1 + day, 12));
function answer(capability: LearningCapability, dimension: string, templateId: string, day: number, overrides: Partial<LearningAnswer> = {}): LearningAnswer {
  return { eventId: `${capability.itemId}:${templateId}:${day}`, packId: capability.packId, itemId: capability.itemId, dimension, templateId,
    format: "recall", correct: true, hinted: false, createdAt: at(day).toISOString(), studyDate: at(day).toISOString().slice(0, 10), ...overrides };
}
function nounHistory(): LearningAnswer[] {
  return noun.dimensions.flatMap(dimension => {
    const objective = noun.templates.find(template => template.dimension === dimension && template.assessment === "objective" && template.format === "recall");
    return objective ? [0, 1, 31].map(day => answer(noun, dimension, objective.id, day)) : [0, 31].map(day => answer(noun, dimension, "record.echo", day));
  });
}

describe("objective recall and self-check practice", () => {
  it("keeps explicitly self-assessed responses out of an otherwise objective dimension", () => {
    const capability: LearningCapability = { packId: "pack", itemId: "written", dimensions: ["writing"], templates: [{ id: "write.sentence", dimension: "writing", skill: "writing", format: "recall", assessment: "objective" }] };
    const history = [answer(capability, "writing", "write.sentence", 0, { selfAssessed: true }), answer(capability, "writing", "write.sentence", 1, { selfAssessed: true })];
    const progress = deriveProgress([capability], history, at(1));
    expect(progress[0]!.segments.writing).toMatchObject({ attempts: 0, practiceAttempts: 2, strength: 0, recallDates: [], state: "new" });
    expect(summarizeProgress(progress)).toMatchObject({ complete: 0, secured: 0, selfPractice: 2, practised: 1 });
  });

  it("detects assessment from actual generated tasks instead of the mechanic or skill name", () => {
    expect(noun.templates.find(template => template.id === "record.echo")?.assessment).toBe("self");
    expect(noun.templates.find(template => template.id === "write.dictation")?.assessment).toBe("objective");
    const sentence = capabilities.find(capability => capability.templates.some(template => template.id === "write.sentence"));
    expect(sentence?.templates.find(template => template.id === "write.sentence")?.assessment).toBe("objective");
  });

  it("completes a noun's four objective dimensions while recording Echo as separate practice", () => {
    const progress = deriveProgress([noun], nounHistory(), at(32));
    const record = progress[0]!;
    expect(Object.values(record.segments).filter(segment => segment.assessment === "objective")).toHaveLength(4);
    expect(record.complete).toBe(true);
    expect(record.gold).toBe(true);
    expect(record.segments.speaking).toMatchObject({ assessment: "self", state: "learning", attempts: 2, practiceAttempts: 2, securedAt: null, strength: 0, due: false, gold: false });
    expect(summarizeProgress(progress)).toMatchObject({ items: 1, complete: 1, gold: 1, segments: 4, secured: 4, practised: 1, selfPractice: 2, selfOnlyItems: 0 });
  });

  it("never turns a speaking prompt's self-rating into secured or Gold recall", () => {
    const template = prompt.templates[0]!;
    const history = [0, 1, 31].map(day => answer(prompt, "speaking", template.id, day));
    const progress = deriveProgress([prompt], history, at(32));
    expect(progress[0]).toMatchObject({ complete: false, gold: false });
    expect(progress[0]!.segments.speaking).toMatchObject({ assessment: "self", state: "learning", recallDates: [], securedAt: null, strength: 0, due: false });
    expect(summarizeProgress(progress)).toMatchObject({ items: 0, segments: 0, secured: 0, strength: 0, practised: 1, selfPractice: 3, selfOnlyItems: 1 });
  });

  it("does not let a self-check strengthen or lapse an objective dimension that also supports it", () => {
    const mixed: LearningCapability = { packId: "p", itemId: "reading", dimensions: ["reading"], templates: [
      { id: "read.quick.recall", dimension: "reading", skill: "reading", format: "recall", assessment: "objective" },
      { id: "read.tap", dimension: "reading", skill: "reading", format: "recognition", assessment: "self" },
    ] };
    const history = [answer(mixed, "reading", "read.quick.recall", 0), answer(mixed, "reading", "read.quick.recall", 1), answer(mixed, "reading", "read.tap", 3, { correct: false, format: "recognition" })];
    const progress = deriveProgress([mixed], history, at(4))[0]!.segments.reading!;
    expect(progress).toMatchObject({ assessment: "objective", state: "secured", attempts: 2, lapses: 0, practiceAttempts: 1, lastSeen: at(1).toISOString() });
    expect(progress.recallDates).toHaveLength(2);
  });

  it("keeps self-check scores out of unit, skill and exam recall meters", () => {
    const history = [...nounHistory(), answer(prompt, "speaking", prompt.templates[0]!.id, 1)];
    const progress = deriveProgress([noun, prompt], history, at(32));
    const currentNoun = pack.items.find(item => item.id === noun.itemId)!;
    const currentPrompt = pack.items.find(item => item.id === prompt.itemId)!;
    const exam = { id: "exam-container", type: "examTask" as const, unitId: currentNoun.unitId, bookRef: currentNoun.bookRef, source: "course" as const, tags: [], section: "mixed", timing: 60, itemRefs: [noun.itemId, prompt.itemId] };
    const grammar = { id: "grammar-container", type: "grammarPoint" as const, unitId: currentNoun.unitId, bookRef: currentNoun.bookRef, source: "course" as const, tags: [], title: "Source notes", explanation: "Source notes", examples: [] };
    const sample = { ...pack, items: [currentNoun, { ...currentPrompt, unitId: currentNoun.unitId }, exam, grammar] };
    expect(deriveUnitProgress(sample, progress)[0]).toMatchObject({ complete: true, segments: 4, secured: 4, items: 1 });
    const missing = { ...sample, items: [...sample.items, { ...currentNoun, id: "missing-word" }] };
    expect(deriveUnitProgress(missing, progress)[0]).toMatchObject({ complete: false, segments: 5, secured: 4, items: 2 });
    const speaking = deriveSkillStrength([noun, prompt], progress).find(skill => skill.skill === "speaking");
    expect(speaking).toMatchObject({ assessment: "self", segments: 0, secured: 0, strength: 0, level: 0, practised: 2 });
    const section = deriveReadiness(sample, progress)[0]!;
    expect(section).toMatchObject({ items: 2, segments: 4, securedRatio: 1, observedItems: 1, selfCheck: true, selfPractice: 2 });
    const productionOnly = { ...sample, items: [currentPrompt, { ...exam, itemRefs: [prompt.itemId] }] };
    expect(deriveReadiness(productionOnly, progress)[0]).toMatchObject({ segments: 0, strength: 0, securedRatio: 0, observedItems: 0, selfCheck: true });
  });

  it("does not rank a practised self-check's permanent zero as a weak objective dimension", () => {
    const focused = { ...noun, dimensions: ["meaning", "speaking"], templates: noun.templates.filter(template => template.dimension === "meaning" || template.dimension === "speaking") };
    const history = [answer(focused, "meaning", "corners.meaning", 1, { format: "recognition" }), answer(focused, "speaking", "record.echo", 1)];
    const plan = createDailyRun({ capabilities: [focused], answers: history, now: at(1), count: 1 });
    expect(plan.tasks[0]?.dimension).toBe("meaning");
  });
});
