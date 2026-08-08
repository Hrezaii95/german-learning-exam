/**
 * Fail-closed LearnerStateEnvelope validation (C2D / C2DR1 / C2DR2 / C2DR3).
 */

import {
  isIsoTimestampWithTimezone,
  isUuid,
  parseLearnerEvent,
  rejectHtmlShaped,
} from "../mastery/events.js";
import { MasteryError } from "../mastery/errors.js";
import {
  LEARNER_EVENT_SCHEMA_VERSION,
  MASTERY_REDUCER_VERSION,
  type LearnerEvent,
} from "../mastery/types.js";
import { parseReviewCardState } from "../review/validate.js";
import { ReviewError } from "../review/errors.js";
import {
  REVIEW_SCHEDULER_VERSION,
  type ReviewCardState,
} from "../review/types.js";
import { canonicalizeValue, sortEnvelopeEntities } from "./canonicalize.js";
import { PersistenceError, persistenceError } from "./errors.js";
import { PERSISTENCE_LIMITS } from "./limits.js";
import {
  EXPECTED_CONTENT_BUNDLE_SCHEMA_VERSION,
  LEARNER_BUILT_IN_TAGS,
  LEARNER_STATE_SCHEMA_VERSION,
  type ContentBundleIdentity,
  type LearnerBuiltInTag,
  type LearnerExportMetadata,
  type LearnerNoteRecord,
  type LearnerSettings,
  type LearnerStateEnvelope,
  type LearnerTagRecord,
  type PublishedContentEntityKind,
  type PublishedContentResolver,
  type RecordingMetadata,
  type ResumeState,
} from "./types.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const REWARD_KEYS = [
  "xp",
  "streak",
  "badge",
  "badges",
  "streakDays",
  "xpDelta",
] as const;

const DERIVED_FORBIDDEN_KEYS = [
  "mastery",
  "masteryByConcept",
  "masterySnapshots",
  "derivedMastery",
  "status",
  "statusCounts",
  "dimensionTotals",
] as const;

const ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "masteryReducerVersion",
  "reviewSchedulerVersion",
  "learnerEventSchemaVersion",
  "contentBundle",
  "settings",
  "resume",
  "tags",
  "notes",
  "events",
  "reviewCards",
  "recordings",
  "exportMeta",
]);

const SETTINGS_KEYS = new Set(["preferredAudioSpeed", "timezone"]);
const RESUME_KEYS = new Set(["lessonId", "activityId", "stageId", "position"]);
const TAG_KEYS = new Set(["contentId", "tag"]);
const NOTE_KEYS = new Set(["noteId", "contentId", "text", "updatedAt"]);
const RECORDING_KEYS = new Set([
  "recordingId",
  "conceptId",
  "activityId",
  "createdAt",
  "mimeType",
  "byteLength",
  "gestureProduced",
  "pronunciationAccuracy",
]);
const BUNDLE_KEYS = new Set(["schemaVersion", "bundleId"]);
const EXPORT_META_KEYS = new Set([
  "exportedAt",
  "includesRawAudioBytes",
  "schemaVersion",
]);

/** Keys that must never appear (blobs / secrets / absolute path smuggling). */
const SECRET_OR_BLOB_KEYS = new Set([
  "audioBytes",
  "rawAudio",
  "blob",
  "password",
  "secret",
  "token",
  "apiKey",
  "privateKey",
  "authorization",
]);

const ABSOLUTE_PATH_RE =
  /^(?:[a-zA-Z]:[\\/]|\\\\|\/(?!\/)|file:\/\/)/i;

/**
 * Mandatory fail-closed validation context.
 * Callers cannot omit typed published-content resolver or expected content-bundle identity.
 */
export type ParseLearnerStateOptions = {
  readonly publishedIds: PublishedContentResolver;
  readonly expectedContentBundle: ContentBundleIdentity;
};

/** Opaque brand — package index must not re-export this type. */
declare const validatedLearnerStateBrand: unique symbol;

/**
 * Envelope that has passed parseLearnerStateEnvelope / migrateToCurrent.
 * Not forgeable via a boolean flag.
 */
export type ValidatedLearnerState = LearnerStateEnvelope & {
  readonly [validatedLearnerStateBrand]: true;
};

function markValidated(state: LearnerStateEnvelope): ValidatedLearnerState {
  return state as ValidatedLearnerState;
}

export function assertValidationContext(
  options: ParseLearnerStateOptions,
): void {
  if (options === null || typeof options !== "object") {
    throw persistenceError(
      "REQUIRED_FIELD",
      "Validation context is required",
      "options",
    );
  }
  const publishedIds = options.publishedIds;
  if (
    publishedIds === null ||
    typeof publishedIds !== "object" ||
    typeof publishedIds.isPublished !== "function" ||
    typeof publishedIds.entityKind !== "function" ||
    typeof publishedIds.lessonOwnsStage !== "function" ||
    typeof publishedIds.stageOwnsActivity !== "function"
  ) {
    throw persistenceError(
      "REQUIRED_FIELD",
      "publishedIds relational resolver is required",
      "publishedIds",
    );
  }
  const bundle = options.expectedContentBundle;
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw persistenceError(
      "REQUIRED_FIELD",
      "expectedContentBundle is required",
      "expectedContentBundle",
    );
  }
  if (
    typeof bundle.schemaVersion !== "string" ||
    bundle.schemaVersion.length === 0
  ) {
    throw persistenceError(
      "REQUIRED_FIELD",
      "expectedContentBundle.schemaVersion is required",
      "expectedContentBundle.schemaVersion",
    );
  }
  if (typeof bundle.bundleId !== "string" || bundle.bundleId.length === 0) {
    throw persistenceError(
      "REQUIRED_FIELD",
      "expectedContentBundle.bundleId is required",
      "expectedContentBundle.bundleId",
    );
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const child of Object.values(value as object)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

/**
 * Detach a plain JSON clone. Never freezes or mutates the caller-owned value.
 */
export function deepClonePlain<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    throw persistenceError(
      "INVALID_TYPE",
      "Value is not JSON-cloneable",
      "$",
    );
  }
}

function assertNoForbiddenKey(key: string, path: string): void {
  if (FORBIDDEN_KEYS.has(key)) {
    throw persistenceError(
      "PROTOTYPE_POLLUTION",
      `Prototype-pollution key rejected at ${path}`,
      path,
    );
  }
  if ((SECRET_OR_BLOB_KEYS as ReadonlySet<string>).has(key)) {
    throw persistenceError(
      "SECRET_OR_BLOB_FORBIDDEN",
      `Secret/blob field rejected at ${path}`,
      path,
    );
  }
  if ((REWARD_KEYS as readonly string[]).includes(key)) {
    throw persistenceError(
      "REWARD_FIELD_FORBIDDEN",
      `Reward field rejected at ${path}`,
      path,
    );
  }
  if ((DERIVED_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
    throw persistenceError(
      "DERIVED_STATE_FORBIDDEN",
      `Derived mastery/status field rejected at ${path}`,
      path,
    );
  }
}

function assertOnlyKeys(
  raw: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Object.keys(raw)) {
    assertNoForbiddenKey(key, `${path}.${key}`);
    if (!allowed.has(key)) {
      throw persistenceError(
        "UNKNOWN_FIELD",
        `Unknown field at ${path}.${key}`,
        `${path}.${key}`,
      );
    }
  }
}

function requireObject(input: unknown, path: string): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw persistenceError("INVALID_TYPE", `Expected object at ${path}`, path);
  }
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    assertNoForbiddenKey(key, `${path}.${key}`);
  }
  return raw;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * After safe prototype/shape preflight, compute a trustworthy serialized size.
 * Callers cannot override or omit this measurement.
 */
function enforceObjectEnvelopeByteLimit(raw: Record<string, unknown>): void {
  let serialized: string;
  try {
    const plain = canonicalizeValue(raw);
    serialized = JSON.stringify(plain);
  } catch (err) {
    if (err instanceof PersistenceError) throw err;
    throw persistenceError(
      "INVALID_TYPE",
      "Envelope candidate is not JSON-serializable",
      "$",
    );
  }
  if (utf8ByteLength(serialized) > PERSISTENCE_LIMITS.maxJsonBytes) {
    throw persistenceError(
      "OVERSIZE_JSON",
      "Import JSON exceeds maxJsonBytes",
      "json",
    );
  }
}

function assertPersistedString(
  value: string,
  path: string,
  maxLen: number = PERSISTENCE_LIMITS.maxStringLength,
): void {
  if (value.length > maxLen) {
    throw persistenceError(
      "OVERSIZE_STRING",
      `${path} exceeds max length`,
      path,
    );
  }
  if (ABSOLUTE_PATH_RE.test(value)) {
    throw persistenceError(
      "ABSOLUTE_PATH_FORBIDDEN",
      `Absolute path rejected at ${path}`,
      path,
    );
  }
}

/**
 * Recursively apply persistence string limits/path firewall and secret-key scan
 * to all persisted string fields (including nested future strings).
 * Never echoes string values in errors.
 */
function assertPersistedDataStrings(value: unknown, path: string): void {
  if (typeof value === "string") {
    assertPersistedString(value, path);
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertPersistedDataStrings(value[i], `${path}[${i}]`);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertNoForbiddenKey(key, `${path}.${key}`);
      assertPersistedDataStrings(child, `${path}.${key}`);
    }
  }
}

/** Learner-event string firewall (C2DR2). */
function assertPersistedEventStrings(value: unknown, path: string): void {
  assertPersistedDataStrings(value, path);
}

/**
 * Review-card string firewall (C2DR3): every string inside a validated
 * ReviewCardState — cardId, conceptId, templateId, due, lastReview,
 * schedulerId/version, measuredDimension, and any future nested string.
 */
function assertPersistedReviewCardStrings(value: unknown, path: string): void {
  assertPersistedDataStrings(value, path);
}

function requireBoundedString(
  raw: Record<string, unknown>,
  field: string,
  path: string,
  maxLen: number = PERSISTENCE_LIMITS.maxStringLength,
): string {
  const v = raw[field];
  if (typeof v !== "string" || v.length === 0) {
    throw persistenceError(
      "REQUIRED_FIELD",
      `${path}.${field} must be a non-empty string`,
      `${path}.${field}`,
    );
  }
  if (v.length > maxLen) {
    throw persistenceError(
      "OVERSIZE_STRING",
      `${path}.${field} exceeds max length`,
      `${path}.${field}`,
    );
  }
  try {
    rejectHtmlShaped(v, `${path}.${field}`);
  } catch {
    throw persistenceError(
      "HTML_CONTENT",
      `HTML-shaped string rejected at ${path}.${field}`,
      `${path}.${field}`,
    );
  }
  if (ABSOLUTE_PATH_RE.test(v)) {
    throw persistenceError(
      "ABSOLUTE_PATH_FORBIDDEN",
      `Absolute path rejected at ${path}.${field}`,
      `${path}.${field}`,
    );
  }
  return v;
}

function requireIso(raw: Record<string, unknown>, field: string, path: string): string {
  const v = requireBoundedString(raw, field, path);
  if (!isIsoTimestampWithTimezone(v)) {
    throw persistenceError(
      "INVALID_DATE",
      `${path}.${field} must be ISO-8601 with timezone`,
      `${path}.${field}`,
    );
  }
  return v;
}

function requirePublished(
  id: string,
  resolver: PublishedContentResolver,
  path: string,
): void {
  if (!resolver.isPublished(id)) {
    throw persistenceError(
      "UNPUBLISHED_ID",
      `Unpublished or unknown content id at ${path}`,
      path,
    );
  }
}

function requirePublishedKind(
  id: string,
  kind: PublishedContentEntityKind,
  resolver: PublishedContentResolver,
  path: string,
): void {
  requirePublished(id, resolver, path);
  if (resolver.entityKind(id) !== kind) {
    throw persistenceError(
      "CROSS_REFERENCE",
      `Content id at ${path} is not a published ${kind}`,
      path,
    );
  }
}

function parseSettings(input: unknown, path: string): LearnerSettings {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, SETTINGS_KEYS, path);
  const preferredAudioSpeed = raw.preferredAudioSpeed;
  if (
    typeof preferredAudioSpeed !== "number" ||
    !Number.isFinite(preferredAudioSpeed) ||
    Number.isNaN(preferredAudioSpeed)
  ) {
    throw persistenceError(
      "INVALID_SETTINGS",
      `${path}.preferredAudioSpeed must be a finite number`,
      `${path}.preferredAudioSpeed`,
    );
  }
  if (
    preferredAudioSpeed < PERSISTENCE_LIMITS.minAudioSpeed ||
    preferredAudioSpeed > PERSISTENCE_LIMITS.maxAudioSpeed
  ) {
    throw persistenceError(
      "INVALID_SETTINGS",
      `${path}.preferredAudioSpeed out of range`,
      `${path}.preferredAudioSpeed`,
    );
  }
  const timezone = requireBoundedString(
    raw,
    "timezone",
    path,
    PERSISTENCE_LIMITS.maxTimezoneLength,
  );
  return Object.freeze({ preferredAudioSpeed, timezone });
}

function parseResume(
  input: unknown,
  path: string,
  publishedIds: PublishedContentResolver,
): ResumeState {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, RESUME_KEYS, path);
  const lessonId = requireBoundedString(raw, "lessonId", path);
  const activityId = requireBoundedString(raw, "activityId", path);
  const stageId = requireBoundedString(raw, "stageId", path);
  requirePublishedKind(lessonId, "Lesson", publishedIds, `${path}.lessonId`);
  requirePublishedKind(
    activityId,
    "LearningActivity",
    publishedIds,
    `${path}.activityId`,
  );
  if (!publishedIds.lessonOwnsStage(lessonId, stageId)) {
    throw persistenceError(
      "CROSS_REFERENCE",
      `Resume stage does not belong to lesson`,
      `${path}.stageId`,
    );
  }
  if (!publishedIds.stageOwnsActivity(lessonId, stageId, activityId)) {
    throw persistenceError(
      "CROSS_REFERENCE",
      `Resume activity does not belong to lesson stage`,
      `${path}.activityId`,
    );
  }
  const position = raw.position;
  if (
    typeof position !== "number" ||
    !Number.isFinite(position) ||
    !Number.isInteger(position) ||
    position < 0
  ) {
    throw persistenceError(
      "INVALID_RESUME",
      `${path}.position must be a non-negative integer`,
      `${path}.position`,
    );
  }
  return Object.freeze({ lessonId, activityId, stageId, position });
}

function parseTag(
  input: unknown,
  path: string,
  publishedIds: PublishedContentResolver,
): LearnerTagRecord {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, TAG_KEYS, path);
  const contentId = requireBoundedString(raw, "contentId", path);
  requirePublished(contentId, publishedIds, `${path}.contentId`);
  const tag = raw.tag;
  if (
    typeof tag !== "string" ||
    !(LEARNER_BUILT_IN_TAGS as readonly string[]).includes(tag)
  ) {
    throw persistenceError(
      "INVALID_TAG",
      `${path}.tag must be a built-in tag`,
      `${path}.tag`,
    );
  }
  return Object.freeze({ contentId, tag: tag as LearnerBuiltInTag });
}

function parseNote(
  input: unknown,
  path: string,
  publishedIds: PublishedContentResolver,
): LearnerNoteRecord {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, NOTE_KEYS, path);
  const noteId = requireBoundedString(raw, "noteId", path);
  if (!isUuid(noteId)) {
    throw persistenceError(
      "INVALID_TYPE",
      `${path}.noteId must be a UUID`,
      `${path}.noteId`,
    );
  }
  const contentId = requireBoundedString(raw, "contentId", path);
  requirePublished(contentId, publishedIds, `${path}.contentId`);
  const text = raw.text;
  if (typeof text !== "string") {
    throw persistenceError(
      "REQUIRED_FIELD",
      `${path}.text must be a string`,
      `${path}.text`,
    );
  }
  if (text.length > PERSISTENCE_LIMITS.maxNoteTextLength) {
    throw persistenceError(
      "OVERSIZE_STRING",
      `${path}.text exceeds max note length`,
      `${path}.text`,
    );
  }
  try {
    rejectHtmlShaped(text, `${path}.text`);
  } catch {
    throw persistenceError(
      "HTML_CONTENT",
      `HTML-shaped note rejected`,
      `${path}.text`,
    );
  }
  if (ABSOLUTE_PATH_RE.test(text)) {
    throw persistenceError(
      "ABSOLUTE_PATH_FORBIDDEN",
      `Absolute path rejected at ${path}.text`,
      `${path}.text`,
    );
  }
  const updatedAt = requireIso(raw, "updatedAt", path);
  return Object.freeze({ noteId, contentId, text, updatedAt });
}

function parseRecording(
  input: unknown,
  path: string,
  publishedIds: PublishedContentResolver,
): RecordingMetadata {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, RECORDING_KEYS, path);
  if ("audioBytes" in raw || "rawAudio" in raw || "blob" in raw) {
    throw persistenceError(
      "SECRET_OR_BLOB_FORBIDDEN",
      `Raw audio bytes must not appear in recording metadata`,
      path,
    );
  }
  const recordingId = requireBoundedString(raw, "recordingId", path);
  if (!isUuid(recordingId)) {
    throw persistenceError(
      "INVALID_RECORDING",
      `${path}.recordingId must be a UUID`,
      `${path}.recordingId`,
    );
  }
  const conceptId = requireBoundedString(raw, "conceptId", path);
  requirePublishedKind(conceptId, "Concept", publishedIds, `${path}.conceptId`);
  let activityId: string | undefined;
  if ("activityId" in raw && raw.activityId !== undefined) {
    activityId = requireBoundedString(raw, "activityId", path);
    requirePublishedKind(
      activityId,
      "LearningActivity",
      publishedIds,
      `${path}.activityId`,
    );
  }
  const createdAt = requireIso(raw, "createdAt", path);
  const mimeType = requireBoundedString(raw, "mimeType", path);
  const byteLength = raw.byteLength;
  if (
    typeof byteLength !== "number" ||
    !Number.isFinite(byteLength) ||
    !Number.isInteger(byteLength) ||
    byteLength < 0
  ) {
    throw persistenceError(
      "INVALID_RECORDING",
      `${path}.byteLength must be a non-negative integer`,
      `${path}.byteLength`,
    );
  }
  if (raw.gestureProduced !== true) {
    throw persistenceError(
      "INVALID_RECORDING",
      `${path}.gestureProduced must be true`,
      `${path}.gestureProduced`,
    );
  }
  if (raw.pronunciationAccuracy !== null) {
    throw persistenceError(
      "INVALID_RECORDING",
      `${path}.pronunciationAccuracy must be null`,
      `${path}.pronunciationAccuracy`,
    );
  }
  const base: RecordingMetadata = {
    recordingId,
    conceptId,
    createdAt,
    mimeType,
    byteLength,
    gestureProduced: true,
    pronunciationAccuracy: null,
  };
  if (activityId !== undefined) {
    return Object.freeze({ ...base, activityId });
  }
  return Object.freeze(base);
}

function parseContentBundle(
  input: unknown,
  path: string,
  expected: ContentBundleIdentity,
): ContentBundleIdentity {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, BUNDLE_KEYS, path);
  const schemaVersion = requireBoundedString(raw, "schemaVersion", path);
  if (schemaVersion !== expected.schemaVersion) {
    throw persistenceError(
      "UNSUPPORTED_VERSION",
      `${path}.schemaVersion unsupported`,
      `${path}.schemaVersion`,
    );
  }
  const bundleId = requireBoundedString(raw, "bundleId", path);
  if (bundleId !== expected.bundleId) {
    throw persistenceError(
      "CROSS_REFERENCE",
      `${path}.bundleId does not match expected content bundle`,
      `${path}.bundleId`,
    );
  }
  return Object.freeze({ schemaVersion, bundleId });
}

function parseExportMeta(input: unknown, path: string): LearnerExportMetadata {
  const raw = requireObject(input, path);
  assertOnlyKeys(raw, EXPORT_META_KEYS, path);
  const exportedAt = requireIso(raw, "exportedAt", path);
  if (raw.includesRawAudioBytes !== false) {
    throw persistenceError(
      "INVALID_TYPE",
      `${path}.includesRawAudioBytes must be false`,
      `${path}.includesRawAudioBytes`,
    );
  }
  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== LEARNER_STATE_SCHEMA_VERSION) {
    throw persistenceError(
      "INVALID_SCHEMA_VERSION",
      `${path}.schemaVersion mismatch`,
      `${path}.schemaVersion`,
    );
  }
  return Object.freeze({
    exportedAt,
    includesRawAudioBytes: false as const,
    schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
  });
}

function parseEventSafe(
  input: unknown,
  path: string,
  publishedIds: PublishedContentResolver,
): LearnerEvent {
  // Preflight: reject secret/blob/reward/derived keys before mastery parse.
  const raw = requireObject(input, path);
  let event: LearnerEvent;
  try {
    event = parseLearnerEvent(raw);
  } catch (err) {
    if (err instanceof MasteryError) {
      if (err.code === "HTML_CONTENT") {
        throw persistenceError("HTML_CONTENT", `Malformed event at ${path}`, path);
      }
      if (err.code === "REWARD_FIELD_FORBIDDEN") {
        throw persistenceError(
          "REWARD_FIELD_FORBIDDEN",
          `Reward field on event at ${path}`,
          path,
        );
      }
      if (err.code === "UNKNOWN_FIELD") {
        throw persistenceError("UNKNOWN_FIELD", `Unknown event field at ${path}`, path);
      }
      if (err.code === "INVALID_SCHEMA_VERSION") {
        throw persistenceError(
          "UNSUPPORTED_VERSION",
          `Unsupported event schema at ${path}`,
          path,
        );
      }
      throw persistenceError("MALFORMED_EVENT", `Malformed event at ${path}`, path);
    }
    throw persistenceError("MALFORMED_EVENT", `Malformed event at ${path}`, path);
  }
  assertPersistedEventStrings(event, path);
  requirePublishedKind(
    event.conceptId,
    "Concept",
    publishedIds,
    `${path}.conceptId`,
  );
  if (event.activityId !== undefined) {
    requirePublishedKind(
      event.activityId,
      "LearningActivity",
      publishedIds,
      `${path}.activityId`,
    );
  }
  return event;
}

function parseCardSafe(
  input: unknown,
  path: string,
  publishedIds: PublishedContentResolver,
): ReviewCardState {
  let card: ReviewCardState;
  try {
    card = parseReviewCardState(input);
  } catch (err) {
    if (err instanceof ReviewError) {
      if (err.code === "HTML_CONTENT") {
        throw persistenceError("HTML_CONTENT", `Malformed card at ${path}`, path);
      }
      if (err.code === "REWARD_FIELD_FORBIDDEN") {
        throw persistenceError(
          "REWARD_FIELD_FORBIDDEN",
          `Reward field on card at ${path}`,
          path,
        );
      }
      if (err.code === "INVALID_SCHEDULER_VERSION") {
        throw persistenceError(
          "UNSUPPORTED_VERSION",
          `Unsupported scheduler version at ${path}`,
          path,
        );
      }
      if (err.code === "UNKNOWN_FIELD") {
        throw persistenceError("UNKNOWN_FIELD", `Unknown card field at ${path}`, path);
      }
      throw persistenceError("MALFORMED_CARD", `Malformed card at ${path}`, path);
    }
    throw persistenceError("MALFORMED_CARD", `Malformed card at ${path}`, path);
  }
  // After review-card schema parsing, before envelope acceptance.
  assertPersistedReviewCardStrings(card, path);
  requirePublishedKind(
    card.conceptId,
    "Concept",
    publishedIds,
    `${path}.conceptId`,
  );
  requirePublishedKind(
    card.templateId,
    "Template",
    publishedIds,
    `${path}.templateId`,
  );
  return card;
}

/**
 * Parse and validate a LearnerStateEnvelope. Fail closed.
 * Returns a deep-frozen, entity-sorted canonical envelope.
 * Byte cap is measured internally after prototype/shape preflight — not caller-supplied.
 */
export function parseLearnerStateEnvelope(
  input: unknown,
  options: ParseLearnerStateOptions,
): ValidatedLearnerState {
  assertValidationContext(options);

  const raw = requireObject(input, "$");
  enforceObjectEnvelopeByteLimit(raw);
  assertOnlyKeys(raw, ENVELOPE_KEYS, "$");

  if (raw.schemaVersion !== LEARNER_STATE_SCHEMA_VERSION) {
    throw persistenceError(
      "UNSUPPORTED_VERSION",
      "Unsupported learner-state schemaVersion",
      "schemaVersion",
    );
  }
  if (raw.masteryReducerVersion !== MASTERY_REDUCER_VERSION) {
    throw persistenceError(
      "UNSUPPORTED_VERSION",
      "Unsupported masteryReducerVersion",
      "masteryReducerVersion",
    );
  }
  if (raw.reviewSchedulerVersion !== REVIEW_SCHEDULER_VERSION) {
    throw persistenceError(
      "UNSUPPORTED_VERSION",
      "Unsupported reviewSchedulerVersion",
      "reviewSchedulerVersion",
    );
  }
  if (raw.learnerEventSchemaVersion !== LEARNER_EVENT_SCHEMA_VERSION) {
    throw persistenceError(
      "UNSUPPORTED_VERSION",
      "Unsupported learnerEventSchemaVersion",
      "learnerEventSchemaVersion",
    );
  }

  const contentBundle = parseContentBundle(
    raw.contentBundle,
    "contentBundle",
    options.expectedContentBundle,
  );
  const settings = parseSettings(raw.settings, "settings");

  let resume: ResumeState | null = null;
  if (raw.resume !== null && raw.resume !== undefined) {
    resume = parseResume(raw.resume, "resume", options.publishedIds);
  } else if (raw.resume === undefined) {
    throw persistenceError(
      "REQUIRED_FIELD",
      "resume must be present (object or null)",
      "resume",
    );
  }

  if (!Array.isArray(raw.tags)) {
    throw persistenceError("INVALID_TYPE", "tags must be an array", "tags");
  }
  if (raw.tags.length > PERSISTENCE_LIMITS.maxTags) {
    throw persistenceError("OVERSIZE_ARRAY", "tags exceeds limit", "tags");
  }
  if (!Array.isArray(raw.notes)) {
    throw persistenceError("INVALID_TYPE", "notes must be an array", "notes");
  }
  if (raw.notes.length > PERSISTENCE_LIMITS.maxNotes) {
    throw persistenceError("OVERSIZE_ARRAY", "notes exceeds limit", "notes");
  }
  if (!Array.isArray(raw.events)) {
    throw persistenceError("INVALID_TYPE", "events must be an array", "events");
  }
  if (raw.events.length > PERSISTENCE_LIMITS.maxEvents) {
    throw persistenceError("OVERSIZE_ARRAY", "events exceeds limit", "events");
  }
  if (!Array.isArray(raw.reviewCards)) {
    throw persistenceError(
      "INVALID_TYPE",
      "reviewCards must be an array",
      "reviewCards",
    );
  }
  if (raw.reviewCards.length > PERSISTENCE_LIMITS.maxReviewCards) {
    throw persistenceError(
      "OVERSIZE_ARRAY",
      "reviewCards exceeds limit",
      "reviewCards",
    );
  }
  if (!Array.isArray(raw.recordings)) {
    throw persistenceError(
      "INVALID_TYPE",
      "recordings must be an array",
      "recordings",
    );
  }
  if (raw.recordings.length > PERSISTENCE_LIMITS.maxRecordings) {
    throw persistenceError(
      "OVERSIZE_ARRAY",
      "recordings exceeds limit",
      "recordings",
    );
  }

  const tags = raw.tags.map((t, i) =>
    parseTag(t, `tags[${i}]`, options.publishedIds),
  );
  const notes = raw.notes.map((n, i) =>
    parseNote(n, `notes[${i}]`, options.publishedIds),
  );
  const events = raw.events.map((e, i) =>
    parseEventSafe(e, `events[${i}]`, options.publishedIds),
  );
  const reviewCards = raw.reviewCards.map((c, i) =>
    parseCardSafe(c, `reviewCards[${i}]`, options.publishedIds),
  );
  const recordings = raw.recordings.map((r, i) =>
    parseRecording(r, `recordings[${i}]`, options.publishedIds),
  );

  // Duplicate IDs — replace semantics, never silent merge.
  const tagKeys = new Set<string>();
  for (const t of tags) {
    const k = `${t.contentId}\0${t.tag}`;
    if (tagKeys.has(k)) {
      throw persistenceError("DUPLICATE_ID", "Duplicate tag record", "tags");
    }
    tagKeys.add(k);
  }
  const noteIds = new Set<string>();
  for (const n of notes) {
    if (noteIds.has(n.noteId)) {
      throw persistenceError("DUPLICATE_ID", "Duplicate noteId", "notes");
    }
    noteIds.add(n.noteId);
  }
  const eventIds = new Set<string>();
  for (const e of events) {
    if (eventIds.has(e.eventId)) {
      throw persistenceError("DUPLICATE_ID", "Duplicate eventId", "events");
    }
    eventIds.add(e.eventId);
  }
  const cardsById = new Map<string, ReviewCardState>();
  for (const c of reviewCards) {
    if (cardsById.has(c.cardId)) {
      throw persistenceError("DUPLICATE_ID", "Duplicate cardId", "reviewCards");
    }
    cardsById.set(c.cardId, c);
  }
  const recordingIds = new Set<string>();
  for (const r of recordings) {
    if (recordingIds.has(r.recordingId)) {
      throw persistenceError(
        "DUPLICATE_ID",
        "Duplicate recordingId",
        "recordings",
      );
    }
    recordingIds.add(r.recordingId);
  }

  // Cross-reference: event.cardId must exist, share conceptId, and compatible dimension.
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.cardId === undefined) continue;
    const card = cardsById.get(e.cardId);
    if (card === undefined) {
      throw persistenceError(
        "CROSS_REFERENCE",
        `Event cardId does not match any review card`,
        `events[${i}].cardId`,
      );
    }
    if (card.conceptId !== e.conceptId) {
      throw persistenceError(
        "CROSS_REFERENCE",
        `Event cardId concept mismatch`,
        `events[${i}].cardId`,
      );
    }
    if (!e.measuredDimensions.includes(card.measuredDimension)) {
      throw persistenceError(
        "CROSS_REFERENCE",
        `Event cardId dimension mismatch`,
        `events[${i}].cardId`,
      );
    }
  }

  let exportMeta: LearnerExportMetadata | undefined;
  if ("exportMeta" in raw && raw.exportMeta !== undefined) {
    exportMeta = parseExportMeta(raw.exportMeta, "exportMeta");
  }

  const envelope: LearnerStateEnvelope =
    exportMeta === undefined
      ? {
          schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
          masteryReducerVersion: MASTERY_REDUCER_VERSION,
          reviewSchedulerVersion: REVIEW_SCHEDULER_VERSION,
          learnerEventSchemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
          contentBundle,
          settings,
          resume,
          tags,
          notes,
          events,
          reviewCards,
          recordings,
        }
      : {
          schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
          masteryReducerVersion: MASTERY_REDUCER_VERSION,
          reviewSchedulerVersion: REVIEW_SCHEDULER_VERSION,
          learnerEventSchemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
          contentBundle,
          settings,
          resume,
          tags,
          notes,
          events,
          reviewCards,
          recordings,
          exportMeta,
        };

  return markValidated(deepFreeze(sortEnvelopeEntities(envelope)));
}

/**
 * Parse JSON text into a validated envelope.
 * Measures UTF-8 bytes before JSON.parse — callers cannot under-report.
 */
export function parseLearnerStateJson(
  jsonText: string,
  options: ParseLearnerStateOptions,
): ValidatedLearnerState {
  assertValidationContext(options);
  if (typeof jsonText !== "string") {
    throw persistenceError("INVALID_TYPE", "JSON text must be a string", "json");
  }
  const bytes = utf8ByteLength(jsonText);
  if (bytes > PERSISTENCE_LIMITS.maxJsonBytes) {
    throw persistenceError(
      "OVERSIZE_JSON",
      "Import JSON exceeds maxJsonBytes",
      "json",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw persistenceError("INVALID_JSON", "Import JSON is not valid JSON", "json");
  }
  return parseLearnerStateEnvelope(parsed, options);
}

export function createEmptyLearnerState(input: {
  contentBundle: ContentBundleIdentity;
  settings?: LearnerSettings;
}): LearnerStateEnvelope {
  const contentBundle = parseContentBundle(
    input.contentBundle,
    "contentBundle",
    {
      schemaVersion: EXPECTED_CONTENT_BUNDLE_SCHEMA_VERSION,
      bundleId: input.contentBundle.bundleId,
    },
  );
  const settings = input.settings
    ? parseSettings(input.settings, "settings")
    : deepFreeze({
        preferredAudioSpeed: 1,
        timezone: "UTC",
      } satisfies LearnerSettings);
  return deepFreeze(
    sortEnvelopeEntities({
      schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
      masteryReducerVersion: MASTERY_REDUCER_VERSION,
      reviewSchedulerVersion: REVIEW_SCHEDULER_VERSION,
      learnerEventSchemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
      contentBundle,
      settings,
      resume: null,
      tags: [],
      notes: [],
      events: [],
      reviewCards: [],
      recordings: [],
    }),
  );
}

export { deepFreeze, utf8ByteLength, markValidated };
