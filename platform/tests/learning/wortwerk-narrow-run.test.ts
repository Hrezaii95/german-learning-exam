import { describe, expect, it } from "vitest";
import { createDailyRun } from "../../packages/learning/src/wortwerk/daily-run.js";
import type { LearningAnswer, LearningCapability, RunTask } from "../../packages/learning/src/wortwerk/types.js";

const now = new Date("2026-09-12T12:00:00.000Z");
const capabilities: LearningCapability[] = Array.from({ length: 8 }, (_, index) => ({
  packId: "narrow-scope", itemId: `item-${index}`, dimensions: ["gender"], templates: [
    { id: "corners.gender", dimension: "gender", skill: "vocabulary", format: "recognition" },
    { id: "corners.gender.reduced", dimension: "gender", skill: "vocabulary", format: "reduced-cues" },
    { id: "corners.gender.recall", dimension: "gender", skill: "vocabulary", format: "recall" },
  ],
}));
function verifyDescriptors(tasks: readonly RunTask[], pool: readonly LearningCapability[]) {
  expect(new Set(tasks.map(task => JSON.stringify([task.packId, task.itemId]))).size).toBe(tasks.length);
  for (const [index, task] of tasks.entries()) {
    const item = pool.find(row => row.packId === task.packId && row.itemId === task.itemId)!;
    expect(item.templates).toContainEqual({ id: task.templateId, dimension: task.dimension, skill: task.skill, format: task.format });
    if (index >= 2) expect(tasks.slice(index - 2, index + 1).every(row => row.templateId === task.templateId)).toBe(false);
  }
}
describe("narrow-scope Daily Run interleaving", () => {
  it("fills a five-answer Quick review with closest supported formats of the same dimension", () => {
    const input = { capabilities, answers: [], now, mode: "quick" as const, seed: "narrow" };
    const before = JSON.stringify(input);
    const plan = createDailyRun(input);
    expect(plan.tasks).toHaveLength(5);
    expect(plan.tasks.map(task => task.dimension)).toEqual(Array(5).fill("gender"));
    expect(plan.tasks.slice(0, 3).map(task => task.format)).toEqual(["recognition", "recognition", "reduced-cues"]);
    expect(plan.preview).toMatchObject({ new: 5, reviews: 0, tricky: 0, byDimension: { gender: 5 } });
    verifyDescriptors(plan.tasks, capabilities);
    expect(createDailyRun(input)).toEqual(plan);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("keeps the existing ranked prefix and fills a finite longer Run with unique items", () => {
    const single = capabilities.map(row => ({ ...row, templates: row.templates.slice(0, 1) }));
    const prefix = createDailyRun({ capabilities: single, answers: [], now, count: 8, seed: "same-ranking" }).tasks;
    const full = createDailyRun({ capabilities, answers: [], now, count: 8, seed: "same-ranking" });
    expect(prefix).toHaveLength(2);
    expect(full.tasks).toHaveLength(8);
    expect(full.tasks.slice(0, 2)).toEqual(prefix);
    verifyDescriptors(full.tasks, capabilities);
    expect(createDailyRun({ capabilities, answers: [], now, count: 20 }).tasks).toHaveLength(8);
  });
  it("stays at two if the selected dimension truly has only one available template", () => {
    const single = capabilities.map(row => ({ ...row, templates: row.templates.slice(0, 1) }));
    const plan = createDailyRun({ capabilities: single, answers: [], now, mode: "quick" });
    expect(plan.tasks).toHaveLength(2);
    verifyDescriptors(plan.tasks, single);
  });
  it("never switches away from the weaker dimension just to fill the requested count", () => {
    const pool = capabilities.map(row => ({ ...row, dimensions: ["gender", "meaning"], templates: [
      row.templates[0]!, { id: "meaning.recall", dimension: "meaning", skill: "vocabulary", format: "recall" as const },
    ] }));
    const answers: LearningAnswer[] = pool.flatMap(row => [11, 12].map(day => ({
      eventId: `${row.itemId}-${day}`, packId: row.packId, itemId: row.itemId, dimension: "meaning", templateId: "meaning.recall",
      format: "recall" as const, correct: true, hinted: false, createdAt: `2026-09-${day}T11:59:00.000Z`, studyDate: `2026-09-${day}`,
    })));
    const plan = createDailyRun({ capabilities: pool, answers, now, mode: "quick" });
    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks.every(task => task.dimension === "gender")).toBe(true);
    verifyDescriptors(plan.tasks, pool);
  });
});
