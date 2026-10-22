import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../content/src/types/packs.js";
import type { CapabilityIndex } from "./capabilities.js";
import { seededRng } from "./random.js";
import { deduplicateTemplates, TASK_TEMPLATES, templateMinimum } from "./template-registry.js";
import type { TaskFormat, TaskTemplate } from "./tasks.js";

export type TaskCapabilityMetadata = { format: TaskFormat; assessment: "objective" | "self" };
export type PlayableCapabilityIndex = Omit<CapabilityIndex, "items" | "templates"> & {
  items: Record<string, { templateIds: string[]; dimensions: string[]; taskMetadata: Record<string, TaskCapabilityMetadata> }>;
  templates: Record<string, CapabilityIndex["templates"][string] & { formats: TaskFormat[] }>;
};

export function eligibilitySeed(packId: string, itemId: string, templateId: string): string {
  return JSON.stringify([packId, itemId, templateId, "eligibility"]);
}

/** Eligibility requires a real generated task, then the template's authored pack minimum. */
export function buildPlayableCapabilityIndex(
  pack: ContentPack, language: LanguageProfile, difficulty: DifficultyProfile,
  templates: readonly TaskTemplate[] = TASK_TEMPLATES,
): PlayableCapabilityIndex {
  const items: PlayableCapabilityIndex["items"] = Object.create(null) as PlayableCapabilityIndex["items"];
  const byTemplate: PlayableCapabilityIndex["templates"] = Object.create(null) as PlayableCapabilityIndex["templates"];
  const pool = [...pack.items].sort((left, right) => left.id.localeCompare(right.id, "en"));
  for (const item of pool) items[item.id] = { templateIds: [], dimensions: [], taskMetadata: Object.create(null) as Record<string, TaskCapabilityMetadata> };
  for (const template of [...deduplicateTemplates(templates)].sort((left, right) => left.id.localeCompare(right.id, "en"))) {
    const minItems = templateMinimum(template);
    const generated = pool.flatMap(item => {
      if (!template.requires(item)) return [];
      const task = template.generate(item, pack, language, difficulty, seededRng(eligibilitySeed(pack.id, item.id, template.id)));
      return task ? [{ itemId: item.id, dimension: task.dimension, metadata: { format: task.format, assessment: task.solution.selfCheck === true ? "self" as const : "objective" as const } }] : [];
    });
    const enabled = generated.length >= minItems;
    byTemplate[template.id] = { skill: template.skill, mechanic: template.mechanic, dimension: template.dimension, minItems,
      itemIds: generated.map(value => value.itemId), enabled, formats: [...new Set(generated.map(value => value.metadata.format))].sort() };
    if (!enabled) continue;
    for (const value of generated) {
      const record = items[value.itemId]!;
      record.templateIds.push(template.id);
      record.dimensions.push(value.dimension);
      record.taskMetadata[template.id] = value.metadata;
    }
  }
  for (const value of Object.values(items)) value.dimensions = [...new Set(value.dimensions)].sort();
  return { schemaVersion: 1, packId: pack.id, items, templates: byTemplate };
}
