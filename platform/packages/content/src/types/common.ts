import type {
  ContentObjectId,
  LessonId,
  SourceAssertionId,
  MediaAssetId,
  ApprovalId,
} from "../ids/index.js";

/** Source priority controls learning obligation, not correctness. */
export type SourcePriority = 1 | 2 | 3 | 4;
// 1 official glossary/core; 2 course/workbook; 3 teacher; 4 personal enrichment

/** Validation status for assertions and reviewed fields. */
export type ValidationStatus =
  | "candidate"
  | "verified"
  | "rejected"
  | "superseded";

export type ExtractionMethod =
  | "manual"
  | "pdf-text"
  | "ocr"
  | "filename"
  | "transcript-align"
  | "generated"
  | "fixture";

export type CefrLevel = "A1";
export type AlphaCefrBand = "A1.1" | "A1.2";

export type Gender = "masculine" | "feminine" | "neuter";
export type Article = "der" | "die" | "das";

export type SkillDimension =
  | "exposure"
  | "recognition"
  | "recall"
  | "listening"
  | "production"
  | "review-stability";

export const LOOP_MODES = [
  "see",
  "hear",
  "notice",
  "repeat",
  "recall",
  "use",
  "check",
  "review",
] as const;

export type LoopMode = (typeof LOOP_MODES)[number];

export type Register = "informal" | "formal" | "neutral";

export type MediaOrigin = "publisher" | "generated" | "recorded-user";

export type MediaKind =
  | "audio"
  | "image"
  | "infographic"
  | "waveform"
  | "other";

/** Structured text token — never raw HTML. */
export type TextToken =
  | { type: "plain"; text: string }
  | { type: "emphasis"; text: string; reason?: string }
  | { type: "gender"; text: string; gender: Gender | "plural" }
  | { type: "morph"; text: string; tag: "REG" | "SPELL" | "IRR" | "STEM" | "SUFFIX" }
  | { type: "gap"; label: string };

export type StructuredText = {
  tokens: TextToken[];
};

export type PublicationStatus =
  | "draft"
  | "review"
  | "published"
  | "blocked";

/**
 * Maps each source-controlled published field to the assertion that supplies it.
 */
export type PublishedFieldRef = {
  field: string;
  assertionId: SourceAssertionId;
};

export type ScopeException = {
  kind: "approved-enrichment";
  attachedLessonId: LessonId;
  approvalId: ApprovalId;
  note: string;
};

export type PublicationState = {
  status: PublicationStatus;
  /** Fields that are considered published and must resolve to verified assertions. */
  publishedFields: PublishedFieldRef[];
  /** Optional Alpha scope exception for teacher/personal enrichment attached to L1/L2. */
  scopeException?: ScopeException;
  blockers?: ContentObjectId[];
};

export type PronunciationRef = {
  ipa?: string;
  syllables?: string[];
  stressIndex?: number;
  audioId?: MediaAssetId;
};

export type SourceLocation = {
  page?: number;
  printedPage?: number;
  exercise?: string;
  track?: string;
  time?: [number, number];
  noteRow?: number;
  region?: string;
};

export type CompletionRule =
  | { type: "attempted"; minAttempts: number }
  | { type: "correct"; minCorrect: number }
  | { type: "viewed" }
  | { type: "recorded" }
  | { type: "all-of"; rules: CompletionRule[] };

export type AnswerSpec =
  | { type: "exact"; accepted: string[]; normalize?: "nfc-trim-casefold" }
  | { type: "tokens"; acceptedTokenSets: string[][] }
  | { type: "choice"; correctIds: string[] }
  | { type: "order"; correctOrder: string[] };

export type StructuredPrompt = {
  instruction: StructuredText;
  stem?: StructuredText;
  choices?: Array<{ id: string; label: StructuredText }>;
};

export const CONTENT_SCHEMA_VERSION = "1.0.0" as const;
export type ContentSchemaVersion = typeof CONTENT_SCHEMA_VERSION;
