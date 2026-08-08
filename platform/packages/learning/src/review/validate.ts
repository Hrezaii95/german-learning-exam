/**
 * Runtime validation for ReviewCardState and ReviewCandidate (fail closed).
 */

import { isMasteryDimension, type MasteryDimension } from "../mastery/dimensions.js";
import { isIsoTimestampWithTimezone, rejectHtmlShaped } from "../mastery/events.js";
import { reviewError } from "./errors.js";
import {
  PUBLICATION_ELIGIBILITIES,
  REVIEW_CARD_LIFECYCLES,
  REVIEW_MODALITIES,
  REVIEW_SCHEDULER_ID,
  REVIEW_SCHEDULER_VERSION,
  type PublicationEligibility,
  type ReviewCardLifecycle,
  type ReviewCardState,
  type ReviewCandidate,
  type ReviewModality,
} from "./types.js";

const REWARD_KEYS = ["xp", "streak", "badge", "badges", "streakDays", "xpDelta"] as const;

const CARD_KEYS = new Set([
  "cardId",
  "conceptId",
  "templateId",
  "measuredDimension",
  "due",
  "stability",
  "difficulty",
  "elapsedDays",
  "scheduledDays",
  "reps",
  "lapses",
  "state",
  "lastReview",
  "schedulerId",
  "schedulerVersion",
]);

const CANDIDATE_KEYS = new Set([
  "cardId",
  "conceptId",
  "templateId",
  "publicationStatus",
  "unlocked",
  "card",
  "conceptLabel",
  "measuredDimension",
  "modality",
  "sourcePriority",
  "lessonId",
  "tags",
  "recentFailureOrDifficult",
  "stageBlocking",
  "olderMaintenance",
  "teacherAssignment",
]);

function assertNoRewardFields(raw: Record<string, unknown>): void {
  for (const key of REWARD_KEYS) {
    if (key in raw) {
      throw reviewError(
        "REWARD_FIELD_FORBIDDEN",
        `Reward field "${key}" is forbidden on review artifacts`,
        key,
      );
    }
  }
}

function assertOnlyKeys(raw: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      if ((REWARD_KEYS as readonly string[]).includes(key)) {
        throw reviewError(
          "REWARD_FIELD_FORBIDDEN",
          `Reward field "${key}" is forbidden on review artifacts`,
          key,
        );
      }
      throw reviewError("UNKNOWN_FIELD", `Unknown field: ${key}`, key);
    }
  }
}

function requireId(raw: Record<string, unknown>, field: string): string {
  const v = raw[field];
  if (typeof v !== "string" || v.length === 0) {
    throw reviewError("REQUIRED_FIELD", `${field} must be a non-empty string`, field);
  }
  rejectHtmlShapedAsReview(v, field);
  return v;
}

function rejectHtmlShapedAsReview(value: string, field: string): void {
  try {
    rejectHtmlShaped(value, field);
  } catch {
    throw reviewError("HTML_CONTENT", `HTML-shaped string rejected at ${field}`, field);
  }
}

function requireFiniteNonNegative(
  raw: Record<string, unknown>,
  field: string,
): number {
  const v = raw[field];
  if (typeof v !== "number" || !Number.isFinite(v) || Number.isNaN(v) || v < 0) {
    throw reviewError(
      "INVALID_COUNTER",
      `${field} must be a finite non-negative number`,
      field,
    );
  }
  return v;
}

function requireFiniteNumber(raw: Record<string, unknown>, field: string): number {
  const v = raw[field];
  if (typeof v !== "number" || !Number.isFinite(v) || Number.isNaN(v)) {
    throw reviewError("INVALID_COUNTER", `${field} must be a finite number`, field);
  }
  return v;
}

function requireIsoDate(raw: Record<string, unknown>, field: string): string {
  const v = raw[field];
  if (!isIsoTimestampWithTimezone(v)) {
    throw reviewError("INVALID_DATE", `${field} must be ISO-8601 with timezone`, field);
  }
  return v;
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
 * Parse and validate an immutable ReviewCardState.
 * Rejects unknown/future scheduler versions, invalid dates, NaN/negative/
 * inconsistent counters, and HTML-shaped IDs.
 */
export function parseReviewCardState(input: unknown): ReviewCardState {
  if (input === null || typeof input !== "object") {
    throw reviewError("INVALID_TYPE", "ReviewCardState must be an object");
  }
  const raw = input as Record<string, unknown>;
  assertNoRewardFields(raw);
  assertOnlyKeys(raw, CARD_KEYS);

  const cardId = requireId(raw, "cardId");
  const conceptId = requireId(raw, "conceptId");
  const templateId = requireId(raw, "templateId");

  const ids = [cardId, conceptId, templateId];
  if (new Set(ids).size !== ids.length) {
    throw reviewError(
      "DUPLICATE_ID",
      "cardId, conceptId, and templateId must be distinct",
      "cardId",
    );
  }

  if (!isMasteryDimension(raw.measuredDimension)) {
    throw reviewError(
      "INVALID_CARD_STATE",
      "measuredDimension must be a mastery dimension",
      "measuredDimension",
    );
  }
  const measuredDimension = raw.measuredDimension as MasteryDimension;

  const due = requireIsoDate(raw, "due");
  const stability = requireFiniteNonNegative(raw, "stability");
  const difficulty = requireFiniteNumber(raw, "difficulty");
  const elapsedDays = requireFiniteNonNegative(raw, "elapsedDays");
  const scheduledDays = requireFiniteNonNegative(raw, "scheduledDays");
  const reps = requireFiniteNonNegative(raw, "reps");
  const lapses = requireFiniteNonNegative(raw, "lapses");

  if (!Number.isInteger(reps) || !Number.isInteger(lapses)) {
    throw reviewError("INVALID_COUNTER", "reps and lapses must be integers", "reps");
  }
  if (lapses > reps) {
    throw reviewError(
      "INCONSISTENT_COUNTERS",
      "lapses cannot exceed reps",
      "lapses",
    );
  }

  const state = raw.state;
  if (
    typeof state !== "string" ||
    !(REVIEW_CARD_LIFECYCLES as readonly string[]).includes(state)
  ) {
    throw reviewError(
      "INVALID_CARD_STATE",
      "state must be new|learning|review|relearning",
      "state",
    );
  }
  const lifecycle = state as ReviewCardLifecycle;

  if (raw.schedulerId !== REVIEW_SCHEDULER_ID) {
    throw reviewError(
      "INVALID_SCHEDULER_VERSION",
      `schedulerId must be ${REVIEW_SCHEDULER_ID}`,
      "schedulerId",
    );
  }
  if (raw.schedulerVersion !== REVIEW_SCHEDULER_VERSION) {
    throw reviewError(
      "INVALID_SCHEDULER_VERSION",
      `Unknown or future schedulerVersion (accepted: ${REVIEW_SCHEDULER_VERSION})`,
      "schedulerVersion",
    );
  }

  let lastReview: string | null;
  if (lifecycle === "new") {
    if (raw.lastReview !== null && raw.lastReview !== undefined) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "new cards must have lastReview null",
        "lastReview",
      );
    }
    if (reps !== 0 || lapses !== 0) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "new cards must have reps=0 and lapses=0",
        "reps",
      );
    }
    if (stability !== 0 || elapsedDays !== 0 || scheduledDays !== 0) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "new cards must have stability=0, elapsedDays=0, scheduledDays=0",
        "stability",
      );
    }
    if (difficulty !== 0) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "new cards must have difficulty=0",
        "difficulty",
      );
    }
    lastReview = null;
  } else {
    if (raw.lastReview === null || raw.lastReview === undefined) {
      throw reviewError(
        "REQUIRED_FIELD",
        "lastReview is required when state is not new",
        "lastReview",
      );
    }
    lastReview = requireIsoDate({ lastReview: raw.lastReview }, "lastReview");
    if (reps < 1) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "non-new cards must have reps >= 1",
        "reps",
      );
    }
    if (difficulty < 1 || difficulty > 10) {
      throw reviewError(
        "INVALID_COUNTER",
        "difficulty must be in [1, 10] after first review",
        "difficulty",
      );
    }

    const dueMs = Date.parse(due);
    const lastMs = Date.parse(lastReview);
    if (!Number.isFinite(dueMs) || !Number.isFinite(lastMs)) {
      throw reviewError("INVALID_DATE", "due/lastReview must be parseable dates", "due");
    }
    if (dueMs < lastMs) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "non-new due cannot precede lastReview",
        "due",
      );
    }

    if (lifecycle === "learning" && lapses !== 0) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "learning cards must have lapses=0",
        "lapses",
      );
    }
    if (lifecycle === "relearning" && lapses < 1) {
      throw reviewError(
        "INCONSISTENT_COUNTERS",
        "relearning cards must have lapses >= 1",
        "lapses",
      );
    }
  }

  const card: ReviewCardState = {
    cardId,
    conceptId,
    templateId,
    measuredDimension,
    due,
    stability,
    difficulty,
    elapsedDays,
    scheduledDays,
    reps,
    lapses,
    state: lifecycle,
    lastReview,
    schedulerId: REVIEW_SCHEDULER_ID,
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
  };
  return deepFreeze(card);
}

/** Create a validated empty (new) card due immediately at `now`. */
export function createNewReviewCard(input: {
  cardId: string;
  conceptId: string;
  templateId: string;
  measuredDimension: MasteryDimension;
  now: Date;
}): ReviewCardState {
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    throw reviewError("INVALID_DATE", "now must be a valid Date", "now");
  }
  return parseReviewCardState({
    cardId: input.cardId,
    conceptId: input.conceptId,
    templateId: input.templateId,
    measuredDimension: input.measuredDimension,
    due: input.now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReview: null,
    schedulerId: REVIEW_SCHEDULER_ID,
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
  });
}

export function parseReviewCandidate(input: unknown): ReviewCandidate {
  if (input === null || typeof input !== "object") {
    throw reviewError("INVALID_TYPE", "ReviewCandidate must be an object");
  }
  const raw = input as Record<string, unknown>;
  assertNoRewardFields(raw);
  assertOnlyKeys(raw, CANDIDATE_KEYS);

  const cardId = requireId(raw, "cardId");
  const conceptId = requireId(raw, "conceptId");
  const templateId = requireId(raw, "templateId");
  const conceptLabel = requireId(raw, "conceptLabel");
  const lessonId = requireId(raw, "lessonId");

  const pub = raw.publicationStatus;
  if (
    typeof pub !== "string" ||
    !(PUBLICATION_ELIGIBILITIES as readonly string[]).includes(pub)
  ) {
    throw reviewError(
      "INVALID_CANDIDATE",
      "publicationStatus must be published|review|draft|blocked",
      "publicationStatus",
    );
  }

  if (typeof raw.unlocked !== "boolean") {
    throw reviewError("INVALID_TYPE", "unlocked must be boolean", "unlocked");
  }

  const card = parseReviewCardState(raw.card);
  if (card.cardId !== cardId || card.conceptId !== conceptId || card.templateId !== templateId) {
    throw reviewError(
      "INCONSISTENT_COUNTERS",
      "candidate IDs must match embedded card IDs",
      "cardId",
    );
  }

  if (!isMasteryDimension(raw.measuredDimension)) {
    throw reviewError(
      "INVALID_CANDIDATE",
      "measuredDimension must be a mastery dimension",
      "measuredDimension",
    );
  }
  if (raw.measuredDimension !== card.measuredDimension) {
    throw reviewError(
      "INCONSISTENT_COUNTERS",
      "candidate measuredDimension must match card",
      "measuredDimension",
    );
  }

  const modality = raw.modality;
  if (
    typeof modality !== "string" ||
    !(REVIEW_MODALITIES as readonly string[]).includes(modality)
  ) {
    throw reviewError(
      "INVALID_CANDIDATE",
      "modality must be recognition|recall|listening|form|production",
      "modality",
    );
  }

  // Exposure is not a review modality; modality must equal measuredDimension.
  if (card.measuredDimension === "exposure") {
    throw reviewError(
      "INVALID_CANDIDATE",
      "measuredDimension exposure is not a review modality",
      "measuredDimension",
    );
  }
  if (modality !== card.measuredDimension) {
    throw reviewError(
      "INCONSISTENT_COUNTERS",
      "modality must equal measuredDimension (exposure is not a review modality)",
      "modality",
    );
  }

  const sourcePriority = requireFiniteNumber(raw, "sourcePriority");

  if (!Array.isArray(raw.tags) || !raw.tags.every((t) => typeof t === "string")) {
    throw reviewError("INVALID_TYPE", "tags must be a string array", "tags");
  }
  for (const t of raw.tags) {
    if (t.length === 0) {
      throw reviewError("INVALID_CANDIDATE", "tags must be non-empty strings", "tags");
    }
    rejectHtmlShapedAsReview(t, "tags");
  }

  for (const flag of [
    "recentFailureOrDifficult",
    "stageBlocking",
    "olderMaintenance",
    "teacherAssignment",
  ] as const) {
    if (typeof raw[flag] !== "boolean") {
      throw reviewError("INVALID_TYPE", `${flag} must be boolean`, flag);
    }
  }

  const candidate: ReviewCandidate = {
    cardId,
    conceptId,
    templateId,
    publicationStatus: pub as PublicationEligibility,
    unlocked: raw.unlocked,
    card,
    conceptLabel,
    measuredDimension: raw.measuredDimension as MasteryDimension,
    modality: modality as ReviewModality,
    sourcePriority,
    lessonId,
    tags: Object.freeze([...raw.tags]) as readonly string[],
    recentFailureOrDifficult: raw.recentFailureOrDifficult as boolean,
    stageBlocking: raw.stageBlocking as boolean,
    olderMaintenance: raw.olderMaintenance as boolean,
    teacherAssignment: raw.teacherAssignment as boolean,
  };
  return deepFreeze(candidate);
}

export function parseReviewCandidates(inputs: unknown): readonly ReviewCandidate[] {
  if (!Array.isArray(inputs)) {
    throw reviewError("INVALID_TYPE", "candidates must be an array", "candidates");
  }
  const out: ReviewCandidate[] = [];
  const seen = new Set<string>();
  for (const item of inputs) {
    const c = parseReviewCandidate(item);
    if (seen.has(c.cardId)) {
      throw reviewError("DUPLICATE_ID", `Duplicate candidate cardId: ${c.cardId}`, "cardId");
    }
    seen.add(c.cardId);
    out.push(c);
  }
  return Object.freeze(out);
}

/** True when a candidate may enter a learner mission. */
export function isLearnerMissionEligible(c: ReviewCandidate): boolean {
  return c.publicationStatus === "published" && c.unlocked === true;
}

export function assertValidNow(now: Date, field = "now"): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw reviewError("INVALID_DATE", `${field} must be a valid Date`, field);
  }
}

export function assertNowNotBeforeLastReview(
  card: ReviewCardState,
  now: Date,
): void {
  assertValidNow(now);
  if (card.lastReview === null) return;
  const last = Date.parse(card.lastReview);
  if (!Number.isFinite(last)) {
    throw reviewError("INVALID_DATE", "lastReview is not a valid date", "lastReview");
  }
  if (now.getTime() < last) {
    throw reviewError(
      "CLOCK_REGRESSION",
      "now must not be before lastReview",
      "now",
    );
  }
}
