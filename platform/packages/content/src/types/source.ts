import type { SourceAssertionId, SourceId } from "../ids/index.js";
import type {
  ExtractionMethod,
  SourceLocation,
  SourcePriority,
  ValidationStatus,
} from "./common.js";

export type SourceKind =
  | "glossary"
  | "coursebook"
  | "workbook"
  | "transcript"
  | "audio-pack"
  | "teacher-handout"
  | "learner-note"
  | "picture-dictionary"
  | "fixture"
  | "other";

export type Source = {
  kind: "Source";
  id: SourceId;
  title: string;
  sourceKind: SourceKind;
  language: string;
  edition?: string;
  priority: SourcePriority;
  /** Original path relative to repo resources root when applicable; never secrets. */
  originalPath?: string;
  checksumSha256?: string;
  pageCount?: number;
  trackCount?: number;
  /** Course pack / CEFR band for audio packs — used by scope firewall. */
  cefrBand?: "A1.1" | "A1.2" | "unknown";
  localeHint?: string;
};

/**
 * Field-level provenance. Published object fields must point at verified assertions.
 */
export type SourceAssertion = {
  kind: "SourceAssertion";
  id: SourceAssertionId;
  sourceId: SourceId;
  location: SourceLocation;
  subjectId: string;
  field: string;
  /** Structured value; validators do not echo this into error messages. */
  value: unknown;
  extraction: ExtractionMethod;
  confidence: number;
  status: ValidationStatus;
  reviewer?: string;
  reviewedAt?: string;
};
