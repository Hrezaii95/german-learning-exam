/**
 * Conversation content pins — only P3D published Q&A fields.
 * Never invent German; never promote review-only content.
 */

import { QA_PROFESSION_CASUAL_CANONICAL } from "../content/detail-canonical-contract";
import {
  CONVERSATION_LEVEL_IDS,
  conversationLevelIndex,
  type ConversationLevelId,
} from "./level-ids";
import type { ConversationLevelMeta } from "./conversation-types";

export const CONVERSATION_CONCEPT_ID =
  QA_PROFESSION_CASUAL_CANONICAL.id;

export const CONVERSATION_QUESTION =
  QA_PROFESSION_CASUAL_CANONICAL.questionRealization;

export const CONVERSATION_ANSWER_REALIZATIONS =
  QA_PROFESSION_CASUAL_CANONICAL.answerRealizations;

/** Whitespace-split tokens of each published answer (ellipsis preserved as `…`). */
export function publishedAnswerTokenFrames(): readonly (readonly string[])[] {
  return Object.freeze(
    CONVERSATION_ANSWER_REALIZATIONS.map((realization) =>
      Object.freeze(realization.split(/\s+/).filter(Boolean)),
    ),
  );
}

/**
 * Canonical fragment pool for substitution — unique tokens drawn only from
 * the three published answer realizations (deterministic sort).
 */
export function publishedSubstitutionFragments(): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const frame of publishedAnswerTokenFrames()) {
    for (const token of frame) {
      if (!seen.has(token)) {
        seen.add(token);
        out.push(token);
      }
    }
  }
  return Object.freeze(out);
}

export function conversationActivityId(levelId: ConversationLevelId): string {
  return `activity:conversation-${levelId}`;
}

const LEVEL_COPY: Readonly<
  Record<
    ConversationLevelId,
    { readonly label: string; readonly shortLabel: string; readonly description: string }
  >
> = Object.freeze({
  model: Object.freeze({
    label: "Model",
    shortLabel: "Model",
    description:
      "Read the published informal exchange. Pronunciation playback stays unavailable until listening approval.",
  }),
  "guided-recognition": Object.freeze({
    label: "Guided recognition",
    shortLabel: "Recognition",
    description:
      "Choose an exact published answer pattern that matches the question.",
  }),
  substitution: Object.freeze({
    label: "Substitution",
    shortLabel: "Substitution",
    description:
      "Build one published answer frame from canonical published fragments only.",
  }),
  "independent-construction": Object.freeze({
    label: "Independent construction",
    shortLabel: "Construction",
    description:
      "Type one of the three published answer realizations (ellipsis-safe). Hints prevent strong correct evidence.",
  }),
  "spoken-role-play": Object.freeze({
    label: "Spoken role-play",
    shortLabel: "Speaking",
    description:
      "Record, play back, and self-check against the published prompt. Self-rating is reflection only — not pronunciation accuracy.",
  }),
});

export function buildConversationLevelCatalog(): readonly ConversationLevelMeta[] {
  return Object.freeze(
    CONVERSATION_LEVEL_IDS.map((id) => {
      const copy = LEVEL_COPY[id];
      const index = conversationLevelIndex(id);
      return Object.freeze({
        id,
        index,
        label: copy.label,
        shortLabel: copy.shortLabel,
        description: copy.description,
        progressLabel: `${index + 1}/${CONVERSATION_LEVEL_IDS.length}`,
      });
    }),
  );
}

export function metaForConversationLevel(
  levelId: ConversationLevelId,
): ConversationLevelMeta {
  const catalog = buildConversationLevelCatalog();
  return catalog[conversationLevelIndex(levelId)]!;
}
