import type {
  ExampleId,
  GrammarConceptId,
  MediaAssetId,
  RelationshipId,
  SourceAssertionId,
  VerbId,
} from "../ids/index.js";
import type { PronunciationRef, PublicationState, StructuredText } from "./common.js";

export type PersonKey =
  | "ich"
  | "du"
  | "er_sie_es"
  | "wir"
  | "ihr"
  | "sie_plural"
  | "Sie_formal";

export type VerbPresentForm = {
  person: PersonKey;
  form: string;
  morphTags?: Array<"REG" | "SPELL" | "IRR" | "STEM">;
  audioId?: MediaAssetId;
};

export type Verb = {
  kind: "Verb";
  id: VerbId;
  infinitive: string;
  separable?: boolean;
  reflexive?: boolean;
  meanings: Array<{ glossEn: string; useNote?: string }>;
  present: VerbPresentForm[];
  pronunciation: PronunciationRef;
  exampleIds: ExampleId[];
  grammarIds: GrammarConceptId[];
  collocations?: StructuredText[];
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  mediaIds: MediaAssetId[];
  cardTemplateIds: string[];
  publication: PublicationState;
};
