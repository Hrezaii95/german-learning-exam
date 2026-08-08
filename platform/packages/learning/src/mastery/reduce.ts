/**
 * Pure deterministic mastery reducer (LRN-003 / LRN-004 / P2-03 / C2BR1 / C2BR3).
 */

import { MASTERY_DIMENSIONS, type MasteryDimension } from "./dimensions.js";
import { eventFingerprint, parseLearnerEvent } from "./events.js";
import { masteryError } from "./errors.js";
import { resolvePolicy } from "./policy.js";
import type {
  AttemptOutcome,
  ConceptMasterySnapshot,
  DelayedCheckpoint,
  DimensionEvidence,
  DimensionRecoveryEvidence,
  EvidenceRecord,
  LearnerEvent,
  MasteryPolicy,
  MasteryStatus,
  RecordingCycleEvent,
  SelfRating,
  StabilityEvidence,
} from "./types.js";
import { MASTERY_REDUCER_VERSION } from "./types.js";

type MutableDimension = {
  attempts: number;
  successes: number;
  partials: number;
  failures: number;
  exposureTouches: number;
  strongEvidenceCount: number;
  latestTimestamp: string | null;
  latencySumMs: number;
  latencySamples: number;
  hintsSum: number;
};

/** Mutable per-dimension recovery tracker (ordered by reducer event order). */
type MutableRecovery = {
  latestLapseTimestamp: string | null;
  latestLapseEventId: string | null;
  strongEvidenceSinceLapse: number;
};

function emptyDim(): MutableDimension {
  return {
    attempts: 0,
    successes: 0,
    partials: 0,
    failures: 0,
    exposureTouches: 0,
    strongEvidenceCount: 0,
    latestTimestamp: null,
    latencySumMs: 0,
    latencySamples: 0,
    hintsSum: 0,
  };
}

function emptyRecovery(): MutableRecovery {
  return {
    latestLapseTimestamp: null,
    latestLapseEventId: null,
    strongEvidenceSinceLapse: 0,
  };
}

function freezeDim(d: MutableDimension): DimensionEvidence {
  return Object.freeze({ ...d });
}

function freezeRecovery(
  r: MutableRecovery,
  policy: MasteryPolicy,
): DimensionRecoveryEvidence {
  const recovered =
    r.latestLapseEventId === null ||
    r.strongEvidenceSinceLapse >= policy.minStrongEvidencePerDimension;
  return Object.freeze({
    latestLapseTimestamp: r.latestLapseTimestamp,
    latestLapseEventId: r.latestLapseEventId,
    strongEvidenceSinceLapse: r.strongEvidenceSinceLapse,
    recovered,
  });
}

function freezeAllRecovery(
  recovery: Record<MasteryDimension, MutableRecovery>,
  policy: MasteryPolicy,
): Readonly<Record<MasteryDimension, DimensionRecoveryEvidence>> {
  return Object.freeze({
    exposure: freezeRecovery(recovery.exposure, policy),
    recognition: freezeRecovery(recovery.recognition, policy),
    recall: freezeRecovery(recovery.recall, policy),
    listening: freezeRecovery(recovery.listening, policy),
    form: freezeRecovery(recovery.form, policy),
    production: freezeRecovery(recovery.production, policy),
  });
}

function deepFreezeSnapshot(s: ConceptMasterySnapshot): ConceptMasterySnapshot {
  Object.freeze(s.dimensions);
  for (const k of MASTERY_DIMENSIONS) {
    Object.freeze(s.dimensions[k]);
  }
  Object.freeze(s.dimensionRecovery);
  for (const k of MASTERY_DIMENSIONS) {
    Object.freeze(s.dimensionRecovery[k]);
  }
  Object.freeze(s.recentEvidence);
  for (const e of s.recentEvidence) Object.freeze(e);
  Object.freeze(s.stability);
  Object.freeze(s.stability.delayedCheckpoints);
  for (const c of s.stability.delayedCheckpoints) Object.freeze(c);
  Object.freeze(s.appliedEventIds);
  return Object.freeze(s);
}

function allRequiredDimensionsRecovered(
  recovery: Readonly<Record<MasteryDimension, DimensionRecoveryEvidence>>,
  policy: MasteryPolicy,
): boolean {
  return policy.requiredDimensions.every((d) => recovery[d].recovered);
}

/** True UTC calendar date via Instant → toISOString() semantics. */
function utcDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function daysBetweenUtc(a: string, b: string): number {
  const msA = Date.parse(`${a}T00:00:00Z`);
  const msB = Date.parse(`${b}T00:00:00Z`);
  return Math.round(Math.abs(msB - msA) / 86_400_000);
}

function compareEvents(a: LearnerEvent, b: LearnerEvent): number {
  const ta = Date.parse(a.timestamp);
  const tb = Date.parse(b.timestamp);
  if (ta !== tb) return ta - tb;
  if (a.eventId < b.eventId) return -1;
  if (a.eventId > b.eventId) return 1;
  return 0;
}

function mapRating(rating: SelfRating): AttemptOutcome {
  if (rating === "again") return "incorrect";
  if (rating === "hard") return "partial";
  return "correct";
}

/**
 * Strong evidence gate.
 * `maxHintsForStrongEvidence` is the maximum hints *allowed*;
 * `hintsUsed > max` blocks (default 0 ⇒ zero-hint evidence still possible).
 */
function isStrongEvidence(
  outcome: AttemptOutcome,
  latencyMs: number | null | undefined,
  hintsUsed: number,
  policy: MasteryPolicy,
): boolean {
  if (outcome !== "correct") return false;
  if (latencyMs === undefined || latencyMs === null) return false;
  if (latencyMs < policy.minValidLatencyMs) return false;
  if (hintsUsed > policy.maxHintsForStrongEvidence) return false;
  return true;
}

function touchLatest(dim: MutableDimension, ts: string): void {
  if (dim.latestTimestamp === null || Date.parse(ts) >= Date.parse(dim.latestTimestamp)) {
    dim.latestTimestamp = ts;
  }
}

function applyOutcome(
  dim: MutableDimension,
  outcome: AttemptOutcome,
  ts: string,
  latencyMs: number | null | undefined,
  hintsUsed: number,
  strong: boolean,
): void {
  dim.attempts += 1;
  if (outcome === "correct") dim.successes += 1;
  else if (outcome === "partial") dim.partials += 1;
  else dim.failures += 1;
  if (latencyMs !== undefined && latencyMs !== null) {
    dim.latencySumMs += latencyMs;
    dim.latencySamples += 1;
  }
  dim.hintsSum += hintsUsed;
  if (strong) dim.strongEvidenceCount += 1;
  touchLatest(dim, ts);
}

function recordingComplete(e: RecordingCycleEvent): boolean {
  return (
    e.listenCompleted &&
    e.recordCompleted &&
    e.playbackCompleted &&
    e.selfCheckCompleted
  );
}

function isCheckpointEligibleDimension(d: MasteryDimension): boolean {
  return d === "recall" || d === "form" || d === "listening" || d === "production";
}

function dimensionMet(dim: DimensionEvidence, policy: MasteryPolicy): boolean {
  return dim.successes >= policy.minSuccessesPerDimension;
}

function dimensionStrongReady(dim: DimensionEvidence, policy: MasteryPolicy): boolean {
  return (
    dim.successes >= policy.minSuccessesPerDimension &&
    dim.strongEvidenceCount >= policy.minStrongEvidencePerDimension
  );
}

function totalRetrievalSuccesses(
  dims: Record<MasteryDimension, MutableDimension>,
): number {
  let n = 0;
  for (const d of MASTERY_DIMENSIONS) {
    if (d === "exposure") continue;
    n += dims[d].successes;
  }
  return n;
}

/**
 * Readiness: select a sequence of ≥ minDelayedCheckpoints UTC dates where
 * each successive pair is ≥ minCheckpointIntervalDays apart (not first–last span).
 */
function hasSuccessiveCheckpointSpacing(
  sortedUniqueDates: readonly string[],
  minCount: number,
  minIntervalDays: number,
): boolean {
  if (sortedUniqueDates.length < minCount) return false;
  const selected: string[] = [sortedUniqueDates[0]!];
  for (let i = 1; i < sortedUniqueDates.length && selected.length < minCount; i++) {
    const next = sortedUniqueDates[i]!;
    if (daysBetweenUtc(selected[selected.length - 1]!, next) >= minIntervalDays) {
      selected.push(next);
    }
  }
  return selected.length >= minCount;
}

function maxSuccessiveGapDays(sortedUniqueDates: readonly string[]): number {
  let maxGap = 0;
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    maxGap = Math.max(
      maxGap,
      daysBetweenUtc(sortedUniqueDates[i - 1]!, sortedUniqueDates[i]!),
    );
  }
  return maxGap;
}

function buildStability(
  checkpoints: DelayedCheckpoint[],
  policy: MasteryPolicy,
  requiredRecovered: boolean,
): StabilityEvidence {
  const dates = [...new Set(checkpoints.map((c) => c.utcDate))].sort();
  const maxGap = maxSuccessiveGapDays(dates);
  const spaced = hasSuccessiveCheckpointSpacing(
    dates,
    policy.minDelayedCheckpoints,
    policy.minCheckpointIntervalDays,
  );
  // Unrecovered required-dimension lapses block readiness even if other dims rebuild checkpoints.
  const ready = spaced && requiredRecovered;
  return Object.freeze({
    kind: "stability" as const,
    delayedCheckpoints: Object.freeze([...checkpoints]),
    distinctUtcDates: dates.length,
    maxGapDays: maxGap,
    readyForMastery: ready,
  });
}

function deriveStatus(
  dims: Record<MasteryDimension, MutableDimension>,
  stability: StabilityEvidence,
  policy: MasteryPolicy,
  hasAnyEvent: boolean,
  requiredRecovered: boolean,
): MasteryStatus {
  if (!hasAnyEvent) return "new";

  const frozen: Record<MasteryDimension, DimensionEvidence> = {
    exposure: freezeDim(dims.exposure),
    recognition: freezeDim(dims.recognition),
    recall: freezeDim(dims.recall),
    listening: freezeDim(dims.listening),
    form: freezeDim(dims.form),
    production: freezeDim(dims.production),
  };

  const requiredMet = policy.requiredDimensions.filter((d) =>
    dimensionMet(frozen[d], policy),
  );
  const requiredStrong = policy.requiredDimensions.filter((d) =>
    dimensionStrongReady(frozen[d], policy),
  );
  const retrievalSuccesses = totalRetrievalSuccesses(dims);

  const anyRetrievalAttempt =
    frozen.recognition.attempts +
      frozen.recall.attempts +
      frozen.listening.attempts +
      frozen.form.attempts +
      frozen.production.attempts >
    0;

  const anyRetrievalSuccess = retrievalSuccesses > 0;
  const allRequiredMet = requiredMet.length === policy.requiredDimensions.length;

  const nonRecognitionSuccess =
    frozen.recall.successes +
      frozen.listening.successes +
      frozen.form.successes +
      frozen.production.successes >
    0;

  // Mastered: all required dims + spaced checkpoints + all required recoveries.
  if (
    requiredRecovered &&
    allRequiredMet &&
    stability.readyForMastery &&
    retrievalSuccesses >= policy.minRetrievalSuccessesForStrong &&
    nonRecognitionSuccess &&
    requiredStrong.length === policy.requiredDimensions.length
  ) {
    return "mastered";
  }

  // Strong: never while a required dimension remains unrecovered after lapse.
  if (
    requiredRecovered &&
    requiredMet.length >= policy.minDimensionsMetForStrong &&
    requiredStrong.length >= Math.min(2, policy.minDimensionsMetForStrong) &&
    stability.delayedCheckpoints.length >= 1 &&
    retrievalSuccesses >= policy.minRetrievalSuccessesForStrong &&
    nonRecognitionSuccess
  ) {
    return "strong";
  }

  // Practising: recall/form/production successful but not yet stable.
  if (
    (frozen.recall.successes >= 1 ||
      frozen.form.successes >= 1 ||
      frozen.production.successes >= 1) &&
    (!stability.readyForMastery || !allRequiredMet)
  ) {
    return "practising";
  }

  // Learning: successful guided work or unstable recall attempts.
  if (
    anyRetrievalSuccess ||
    (frozen.recall.attempts > 0 && frozen.recall.failures + frozen.recall.partials > 0)
  ) {
    return "learning";
  }

  // Exploring: exposed but insufficient retrieval evidence.
  if (
    frozen.exposure.exposureTouches > 0 ||
    frozen.exposure.attempts > 0 ||
    (hasAnyEvent && !anyRetrievalAttempt)
  ) {
    return "exploring";
  }

  if (hasAnyEvent) return "exploring";
  return "new";
}

function emptySnapshot(conceptId: string, policy: MasteryPolicy): ConceptMasterySnapshot {
  const dimensions = {
    exposure: freezeDim(emptyDim()),
    recognition: freezeDim(emptyDim()),
    recall: freezeDim(emptyDim()),
    listening: freezeDim(emptyDim()),
    form: freezeDim(emptyDim()),
    production: freezeDim(emptyDim()),
  };
  const dimensionRecovery = freezeAllRecovery(
    {
      exposure: emptyRecovery(),
      recognition: emptyRecovery(),
      recall: emptyRecovery(),
      listening: emptyRecovery(),
      form: emptyRecovery(),
      production: emptyRecovery(),
    },
    policy,
  );
  return deepFreezeSnapshot({
    conceptId,
    reducerVersion: MASTERY_REDUCER_VERSION,
    dimensions: Object.freeze(dimensions),
    dimensionRecovery,
    recentEvidence: Object.freeze([]),
    stability: buildStability([], policy, true),
    status: "new",
    pronunciationAccuracy: null,
    appliedEventIds: Object.freeze([]),
  });
}

function maybeCheckpoint(
  checkpoints: DelayedCheckpoint[],
  seenDates: Set<string>,
  event: LearnerEvent,
  dimension: MasteryDimension,
): void {
  const date = utcDate(event.timestamp);
  if (seenDates.has(date)) return;
  seenDates.add(date);
  checkpoints.push(
    Object.freeze({
      eventId: event.eventId,
      timestamp: event.timestamp,
      utcDate: date,
      dimension,
    }),
  );
}

function isRequiredRetrievalDimension(
  dimension: MasteryDimension,
  policy: MasteryPolicy,
): boolean {
  return (policy.requiredDimensions as readonly MasteryDimension[]).includes(dimension);
}

/**
 * Reduce validated (or raw) events for one concept into an immutable snapshot.
 * Deduplicates identical event IDs; rejects conflicting duplicates.
 * Uses event timestamps only (no wall clock).
 */
export function reduceConceptMastery(
  conceptId: string,
  events: readonly unknown[],
  policyInput?: MasteryPolicy,
): ConceptMasterySnapshot {
  const policy = resolvePolicy(policyInput);
  const parsed: LearnerEvent[] = [];
  const fingerprints = new Map<string, string>();

  for (const raw of events) {
    const event = parseLearnerEvent(raw);
    if (event.conceptId !== conceptId) {
      throw masteryError(
        "INVALID_TYPE",
        `Event conceptId ${event.conceptId} does not match reducer conceptId ${conceptId}`,
        "conceptId",
      );
    }
    const fp = eventFingerprint(event);
    const prior = fingerprints.get(event.eventId);
    if (prior !== undefined) {
      if (prior === fp) continue;
      throw masteryError(
        "CONFLICTING_EVENT_ID",
        `Conflicting duplicate eventId ${event.eventId}`,
        "eventId",
      );
    }
    fingerprints.set(event.eventId, fp);
    parsed.push(event);
  }

  parsed.sort(compareEvents);

  if (parsed.length === 0) {
    return emptySnapshot(conceptId, policy);
  }

  const dims: Record<MasteryDimension, MutableDimension> = {
    exposure: emptyDim(),
    recognition: emptyDim(),
    recall: emptyDim(),
    listening: emptyDim(),
    form: emptyDim(),
    production: emptyDim(),
  };

  const recovery: Record<MasteryDimension, MutableRecovery> = {
    exposure: emptyRecovery(),
    recognition: emptyRecovery(),
    recall: emptyRecovery(),
    listening: emptyRecovery(),
    form: emptyRecovery(),
    production: emptyRecovery(),
  };

  const recent: EvidenceRecord[] = [];
  const checkpoints: DelayedCheckpoint[] = [];
  const applied: string[] = [];
  const seenCheckpointDates = new Set<string>();

  /**
   * Lapse tracking (C2BR3):
   * - always records latest incorrect/partial position per dimension;
   * - resets that dimension's strong-since-lapse counter;
   * - required-dimension lapses also clear global delayed checkpoints.
   * Cumulative success/strong audit counts remain on DimensionEvidence.
   */
  const noteLapse = (
    dimension: MasteryDimension,
    outcome: AttemptOutcome,
    event: LearnerEvent,
  ): void => {
    if (outcome === "correct") return;
    const rec = recovery[dimension];
    rec.latestLapseTimestamp = event.timestamp;
    rec.latestLapseEventId = event.eventId;
    rec.strongEvidenceSinceLapse = 0;
    if (isRequiredRetrievalDimension(dimension, policy)) {
      checkpoints.length = 0;
      seenCheckpointDates.clear();
    }
  };

  const noteStrongEvidence = (dimension: MasteryDimension, strong: boolean): void => {
    if (!strong) return;
    recovery[dimension].strongEvidenceSinceLapse += 1;
  };

  const pushEvidence = (rec: EvidenceRecord): void => {
    recent.push(Object.freeze(rec));
    while (recent.length > policy.recentEvidenceLimit) recent.shift();
  };

  for (const event of parsed) {
    applied.push(event.eventId);

    if (event.kind === "exposure") {
      const dim = dims.exposure;
      dim.exposureTouches += 1;
      dim.attempts += 1;
      touchLatest(dim, event.timestamp);
      pushEvidence({
        eventId: event.eventId,
        timestamp: event.timestamp,
        dimension: "exposure",
        outcome: "exposure",
        strong: false,
        hintsUsed: 0,
        latencyMs: null,
        taskFamily: event.exposureKind,
      });
      continue;
    }

    if (event.kind === "audioInteraction" && !event.hasLinkedTask) {
      for (const d of event.measuredDimensions) {
        const dim = dims[d];
        dim.exposureTouches += 1;
        dim.attempts += 1;
        touchLatest(dim, event.timestamp);
        pushEvidence({
          eventId: event.eventId,
          timestamp: event.timestamp,
          dimension: d,
          outcome: "exposure",
          strong: false,
          hintsUsed: event.hintsUsed ?? 0,
          latencyMs: event.latencyMs ?? null,
          taskFamily: "audioPlay",
        });
      }
      continue;
    }

    if (event.kind === "recordingCycle") {
      const complete = recordingComplete(event);
      if (!complete) {
        dims.exposure.exposureTouches += 1;
        dims.exposure.attempts += 1;
        touchLatest(dims.exposure, event.timestamp);
        pushEvidence({
          eventId: event.eventId,
          timestamp: event.timestamp,
          dimension: "exposure",
          outcome: "exposure",
          strong: false,
          hintsUsed: event.hintsUsed ?? 0,
          latencyMs: event.latencyMs ?? null,
          taskFamily: "recording",
        });
        continue;
      }

      const outcome: AttemptOutcome = event.selfRating
        ? mapRating(event.selfRating)
        : "partial";
      const hints = event.hintsUsed ?? 0;
      const latency = event.latencyMs;
      const strong = isStrongEvidence(outcome, latency, hints, policy);
      noteLapse("production", outcome, event);
      applyOutcome(dims.production, outcome, event.timestamp, latency, hints, strong);
      noteStrongEvidence("production", strong);
      pushEvidence({
        eventId: event.eventId,
        timestamp: event.timestamp,
        dimension: "production",
        outcome,
        strong,
        hintsUsed: hints,
        latencyMs: latency ?? null,
        taskFamily: "recording",
      });

      if (strong && isCheckpointEligibleDimension("production")) {
        maybeCheckpoint(checkpoints, seenCheckpointDates, event, "production");
      }
      continue;
    }

    let outcome: AttemptOutcome;
    let latencyMs: number;
    let hintsUsed: number;
    let taskFamily: EvidenceRecord["taskFamily"];
    let allowStrongAndCheckpoint: boolean;

    if (event.kind === "objectiveAttempt") {
      outcome = event.graderOutcome;
      latencyMs = event.latencyMs;
      hintsUsed = event.hintsUsed;
      taskFamily = event.taskFamily;
      allowStrongAndCheckpoint = true;
    } else if (event.kind === "selfRatedAttempt") {
      // Flashcard self-rating: practice counts only — never strong / never checkpoints.
      outcome = mapRating(event.rating);
      latencyMs = event.latencyMs;
      hintsUsed = event.hintsUsed;
      taskFamily = event.taskFamily;
      allowStrongAndCheckpoint = false;
    } else if (event.kind === "audioInteraction" && event.hasLinkedTask) {
      outcome = event.graderOutcome;
      latencyMs = event.latencyMs;
      hintsUsed = event.hintsUsed;
      taskFamily = "audioPlay";
      allowStrongAndCheckpoint = true;
    } else {
      continue;
    }

    const strong =
      allowStrongAndCheckpoint && isStrongEvidence(outcome, latencyMs, hintsUsed, policy);

    for (const d of event.measuredDimensions) {
      noteLapse(d, outcome, event);
      applyOutcome(dims[d], outcome, event.timestamp, latencyMs, hintsUsed, strong);
      noteStrongEvidence(d, strong);
      pushEvidence({
        eventId: event.eventId,
        timestamp: event.timestamp,
        dimension: d,
        outcome,
        strong,
        hintsUsed,
        latencyMs,
        taskFamily,
      });

      if (strong && isCheckpointEligibleDimension(d) && outcome === "correct") {
        maybeCheckpoint(checkpoints, seenCheckpointDates, event, d);
      }
    }
  }

  const dimensionRecovery = freezeAllRecovery(recovery, policy);
  const requiredRecovered = allRequiredDimensionsRecovered(dimensionRecovery, policy);
  const stability = buildStability(checkpoints, policy, requiredRecovered);
  const status = deriveStatus(dims, stability, policy, true, requiredRecovered);

  const dimensions = Object.freeze({
    exposure: freezeDim(dims.exposure),
    recognition: freezeDim(dims.recognition),
    recall: freezeDim(dims.recall),
    listening: freezeDim(dims.listening),
    form: freezeDim(dims.form),
    production: freezeDim(dims.production),
  });

  return deepFreezeSnapshot({
    conceptId,
    reducerVersion: MASTERY_REDUCER_VERSION,
    dimensions,
    dimensionRecovery,
    recentEvidence: Object.freeze([...recent]),
    stability,
    status,
    pronunciationAccuracy: null,
    appliedEventIds: Object.freeze([...applied]),
  });
}

/** Reduce many concepts; each concept filtered from the shared event list. */
export function reduceAllConceptMastery(
  events: readonly unknown[],
  policyInput?: MasteryPolicy,
): Map<string, ConceptMasterySnapshot> {
  const policy = resolvePolicy(policyInput);
  const byConcept = new Map<string, unknown[]>();
  const fingerprints = new Map<string, string>();

  for (const raw of events) {
    const event = parseLearnerEvent(raw);
    const fp = eventFingerprint(event);
    const prior = fingerprints.get(event.eventId);
    if (prior !== undefined) {
      if (prior === fp) continue;
      throw masteryError(
        "CONFLICTING_EVENT_ID",
        `Conflicting duplicate eventId ${event.eventId}`,
        "eventId",
      );
    }
    fingerprints.set(event.eventId, fp);
    const list = byConcept.get(event.conceptId) ?? [];
    list.push(event);
    byConcept.set(event.conceptId, list);
  }

  const out = new Map<string, ConceptMasterySnapshot>();
  const conceptIds = [...byConcept.keys()].sort();
  for (const id of conceptIds) {
    out.set(id, reduceConceptMastery(id, byConcept.get(id)!, policy));
  }
  return out;
}
