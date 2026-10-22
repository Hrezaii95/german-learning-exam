import type { ContentPack } from "../../content/src/types/packs.js";
import { assertContentPack } from "../../content/src/validation/packs.js";

const listeners = new Set<() => void>();
export function subscribeOverlayPacks(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify(): void { for (const listener of listeners) { try { listener(); } catch { /* Another observer must not block registration. */ } } }

const overlays = new Map<string, ContentPack>();
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Validate the whole batch before changing any class content. Re-registering an id replaces it. */
export function registerOverlayPacks(packs: ContentPack[]): void {
  if (!Array.isArray(packs)) throw new Error("Overlay packs must be an array");
  const staged = new Map<string, ContentPack>();
  for (const value of packs) {
    assertContentPack(value);
    if (staged.has(value.id)) throw new Error(`Duplicate overlay pack id: ${value.id}`);
    staged.set(value.id, copy(value));
  }
  let changed = false;
  for (const [id, pack] of staged) {
    if (JSON.stringify(overlays.get(id)) !== JSON.stringify(pack)) { overlays.set(id, pack); changed = true; }
  }
  if (changed) notify();
}

export function getOverlayPacks(): ContentPack[] { return [...overlays.values()].sort((a, b) => a.id.localeCompare(b.id, "en")).map(copy); }
export function clearOverlayPacks(): void { if (overlays.size) { overlays.clear(); notify(); } }
