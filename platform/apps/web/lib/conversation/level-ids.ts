/**
 * Exact five P4B conversation ladder level IDs — centralized, ordered, immutable.
 * Unknown / duplicate / missing / wrong-order fail closed at runtime.
 */

export const CONVERSATION_LEVEL_IDS = [
  "model",
  "guided-recognition",
  "substitution",
  "independent-construction",
  "spoken-role-play",
] as const;

export type ConversationLevelId = (typeof CONVERSATION_LEVEL_IDS)[number];

export const CONVERSATION_LEVEL_COUNT = CONVERSATION_LEVEL_IDS.length;

const LEVEL_ID_SET = new Set<string>(CONVERSATION_LEVEL_IDS);

export function isConversationLevelId(
  value: unknown,
): value is ConversationLevelId {
  return typeof value === "string" && LEVEL_ID_SET.has(value);
}

export function conversationLevelIndex(id: ConversationLevelId): number {
  return CONVERSATION_LEVEL_IDS.indexOf(id);
}

/**
 * Assert exact five-ID set in exact order. Throws on unknown, duplicate,
 * missing, or wrong order — never silently pads or reorders.
 */
export function assertExactConversationLevelIds(
  ids: readonly string[],
): asserts ids is readonly ConversationLevelId[] {
  if (ids.length !== CONVERSATION_LEVEL_IDS.length) {
    throw new Error(
      `Conversation level count mismatch: expected ${CONVERSATION_LEVEL_IDS.length}, got ${ids.length}`,
    );
  }
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    if (!isConversationLevelId(id)) {
      throw new Error("Unknown conversation level");
    }
    if (seen.has(id)) {
      throw new Error("Duplicate conversation level");
    }
    if (id !== CONVERSATION_LEVEL_IDS[i]) {
      throw new Error(
        `Conversation level order mismatch at index ${i}: expected ${CONVERSATION_LEVEL_IDS[i]}, got ${id}`,
      );
    }
    seen.add(id);
  }
}

/** Diff of actual vs exact required ordered set — empty when exact. */
export function conversationLevelIdDiff(actual: readonly string[]): {
  readonly missing: readonly ConversationLevelId[];
  readonly unknown: readonly string[];
  readonly duplicates: readonly string[];
  readonly orderMismatch: boolean;
} {
  const counts = new Map<string, number>();
  for (const id of actual) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const missing = CONVERSATION_LEVEL_IDS.filter((id) => !counts.has(id));
  const unknown = [...counts.keys()].filter((id) => !isConversationLevelId(id));
  const duplicates = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([id]) => id);
  let orderMismatch = actual.length !== CONVERSATION_LEVEL_IDS.length;
  if (!orderMismatch) {
    for (let i = 0; i < CONVERSATION_LEVEL_IDS.length; i++) {
      if (actual[i] !== CONVERSATION_LEVEL_IDS[i]) {
        orderMismatch = true;
        break;
      }
    }
  }
  return Object.freeze({
    missing: Object.freeze([...missing]),
    unknown: Object.freeze(unknown),
    duplicates: Object.freeze(duplicates),
    orderMismatch,
  });
}

export function isExactConversationLevelIdOrder(
  actual: readonly string[],
): boolean {
  const diff = conversationLevelIdDiff(actual);
  return (
    diff.missing.length === 0 &&
    diff.unknown.length === 0 &&
    diff.duplicates.length === 0 &&
    !diff.orderMismatch
  );
}
