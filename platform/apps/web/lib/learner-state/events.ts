import {
  parseLearnerEvent,
  type LearnerEvent,
} from "@german-learning/learning";
import { conversationActivityId } from "../conversation/conversation-content";
import type { ConversationLevelId } from "../conversation/level-ids";
import { practiceActivityId } from "../games/game-prompts";
import type { PracticeGameId } from "../games/game-ids";
import {
  learnerPublishedContentResolver,
  reviewTemplateForGame,
  reviewTemplateForId,
  type ReviewGameId,
  type ReviewTemplateId,
} from "./registry";

export type ReviewEventLink = Readonly<{
  cardId: string;
  templateId: ReviewTemplateId;
}>;

function failEvent(): never {
  throw new Error("Learner event does not match the published activity registry");
}

function assertSyntheticBase(
  event: LearnerEvent,
  expectedActivityId: string,
  expectedConceptId: string,
): void {
  if (
    event.activityId !== expectedActivityId ||
    event.conceptId !== expectedConceptId ||
    event.cardId !== undefined
  ) {
    failEvent();
  }
}

function rebuild(
  event: LearnerEvent,
  activityId: string,
  review: ReviewEventLink | undefined,
): LearnerEvent {
  const raw: Record<string, unknown> = {
    ...event,
    activityId,
    sourceActivityMode: review === undefined ? event.sourceActivityMode : "mission",
  };
  if (review === undefined) {
    delete raw.cardId;
  } else {
    raw.cardId = review.cardId;
  }
  return parseLearnerEvent(raw);
}

const CURRENT_EVENT_OWNERS = Object.freeze(new Set([
  "lex:architekt\0activity:lesson-02-core-professions",
  "lex:architekt\0activity:lesson-02-person-form-morphology",
  "verb:sein\0activity:lesson-02-sein-arbeiten-contrast",
  "qa:profession-casual-main\0activity:lesson-02-profession-qa-builder",
]));

/** Current P4 persisted events must belong to an exact representative/activity pair. */
export function assertCurrentPersistentEventLink(eventInput: LearnerEvent): LearnerEvent {
  const event = parseLearnerEvent(eventInput);
  if (
    event.activityId === undefined ||
    learnerPublishedContentResolver.entityKind(event.conceptId) !== "Concept" ||
    learnerPublishedContentResolver.entityKind(event.activityId) !== "LearningActivity" ||
    !CURRENT_EVENT_OWNERS.has(`${event.conceptId}\0${event.activityId}`)
  ) {
    failEvent();
  }
  return event;
}

function assertPracticeShape(event: LearnerEvent, gameId: ReviewGameId): void {
  if (event.sourceActivityMode !== "review") failEvent();
  switch (gameId) {
    case "flashcards":
      if (
        event.kind !== "selfRatedAttempt" ||
        event.taskFamily !== "flashcard" ||
        event.measuredDimensions[0] !== "recall"
      ) failEvent();
      return;
    case "picture-word-match":
      if (
        event.kind !== "objectiveAttempt" ||
        event.taskFamily !== "pictureRecognition" ||
        event.measuredDimensions[0] !== "recognition"
      ) failEvent();
      return;
    case "article-choice":
      if (
        event.kind !== "objectiveAttempt" ||
        event.taskFamily !== "multipleChoice" ||
        event.measuredDimensions[0] !== "recognition"
      ) failEvent();
      return;
    case "morphology-puzzle":
    case "verb-builder":
      if (
        event.kind !== "objectiveAttempt" ||
        event.taskFamily !== "formManipulation" ||
        event.measuredDimensions[0] !== "form"
      ) failEvent();
      return;
    case "word-order":
      if (
        event.kind !== "objectiveAttempt" ||
        event.taskFamily !== "sentenceOrder" ||
        event.measuredDimensions[0] !== "form"
      ) failEvent();
      return;
  }
}

/**
 * Replace a P4A synthetic activity ID with its exact published owner.
 * Audio match and every unknown/mismatched mapping fail closed.
 */
export function normalizePracticeEventForPersistence(input: {
  readonly event: LearnerEvent;
  readonly gameId: PracticeGameId;
  readonly review?: ReviewEventLink;
}): LearnerEvent {
  const event = parseLearnerEvent(input.event);
  const template = reviewTemplateForGame(input.gameId);
  if (template === null || input.gameId === "audio-match") failEvent();
  assertSyntheticBase(event, practiceActivityId(input.gameId), template.conceptId);
  assertPracticeShape(event, template.gameId as ReviewGameId);
  if (input.review !== undefined) {
    if (
      input.review.cardId.length === 0 ||
      input.review.templateId !== template.id
    ) failEvent();
  }
  return assertCurrentPersistentEventLink(
    rebuild(event, template.activityId, input.review),
  );
}

function assertConversationShape(event: LearnerEvent, levelId: ConversationLevelId): void {
  switch (levelId) {
    case "model":
      if (
        event.kind !== "exposure" ||
        event.sourceActivityMode !== "use" ||
        event.measuredDimensions[0] !== "exposure"
      ) failEvent();
      return;
    case "guided-recognition":
      if (
        event.kind !== "objectiveAttempt" ||
        event.sourceActivityMode !== "use" ||
        event.taskFamily !== "multipleChoice" ||
        event.measuredDimensions[0] !== "recognition"
      ) failEvent();
      return;
    case "substitution":
      if (
        event.kind !== "objectiveAttempt" ||
        event.sourceActivityMode !== "use" ||
        event.taskFamily !== "formManipulation" ||
        event.measuredDimensions[0] !== "form"
      ) failEvent();
      return;
    case "independent-construction":
      if (
        event.kind !== "objectiveAttempt" ||
        event.sourceActivityMode !== "use" ||
        event.taskFamily !== "productionTask" ||
        event.measuredDimensions[0] !== "production"
      ) failEvent();
      return;
    case "spoken-role-play":
      if (
        event.kind !== "recordingCycle" ||
        event.sourceActivityMode !== "repeat" ||
        event.measuredDimensions[0] !== "production"
      ) failEvent();
      return;
  }
}

/**
 * Replace a P4B synthetic level activity with the published profession-QA activity.
 * The only card-linked conversation renderer is independent construction.
 */
export function normalizeConversationEventForPersistence(input: {
  readonly event: LearnerEvent;
  readonly levelId: ConversationLevelId;
  readonly review?: ReviewEventLink;
}): LearnerEvent {
  const event = parseLearnerEvent(input.event);
  const activityId = "activity:lesson-02-profession-qa-builder";
  const conceptId = "qa:profession-casual-main";
  assertSyntheticBase(event, conversationActivityId(input.levelId), conceptId);
  assertConversationShape(event, input.levelId);

  if (input.review !== undefined) {
    const template = reviewTemplateForId(input.review.templateId);
    if (
      input.levelId !== "independent-construction" ||
      input.review.cardId.length === 0 ||
      template?.id !== "template:profession-qa-production" ||
      template.activityId !== activityId
    ) failEvent();
  }
  return assertCurrentPersistentEventLink(rebuild(event, activityId, input.review));
}
