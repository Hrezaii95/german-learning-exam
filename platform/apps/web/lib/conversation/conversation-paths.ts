/**
 * Canonical `/conversation` and `/conversation/[entityId]` path helpers.
 * Canonical routes use the Pages-safe typed-ID slug; raw/percent-colon forms
 * are legacy one-hop redirect aliases in server mode.
 * Unknown / wrong-kind / malformed / extra → 404 (via route resolver).
 */

import {
  encodeEntityRouteSegment,
  tryDecodeEntityRouteSegment,
} from "../content/path-utils";
import { CONVERSATION_CONCEPT_ID } from "./conversation-content";

export const CONVERSATION_ROOT_PATH = "/conversation" as const;

export const CONVERSATION_ENTITY_ID = CONVERSATION_CONCEPT_ID;

export type ConversationEntityId = typeof CONVERSATION_ENTITY_ID;

export function conversationCanonicalPath(
  entityId: ConversationEntityId = CONVERSATION_ENTITY_ID,
): string {
  return `${CONVERSATION_ROOT_PATH}/${encodeEntityRouteSegment(entityId)}`;
}

export function conversationRawColonPath(
  entityId: ConversationEntityId = CONVERSATION_ENTITY_ID,
): string {
  return `${CONVERSATION_ROOT_PATH}/${entityId}`;
}

export function listCanonicalConversationPaths(): string[] {
  return [CONVERSATION_ROOT_PATH, conversationCanonicalPath()];
}

/**
 * Decode a conversation entity segment. Accepts only the published Q&A
 * representative. Encoded canonical and identity decode of that ID succeed;
 * exotic encodings / other kinds fail closed.
 */
export function tryDecodeConversationEntitySegment(
  segment: string,
): ConversationEntityId | null {
  if (typeof segment !== "string" || segment.length === 0) return null;
  if (segment.includes("/")) return null;

  const decoded = tryDecodeEntityRouteSegment(segment);
  if (decoded == null) return null;
  if (decoded !== CONVERSATION_ENTITY_ID) return null;

  const expectedEncoded = encodeEntityRouteSegment(decoded);
  const isCanonical = segment === expectedEncoded;
  const isRawColon =
    segment === decoded && decoded.includes(":") && !segment.includes("%");

  const isLegacyEncoded =
    segment.toLowerCase() === encodeURIComponent(decoded).toLowerCase();
  if (!isCanonical && !isRawColon && !isLegacyEncoded) return null;

  return decoded;
}

export function isCanonicalConversationPath(pathname: string): boolean {
  if (pathname === CONVERSATION_ROOT_PATH) return true;
  const m = pathname.match(/^\/conversation\/([^/]+)$/);
  if (!m) return false;
  const id = tryDecodeConversationEntitySegment(m[1]!);
  if (id == null) return false;
  return pathname === conversationCanonicalPath(id);
}
