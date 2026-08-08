import type {
  ExampleId,
  GrammarConceptId,
  MediaAssetId,
  RelationshipId,
  SourceAssertionId,
} from "../ids/index.js";
import type { PublicationState, StructuredText } from "./common.js";

export type GrammarRuleStep = {
  id: string;
  notice: StructuredText;
  model?: StructuredText;
};

export type GrammarConcept = {
  kind: "GrammarConcept";
  id: GrammarConceptId;
  titleEn: string;
  titleDe?: string;
  prerequisiteIds: GrammarConceptId[];
  noticeTarget: StructuredText;
  ruleSteps: GrammarRuleStep[];
  exampleIds: ExampleId[];
  commonErrorTags: string[];
  infographicId?: MediaAssetId;
  activityTemplateIds: string[];
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  mediaIds: MediaAssetId[];
  publication: PublicationState;
};
