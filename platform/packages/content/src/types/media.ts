import type { MediaAssetId, SourceAssertionId } from "../ids/index.js";
import type { MediaKind, MediaOrigin, PublicationState, ValidationStatus } from "./common.js";

export type MediaVariant = {
  path: string;
  role: "master" | "study-speed" | "thumbnail" | "mobile" | "desktop" | "other";
  checksumSha256?: string;
  durationMs?: number;
};

/**
 * Media manifest entry. UI resolves by ID; never constructs filenames from German text.
 */
export type MediaAsset = {
  kind: "MediaAsset";
  id: MediaAssetId;
  mediaKind: MediaKind;
  origin: MediaOrigin;
  locale: string;
  variants: MediaVariant[];
  spokenText?: string;
  transcriptRef?: string;
  speakerOrVoice?: string;
  parentTrackId?: MediaAssetId;
  timing?: [number, number];
  speed?: number;
  licenseUseBasis?: string;
  reviewStatus: ValidationStatus;
  linkedConceptIds: string[];
  sourceAssertionIds: SourceAssertionId[];
  /** Explicit flags for scope firewall. */
  audioPack?: "A1.1" | "A1.2" | "mixed" | "unknown";
  localizedPack?: "de-DE" | "cs" | "sk" | "other";
  publication: PublicationState;
};
