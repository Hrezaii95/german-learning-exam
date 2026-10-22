import { interleaveMissionTasks } from "../review/mission.js";
import { deriveProgress } from "./progress.js";
import type { DailyRunPlan, DimensionProgress, LearningAnswer, LearningCapability, LearningFormat, LearningTemplate, RunTask } from "./types.js";

const FORMATS: readonly LearningFormat[] = ["recognition", "reduced-cues", "recall"];

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) { result ^= char.codePointAt(0)!; result = Math.imul(result, 16777619); }
  return result >>> 0;
}

function priority(segment: DimensionProgress, now: Date): number {
  if (segment.due && segment.dueAt) {
    const overdue = Math.max(0, now.getTime() - Date.parse(segment.dueAt)) / 86_400_000;
    return 1000 + Math.min(365, overdue) + (1 - segment.strength) * 100;
  }
  if (segment.lapses > 0 && segment.strength < 0.5) return 500 + (1 - segment.strength) * 100;
  if (segment.state === "new") return 300;
  return (1 - segment.strength) * 100;
}

function templateFor(templates: readonly LearningTemplate[], dimension: string, format: LearningFormat, seed: string): LearningTemplate | undefined {
  return templates.filter(t => t.dimension === dimension).sort((a, b) =>
    Math.abs(FORMATS.indexOf(a.format) - FORMATS.indexOf(format)) - Math.abs(FORMATS.indexOf(b.format) - FORMATS.indexOf(format))
    || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id))[0];
}

export function createDailyRun(input: {
  capabilities: readonly LearningCapability[]; answers: readonly LearningAnswer[]; now: Date;
  count?: number; mode?: "run" | "quick" | "free" | "boss" | "blitz"; seed?: string | number;
}): DailyRunPlan {
  const count = input.count ?? (input.mode === "quick" ? 5 : 20);
  if (!Number.isInteger(count) || count < 0 || count > 200) throw new Error("Run size must be an integer from 0 to 200");
  const progress = deriveProgress(input.capabilities, input.answers, input.now);
  const seed = String(input.seed ?? input.now.toISOString().slice(0, 10));
  const ranked = input.capabilities.flatMap((capability, index) => {
    const item = progress[index]!;
    const options = Object.values(item.segments).filter(s => capability.templates.some(t => t.dimension === s.dimension));
    options.sort((a, b) => priority(b, input.now) - priority(a, input.now)
      || hash(`${seed}:${capability.itemId}:${a.dimension}`) - hash(`${seed}:${capability.itemId}:${b.dimension}`));
    const dimension = options[0];
    if (!dimension) return [];
    const template = templateFor(capability.templates, dimension.dimension, dimension.format, `${seed}:${capability.itemId}`);
    if (!template) return [];
    const reason: RunTask["reason"] = dimension.state === "new" ? "new" : dimension.lapses > 0 && dimension.strength < 0.5
      ? "tricky" : dimension.due ? "review" : "maintenance";
    return [{ priority: priority(dimension, input.now), tie: hash(`${seed}:${capability.packId}:${capability.itemId}`),
      task: { packId: capability.packId, itemId: capability.itemId, dimension: dimension.dimension,
        templateId: template.id, skill: template.skill, format: template.format, reason } satisfies RunTask }];
  }).sort((a, b) => b.priority - a.priority || a.tie - b.tie || a.task.itemId.localeCompare(b.task.itemId));
  const tasks = interleaveMissionTasks(ranked, row => row.task.templateId, count).map(row => row.task);
  const preview: DailyRunPlan["preview"] = { new: 0, reviews: 0, tricky: 0, byDimension: Object.create(null) as Record<string, number> };
  for (const task of tasks) {
    if (task.reason === "new") preview.new += 1;
    else if (task.reason === "tricky") preview.tricky += 1;
    else preview.reviews += 1;
    preview.byDimension[task.dimension] = (preview.byDimension[task.dimension] ?? 0) + 1;
  }
  const parts: string[] = [];
  if (preview.new) parts.push(`${preview.new} new`);
  if (preview.reviews) parts.push(`${preview.reviews} reviews`);
  if (preview.tricky) parts.push(`${preview.tricky} tricky`);
  return { tasks, preview, reasonText: parts.join(" · ") || "No eligible tasks in this scope" };
}

function alternate(task: RunTask, capabilities: readonly LearningCapability[], seed: string): RunTask | null {
  const capability = capabilities.find(c => c.packId === task.packId && c.itemId === task.itemId);
  const options = capability?.templates.filter(t => t.dimension === task.dimension && t.id !== task.templateId && t.format !== task.format)
    .sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id));
  const template = options?.[0];
  return template ? { ...task, templateId: template.id, skill: template.skill, format: template.format, reason: "comeback" } : null;
}

function respectsTemplateLimit(tasks: readonly RunTask[]): boolean {
  return tasks.every((task, index) => index < 2 || task.templateId !== tasks[index - 1]?.templateId || task.templateId !== tasks[index - 2]?.templateId);
}

/** Returns a new queue. Never schedules a surprise retry immediately after a miss. */
export function enqueueComeback(
  tasks: readonly RunTask[], answeredIndex: number, missed: RunTask,
  capabilities: readonly LearningCapability[], seed: string | number = "comeback",
): { tasks: RunTask[]; pending: RunTask[]; scheduledIndex: number | null } {
  if (!Number.isInteger(answeredIndex) || answeredIndex < 0 || answeredIndex >= tasks.length) throw new Error("Invalid answered index");
  const candidate = alternate(missed, capabilities, String(seed));
  if (!candidate) return { tasks: [...tasks], pending: [missed], scheduledIndex: null };
  const start = hash(`${seed}:${missed.itemId}:${answeredIndex}`) % 4;
  for (let offset = 0; offset < 4; offset += 1) {
    const index = answeredIndex + 4 + (start + offset) % 4;
    if (index > tasks.length) continue;
    const next = [...tasks.slice(0, index), candidate, ...tasks.slice(index)];
    if (respectsTemplateLimit(next)) return { tasks: next, pending: [], scheduledIndex: index };
  }
  return { tasks: [...tasks], pending: [missed], scheduledIndex: null };
}

/** A finite, explicitly optional queue. A missing alternate is left for later practice. */
export function createFinisher(pending: readonly RunTask[], capabilities: readonly LearningCapability[]): RunTask[] {
  const seen = new Set<string>();
  const tasks = pending.flatMap(task => {
    const key = JSON.stringify([task.packId, task.itemId, task.dimension]);
    if (seen.has(key)) return [];
    seen.add(key);
    const next = alternate(task, capabilities, "finisher");
    return next ? [{ ...next, reason: "finisher" as const }] : [];
  });
  return interleaveMissionTasks(tasks, task => task.templateId, tasks.length);
}
