/**
 * Deterministic canonical JSON serialization for learner-state export.
 * Same logical state + same timestamp ⇒ byte-identical output.
 */

import { persistenceError } from "./errors.js";
import type {
  ContentBundleIdentity,
  ActivityProgressRecord,
  LearnerExportMetadata,
  LearnerNoteRecord,
  LearnerSettings,
  LearnerStateEnvelope,
  LearnerTagRecord,
  RecordingMetadata,
  ResumeState,
} from "./types.js";
import type { LearnerEvent } from "../mastery/types.js";
import type { ReviewCardState } from "../review/types.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function assertSafeKey(key: string, path: string): void {
  if (FORBIDDEN_KEYS.has(key)) {
    throw persistenceError(
      "PROTOTYPE_POLLUTION",
      `Prototype-pollution key rejected at ${path}`,
      path,
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Recursively sort object keys and reject non-JSON / unsafe values.
 * Arrays retain caller order (entity arrays are pre-sorted by callers).
 */
export function canonicalizeValue(value: unknown, path = "$"): unknown {
  if (value === undefined) {
    throw persistenceError(
      "INVALID_TYPE",
      `undefined is not allowed in canonical JSON at ${path}`,
      path,
    );
  }
  if (typeof value === "function") {
    throw persistenceError(
      "INVALID_TYPE",
      `functions are not allowed in canonical JSON at ${path}`,
      path,
    );
  }
  if (typeof value === "symbol") {
    throw persistenceError(
      "INVALID_TYPE",
      `symbols are not allowed in canonical JSON at ${path}`,
      path,
    );
  }
  if (typeof value === "bigint") {
    throw persistenceError(
      "INVALID_TYPE",
      `bigint is not allowed in canonical JSON at ${path}`,
      path,
    );
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw persistenceError(
        "NAN_OR_INFINITY",
        `NaN/Infinity rejected at ${path}`,
        path,
      );
    }
    return value;
  }
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => canonicalizeValue(item, `${path}[${i}]`));
  }
  if (!isPlainObject(value)) {
    throw persistenceError(
      "INVALID_TYPE",
      `Non-plain object rejected at ${path}`,
      path,
    );
  }

  const keys = Object.keys(value).sort();
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    assertSafeKey(key, `${path}.${key}`);
    const child = value[key];
    if (child === undefined) continue;
    out[key] = canonicalizeValue(child, `${path}.${key}`);
  }
  return out;
}

function orderedSettings(s: LearnerSettings): Record<string, unknown> {
  return {
    preferredAudioSpeed: s.preferredAudioSpeed,
    timezone: s.timezone,
  };
}

function orderedContentBundle(c: ContentBundleIdentity): Record<string, unknown> {
  return {
    bundleId: c.bundleId,
    schemaVersion: c.schemaVersion,
  };
}

function orderedResume(r: ResumeState): Record<string, unknown> {
  return {
    activityId: r.activityId,
    lessonId: r.lessonId,
    position: r.position,
    stageId: r.stageId,
  };
}

function orderedActivityProgress(p: ActivityProgressRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {
    activityId: p.activityId,
    lessonId: p.lessonId,
    stageId: p.stageId,
    startedAt: p.startedAt,
    progressState: p.progressState,
  };
  if (p.completedAt !== undefined) out.completedAt = p.completedAt;
  return out;
}

function orderedTag(t: LearnerTagRecord): Record<string, unknown> {
  return {
    contentId: t.contentId,
    tag: t.tag,
  };
}

function orderedNote(n: LearnerNoteRecord): Record<string, unknown> {
  return {
    contentId: n.contentId,
    noteId: n.noteId,
    text: n.text,
    updatedAt: n.updatedAt,
  };
}

function orderedRecording(r: RecordingMetadata): Record<string, unknown> {
  const out: Record<string, unknown> = {
    byteLength: r.byteLength,
    conceptId: r.conceptId,
    createdAt: r.createdAt,
    gestureProduced: r.gestureProduced,
    mimeType: r.mimeType,
    pronunciationAccuracy: r.pronunciationAccuracy,
    recordingId: r.recordingId,
  };
  if (r.activityId !== undefined) {
    out.activityId = r.activityId;
  }
  return out;
}

function orderedExportMeta(m: LearnerExportMetadata): Record<string, unknown> {
  return {
    exportedAt: m.exportedAt,
    includesRawAudioBytes: m.includesRawAudioBytes,
    schemaVersion: m.schemaVersion,
  };
}

/** Stable field order for review cards (alphabetical). */
function orderedReviewCard(c: ReviewCardState): Record<string, unknown> {
  return {
    cardId: c.cardId,
    conceptId: c.conceptId,
    difficulty: c.difficulty,
    due: c.due,
    elapsedDays: c.elapsedDays,
    lastReview: c.lastReview,
    lapses: c.lapses,
    measuredDimension: c.measuredDimension,
    reps: c.reps,
    scheduledDays: c.scheduledDays,
    schedulerId: c.schedulerId,
    schedulerVersion: c.schedulerVersion,
    stability: c.stability,
    state: c.state,
    templateId: c.templateId,
  };
}

/**
 * Build a plain object with deterministic entity ordering for export.
 * Object key order is finalized by canonicalizeValue (sorted keys).
 */
export function toCanonicalPlainObject(
  state: LearnerStateEnvelope,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    activityProgress: state.activityProgress.map(orderedActivityProgress),
    contentBundle: orderedContentBundle(state.contentBundle),
    events: state.events.map((e) => canonicalizeValue(e) as LearnerEvent),
    learnerEventSchemaVersion: state.learnerEventSchemaVersion,
    masteryReducerVersion: state.masteryReducerVersion,
    notes: state.notes.map(orderedNote),
    recordings: state.recordings.map(orderedRecording),
    resume: state.resume === null ? null : orderedResume(state.resume),
    reviewCards: state.reviewCards.map(orderedReviewCard),
    reviewSchedulerVersion: state.reviewSchedulerVersion,
    schemaVersion: state.schemaVersion,
    settings: orderedSettings(state.settings),
    tags: state.tags.map(orderedTag),
  };
  if (state.exportMeta !== undefined) {
    out.exportMeta = orderedExportMeta(state.exportMeta);
  }
  return out;
}

/**
 * Sort entity arrays into stable order (by primary IDs).
 * Replace semantics: caller supplies full arrays; duplicates already rejected.
 */
export function sortEnvelopeEntities(
  state: LearnerStateEnvelope,
): LearnerStateEnvelope {
  const tags = [...state.tags].sort((a, b) => {
    if (a.contentId !== b.contentId) {
      return a.contentId < b.contentId ? -1 : 1;
    }
    return a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0;
  });
  const notes = [...state.notes].sort((a, b) =>
    a.noteId < b.noteId ? -1 : a.noteId > b.noteId ? 1 : 0,
  );
  const events = [...state.events].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp < b.timestamp ? -1 : 1;
    }
    return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
  });
  const reviewCards = [...state.reviewCards].sort((a, b) =>
    a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0,
  );
  const recordings = [...state.recordings].sort((a, b) =>
    a.recordingId < b.recordingId ? -1 : a.recordingId > b.recordingId ? 1 : 0,
  );
  const activityProgress = [...state.activityProgress].sort((a, b) =>
    a.activityId < b.activityId ? -1 : a.activityId > b.activityId ? 1 : 0,
  );

  const base: LearnerStateEnvelope = {
    schemaVersion: state.schemaVersion,
    masteryReducerVersion: state.masteryReducerVersion,
    reviewSchedulerVersion: state.reviewSchedulerVersion,
    learnerEventSchemaVersion: state.learnerEventSchemaVersion,
    contentBundle: state.contentBundle,
    settings: state.settings,
    resume: state.resume,
    activityProgress,
    tags,
    notes,
    events,
    reviewCards,
    recordings,
  };
  if (state.exportMeta !== undefined) {
    return { ...base, exportMeta: state.exportMeta };
  }
  return base;
}

/**
 * Serialize envelope to deterministic canonical JSON string (no trailing newline).
 */
export function serializeCanonicalLearnerState(
  state: LearnerStateEnvelope,
): string {
  const sorted = sortEnvelopeEntities(state);
  const plain = toCanonicalPlainObject(sorted);
  const canonical = canonicalizeValue(plain);
  return JSON.stringify(canonical);
}
