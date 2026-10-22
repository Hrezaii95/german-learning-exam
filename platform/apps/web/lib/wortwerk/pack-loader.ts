// Browser-safe entry point. Filesystem discovery stays in loader.server.ts.
export { registerOverlayPacks, getOverlayPacks, clearOverlayPacks } from "../../../../packages/wortwerk/src/registry.js";
export { buildCapabilityIndex } from "../../../../packages/wortwerk/src/capabilities.js";
export type { ContentPack } from "../../../../packages/content/src/types/packs.js";
