import type {
  GrammarConceptId,
  MediaAssetId,
  PhrasePatternId,
  QAPairId,
  RelationshipId,
  SourceAssertionId,
} from "../ids/index.js";
import type { PublicationState, Register, StructuredText } from "./common.js";

export type SlotRole =
  | "person"
  | "name"
  | "country"
  | "city"
  | "profession"
  | "age"
  | "status"
  | "free-text";

export type Slot = {
  id: string;
  role: SlotRole;
  acceptsConceptIds?: string[];
  required: boolean;
};

export type PhrasePattern = {
  kind: "PhrasePattern";
  id: PhrasePatternId;
  intent: string;
  register: Register;
  fixedTokens: StructuredText;
  slots: Slot[];
  acceptedRealizations: StructuredText[];
  grammarIds: GrammarConceptId[];
  audioIds: MediaAssetId[];
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  publication: PublicationState;
};

export type QAPair = {
  kind: "QAPair";
  id: QAPairId;
  intent: string;
  register: Register;
  questionPatternId: PhrasePatternId;
  answerPatternIds: PhrasePatternId[];
  substitutionSets?: Array<{ slotId: string; conceptIds: string[] }>;
  grammarIds: GrammarConceptId[];
  dialogueRole?: string;
  audioIds: MediaAssetId[];
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  publication: PublicationState;
};
