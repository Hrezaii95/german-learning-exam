/**
 * Deterministic daily mission generator (C2C / C2CR1 / REV-001).
 *
 * Selection order (docs/10-review-and-gamification.md):
 * 1. overdue (with reserved capacity for listening/form/production mix)
 * 2. recent failed/difficult (canonical predicate)
 * 3. lesson-required stage blockers
 * 4. balanced interleaved listening / production / form
 * 5. older interleaved maintenance
 * 6. new cards within daily new-card limit (`card.state === "new"`)
 *
 * Target mix (ratios only — never invent modalities/cards):
 * 35% due recall · 20% listening · 15% form · 15% difficult · 10% production · 5% older
 *
 * Category accounting vs reason counts (C2CR1):
 * - `category` / `categoryCounts` — exclusive selection category per card.
 *   After due-recall, difficult precedes modality categorization.
 * - `reason.*` — overlapping attribute counts (a difficult listening card
 *   increments both `difficult` and `listening`).
 *
 * Scheduler math is independent of tags/XP/streaks; flags/tags influence selection only.
 */

import { isDifficultCandidate, isNewReviewCard } from "./difficult.js";
import { reviewError } from "./errors.js";
import {
  DEFAULT_MISSION_MIX,
  type DailyMission,
  type GenerateMissionInput,
  type MissionCategory,
  type MissionFilters,
  type MissionReasonCounts,
  type ReviewCandidate,
  type SelectedMissionCard,
} from "./types.js";
import {
  assertValidNow,
  isLearnerMissionEligible,
  parseReviewCandidates,
} from "./validate.js";

const FILTER_KEYS = new Set(["onlyDifficult", "teacherAssignment", "lessonId"]);

const EMPTY_CATEGORY_COUNTS: Record<MissionCategory, number> = {
  dueRecall: 0,
  listening: 0,
  form: 0,
  difficult: 0,
  production: 0,
  older: 0,
  backfill: 0,
};

type MixCategory = Exclude<MissionCategory, "backfill">;

const BALANCE_KEYS = ["listening", "production", "form"] as const;
type BalanceKey = (typeof BALANCE_KEYS)[number];

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const child of Object.values(value as object)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function parseFilters(
  filters: MissionFilters | undefined,
  knownLessonIds: ReadonlySet<string>,
): MissionFilters {
  if (filters === undefined) return Object.freeze({});
  if (filters === null || typeof filters !== "object") {
    throw reviewError("INVALID_TYPE", "filters must be an object", "filters");
  }
  const raw = filters as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!FILTER_KEYS.has(key)) {
      throw reviewError("UNKNOWN_FILTER", `Unknown mission filter: ${key}`, key);
    }
  }
  const out: {
    onlyDifficult?: boolean;
    teacherAssignment?: boolean;
    lessonId?: string;
  } = {};

  if ("onlyDifficult" in raw) {
    if (typeof raw.onlyDifficult !== "boolean") {
      throw reviewError("INVALID_TYPE", "onlyDifficult must be boolean", "onlyDifficult");
    }
    out.onlyDifficult = raw.onlyDifficult;
  }
  if ("teacherAssignment" in raw) {
    if (typeof raw.teacherAssignment !== "boolean") {
      throw reviewError(
        "INVALID_TYPE",
        "teacherAssignment must be boolean",
        "teacherAssignment",
      );
    }
    out.teacherAssignment = raw.teacherAssignment;
  }
  if ("lessonId" in raw) {
    if (typeof raw.lessonId !== "string" || raw.lessonId.length === 0) {
      throw reviewError("INVALID_TYPE", "lessonId must be a non-empty string", "lessonId");
    }
    if (!knownLessonIds.has(raw.lessonId)) {
      throw reviewError(
        "UNKNOWN_LESSON_ID",
        `Unknown lessonId filter: ${raw.lessonId}`,
        "lessonId",
      );
    }
    out.lessonId = raw.lessonId;
  }
  return Object.freeze(out);
}

function assertLimits(dailyCardLimit: number, newCardLimit: number): void {
  if (
    typeof dailyCardLimit !== "number" ||
    !Number.isInteger(dailyCardLimit) ||
    dailyCardLimit < 0 ||
    !Number.isFinite(dailyCardLimit)
  ) {
    throw reviewError("INVALID_LIMIT", "dailyCardLimit must be a non-negative integer");
  }
  if (
    typeof newCardLimit !== "number" ||
    !Number.isInteger(newCardLimit) ||
    newCardLimit < 0 ||
    !Number.isFinite(newCardLimit)
  ) {
    throw reviewError("INVALID_LIMIT", "newCardLimit must be a non-negative integer");
  }
}

function dueTime(c: ReviewCandidate): number {
  return Date.parse(c.card.due);
}

/** Stable total order: due → priority → conceptId → cardId. */
export function compareReviewCandidates(a: ReviewCandidate, b: ReviewCandidate): number {
  const da = dueTime(a);
  const db = dueTime(b);
  if (da !== db) return da < db ? -1 : 1;
  if (a.sourcePriority !== b.sourcePriority) {
    return a.sourcePriority < b.sourcePriority ? -1 : 1;
  }
  if (a.conceptId !== b.conceptId) return a.conceptId < b.conceptId ? -1 : 1;
  if (a.cardId !== b.cardId) return a.cardId < b.cardId ? -1 : 1;
  return 0;
}

function isOverdue(c: ReviewCandidate, nowMs: number): boolean {
  return dueTime(c) <= nowMs;
}

function applyFilters(
  candidates: readonly ReviewCandidate[],
  filters: MissionFilters,
): ReviewCandidate[] {
  return candidates.filter((c) => {
    if (!isLearnerMissionEligible(c)) return false;
    if (filters.onlyDifficult === true && !isDifficultCandidate(c)) return false;
    if (filters.teacherAssignment === true && !c.teacherAssignment) return false;
    if (filters.lessonId !== undefined && c.lessonId !== filters.lessonId) return false;
    return true;
  });
}

function targetSlots(total: number): Record<MixCategory, number> {
  const mix = DEFAULT_MISSION_MIX;
  const raw: Record<MixCategory, number> = {
    dueRecall: Math.floor(total * mix.dueRecall),
    listening: Math.floor(total * mix.listening),
    form: Math.floor(total * mix.form),
    difficult: Math.floor(total * mix.difficult),
    production: Math.floor(total * mix.production),
    older: Math.floor(total * mix.older),
  };
  let allocated = Object.values(raw).reduce((a, b) => a + b, 0);
  const order: MixCategory[] = [
    "dueRecall",
    "listening",
    "form",
    "difficult",
    "production",
    "older",
  ];
  let i = 0;
  while (allocated < total) {
    raw[order[i % order.length]!] += 1;
    allocated += 1;
    i += 1;
  }
  return raw;
}

/**
 * Exclusive selection category for mix accounting.
 * Order: due recall → difficult → modality → older → backfill.
 */
export function exclusiveSelectionCategory(
  c: ReviewCandidate,
  nowMs: number,
): MissionCategory {
  if (c.modality === "recall" && isOverdue(c, nowMs)) return "dueRecall";
  if (isDifficultCandidate(c)) return "difficult";
  if (c.modality === "listening") return "listening";
  if (c.modality === "form") return "form";
  if (c.modality === "production") return "production";
  if (c.olderMaintenance) return "older";
  return "backfill";
}

type PoolKey =
  | "overdue"
  | "difficult"
  | "stageBlocking"
  | "listening"
  | "production"
  | "older"
  | "new"
  | "dueRecall"
  | "form"
  | "rest";

function buildPools(
  eligible: readonly ReviewCandidate[],
  nowMs: number,
): Record<PoolKey, ReviewCandidate[]> {
  const sorted = [...eligible].sort(compareReviewCandidates);
  const pools: Record<PoolKey, ReviewCandidate[]> = {
    overdue: [],
    difficult: [],
    stageBlocking: [],
    listening: [],
    production: [],
    older: [],
    new: [],
    dueRecall: [],
    form: [],
    rest: [],
  };

  for (const c of sorted) {
    if (isOverdue(c, nowMs)) pools.overdue.push(c);
    if (isDifficultCandidate(c)) pools.difficult.push(c);
    if (c.stageBlocking) pools.stageBlocking.push(c);
    if (c.modality === "listening") pools.listening.push(c);
    if (c.modality === "production") pools.production.push(c);
    if (c.olderMaintenance) pools.older.push(c);
    if (isNewReviewCard(c)) pools.new.push(c);
    if (c.modality === "recall" && isOverdue(c, nowMs)) pools.dueRecall.push(c);
    if (c.modality === "form") pools.form.push(c);
    pools.rest.push(c);
  }
  return pools;
}

function isBalanceCategory(cat: MissionCategory): cat is BalanceKey {
  return cat === "listening" || cat === "production" || cat === "form";
}

function selectCards(
  eligible: readonly ReviewCandidate[],
  nowMs: number,
  dailyCardLimit: number,
  newCardLimit: number,
  targetCount: number,
): SelectedMissionCard[] {
  const pools = buildPools(eligible, nowMs);
  const selected: SelectedMissionCard[] = [];
  const used = new Set<string>();
  let newCount = 0;
  const capacity = Math.min(targetCount, dailyCardLimit);
  const slots = targetSlots(targetCount);
  const categoryFilled: Record<MixCategory, number> = {
    dueRecall: 0,
    listening: 0,
    form: 0,
    difficult: 0,
    production: 0,
    older: 0,
  };

  const tryTake = (c: ReviewCandidate, category: MissionCategory): boolean => {
    if (used.has(c.cardId)) return false;
    if (selected.length >= capacity) return false;
    if (isNewReviewCard(c) && newCount >= newCardLimit) return false;
    used.add(c.cardId);
    if (isNewReviewCard(c)) newCount += 1;
    selected.push(
      Object.freeze({
        candidate: c,
        category,
        selectionRank: selected.length,
      }),
    );
    if (category !== "backfill") categoryFilled[category] += 1;
    return true;
  };

  const unusedIn = (list: readonly ReviewCandidate[]): number => {
    let n = 0;
    for (const c of list) {
      if (!used.has(c.cardId)) n += 1;
    }
    return n;
  };

  /** Remaining reserved balance slots that can still be filled from unused pools. */
  const balanceReserveNeeded = (exclude?: BalanceKey): number => {
    let n = 0;
    for (const key of BALANCE_KEYS) {
      if (exclude !== undefined && key === exclude) continue;
      const want = Math.max(0, slots[key] - categoryFilled[key]);
      const avail = unusedIn(pools[key]);
      n += Math.min(want, avail);
    }
    return n;
  };

  // Phase 1 — overdue with reserved capacity for listening/form/production mix.
  for (const c of pools.overdue) {
    if (selected.length >= capacity) break;
    const cat = exclusiveSelectionCategory(c, nowMs);
    const room = capacity - selected.length;
    if (isBalanceCategory(cat)) {
      // Fill this modality's quota; defer surplus so sibling modalities get room.
      if (categoryFilled[cat] >= slots[cat]) continue;
      tryTake(c, cat);
    } else {
      const need = balanceReserveNeeded();
      if (room <= need) continue;
      tryTake(c, cat);
    }
  }

  // Phase 2 — recent failed / difficult (canonical predicate).
  for (const c of pools.difficult) {
    if (selected.length >= capacity) break;
    tryTake(c, "difficult");
  }

  // Phase 3 — stage blockers.
  for (const c of pools.stageBlocking) {
    if (selected.length >= capacity) break;
    tryTake(c, exclusiveSelectionCategory(c, nowMs));
  }

  // Phase 4 — interleaved listening / production / form up to quotas.
  let progress = true;
  while (progress) {
    progress = false;
    for (const key of BALANCE_KEYS) {
      if (categoryFilled[key] >= slots[key]) continue;
      const next = pools[key].find((c) => !used.has(c.cardId));
      if (next && tryTake(next, key)) progress = true;
    }
  }

  // Fair-share remaining capacity across available balance modalities (sparse OK).
  progress = true;
  while (progress && selected.length < capacity) {
    progress = false;
    for (const key of BALANCE_KEYS) {
      const next = pools[key].find((c) => !used.has(c.cardId));
      if (next && tryTake(next, key)) progress = true;
    }
  }

  // Phase 5 — older maintenance up to quota.
  for (const c of pools.older) {
    if (categoryFilled.older >= slots.older) break;
    if (selected.length >= capacity) break;
    tryTake(c, "older");
  }

  // Phase 6 — new cards within newCardLimit (lifecycle authority).
  for (const c of pools.new) {
    if (selected.length >= capacity) break;
    tryTake(c, exclusiveSelectionCategory(c, nowMs));
  }

  // Under-filled mix categories from their pools (deterministic; no invented cards).
  const mixOrder: Array<{ key: MixCategory; list: ReviewCandidate[] }> = [
    { key: "dueRecall", list: pools.dueRecall },
    { key: "listening", list: pools.listening },
    { key: "form", list: pools.form },
    { key: "difficult", list: pools.difficult },
    { key: "production", list: pools.production },
    { key: "older", list: pools.older },
  ];
  for (const { key, list } of mixOrder) {
    for (const c of list) {
      if (categoryFilled[key] >= slots[key]) break;
      if (selected.length >= capacity) break;
      if (tryTake(c, key)) {
        /* counted in tryTake */
      }
    }
  }

  // Deterministic backfill from remaining eligible.
  for (const c of pools.rest) {
    if (selected.length >= capacity) break;
    tryTake(c, "backfill");
  }

  return selected;
}

function countReasons(
  selected: readonly SelectedMissionCard[],
  nowMs: number,
): MissionReasonCounts {
  let due = 0;
  let difficult = 0;
  let listening = 0;
  let production = 0;
  let stageBlocking = 0;
  let older = 0;
  let newCards = 0;

  for (const s of selected) {
    const c = s.candidate;
    if (isOverdue(c, nowMs)) due += 1;
    if (isDifficultCandidate(c)) difficult += 1;
    if (c.modality === "listening") listening += 1;
    if (c.modality === "production") production += 1;
    if (c.stageBlocking) stageBlocking += 1;
    if (c.olderMaintenance) older += 1;
    if (isNewReviewCard(c)) newCards += 1;
  }

  return Object.freeze({
    due,
    difficult,
    listening,
    production,
    stageBlocking,
    older,
    new: newCards,
  });
}

/**
 * Deterministic human-readable reason text derived only from selected counts.
 * Never claims a category with count 0.
 */
export function formatMissionReasonText(reason: MissionReasonCounts): string {
  const parts: string[] = [];
  if (reason.due > 0) parts.push(`${reason.due} due`);
  if (reason.difficult > 0) parts.push(`${reason.difficult} difficult`);
  if (reason.listening > 0) parts.push(`${reason.listening} listening`);
  if (reason.production > 0) parts.push(`${reason.production} production`);
  if (reason.stageBlocking > 0) parts.push(`${reason.stageBlocking} stage-blocking`);
  if (reason.older > 0) parts.push(`${reason.older} older`);
  if (reason.new > 0) parts.push(`${reason.new} new`);
  return parts.join(" · ");
}

function categoryCountsOf(
  selected: readonly SelectedMissionCard[],
): Record<MissionCategory, number> {
  const counts = { ...EMPTY_CATEGORY_COUNTS };
  for (const s of selected) {
    counts[s.category] += 1;
  }
  return counts;
}

function buildMission(
  selected: readonly SelectedMissionCard[],
  nowMs: number,
  dailyCardLimit: number,
  newCardLimit: number,
): DailyMission {
  const reason = countReasons(selected, nowMs);
  return deepFreeze({
    selected: Object.freeze([...selected]),
    reason,
    reasonText: formatMissionReasonText(reason),
    categoryCounts: Object.freeze(categoryCountsOf(selected)),
    dailyCardLimit,
    newCardLimit,
    newCardsSelected: selected.filter((s) => isNewReviewCard(s.candidate)).length,
  });
}

/**
 * Shorten a mission to `maxCards` (deterministic prefix) without mutating
 * scheduler / card / mastery state.
 */
export function shortenMissionAt(
  mission: DailyMission,
  maxCards: number,
  now: Date,
): DailyMission {
  assertValidNow(now);
  if (
    typeof maxCards !== "number" ||
    !Number.isInteger(maxCards) ||
    maxCards < 0 ||
    !Number.isFinite(maxCards)
  ) {
    throw reviewError("INVALID_LIMIT", "maxCards must be a non-negative integer");
  }
  const sliced = mission.selected.slice(0, maxCards).map((s, i) =>
    deepFreeze({
      candidate: s.candidate,
      category: s.category,
      selectionRank: i,
    }),
  );
  return buildMission(sliced, now.getTime(), mission.dailyCardLimit, mission.newCardLimit);
}

/**
 * Resume from prior card IDs: stable subset in the same requested order.
 * Unknown IDs fail closed.
 */
export function resumeMissionFromCardIds(
  mission: DailyMission,
  cardIds: readonly string[],
  now: Date,
): DailyMission {
  assertValidNow(now);
  if (!Array.isArray(cardIds)) {
    throw reviewError("INVALID_TYPE", "cardIds must be an array", "resumeCardIds");
  }
  const byId = new Map(mission.selected.map((s) => [s.candidate.cardId, s]));
  const seen = new Set<string>();
  const picked: SelectedMissionCard[] = [];
  for (const id of cardIds) {
    if (typeof id !== "string" || id.length === 0) {
      throw reviewError("INVALID_TYPE", "resume cardId must be non-empty string");
    }
    if (seen.has(id)) {
      throw reviewError("DUPLICATE_ID", `Duplicate resume cardId: ${id}`);
    }
    seen.add(id);
    const row = byId.get(id);
    if (!row) {
      throw reviewError(
        "UNKNOWN_FILTER",
        `resume cardId not in mission: ${id}`,
        "resumeCardIds",
      );
    }
    picked.push(
      deepFreeze({
        candidate: row.candidate,
        category: row.category,
        selectionRank: picked.length,
      }),
    );
  }
  return buildMission(picked, now.getTime(), mission.dailyCardLimit, mission.newCardLimit);
}

export function generateDailyMission(input: GenerateMissionInput): DailyMission {
  if (input === null || input === undefined || typeof input !== "object") {
    throw reviewError("INVALID_TYPE", "generateDailyMission input must be an object");
  }
  const raw = input as GenerateMissionInput;
  assertValidNow(raw.now);
  assertLimits(raw.dailyCardLimit, raw.newCardLimit);

  const candidates = parseReviewCandidates(raw.candidates);
  const knownLessons = new Set(candidates.map((c) => c.lessonId));
  const filters = parseFilters(raw.filters, knownLessons);

  if (raw.targetCount !== undefined) {
    if (
      typeof raw.targetCount !== "number" ||
      !Number.isInteger(raw.targetCount) ||
      raw.targetCount < 0 ||
      !Number.isFinite(raw.targetCount)
    ) {
      throw reviewError("INVALID_LIMIT", "targetCount must be a non-negative integer");
    }
  }

  const targetCount = Math.min(
    raw.targetCount ?? raw.dailyCardLimit,
    raw.dailyCardLimit,
  );

  const eligible = applyFilters(candidates, filters);
  const nowMs = raw.now.getTime();
  const selected = selectCards(
    eligible,
    nowMs,
    raw.dailyCardLimit,
    raw.newCardLimit,
    targetCount,
  );

  const mission = buildMission(
    selected,
    nowMs,
    raw.dailyCardLimit,
    raw.newCardLimit,
  );

  if (raw.resumeCardIds !== undefined) {
    return resumeMissionFromCardIds(mission, raw.resumeCardIds, raw.now);
  }
  return mission;
}
