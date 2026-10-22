import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../../../packages/content/src/types/packs.js";
import type { LearningCapability, RunTask } from "../../../../packages/learning/src/wortwerk/index.js";
import { buildPlayableCapabilityIndex, type PlayableCapabilityIndex } from "../../../../packages/wortwerk/src/playable-capabilities.js";
import { TASK_TEMPLATES, getTaskTemplate } from "../../../../packages/wortwerk/src/template-registry.js";
import { seededRng } from "../../../../packages/wortwerk/src/random.js";
import type { GeneratedTask, TaskTemplate } from "../../../../packages/wortwerk/src/tasks.js";
import { matchesPlayScope, type PlayScope } from "../study/scope";

export const PLAY_TEMPLATES = TASK_TEMPLATES;
const cached = new WeakMap<ContentPack, { language: LanguageProfile; difficulty: DifficultyProfile; templates: readonly TaskTemplate[]; index: PlayableCapabilityIndex }>();
function capabilityIndex(pack: ContentPack, language: LanguageProfile, difficulty: DifficultyProfile, templates = PLAY_TEMPLATES): PlayableCapabilityIndex {
  const found = cached.get(pack);
  if (found && found.language === language && found.difficulty === difficulty && found.templates === templates) return found.index;
  const index = buildPlayableCapabilityIndex(pack, language, difficulty, templates);
  cached.set(pack, { language, difficulty, templates, index });
  return index;
}

export function playableCapabilities(pack: ContentPack, language: LanguageProfile, difficulty: DifficultyProfile,
  scope: PlayScope = { v: 1 }, templates: readonly TaskTemplate[] = PLAY_TEMPLATES): LearningCapability[] {
  const index = capabilityIndex(pack, language, difficulty, templates);
  return pack.items.filter(item => matchesPlayScope(item, scope)).flatMap(item => {
    const supported = index.items[item.id]!;
    const available = supported.templateIds.flatMap(id => {
      const template = index.templates[id]!;
      if (scope.skills?.length && !scope.skills.includes(template.skill) && !scope.skills.includes(template.dimension)) return [];
      return [{ id, dimension: template.dimension, skill: template.skill, ...supported.taskMetadata[id]! }];
    });
    return available.length ? [{ packId: pack.id, itemId: item.id,
      dimensions: [...new Set(available.map(template => template.dimension))], templates: available }] : [];
  });
}
export function materializeTask(task: RunTask, pack: ContentPack, language: LanguageProfile,
  difficulty: DifficultyProfile, seed: string): GeneratedTask | null {
  if (task.packId !== pack.id) return null;
  const supported = capabilityIndex(pack, language, difficulty).items[task.itemId];
  if (!supported?.templateIds.includes(task.templateId)) return null;
  const item = pack.items.find(value => value.id === task.itemId);
  const template = getTaskTemplate(task.templateId);
  return item && template ? template.generate(item, pack, language, difficulty, seededRng(seed)) : null;
}
export const templateFor = getTaskTemplate;
