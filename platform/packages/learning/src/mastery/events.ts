/**
 * Discriminated, versioned learner-event schema with fail-closed runtime validation.
 */

import { isMasteryDimension, type MasteryDimension } from "./dimensions.js";
import { MasteryError, masteryError } from "./errors.js";
import { expectedDimensionForTaskFamily } from "./policy.js";
import {
  LEARNER_EVENT_SCHEMA_VERSION,
  type AttemptOutcome,
  type AudioInteractionEvent,
  type ExposureEvent,
  type ExposureKind,
  type LearnerEvent,
  type ObjectiveAttemptEvent,
  type ObjectiveTaskFamily,
  type RecordingCycleEvent,
  type SelfRatedAttemptEvent,
  type SelfRating,
  type SourceActivityMode,
  type TaskFamily,
} from "./types.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ISO_TZ_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/;

const HTML_RE = /<\/?[a-z][\s\S]*>/i;

const EVENT_KINDS = [
  "exposure",
  "objectiveAttempt",
  "selfRatedAttempt",
  "audioInteraction",
  "recordingCycle",
] as const;

const EXPOSURE_KINDS: readonly ExposureKind[] = ["page", "card", "visual"];

const TASK_FAMILIES: readonly TaskFamily[] = [
  "multipleChoice",
  "pictureRecognition",
  "typedRecall",
  "formManipulation",
  "listeningTask",
  "productionTask",
  "flashcard",
  "sentenceOrder",
];

const SOURCE_MODES: readonly SourceActivityMode[] = [
  "see",
  "hear",
  "notice",
  "repeat",
  "recall",
  "use",
  "check",
  "review",
  "hub",
  "mission",
];

const OUTCOMES: readonly AttemptOutcome[] = ["correct", "partial", "incorrect"];
const RATINGS: readonly SelfRating[] = ["again", "hard", "good", "easy"];

const REWARD_KEYS = ["xp", "streak", "badge", "badges", "streakDays", "xpDelta"] as const;

const ALLOWED_BASE = new Set([
  "schemaVersion",
  "eventId",
  "sessionId",
  "timestamp",
  "conceptId",
  "activityId",
  "cardId",
  "sourceActivityMode",
  "measuredDimensions",
  "kind",
]);

const ALLOWED_BY_KIND: Record<(typeof EVENT_KINDS)[number], ReadonlySet<string>> = {
  exposure: new Set([...ALLOWED_BASE, "exposureKind"]),
  objectiveAttempt: new Set([
    ...ALLOWED_BASE,
    "taskFamily",
    "graderOutcome",
    "latencyMs",
    "hintsUsed",
    "normalizedAnswer",
  ]),
  selfRatedAttempt: new Set([
    ...ALLOWED_BASE,
    "taskFamily",
    "rating",
    "latencyMs",
    "hintsUsed",
  ]),
  audioInteraction: new Set([
    ...ALLOWED_BASE,
    "hasLinkedTask",
    "audioSpeed",
    "latencyMs",
    "hintsUsed",
    "graderOutcome",
  ]),
  recordingCycle: new Set([
    ...ALLOWED_BASE,
    "listenCompleted",
    "recordCompleted",
    "playbackCompleted",
    "selfCheckCompleted",
    "selfRating",
    "latencyMs",
    "hintsUsed",
  ]),
};

function assertNoRewardFields(raw: Record<string, unknown>): void {
  for (const key of REWARD_KEYS) {
    if (key in raw) {
      throw masteryError(
        "REWARD_FIELD_FORBIDDEN",
        `Reward field "${key}" is forbidden on learner events`,
        key,
      );
    }
  }
}

function assertOnlyAllowedKeys(
  raw: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      if ((REWARD_KEYS as readonly string[]).includes(key)) {
        throw masteryError(
          "REWARD_FIELD_FORBIDDEN",
          `Reward field "${key}" is forbidden on learner events`,
          key,
        );
      }
      throw masteryError("UNKNOWN_FIELD", `Unknown event field: ${key}`, key);
    }
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Strict ISO-8601 timestamp with timezone.
 * Rejects impossible Gregorian dates (e.g. 2026-02-30); accepts valid leap days.
 * Requires Z or ±HH:MM; validates hour/minute/second and offset ranges.
 */
export function isIsoTimestampWithTimezone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_TZ_RE.exec(value);
  if (!m) return false;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;

  const tz = m[7]!;
  if (tz !== "Z") {
    const offH = Number(m[8]);
    const offM = Number(m[9]);
    if (!Number.isInteger(offH) || !Number.isInteger(offM)) return false;
    if (offM > 59) return false;
    // Practical civil offset band: −12:00 … +14:00
    if (offH > 14 || (offH === 14 && offM > 0)) return false;
    if (tz.startsWith("-") && (offH > 12 || (offH === 12 && offM > 0))) return false;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

export function rejectHtmlShaped(value: string, field: string): void {
  if (HTML_RE.test(value)) {
    throw masteryError("HTML_CONTENT", `HTML-shaped string rejected at ${field}`, field);
  }
}

function requireString(raw: Record<string, unknown>, field: string): string {
  const v = raw[field];
  if (typeof v !== "string" || v.length === 0) {
    throw masteryError("REQUIRED_FIELD", `${field} must be a non-empty string`, field);
  }
  rejectHtmlShaped(v, field);
  return v;
}

function optionalString(raw: Record<string, unknown>, field: string): string | undefined {
  if (!(field in raw) || raw[field] === undefined) return undefined;
  const v = raw[field];
  if (typeof v !== "string" || v.length === 0) {
    throw masteryError("INVALID_TYPE", `${field} must be a non-empty string when present`, field);
  }
  rejectHtmlShaped(v, field);
  return v;
}

function requireBoolean(raw: Record<string, unknown>, field: string): boolean {
  const v = raw[field];
  if (typeof v !== "boolean") {
    throw masteryError("INVALID_TYPE", `${field} must be boolean`, field);
  }
  return v;
}

function requireLatency(raw: Record<string, unknown>, field = "latencyMs"): number {
  const v = raw[field];
  if (typeof v !== "number" || !Number.isFinite(v) || Number.isNaN(v) || v < 0) {
    throw masteryError(
      "INVALID_LATENCY",
      `${field} must be a finite non-negative number`,
      field,
    );
  }
  return v;
}

function optionalLatency(raw: Record<string, unknown>): number | undefined {
  if (!("latencyMs" in raw) || raw.latencyMs === undefined) return undefined;
  return requireLatency(raw);
}

function requireHints(raw: Record<string, unknown>): number {
  const v = raw.hintsUsed;
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
    throw masteryError(
      "INVALID_TYPE",
      "hintsUsed must be a non-negative integer",
      "hintsUsed",
    );
  }
  return v;
}

function optionalHints(raw: Record<string, unknown>): number | undefined {
  if (!("hintsUsed" in raw) || raw.hintsUsed === undefined) return undefined;
  return requireHints(raw);
}

function requireAudioSpeed(raw: Record<string, unknown>): number {
  const v = raw.audioSpeed;
  if (typeof v !== "number" || !Number.isFinite(v) || Number.isNaN(v)) {
    throw masteryError("INVALID_AUDIO_SPEED", "audioSpeed must be a finite number", "audioSpeed");
  }
  if (v < 0.25 || v > 2.0) {
    throw masteryError(
      "INVALID_AUDIO_SPEED",
      "audioSpeed must be within [0.25, 2.0]",
      "audioSpeed",
    );
  }
  return v;
}

function parseDimensions(raw: Record<string, unknown>): MasteryDimension[] {
  const v = raw.measuredDimensions;
  if (!Array.isArray(v) || v.length === 0) {
    throw masteryError(
      "REQUIRED_FIELD",
      "measuredDimensions must be a non-empty array",
      "measuredDimensions",
    );
  }
  const out: MasteryDimension[] = [];
  for (const d of v) {
    if (!isMasteryDimension(d)) {
      throw masteryError(
        "INVALID_DIMENSION",
        `Unknown mastery dimension: ${String(d)}`,
        "measuredDimensions",
      );
    }
    if (out.includes(d)) {
      throw masteryError(
        "INVALID_DIMENSION",
        `Duplicate measured dimension: ${d}`,
        "measuredDimensions",
      );
    }
    out.push(d);
  }
  return out;
}

function parseTaskFamily(raw: Record<string, unknown>): TaskFamily {
  const v = raw.taskFamily;
  if (typeof v !== "string" || !(TASK_FAMILIES as readonly string[]).includes(v)) {
    throw masteryError("INVALID_DISCRIMINANT", `Invalid taskFamily: ${String(v)}`, "taskFamily");
  }
  return v as TaskFamily;
}

function parseOutcome(raw: Record<string, unknown>, field: string): AttemptOutcome {
  const v = raw[field];
  if (typeof v !== "string" || !(OUTCOMES as readonly string[]).includes(v)) {
    throw masteryError("INVALID_DISCRIMINANT", `Invalid ${field}: ${String(v)}`, field);
  }
  return v as AttemptOutcome;
}

function parseRating(raw: Record<string, unknown>, field: string): SelfRating {
  const v = raw[field];
  if (typeof v !== "string" || !(RATINGS as readonly string[]).includes(v)) {
    throw masteryError("INVALID_DISCRIMINANT", `Invalid ${field}: ${String(v)}`, field);
  }
  return v as SelfRating;
}

/** Enforce exact task-family → single measured dimension (no laundering / no exposure append). */
function assertExactTaskFamilyDimension(
  taskFamily: TaskFamily,
  dimensions: readonly MasteryDimension[],
): void {
  const expected = expectedDimensionForTaskFamily(taskFamily);
  if (dimensions.length !== 1 || dimensions[0] !== expected) {
    throw masteryError(
      "DIMENSION_EVENT_MISMATCH",
      `${taskFamily} must measure exactly ["${expected}"]`,
      "measuredDimensions",
    );
  }
}

function parseBase(raw: Record<string, unknown>): {
  schemaVersion: typeof LEARNER_EVENT_SCHEMA_VERSION;
  eventId: string;
  sessionId: string;
  timestamp: string;
  conceptId: string;
  activityId?: string;
  cardId?: string;
  sourceActivityMode: SourceActivityMode;
  measuredDimensions: MasteryDimension[];
} {
  assertNoRewardFields(raw);

  if (raw.schemaVersion !== LEARNER_EVENT_SCHEMA_VERSION) {
    throw masteryError(
      "INVALID_SCHEMA_VERSION",
      `Unsupported schemaVersion: ${String(raw.schemaVersion)}`,
      "schemaVersion",
    );
  }

  if (!isUuid(raw.eventId)) {
    throw masteryError("INVALID_UUID", "eventId must be a valid UUID", "eventId");
  }
  if (!isUuid(raw.sessionId)) {
    throw masteryError("INVALID_UUID", "sessionId must be a valid UUID", "sessionId");
  }
  if (!isIsoTimestampWithTimezone(raw.timestamp)) {
    throw masteryError(
      "INVALID_TIMESTAMP",
      "timestamp must be ISO-8601 with timezone",
      "timestamp",
    );
  }

  const conceptId = requireString(raw, "conceptId");
  const activityId = optionalString(raw, "activityId");
  const cardId = optionalString(raw, "cardId");

  const mode = raw.sourceActivityMode;
  if (typeof mode !== "string" || !(SOURCE_MODES as readonly string[]).includes(mode)) {
    throw masteryError(
      "INVALID_DISCRIMINANT",
      `Invalid sourceActivityMode: ${String(mode)}`,
      "sourceActivityMode",
    );
  }

  const measuredDimensions = parseDimensions(raw);

  const base: {
    schemaVersion: typeof LEARNER_EVENT_SCHEMA_VERSION;
    eventId: string;
    sessionId: string;
    timestamp: string;
    conceptId: string;
    activityId?: string;
    cardId?: string;
    sourceActivityMode: SourceActivityMode;
    measuredDimensions: MasteryDimension[];
  } = {
    schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
    eventId: raw.eventId,
    sessionId: raw.sessionId,
    timestamp: raw.timestamp,
    conceptId,
    sourceActivityMode: mode as SourceActivityMode,
    measuredDimensions,
  };
  if (activityId !== undefined) base.activityId = activityId;
  if (cardId !== undefined) base.cardId = cardId;
  return base;
}

function parseExposure(raw: Record<string, unknown>): ExposureEvent {
  assertOnlyAllowedKeys(raw, ALLOWED_BY_KIND.exposure);
  const base = parseBase(raw);
  const exposureKind = raw.exposureKind;
  if (
    typeof exposureKind !== "string" ||
    !(EXPOSURE_KINDS as readonly string[]).includes(exposureKind)
  ) {
    throw masteryError(
      "INVALID_DISCRIMINANT",
      `Invalid exposureKind: ${String(exposureKind)}`,
      "exposureKind",
    );
  }
  if (base.measuredDimensions.length !== 1 || base.measuredDimensions[0] !== "exposure") {
    throw masteryError(
      "DIMENSION_EVENT_MISMATCH",
      "exposure events may only measure exposure",
      "measuredDimensions",
    );
  }
  return { ...base, kind: "exposure", exposureKind: exposureKind as ExposureKind };
}

function parseObjective(raw: Record<string, unknown>): ObjectiveAttemptEvent {
  assertOnlyAllowedKeys(raw, ALLOWED_BY_KIND.objectiveAttempt);
  const base = parseBase(raw);
  const taskFamily = parseTaskFamily(raw);
  // C2BR2: flashcard is reserved for selfRatedAttempt — never launder into graded strong evidence.
  if (taskFamily === "flashcard") {
    throw masteryError(
      "DIMENSION_EVENT_MISMATCH",
      'taskFamily:"flashcard" is reserved for selfRatedAttempt; use typedRecall for objective graded recall',
      "taskFamily",
    );
  }
  const objectiveFamily = taskFamily as ObjectiveTaskFamily;
  assertExactTaskFamilyDimension(objectiveFamily, base.measuredDimensions);
  const graderOutcome = parseOutcome(raw, "graderOutcome");
  const latencyMs = requireLatency(raw);
  const hintsUsed = requireHints(raw);
  const normalizedAnswer = optionalString(raw, "normalizedAnswer");

  if ("masteryPoints" in raw || "status" in raw || "masteryStatus" in raw) {
    throw masteryError(
      "UNKNOWN_FIELD",
      "Client-supplied mastery points/status are forbidden",
    );
  }

  const event: ObjectiveAttemptEvent = {
    ...base,
    kind: "objectiveAttempt",
    taskFamily: objectiveFamily,
    graderOutcome,
    latencyMs,
    hintsUsed,
  };
  if (normalizedAnswer !== undefined) event.normalizedAnswer = normalizedAnswer;
  return event;
}

function parseSelfRated(raw: Record<string, unknown>): SelfRatedAttemptEvent {
  assertOnlyAllowedKeys(raw, ALLOWED_BY_KIND.selfRatedAttempt);
  const base = parseBase(raw);
  const taskFamily = parseTaskFamily(raw);
  if (taskFamily !== "flashcard") {
    throw masteryError(
      "INVALID_DISCRIMINANT",
      'selfRatedAttempt is valid only for taskFamily:"flashcard"',
      "taskFamily",
    );
  }
  assertExactTaskFamilyDimension("flashcard", base.measuredDimensions);
  return {
    ...base,
    kind: "selfRatedAttempt",
    taskFamily: "flashcard",
    rating: parseRating(raw, "rating"),
    latencyMs: requireLatency(raw),
    hintsUsed: requireHints(raw),
  };
}

function parseAudio(raw: Record<string, unknown>): AudioInteractionEvent {
  assertOnlyAllowedKeys(raw, ALLOWED_BY_KIND.audioInteraction);
  const base = parseBase(raw);
  const hasLinkedTask = requireBoolean(raw, "hasLinkedTask");
  const audioSpeed = requireAudioSpeed(raw);

  if (!hasLinkedTask) {
    for (const d of base.measuredDimensions) {
      if (d !== "exposure" && d !== "listening") {
        throw masteryError(
          "DIMENSION_EVENT_MISMATCH",
          "audio without task may only measure exposure and/or listening",
          "measuredDimensions",
        );
      }
    }
    if ("graderOutcome" in raw && raw.graderOutcome !== undefined) {
      throw masteryError(
        "DIMENSION_EVENT_MISMATCH",
        "audio without task cannot carry graderOutcome",
        "graderOutcome",
      );
    }
    const latencyMs = optionalLatency(raw);
    const hintsUsed = optionalHints(raw);
    const event: AudioInteractionEvent = {
      ...base,
      kind: "audioInteraction",
      hasLinkedTask: false,
      audioSpeed,
    };
    if (latencyMs !== undefined) event.latencyMs = latencyMs;
    if (hintsUsed !== undefined) event.hintsUsed = hintsUsed;
    return event;
  }

  // Linked audio task: listening only; latency + hints required (no zero-coercion).
  if (base.measuredDimensions.length !== 1 || base.measuredDimensions[0] !== "listening") {
    throw masteryError(
      "DIMENSION_EVENT_MISMATCH",
      "audio with linked task must measure exactly [\"listening\"]",
      "measuredDimensions",
    );
  }
  if (!("latencyMs" in raw) || raw.latencyMs === undefined) {
    throw masteryError(
      "REQUIRED_FIELD",
      "linked audio task requires latencyMs",
      "latencyMs",
    );
  }
  if (!("hintsUsed" in raw) || raw.hintsUsed === undefined) {
    throw masteryError(
      "REQUIRED_FIELD",
      "linked audio task requires hintsUsed",
      "hintsUsed",
    );
  }
  const latencyMs = requireLatency(raw);
  const hintsUsed = requireHints(raw);
  const graderOutcome = parseOutcome(raw, "graderOutcome");
  return {
    ...base,
    kind: "audioInteraction",
    hasLinkedTask: true,
    audioSpeed,
    latencyMs,
    hintsUsed,
    graderOutcome,
  };
}

function parseRecording(raw: Record<string, unknown>): RecordingCycleEvent {
  assertOnlyAllowedKeys(raw, ALLOWED_BY_KIND.recordingCycle);
  const base = parseBase(raw);
  if (base.measuredDimensions.length !== 1 || base.measuredDimensions[0] !== "production") {
    throw masteryError(
      "DIMENSION_EVENT_MISMATCH",
      "recordingCycle must measure exactly [\"production\"]",
      "measuredDimensions",
    );
  }

  const listenCompleted = requireBoolean(raw, "listenCompleted");
  const recordCompleted = requireBoolean(raw, "recordCompleted");
  const playbackCompleted = requireBoolean(raw, "playbackCompleted");
  const selfCheckCompleted = requireBoolean(raw, "selfCheckCompleted");

  let selfRating: SelfRating | undefined;
  if ("selfRating" in raw && raw.selfRating !== undefined) {
    selfRating = parseRating(raw, "selfRating");
  }
  const latencyMs = optionalLatency(raw);
  const hintsUsed = optionalHints(raw);

  if ("pronunciationAccuracy" in raw || "pronunciationScore" in raw) {
    throw masteryError(
      "UNKNOWN_FIELD",
      "pronunciation scoring fields are forbidden on recording events",
    );
  }

  const event: RecordingCycleEvent = {
    ...base,
    kind: "recordingCycle",
    listenCompleted,
    recordCompleted,
    playbackCompleted,
    selfCheckCompleted,
  };
  if (selfRating !== undefined) event.selfRating = selfRating;
  if (latencyMs !== undefined) event.latencyMs = latencyMs;
  if (hintsUsed !== undefined) event.hintsUsed = hintsUsed;
  return event;
}

/**
 * Validate and normalize one learner event. Fail closed on malformed input.
 */
export function parseLearnerEvent(input: unknown): LearnerEvent {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw masteryError("INVALID_TYPE", "Event must be a plain object");
  }
  const raw = input as Record<string, unknown>;
  const kind = raw.kind;
  if (typeof kind !== "string" || !(EVENT_KINDS as readonly string[]).includes(kind)) {
    throw masteryError(
      "INVALID_DISCRIMINANT",
      `Unknown or missing event kind: ${String(kind)}`,
      "kind",
    );
  }
  switch (kind as (typeof EVENT_KINDS)[number]) {
    case "exposure":
      return parseExposure(raw);
    case "objectiveAttempt":
      return parseObjective(raw);
    case "selfRatedAttempt":
      return parseSelfRated(raw);
    case "audioInteraction":
      return parseAudio(raw);
    case "recordingCycle":
      return parseRecording(raw);
    default: {
      const _exhaustive: never = kind as never;
      throw masteryError("INVALID_DISCRIMINANT", `Unhandled kind: ${String(_exhaustive)}`);
    }
  }
}

export function parseLearnerEvents(inputs: unknown[]): LearnerEvent[] {
  return inputs.map((e, i) => {
    try {
      return parseLearnerEvent(e);
    } catch (err) {
      if (err instanceof MasteryError) {
        throw masteryError(err.code, `events[${i}]: ${err.message}`, err.field);
      }
      throw err;
    }
  });
}

/** Canonical fingerprint for conflict detection (order-independent key sort). */
export function eventFingerprint(event: LearnerEvent): string {
  const keys = Object.keys(event).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) {
    ordered[k] = (event as unknown as Record<string, unknown>)[k];
  }
  return JSON.stringify(ordered);
}
