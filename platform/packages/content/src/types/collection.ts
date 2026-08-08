import type {
  ActivityId,
  CollectionId,
  LessonId,
  RelationshipId,
  SourceAssertionId,
} from "../ids/index.js";
import type {
  AnswerSpec,
  CompletionRule,
  LoopMode,
  PublicationState,
  SkillDimension,
  SourcePriority,
  StructuredPrompt,
} from "./common.js";

/**
 * Named set of concepts. Static collections list member IDs;
 * dynamic collections store a query. Lesson attachment is via lessonLinks (LRN-006).
 */
export type CollectionMembership =
  | { mode: "static"; memberIds: string[] }
  | { mode: "dynamic"; query: { type?: string; lessonId?: LessonId; tags?: string[] } };

export type LessonLink = {
  lessonId: LessonId;
  sourcePriority: SourcePriority;
  required: boolean;
};

export type Collection = {
  kind: "Collection";
  id: CollectionId;
  titleEn: string;
  titleDe?: string;
  membership: CollectionMembership;
  lessonLinks: LessonLink[];
  sourcePriority: SourcePriority;
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  publication: PublicationState;
};

export type LearningActivity = {
  kind: "LearningActivity";
  id: ActivityId;
  lessonId?: LessonId;
  mode: LoopMode;
  renderer: string;
  conceptIds: string[];
  prompt: StructuredPrompt;
  answerSpec?: AnswerSpec;
  skillDimensions: SkillDimension[];
  completionRule: CompletionRule;
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  publication: PublicationState;
};
