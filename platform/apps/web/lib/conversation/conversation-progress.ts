/**
 * Deterministic in-session conversation progress.
 * Forward only after meaningful level completion; back is always allowed.
 * Persistence/resume across sessions is explicitly pending (P4C/P4D).
 */

import {
  CONVERSATION_LEVEL_IDS,
  conversationLevelIndex,
  type ConversationLevelId,
} from "./level-ids";
import type { ConversationSessionProgress } from "./conversation-types";

export function initialConversationProgress(): ConversationSessionProgress {
  return Object.freeze({
    highestCompletedIndex: -1,
    currentLevelId: CONVERSATION_LEVEL_IDS[0]!,
    completedLevelIds: Object.freeze([]) as readonly ConversationLevelId[],
  });
}

export function canAccessConversationLevel(
  progress: ConversationSessionProgress,
  levelId: ConversationLevelId,
): boolean {
  const idx = conversationLevelIndex(levelId);
  // Current and all completed; next locked level is highestCompleted+1.
  return idx <= progress.highestCompletedIndex + 1;
}

export function selectConversationLevel(
  progress: ConversationSessionProgress,
  levelId: ConversationLevelId,
): ConversationSessionProgress {
  if (!canAccessConversationLevel(progress, levelId)) return progress;
  return Object.freeze({
    ...progress,
    currentLevelId: levelId,
  });
}

/**
 * Mark the current level complete and advance when possible.
 * Idempotent for already-completed levels.
 */
export function completeConversationLevel(
  progress: ConversationSessionProgress,
  levelId: ConversationLevelId,
): ConversationSessionProgress {
  if (!canAccessConversationLevel(progress, levelId)) return progress;
  const idx = conversationLevelIndex(levelId);
  const highest = Math.max(progress.highestCompletedIndex, idx);
  const completed = CONVERSATION_LEVEL_IDS.filter((_, i) => i <= highest);
  const nextId =
    highest + 1 < CONVERSATION_LEVEL_IDS.length
      ? CONVERSATION_LEVEL_IDS[highest + 1]!
      : levelId;
  // Stay on completed level if caller wants to review; ladder UI may advance.
  return Object.freeze({
    highestCompletedIndex: highest,
    currentLevelId: progress.currentLevelId === levelId ? nextId : progress.currentLevelId,
    completedLevelIds: Object.freeze([...completed]),
  });
}

export function advanceAfterComplete(
  progress: ConversationSessionProgress,
  levelId: ConversationLevelId,
): ConversationSessionProgress {
  const next = completeConversationLevel(progress, levelId);
  const idx = conversationLevelIndex(levelId);
  if (idx + 1 < CONVERSATION_LEVEL_IDS.length) {
    return selectConversationLevel(next, CONVERSATION_LEVEL_IDS[idx + 1]!);
  }
  return selectConversationLevel(next, levelId);
}

export function isLevelCompleted(
  progress: ConversationSessionProgress,
  levelId: ConversationLevelId,
): boolean {
  return conversationLevelIndex(levelId) <= progress.highestCompletedIndex;
}
