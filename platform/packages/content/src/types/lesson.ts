import type {
  ActivityId,
  CollectionId,
  LessonId,
  MediaAssetId,
  RelationshipId,
  SourceAssertionId,
} from "../ids/index.js";
import type {
  CefrLevel,
  LoopMode,
  PublicationState,
  SkillDimension,
  SourcePriority,
} from "./common.js";

export type LessonStageKind =
  | "overview"
  | "learn"
  | "listen"
  | "practise"
  | "check"
  | "review"
  | "summary";

export type LessonStage = {
  id: string;
  kind: LessonStageKind;
  titleEn: string;
  activityIds: ActivityId[];
  estimatedMinutes: number;
  skillTargets: SkillDimension[];
  required: boolean;
  completionRuleId?: string;
};

export type LessonCollectionLink = {
  collectionId: CollectionId;
  sourcePriority: SourcePriority;
  required: boolean;
};

/**
 * Lesson entity. Stages reference activities; they do not embed teachable German.
 * Extra content attaches via collections and typed relationships (LRN-006).
 */
export type Lesson = {
  kind: "Lesson";
  id: LessonId;
  number: number;
  titleDe: string;
  titleEn: string;
  cefr: CefrLevel;
  communicativeGoals: string[];
  prerequisiteLessonIds: LessonId[];
  stages: LessonStage[];
  collections: LessonCollectionLink[];
  summaryInfographicId?: MediaAssetId;
  sourceAssertionIds: SourceAssertionId[];
  relationIds: RelationshipId[];
  publication: PublicationState;
};
