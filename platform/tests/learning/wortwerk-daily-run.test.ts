import { describe, expect, it } from "vitest";
import { createDailyRun, createFinisher, enqueueComeback } from "../../packages/learning/src/wortwerk/daily-run.js";
import { interleaveMissionTasks } from "../../packages/learning/src/review/mission.js";
import type { LearningAnswer, LearningCapability, RunTask } from "../../packages/learning/src/wortwerk/types.js";

const now = new Date("2026-09-12T12:00:00Z");
const capabilities: LearningCapability[] = Array.from({ length: 20 }, (_, index) => ({
  packId: "fixture", itemId: `item-${index}`, dimensions: ["meaning", "plural"], templates: [
    { id: "meaning.pick", dimension: "meaning", skill: "vocabulary", format: "recognition" },
    { id: "meaning.recall", dimension: "meaning", skill: "vocabulary", format: "recall" },
    { id: "plural.pick", dimension: "plural", skill: "vocabulary", format: "recognition" },
    { id: "plural.recall", dimension: "plural", skill: "vocabulary", format: "recall" },
  ],
}));
function task(index: number): RunTask {
  return { packId: "fixture", itemId: `item-${index}`, dimension: "plural", templateId: index % 2 ? "plural.recall" : "plural.pick",
    skill: "vocabulary", format: index % 2 ? "recall" : "recognition", reason: "new" };
}
function evidence(n: number, dimension: string, correct = true): LearningAnswer {
  return { eventId: `${dimension}-${n}`, packId: "fixture", itemId: "item-0", dimension, templateId: `${dimension}.recall`,
    format: "recall", correct, hinted: false, createdAt: `2026-09-${String(n).padStart(2, "0")}T12:00:00Z`, studyDate: `2026-09-${String(n).padStart(2, "0")}` };
}

describe("Wortwerk adaptive Daily Run", () => {
  it("selects an item's overdue weak dimension and an available ladder format", () => {
    const answers = [evidence(1, "plural", false), evidence(10, "meaning"), evidence(11, "meaning")];
    const run = createDailyRun({ capabilities, answers, now, count: 10 });
    expect(run.tasks[0]).toMatchObject({ itemId: "item-0", dimension: "plural", reason: "tricky" });
    expect(run.preview.tricky).toBe(1);
    expect(run.reasonText).toContain("1 tricky");
  });

  it("is deterministic, does not mutate evidence, and interleaves at most two of the same template", () => {
    const input = { capabilities, answers: [], now, seed: "same", count: 20 };
    const snapshot = JSON.stringify(input);
    const run = createDailyRun(input);
    expect(run).toEqual(createDailyRun(input));
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(run.tasks.length).toBeGreaterThan(10);
    for (let index = 2; index < run.tasks.length; index += 1) {
      expect([run.tasks[index - 2]!.templateId, run.tasks[index - 1]!.templateId, run.tasks[index]!.templateId].every(t => t === run.tasks[index]!.templateId)).toBe(false);
    }
  });

  it("makes a five-task Quick review and explains an empty scope", () => {
    expect(createDailyRun({ capabilities, answers: [], now, mode: "quick" }).tasks).toHaveLength(5);
    expect(createDailyRun({ capabilities: [], answers: [], now }).reasonText).toBe("No eligible tasks in this scope");
    expect(() => createDailyRun({ capabilities, answers: [], now, count: -1 })).toThrow();
  });

  it("extends the existing mission interleaving layer without inventing a template", () => {
    expect(interleaveMissionTasks(["x", "x", "x", "x"], t => t, 4)).toEqual(["x", "x"]);
    expect(interleaveMissionTasks(["x", "x", "x", "y"], t => t, 4)).toEqual(["x", "x", "y", "x"]);
  });

  it("returns misses three to six intervening cards later in another format and template", () => {
    const tasks = Array.from({ length: 15 }, (_, index) => task(index));
    const next = enqueueComeback(tasks, 0, tasks[0]!, capabilities, "fixed-seed");
    expect(next.scheduledIndex).not.toBeNull();
    const inserted = next.scheduledIndex!;
    expect(inserted - 1).toBeGreaterThanOrEqual(3);
    expect(inserted - 1).toBeLessThanOrEqual(6);
    expect(next.tasks[inserted]).toMatchObject({ itemId: tasks[0]!.itemId, dimension: "plural", reason: "comeback" });
    expect(next.tasks[inserted]!.templateId).not.toBe(tasks[0]!.templateId);
    expect(next.tasks[inserted]!.format).not.toBe(tasks[0]!.format);
    expect(tasks).toHaveLength(15);
  });

  it("offers a finite deduplicated finisher when the run is too short for a spaced comeback", () => {
    const tasks = [task(0), task(1)];
    const retry = enqueueComeback(tasks, 1, tasks[1]!, capabilities);
    expect(retry.tasks).toHaveLength(2);
    expect(retry.pending).toEqual([tasks[1]]);
    expect(createFinisher([...retry.pending, ...retry.pending], capabilities)).toHaveLength(1);
    expect(createFinisher(retry.pending, capabilities)[0]!.reason).toBe("finisher");
    expect(createFinisher(retry.pending, [])).toEqual([]);
  });
});
