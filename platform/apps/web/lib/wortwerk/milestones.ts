import type { ContentPack, LanguageProfile, PackItem, PackLexeme } from "../../../../packages/content/src/types/packs.js";
import type { ItemProgress, LearningAnswer, LearningCapability, RunTask } from "../../../../packages/learning/src/wortwerk/types.js";
import { orderedAnswers } from "../../../../packages/learning/src/wortwerk/progress.js";
import { mapFieldValues } from "../../../../packages/wortwerk/src/distractors.js";

export type MilestoneRule = {
  fields: Array<{ label: string; value: string }>;
  examples: Array<{ item: PackLexeme; forms: string[] }>;
  profileId: string;
};
export type PatternMilestone = {
  id: string; mapId: string; title: string;
  learningItemIds: string[]; remainingItemIds: string[]; secured: number;
  learningComplete: boolean; cellComplete: boolean;
  rule: MilestoneRule | null;
  challenge: RunTask | null;
  challengeSeen: boolean;
};

function fieldLabel(value: string, language: LanguageProfile, pack: ContentPack): string {
  return language.genders.find(entry => entry.id === value)?.article
    ?? language.pluralPatterns.find(entry => entry.id === value)?.label
    ?? pack.units.find(entry => entry.id === value)?.title ?? value;
}

/** Only profile-backed grammatical fields are rules; tags/parts of speech imply none. */
function ruleFields(fields: readonly [string, string][], language: LanguageProfile): MilestoneRule["fields"] {
  const result: MilestoneRule["fields"] = [];
  for (const [field, value] of fields) {
    if (field === "gender") {
      const entry = language.genders.find(entry => entry.id === value);
      if (!entry) return [];
      result.push({ label: language.grammarLabels.gender ?? "Gender", value: `${entry.article} · ${entry.label}` });
    } else if (field === "forms.pluralPattern") {
      const entry = language.pluralPatterns.find(entry => entry.id === value);
      if (!entry) return [];
      result.push({ label: language.grammarLabels.plural ?? "Plural", value: entry.label });
    }
  }
  return result;
}

/** All inputs are scoped capabilities plus the unfiltered raw answer history. */
export function derivePatternMilestones(pack: ContentPack, language: LanguageProfile,
  capabilities: readonly LearningCapability[], progress: readonly ItemProgress[],
  answers: readonly LearningAnswer[], now: Date): PatternMilestone[] {
  const objectives = new Map(capabilities.filter(entry => entry.packId === pack.id).flatMap(entry => {
    const dimensions = entry.dimensions.filter(dimension => entry.templates.some(template => template.dimension === dimension && template.assessment !== "self"));
    return dimensions.length ? [[entry.itemId, { capability: entry, dimensions }] as const] : [];
  }));
  const byItem = new Map(progress.filter(entry => entry.packId === pack.id).map(entry => [entry.itemId, entry]));
  const secured = (id: string) => objectives.get(id)!.dimensions.every(dimension => byItem.get(id)?.segments[dimension]?.state === "secured");
  const seen = new Set(orderedAnswers(answers, now).filter(answer => answer.packId === pack.id).map(answer => answer.itemId));
  return pack.maps.flatMap(map => {
    const cells = new Map<string, { row: string; column: string; items: PackItem[] }>();
    for (const item of pack.items) {
      if (!objectives.has(item.id)) continue;
      for (const row of mapFieldValues(item, map.rows)) for (const column of mapFieldValues(item, map.cols)) {
        const key = JSON.stringify([row, column]);
        const cell = cells.get(key) ?? { row, column, items: [] };
        if (!cell.items.some(entry => entry.id === item.id)) cell.items.push(item);
        cells.set(key, cell);
      }
    }
    return [...cells.entries()].map(([key, cell]): PatternMilestone => {
      const items = [...cell.items].sort((left, right) => left.id.localeCompare(right.id, "en"));
      const fields = ruleFields([[map.rows, cell.row], [map.cols, cell.column]], language);
      const plural = map.rows === "forms.pluralPattern" || map.cols === "forms.pluralPattern";
      const lexical = items.filter((item): item is PackLexeme => item.type === "lexeme");
      const dimensions = [...(plural ? ["plural"] : []), ...(map.rows === "gender" || map.cols === "gender" ? ["gender"] : [])];
      const formats = ["recall", "reduced-cues", "recognition"];
      // A fixed holdout gives a genuinely unseen transfer item without moving the goal
      // as answers arrive. It remains a token in the full map cell, outside this goal.
      const reserved = fields.length && lexical.length >= 2 ? [...lexical].reverse().flatMap(item => {
        const template = objectives.get(item.id)!.capability.templates.filter(template => dimensions.includes(template.dimension) && template.assessment !== "self")
          .sort((left, right) => dimensions.indexOf(left.dimension) - dimensions.indexOf(right.dimension)
            || formats.indexOf(left.format) - formats.indexOf(right.format) || left.id.localeCompare(right.id, "en"))[0];
        return template ? [{ item, template }] : [];
      })[0] : undefined;
      const learningItems = items.filter(item => item.id !== reserved?.item.id);
      const examples = learningItems.filter((item): item is PackLexeme => item.type === "lexeme").slice(0, 3);
      const rule = fields.length && examples.length ? { fields, examples: examples.map(item => ({ item, forms: plural ? [...(item.forms?.plural ?? [])] : [] })), profileId: language.id } : null;
      const remainingItemIds = learningItems.filter(item => !secured(item.id)).map(item => item.id);
      return {
        id: JSON.stringify([pack.id, map.id, key]), mapId: map.id,
        title: `${fieldLabel(cell.row, language, pack)} × ${fieldLabel(cell.column, language, pack)}`,
        learningItemIds: learningItems.map(item => item.id), remainingItemIds,
        secured: learningItems.length - remainingItemIds.length,
        learningComplete: learningItems.length > 0 && remainingItemIds.length === 0,
        cellComplete: items.every(item => secured(item.id)), rule,
        challenge: reserved && rule ? { packId: pack.id, itemId: reserved.item.id,
          templateId: reserved.template.id, skill: reserved.template.skill, dimension: reserved.template.dimension,
          format: reserved.template.format, reason: "finisher" } : null,
        challengeSeen: reserved ? seen.has(reserved.item.id) : false,
      };
    });
  }).sort((left, right) => left.remainingItemIds.length - right.remainingItemIds.length
    || right.secured - left.secured || left.id.localeCompare(right.id, "en"));
}

export function nearestPatternMilestone(milestones: readonly PatternMilestone[]): PatternMilestone | undefined {
  return milestones.find(milestone => !milestone.learningComplete);
}
