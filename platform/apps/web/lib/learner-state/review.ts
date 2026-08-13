import {
  deriveMasteryDimensionReviewState,
  generateDailyMission,
  parseReviewCandidate,
  type ConceptMasterySnapshot,
  type DailyMission,
  type LearnerStateEnvelope,
  type MissionFilters,
  type ReviewCandidate,
} from "@german-learning/learning";
import {
  REVIEW_TEMPLATES,
  conceptReviewMetadata,
  learnerPublishedContentResolver,
  reviewTemplateForId,
  stableCardIdForTemplate,
} from "./registry";

export const OLDER_MAINTENANCE_DAYS = 30 as const;
export const DEFAULT_DAILY_CARD_LIMIT = 10 as const;
export const DEFAULT_NEW_CARD_LIMIT = 4 as const;

const DAY_MS = 86_400_000;

function failReviewJoin(): never {
  throw new Error("Stored review card does not match the learner-safe template registry");
}

function tagsForConcept(state: LearnerStateEnvelope, conceptId: string): readonly string[] {
  return Object.freeze(
    state.tags
      .filter((row) => row.contentId === conceptId)
      .map((row) => row.tag)
      .sort(),
  );
}

function isOlderMaintenance(lastReview: string | null, now: Date): boolean {
  if (lastReview === null) return false;
  const reviewedAt = Date.parse(lastReview);
  if (!Number.isFinite(reviewedAt)) failReviewJoin();
  const age = now.getTime() - reviewedAt;
  return age >= OLDER_MAINTENANCE_DAYS * DAY_MS;
}

export function buildReviewCandidates(input: {
  readonly state: LearnerStateEnvelope;
  readonly masteryByConcept: ReadonlyMap<string, ConceptMasterySnapshot>;
  readonly now: Date;
}): readonly ReviewCandidate[] {
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    failReviewJoin();
  }

  const candidates = input.state.reviewCards.map((card) => {
    const template = reviewTemplateForId(card.templateId);
    if (
      template === null ||
      card.cardId !== stableCardIdForTemplate(template.id) ||
      card.conceptId !== template.conceptId ||
      card.measuredDimension !== template.modality
    ) {
      failReviewJoin();
    }
    const metadata = conceptReviewMetadata(card.conceptId);
    if (
      metadata === null ||
      !metadata.lessonIds.includes(template.lessonId)
    ) {
      failReviewJoin();
    }
    const tags = tagsForConcept(input.state, card.conceptId);
    const mastery = input.masteryByConcept.get(card.conceptId);
    const recentFailure = mastery === undefined
      ? false
      : deriveMasteryDimensionReviewState(mastery, card.measuredDimension)
          .recentFailureOrDifficult;
    const taggedDifficult = tags.includes("Difficult") || tags.includes("Confusing");

    return parseReviewCandidate({
      cardId: card.cardId,
      conceptId: card.conceptId,
      templateId: card.templateId,
      publicationStatus: "published",
      unlocked: true,
      card,
      conceptLabel: metadata.displayLabel,
      measuredDimension: card.measuredDimension,
      modality: template.modality,
      sourcePriority: metadata.sourcePriority,
      lessonId: template.lessonId,
      tags,
      recentFailureOrDifficult: recentFailure || taggedDifficult,
      stageBlocking: false,
      olderMaintenance: isOlderMaintenance(card.lastReview, input.now),
      teacherAssignment: tags.includes("Teacher"),
    });
  });

  return Object.freeze(
    candidates.sort((a, b) =>
      a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0,
    ),
  );
}

export type ReviewMissionView = Readonly<{
  mission: DailyMission;
  candidateCount: number;
  dueCount: number;
  newCount: number;
  omittedModalities: readonly ("listening")[];
  availabilityNote: string;
}>;

/** Use the canonical mission generator; this helper only constructs safe inputs and honest gaps. */
export function buildDailyReviewMission(input: {
  readonly state: LearnerStateEnvelope;
  readonly masteryByConcept: ReadonlyMap<string, ConceptMasterySnapshot>;
  readonly now: Date;
  readonly dailyCardLimit?: 5 | 10 | 15;
  readonly newCardLimit?: number;
  readonly targetCount?: number;
  readonly filters?: MissionFilters;
  readonly resumeCardIds?: readonly string[];
}): ReviewMissionView {
  let candidates = buildReviewCandidates(input);
  let generatorFilters = input.filters;
  if (input.filters?.lessonId !== undefined) {
    if (learnerPublishedContentResolver.entityKind(input.filters.lessonId) !== "Lesson") {
      failReviewJoin();
    }
    candidates = Object.freeze(
      candidates.filter((candidate) => candidate.lessonId === input.filters!.lessonId),
    );
    const { lessonId: _lessonId, ...remainingFilters } = input.filters;
    generatorFilters = Object.keys(remainingFilters).length === 0
      ? undefined
      : Object.freeze(remainingFilters);
  }
  const dailyCardLimit = input.dailyCardLimit ?? DEFAULT_DAILY_CARD_LIMIT;
  const newCardLimit = input.newCardLimit ?? DEFAULT_NEW_CARD_LIMIT;
  const mission = generateDailyMission({
    candidates,
    now: input.now,
    dailyCardLimit,
    newCardLimit,
    ...(input.targetCount === undefined ? {} : { targetCount: input.targetCount }),
    ...(generatorFilters === undefined ? {} : { filters: generatorFilters }),
    ...(input.resumeCardIds === undefined ? {} : { resumeCardIds: input.resumeCardIds }),
  });
  return Object.freeze({
    mission,
    candidateCount: candidates.length,
    dueCount: candidates.filter((candidate) => Date.parse(candidate.card.due) <= input.now.getTime())
      .length,
    newCount: candidates.filter((candidate) => candidate.card.state === "new").length,
    omittedModalities: Object.freeze(["listening"] as const),
    availabilityNote:
      "Listening review is not included because no listening-approved public template is available yet.",
  });
}

export function eligibleReviewTemplateCount(conceptId: string): number {
  return REVIEW_TEMPLATES.filter((template) => template.conceptId === conceptId).length;
}
