import { describe, expect, it } from "vitest";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import { deriveWortwerkState, parseWortwerkEvidence, recordAnswer, recordSession } from "../../apps/web/lib/wortwerk/learning-state.js";
import { generateLiteracyTask, gradeLiteracyTask } from "../../packages/wortwerk/src/templates/literacy.js";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { LearningCapability } from "../../packages/learning/src/wortwerk/types.js";
import type { GeneratedTask } from "../../packages/wortwerk/src/tasks.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import de from "../../content/languages/de.json";
import b2 from "../fixtures/packs/de-b2-sample/difficulty.json";

const pack = { ...manifest, items } as unknown as ContentPack;
const profile = de as LanguageProfile;
const difficulty = b2 as DifficultyProfile;
function generate(id: string): GeneratedTask {
  const type = id === "write.sentence" ? "sentence" : id === "write.prompt" ? "writingPrompt" : "speakingPrompt";
  const item = pack.items.find(value => value.type === type)!;
  const task = generateLiteracyTask({ templateId: id, item, pack, profile, difficulty, random: () => 0.5 });
  if (!task) throw new Error(`Fixture could not generate ${id}`);
  return task;
}
function capability(task: GeneratedTask, assessment: "objective" | "self"): LearningCapability {
  return { packId: task.packId, itemId: task.itemId, dimensions: [task.dimension],
    templates: [{ id: task.templateId, dimension: task.dimension, skill: task.skill, format: task.format, assessment }] };
}
function testStore() {
  let now = new Date("2026-10-22T12:00:00.000Z");
  const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined }, { now: () => now, deviceId: "assessment-test" });
  return { store, now: () => now, nextDay: () => { now = new Date(now.getTime() + 86_400_000); } };
}

describe("objective and self-assessed raw answer evidence", () => {
  it("records and rebuilds objective sentence writing without inventing a hint", () => {
    const task = generate("write.sentence");
    const clock = testStore();
    const result = gradeLiteracyTask(task, task.solution.accepted![0]!, profile);
    expect(result).toMatchObject({ correct: true, hinted: false });
    const first = recordAnswer(task, result, { store: clock.store, now: clock.now(), timeZone: "UTC" });
    expect(first.payload).toMatchObject({ skill: "writing", hinted: false });
    expect(first.payload).not.toHaveProperty("selfAssessed");
    clock.nextDay();
    recordAnswer(task, result, { store: clock.store, now: clock.now(), timeZone: "UTC" });
    const evidence = parseWortwerkEvidence(clock.store.getSnapshot().events);
    expect(evidence.answers.every(answer => !answer.hinted)).toBe(true);
    expect(evidence.answers.every(answer => !("selfAssessed" in answer))).toBe(true);
    const state = deriveWortwerkState(clock.store.getSnapshot(), { now: clock.now(), timeZone: "UTC", capabilities: [capability(task, "objective")] });
    expect(state.progress[0]?.segments.writing).toMatchObject({ assessment: "objective", state: "secured" });
    expect(state.summary.secured).toBe(1);
  });

  it.each(["write.prompt", "record.prompt"])("persists explicit self proof for %s and never secures it", id => {
    const task = generate(id);
    const clock = testStore();
    const result = gradeLiteracyTask(task, ["self:complete", "A practice response"], profile);
    expect(result.assessment).toBe("self");
    const first = recordAnswer(task, result, { store: clock.store, now: clock.now(), timeZone: "UTC" });
    expect(first.payload).toMatchObject({ selfAssessed: true, hinted: true });
    clock.nextDay();
    recordAnswer(task, result, { store: clock.store, now: clock.now(), timeZone: "UTC" });
    const raw = clock.store.getSnapshot().events.map(event => ({ ...event, payload: { ...(event.payload as object), hinted: false } }));
    expect(parseWortwerkEvidence(raw).answers.every(answer => answer.hinted && answer.selfAssessed === true)).toBe(true);
    const state = deriveWortwerkState(clock.store.getSnapshot(), { now: clock.now(), timeZone: "UTC", capabilities: [capability(task, "self")] });
    expect(state.summary.secured).toBe(0);
    expect(state.progress[0]?.complete).toBe(false);
    expect(state.progress[0]?.segments[task.dimension]?.assessment).toBe("self");
  });

  it("honours each explicit self-evidence channel without relying on the skill label", () => {
    const task = generate("write.sentence");
    const result = gradeLiteracyTask(task, task.solution.accepted![0]!, profile);
    const clock = testStore();
    const bySolution = recordAnswer({ ...task, solution: { ...task.solution, selfCheck: true } }, result, { store: clock.store, now: clock.now() });
    const byGrade = recordAnswer(task, { ...result, assessment: "self" }, { store: clock.store, now: clock.now() });
    const byCaller = recordAnswer(task, result, { store: clock.store, now: clock.now(), selfAssessed: true });
    for (const event of [bySolution, byGrade, byCaller]) expect(event.payload).toMatchObject({ hinted: true, selfAssessed: true });
    const legacyHint = { ...byCaller, payload: { ...(byCaller.payload as Record<string, unknown>), selfAssessed: undefined } };
    delete (legacyHint.payload as Record<string, unknown>).selfAssessed;
    expect(parseWortwerkEvidence([legacyHint]).answers[0]?.hinted).toBe(true);
  });

  it("preserves assignment answer totals for mixed objective writing and self speaking", () => {
    const clock = testStore();
    const writing = generate("write.sentence");
    const speaking = generate("record.prompt");
    recordAnswer(writing, gradeLiteracyTask(writing, writing.solution.accepted![0]!, profile), { store: clock.store, now: clock.now(), sessionId: "assignment-session" });
    recordAnswer(speaking, gradeLiteracyTask(speaking, "self:complete", profile), { store: clock.store, now: clock.now(), sessionId: "assignment-session" });
    recordSession({ sessionId: "assignment-session", mode: "run", startedAt: clock.now().toISOString(), answered: 2, correct: 2, completed: true },
      { store: clock.store, now: clock.now(), assignmentId: "assignment-1" });
    const progress = clock.store.getSnapshot().events.find(event => event.type === "assignment.progress");
    expect(progress?.payload).toEqual({ assignmentId: "assignment-1", answered: 2, correct: 2, completed: true,
      bySkill: { writing: { answered: 1, correct: 1 }, speaking: { answered: 1, correct: 1 } } });
    const answers = parseWortwerkEvidence(clock.store.getSnapshot().events).answers;
    expect(answers.find(answer => answer.skill === "writing")?.hinted).toBe(false);
    expect(answers.find(answer => answer.skill === "speaking")?.hinted).toBe(true);
  });
});
