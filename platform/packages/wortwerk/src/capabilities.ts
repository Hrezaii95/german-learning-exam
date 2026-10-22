import type { ContentPack, PackItem } from "../../content/src/types/packs.js";

export type Mechanic = "corners" | "sort" | "build" | "order" | "gap" | "match" | "hotspot" | "listen" | "record" | "write";
export type CapabilityTemplate = {
  id: string;
  skill: string;
  mechanic: Mechanic;
  dimension: string;
  minItems: number;
  requires(item: PackItem): boolean;
};

/** Eligibility only; task generation and grading are supplied by each game slice. */
export const CAPABILITY_TEMPLATES: readonly CapabilityTemplate[] = [
  { id: "corners.meaning", skill: "vocabulary", mechanic: "corners", dimension: "meaning", minItems: 8, requires: i => i.type === "lexeme" && !!i.meaning },
  { id: "corners.gender", skill: "vocabulary", mechanic: "corners", dimension: "gender", minItems: 8, requires: i => i.type === "lexeme" && !!i.gender && !!i.article },
  { id: "corners.plural", skill: "vocabulary", mechanic: "corners", dimension: "plural", minItems: 8, requires: i => i.type === "lexeme" && !!i.forms?.plural?.length },
  { id: "build.form", skill: "vocabulary", mechanic: "build", dimension: "plural", minItems: 8, requires: i => i.type === "lexeme" && !!i.forms?.plural?.length },
  { id: "match.meaning", skill: "vocabulary", mechanic: "match", dimension: "meaning", minItems: 6, requires: i => i.type === "lexeme" && !!i.meaning },
  { id: "listen.pick", skill: "listening", mechanic: "listen", dimension: "listening", minItems: 8, requires: i => !!i.audio && !!i.image },
  { id: "listen.dictation", skill: "listening", mechanic: "write", dimension: "listening", minItems: 1, requires: i => !!i.audio && (i.type === "lexeme" || i.type === "sentence") },
  { id: "record.echo", skill: "speaking", mechanic: "record", dimension: "speaking", minItems: 1, requires: i => !!i.audio && (i.type === "lexeme" || i.type === "sentence") },
  { id: "record.prompt", skill: "speaking", mechanic: "record", dimension: "speaking", minItems: 1, requires: i => i.type === "speakingPrompt" },
  { id: "order.sentence", skill: "grammar", mechanic: "order", dimension: "order", minItems: 1, requires: i => i.type === "sentence" && (i.tokens?.length ?? 0) > 1 },
  ...(["sort", "gap", "order", "transform", "errorHunt", "build"] as const).map(kind => ({
    id: `drill.${kind}`, skill: "grammar", mechanic: (kind === "transform" ? "gap" : kind === "errorHunt" ? "hotspot" : kind) as Mechanic,
    dimension: "form", minItems: 1, requires: (i: PackItem) => i.type === "drill" && i.drillType === kind,
  })),
  { id: "read.text", skill: "reading", mechanic: "hotspot", dimension: "reading", minItems: 1, requires: i => i.type === "text" },
  { id: "write.prompt", skill: "writing", mechanic: "write", dimension: "writing", minItems: 1, requires: i => i.type === "writingPrompt" },
  { id: "exam.task", skill: "exam", mechanic: "gap", dimension: "exam", minItems: 1, requires: i => i.type === "examTask" },
];

export type CapabilityIndex = {
  schemaVersion: 1;
  packId: string;
  items: Record<string, { templateIds: string[]; dimensions: string[] }>;
  templates: Record<string, { skill: string; mechanic: Mechanic; dimension: string; minItems: number; itemIds: string[]; enabled: boolean }>;
};

export function buildCapabilityIndex(pack: ContentPack, templates = CAPABILITY_TEMPLATES): CapabilityIndex {
  const items: CapabilityIndex["items"] = Object.create(null);
  const byTemplate: CapabilityIndex["templates"] = Object.create(null);
  for (const item of [...pack.items].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
    const eligible = templates.filter(template => template.requires(item));
    items[item.id] = { templateIds: eligible.map(template => template.id).sort(), dimensions: [...new Set(eligible.map(template => template.dimension))].sort() };
  }
  for (const template of [...templates].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
    const itemIds = Object.keys(items).filter(id => items[id]?.templateIds.includes(template.id));
    byTemplate[template.id] = { skill: template.skill, mechanic: template.mechanic, dimension: template.dimension, minItems: template.minItems, itemIds, enabled: itemIds.length >= template.minItems };
  }
  return { schemaVersion: 1, packId: pack.id, items, templates: byTemplate };
}
