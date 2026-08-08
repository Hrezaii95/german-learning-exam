/**
 * Explicit fail-closed import/export size and count limits (C2D / P2-05).
 */

export const PERSISTENCE_LIMITS = Object.freeze({
  /** Maximum UTF-8 byte length of import JSON text. */
  maxJsonBytes: 5_000_000,
  maxEvents: 50_000,
  maxReviewCards: 20_000,
  maxTags: 10_000,
  maxNotes: 5_000,
  maxRecordings: 5_000,
  /** Plain-text personal note body. */
  maxNoteTextLength: 4_000,
  /** IDs, timezone, mimeType, bundleId, stageId, etc. */
  maxStringLength: 512,
  maxTimezoneLength: 64,
  minAudioSpeed: 0.5,
  maxAudioSpeed: 2.0,
} as const);

export type PersistenceLimits = typeof PERSISTENCE_LIMITS;
