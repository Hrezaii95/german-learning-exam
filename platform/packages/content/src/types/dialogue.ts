import type {
  DialogueId,
  ListeningAssetId,
  MediaAssetId,
  RelationshipId,
  SourceAssertionId,
} from "../ids/index.js";
import type { PublicationState, StructuredText } from "./common.js";

export type DialogueTurn = {
  id: string;
  speaker: string;
  textDe: StructuredText;
  translationEn?: StructuredText;
  audioSegmentId?: MediaAssetId;
  linkedConceptIds: string[];
  taskPrompt?: StructuredText;
};

export type Dialogue = {
  kind: "Dialogue";
  id: DialogueId;
  titleEn: string;
  turns: DialogueTurn[];
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  mediaIds: MediaAssetId[];
  publication: PublicationState;
};

/**
 * ListeningAsset links media to transcript segments and exercise/source evidence.
 * Whole source tracks and derived time segments remain distinct.
 */
export type TranscriptSegment = {
  id: string;
  textDe: StructuredText;
  time?: [number, number];
  linkedConceptIds: string[];
};

export type ListeningAsset = {
  kind: "ListeningAsset";
  id: ListeningAssetId;
  mediaId: MediaAssetId;
  parentTrackMediaId?: MediaAssetId;
  transcriptSegments: TranscriptSegment[];
  exerciseRef?: string;
  relationIds: RelationshipId[];
  sourceAssertionIds: SourceAssertionId[];
  publication: PublicationState;
};
