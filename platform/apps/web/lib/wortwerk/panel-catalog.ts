import type { ContentPack, DifficultyProfile, LanguageProfile, PackItem } from "../../../../packages/content/src/types/packs.js";
import type { LearningCapability, LearningFormat } from "../../../../packages/learning/src/wortwerk/types.js";
import { encodeScope, parsePlayScope, type PlayScope } from "./links";
import { playableCapabilities } from "./runtime";
import type { WortwerkSnapshot, WortwerkStore } from "./store";

export const PANEL_CATALOG_KEY = "content.catalog";
export type PanelPackMetadata = {
  packId: string; title: string; locale: string; difficultyId: string; defaultEnabled: boolean;
  scopeKey: string; capabilities: LearningCapability[]; labels: Record<string, string>;
};
export type PanelCatalog = { v: 1; packs: PanelPackMetadata[] };
type PackSource = { pack: ContentPack; language: LanguageProfile; difficulty: DifficultyProfile; fixture: boolean };
const FORMATS: readonly LearningFormat[] = ["recognition", "reduced-cues", "recall"];
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, limit = 200): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= limit; }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.length <= 100 && value.every(v => text(v)); }
export function panelItemLabel(item: PackItem): string {
  if (item.type === "lexeme") return item.lemma;
  if (item.type === "sentence") return item.text;
  if (item.type === "text" || item.type === "grammarPoint") return item.title;
  if (item.type === "dialogue") return item.turns[0]?.text ?? item.id;
  if (item.type === "examTask") return item.section;
  return typeof item.prompt === "string" ? item.prompt : item.prompt.instruction.tokens.map(token => token.type === "gap" ? token.label : token.text).join("");
}

/** Authored capability/label metadata only. Every progress value still comes from answer events. */
export function buildPanelCatalog(packs: readonly PackSource[], scope: PlayScope): PanelCatalog {
  const scopeKey = encodeScope(scope);
  return { v: 1, packs: packs.map(({ pack, language, difficulty, fixture }) => {
    const capabilities = playableCapabilities(pack, language, difficulty, scope);
    const eligible = new Set(capabilities.map(c => c.itemId));
    const labels: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const item of pack.items) if (eligible.has(item.id)) labels[item.id] = panelItemLabel(item).slice(0, 2000) || item.id;
    return { packId: pack.id, title: pack.title, locale: language.locale, difficultyId: difficulty.id,
      defaultEnabled: !fixture && pack.review.status === "reviewed", scopeKey, capabilities, labels };
  }) };
}

/** Parse a copied snapshot instead of trusting synced JSON or a future metadata format. */
export function parsePanelCatalog(value: unknown): PanelCatalog | null {
  if (!record(value) || value.v !== 1 || !Array.isArray(value.packs) || value.packs.length > 200) return null;
  const packs: PanelPackMetadata[] = [];
  const packIds = new Set<string>();
  for (const source of value.packs) {
    if (!record(source) || !text(source.packId) || packIds.has(source.packId) || !text(source.title, 2000)
      || !text(source.locale) || !text(source.difficultyId) || typeof source.defaultEnabled !== "boolean"
      || !text(source.scopeKey, 30000) || !Array.isArray(source.capabilities) || source.capabilities.length > 20000 || !record(source.labels)) return null;
    const capabilities: LearningCapability[] = [];
    const labels: Record<string, string> = Object.create(null) as Record<string, string>;
    const itemIds = new Set<string>();
    for (const item of source.capabilities) {
      if (!record(item) || item.packId !== source.packId || !text(item.itemId) || itemIds.has(item.itemId)
        || !strings(item.dimensions) || !Array.isArray(item.templates) || item.templates.length > 100
        || !Object.prototype.hasOwnProperty.call(source.labels, item.itemId) || !text(source.labels[item.itemId], 2000)) return null;
      const templates: LearningCapability["templates"][number][] = [];
      const templateIds = new Set<string>();
      for (const template of item.templates) {
        if (!record(template) || !text(template.id) || templateIds.has(template.id) || !text(template.dimension)
          || !item.dimensions.includes(template.dimension) || !text(template.skill) || !FORMATS.includes(template.format as LearningFormat)
          || template.assessment !== "objective" && template.assessment !== "self") return null;
        templates.push({ id: template.id, dimension: template.dimension, skill: template.skill, format: template.format as LearningFormat,
          assessment: template.assessment as "objective" | "self" });
        templateIds.add(template.id);
      }
      capabilities.push({ packId: source.packId, itemId: item.itemId, dimensions: [...new Set(item.dimensions)], templates });
      labels[item.itemId] = source.labels[item.itemId] as string;
      itemIds.add(item.itemId);
    }
    packs.push({ packId: source.packId, title: source.title, locale: source.locale, difficultyId: source.difficultyId,
      defaultEnabled: source.defaultEnabled, scopeKey: source.scopeKey, capabilities, labels });
    packIds.add(source.packId);
  }
  return { v: 1, packs };
}

/** Future metadata is preserved. Equal catalogs do not cause a store notification loop. */
export function cachePanelCatalog(store: WortwerkStore, catalog: PanelCatalog): boolean {
  const existing = store.getSnapshot().docs.find(doc => doc.key === PANEL_CATALOG_KEY);
  if (existing && (existing.schemaVersion > 1 || record(existing.value) && typeof existing.value.v === "number" && existing.value.v > 1)) return false;
  if (JSON.stringify(existing?.value) === JSON.stringify(catalog)) return false;
  store.setDoc(PANEL_CATALOG_KEY, catalog);
  return true;
}

export type PanelSelection = {
  status: "ready" | "missing" | "stale" | "unsupported";
  pack: PanelPackMetadata | undefined; scope: PlayScope;
};
export function selectedPanelMetadata(snapshot: WortwerkSnapshot): PanelSelection {
  let scope: PlayScope;
  try { scope = parsePlayScope(snapshot.docs.find(doc => doc.key === "study.scope")?.value ?? { v: 1 }); }
  catch { return { status: "stale", pack: undefined, scope: { v: 1 } }; }
  const doc = snapshot.docs.find(entry => entry.key === PANEL_CATALOG_KEY);
  if (!doc) return { status: "missing", pack: undefined, scope };
  if (doc.schemaVersion !== 1) return { status: "unsupported", pack: undefined, scope };
  const catalog = parsePanelCatalog(doc.value);
  if (!catalog) return { status: "unsupported", pack: undefined, scope };
  const settings = snapshot.docs.find(entry => entry.key === "settings")?.value;
  const explicitIds = record(settings) && Array.isArray(settings.enabledPackIds) && settings.enabledPackIds.every(id => typeof id === "string") ? settings.enabledPackIds : null;
  const enabled = catalog.packs.filter(pack => explicitIds ? explicitIds.includes(pack.packId) : pack.defaultEnabled);
  const id = snapshot.docs.find(entry => entry.key === "study.pack")?.value;
  const pack = enabled.find(entry => entry.packId === id) ?? enabled[0];
  if (!pack) return { status: "missing", pack: undefined, scope };
  return { status: pack.scopeKey === encodeScope(scope) ? "ready" : "stale", pack, scope };
}
