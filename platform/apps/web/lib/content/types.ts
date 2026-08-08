import type {
  ActivityId,
  LessonId,
  LoopMode,
  SkillDimension,
  StructuredPrompt,
  TextToken,
} from "./learner-content-types";

export type LearnerLessonStageKind =
  | "overview"
  | "learn"
  | "listen"
  | "practise"
  | "check"
  | "review"
  | "summary";

export type LearnerPromptText = {
  tokens: TextToken[];
};

export type LearnerPrompt = {
  instruction: LearnerPromptText;
  stem?: LearnerPromptText;
  choices?: Array<{ id: string; label: LearnerPromptText }>;
};

export type LearnerActivityEvidence = {
  /** Only published activities are projected. */
  publicationStatus: "published";
  /** Prompt field is present in the published bundle after validation. */
  promptPublished: true;
  /** Interaction renderer is not implemented in this slice. */
  interactionReady: false;
};

export type LearnerActivity = {
  id: ActivityId;
  lessonId: LessonId;
  lessonNumber: number;
  lessonRouteSegment: string;
  stageId: string;
  stageTitleEn: string;
  mode: LoopMode;
  renderer: string;
  prompt: LearnerPrompt;
  promptPlainText: string;
  skillDimensions: readonly SkillDimension[];
  evidence: LearnerActivityEvidence;
  canonicalPath: string;
};

export type LearnerStage = {
  id: string;
  kind: LearnerLessonStageKind;
  titleEn: string;
  estimatedMinutes: number;
  skillTargets: readonly SkillDimension[];
  required: boolean;
  activityIds: readonly ActivityId[];
};

export type LearnerLesson = {
  id: LessonId;
  number: number;
  routeSegment: string;
  titleDe: string;
  titleEn: string;
  communicativeGoals: readonly string[];
  stages: readonly LearnerStage[];
  estimatedMinutesTotal: number;
  activityCount: number;
  canonicalPath: string;
};

export type ActivityOwnership = {
  activityId: ActivityId;
  lessonId: LessonId;
  lessonNumber: number;
  lessonRouteSegment: string;
  stageId: string;
  canonicalPath: string;
};

export type LearnerWebProjection = {
  schemaVersion: "1.0.0";
  projectionKind: "learner-web";
  lessonCount: 2;
  /**
   * Learner-published activities only.
   * Derived from validated publication total minus review-only policy
   * (`learner-publication-policy.ts`); currently 23 until teacher-deck approval.
   */
  activityCount: number;
  lessons: readonly LearnerLesson[];
  activities: readonly LearnerActivity[];
  ownershipByActivityId: Readonly<Record<string, ActivityOwnership>>;
  zeroState: {
    continuePath: string;
    continueActivityId: ActivityId;
    continueLessonId: LessonId;
    continueLessonTitleDe: string;
  };
};

export type ProjectedStructuredPrompt = StructuredPrompt;
