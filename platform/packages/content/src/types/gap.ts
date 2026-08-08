import type { ContentGapId } from "../ids/index.js";

/**
 * Explicit missing-item ledger entry. Blocking gaps reject publication.
 * Validators report gap IDs and field paths — never invent substitute content.
 */
export type ContentGap = {
  kind: "ContentGap";
  id: ContentGapId;
  objectId: string;
  field: string;
  reason: string;
  owner: "codex-media" | "codex-content" | "cursor" | "owner-review" | "unknown";
  blocksPublication: boolean;
};
