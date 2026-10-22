import type { ContentPack, DifficultyProfile, PackLexeme } from "../../../content/src/types/packs.js";
import { calendarDate, isCalendarDate, shiftCalendarDate, studyDate } from "./dates.js";
import { deriveLearningMetrics, deriveRewards, isMeaningfulSession, orderedSessions } from "./engagement.js";
import { isObjectiveDimension, objectiveDimensions, orderedAnswers } from "./progress.js";
import type { ItemProgress, LearningAnswer, LearningCapability, LearningSession } from "./types.js";

function fraction(value: number, total: number): number { return total ? value / total : 0; }
function clamp(value: number): number { return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0; }
function itemKey(packId: string, itemId: string): string { return JSON.stringify([packId, itemId]); }

export type UnitProgress = {
  unitId: string; title: string; canDo: string[]; items: number; segments: number;
  secured: number; securedRatio: number; strength: number; complete: boolean; gold: boolean;
  unlocked: boolean; bossUnlocked: boolean; practised?: number;
};
export function deriveUnitProgress(pack: ContentPack, progress: readonly ItemProgress[], masteryThreshold = 0.8): UnitProgress[] {
  if (!Number.isFinite(masteryThreshold) || masteryThreshold <= 0 || masteryThreshold > 1) throw new Error("Invalid mastery threshold");
  const index = new Map(progress.map(item => [itemKey(item.packId, item.itemId), item]));
  let previousMastered = true;
  return pack.units.map(unit => {
    const candidates = pack.items.filter(item => item.unitId === unit.id && item.type !== "grammarPoint" && item.type !== "examTask"
      && item.type !== "speakingPrompt" && item.type !== "writingPrompt"
      && (!index.has(itemKey(pack.id, item.id)) || Object.keys(index.get(itemKey(pack.id, item.id))!.segments).length === 0 || objectiveDimensions(index.get(itemKey(pack.id, item.id))!).length > 0));
    const items = candidates.map(item => index.get(itemKey(pack.id, item.id)));
    const segments = items.flatMap(item => item ? objectiveDimensions(item) : []);
    const missing = items.filter(item => !item || Object.keys(item.segments).length === 0).length;
    const total = segments.length + missing;
    const secured = segments.filter(segment => segment.state === "secured").length;
    const securedRatio = fraction(secured, total);
    const mastered = total > 0 && securedRatio >= masteryThreshold;
    const result: UnitProgress = { unitId: unit.id, title: unit.title, canDo: [...unit.canDo], items: items.length,
      segments: total, secured, securedRatio, strength: fraction(segments.reduce((sum, segment) => sum + clamp(segment.strength), 0), total),
      complete: total > 0 && secured === total, gold: total > 0 && missing === 0 && segments.every(segment => segment.state === "secured" && segment.gold),
      unlocked: previousMastered, bossUnlocked: mastered, practised: pack.items.filter(item => item.unitId === unit.id && Object.values(index.get(itemKey(pack.id, item.id))?.segments ?? {}).some(segment => (segment.practiceAttempts ?? 0) > 0)).length };
    previousMastered = previousMastered && mastered;
    return result;
  });
}

export type SkillStrength = { skill: string; items: number; segments: number; secured: number; strength: number; level: number; assessment?: "objective" | "self"; practised?: number };
export function deriveSkillStrength(capabilities: readonly LearningCapability[], progress: readonly ItemProgress[]): SkillStrength[] {
  const index = new Map(progress.map(item => [itemKey(item.packId, item.itemId), item]));
  const bySkill = new Map<string, { itemIds: Set<string>; selfItems: Set<string>; practised: Set<string>; segments: Map<string, { strength: number; secured: boolean }> }>();
  for (const capability of capabilities) for (const template of capability.templates) {
    const segment = index.get(itemKey(capability.packId, capability.itemId))?.segments[template.dimension];
    if (!segment) continue;
    const row = bySkill.get(template.skill) ?? { itemIds: new Set<string>(), selfItems: new Set<string>(), practised: new Set<string>(), segments: new Map() };
    const key = itemKey(capability.packId, capability.itemId);
    if (template.assessment === "self" || !isObjectiveDimension(segment)) {
      row.selfItems.add(key);
      if ((segment.practiceAttempts ?? 0) > 0 || (!isObjectiveDimension(segment) && segment.attempts > 0)) row.practised.add(key);
    } else {
      row.itemIds.add(key);
      row.segments.set(JSON.stringify([capability.packId, capability.itemId, template.dimension]), { strength: clamp(segment.strength), secured: segment.state === "secured" });
    }
    bySkill.set(template.skill, row);
  }
  return [...bySkill].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([skill, row]) => {
    const values = [...row.segments.values()];
    const secured = values.filter(segment => segment.secured).length;
    return { skill, items: values.length ? row.itemIds.size : row.selfItems.size, segments: values.length, secured,
      strength: fraction(values.reduce((sum, segment) => sum + segment.strength, 0), values.length),
      level: secured ? 1 + Math.floor((secured - 1) / 10) : 0,
      ...(row.selfItems.size ? { assessment: values.length ? "objective" as const : "self" as const, practised: row.practised.size } : {}) };
  });
}

export type ReadinessSection = {
  section: string; itemIds: string[]; items: number; observedItems: number;
  segments: number; strength: number; securedRatio: number; selfCheck: boolean; selfPractice?: number;
};
/** A practice-evidence meter, not a predicted exam score. Production remains a self-check. */
export function deriveReadiness(pack: ContentPack, progress: readonly ItemProgress[]): ReadinessSection[] {
  const index = new Map(progress.filter(item => item.packId === pack.id).map(item => [item.itemId, item]));
  const itemsById = new Map(pack.items.map(item => [item.id, item]));
  const sections = new Map<string, Set<string>>();
  for (const task of pack.items) if (task.type === "examTask") {
    const refs = sections.get(task.section) ?? new Set<string>();
    const visit = (id: string, seen: Set<string>): void => {
      if (seen.has(id)) return;
      seen.add(id);
      const item = itemsById.get(id);
      if (!item) return;
      if (item.type === "examTask") for (const ref of item.itemRefs) visit(ref, seen);
      else if (item.type !== "grammarPoint") refs.add(id);
    };
    for (const id of task.itemRefs) visit(id, new Set());
    sections.set(task.section, refs);
  }
  return [...sections].map(([section, ids]) => {
    const itemIds = [...ids].sort();
    const observed = itemIds.map(id => index.get(id));
    const segments = observed.flatMap(item => item ? objectiveDimensions(item) : []);
    // Missing objective word evidence remains zero; self-check-only prompts do not become a score.
    const missing = itemIds.filter((id, itemIndex) => {
      const type = itemsById.get(id)?.type;
      return type !== "speakingPrompt" && type !== "writingPrompt" && (!observed[itemIndex] || Object.keys(observed[itemIndex]!.segments).length === 0);
    }).length;
    const denominator = segments.length + missing;
    return { section, itemIds, items: itemIds.length, observedItems: observed.filter(item => item && objectiveDimensions(item).some(segment => segment.attempts > 0)).length,
      selfPractice: observed.filter(item => item && Object.values(item.segments).some(segment => (segment.practiceAttempts ?? 0) > 0 || (!isObjectiveDimension(segment) && segment.attempts > 0))).length,
      segments: denominator, strength: fraction(segments.reduce((sum, segment) => sum + clamp(segment.strength), 0), denominator),
      securedRatio: fraction(segments.filter(segment => segment.state === "secured").length, denominator),
      selfCheck: itemIds.some(id => { const type = itemsById.get(id)?.type; return type === "speakingPrompt" || type === "writingPrompt" || Object.values(index.get(id)?.segments ?? {}).some(segment => !isObjectiveDimension(segment) || (segment.practiceAttempts ?? 0) > 0); }) };
  });
}

export type CardRarity = "common" | "uncommon" | "rare" | "legendary";
export type CollectionCard = { item: PackLexeme; collected: boolean; rarity: CardRarity; complete: boolean; gold: boolean };
function rarity(item: PackLexeme, difficulty: DifficultyProfile): CardRarity {
  if (!item.frequencyRank || !Number.isFinite(item.frequencyRank) || item.frequencyRank < 1) return "common";
  const demand = 0.6 * clamp(difficulty.typedAnswerRatio) + 0.4 * clamp(difficulty.distractorCloseness);
  const score = Math.log10(item.frequencyRank) + 0.3 * demand;
  return score < 3 ? "common" : score < 3.7 ? "uncommon" : score < 4.3 ? "rare" : "legendary";
}
export function deriveCollection(pack: ContentPack, answers: readonly LearningAnswer[], progress: readonly ItemProgress[], difficulty: DifficultyProfile, now: Date): CollectionCard[] {
  const recalled = new Set(orderedAnswers(answers, now).filter(answer => answer.packId === pack.id && answer.correct && !answer.hinted).map(answer => answer.itemId));
  const index = new Map(progress.filter(item => item.packId === pack.id).map(item => [item.itemId, item]));
  return pack.items.filter((item): item is PackLexeme => item.type === "lexeme").map(item => ({ item,
    collected: recalled.has(item.id), rarity: rarity(item, difficulty), complete: index.get(item.id)?.complete ?? false, gold: index.get(item.id)?.gold ?? false }));
}

export type WeeklyRecap = {
  startDate: string; endDate: string; answered: number; correct: number; activeDays: number;
  completedRuns: number; listeningTasks: number; speakingCycles: number; writingSubmissions: number;
  xp: number; learningMetrics: ReturnType<typeof deriveLearningMetrics>;
};
export function deriveWeeklyRecap(answers: readonly LearningAnswer[], sessions: readonly LearningSession[], now: Date, timeZone: string): WeeklyRecap {
  const endDate = calendarDate(now, timeZone);
  const startDate = shiftCalendarDate(endDate, -6);
  const rows = orderedAnswers(answers, now).filter(answer => calendarDate(new Date(answer.createdAt), timeZone) >= startDate);
  const runs = orderedSessions(sessions, now).filter(session => calendarDate(new Date(session.completedAt), timeZone) >= startDate);
  const dates = new Set(rows.map(answer => calendarDate(new Date(answer.createdAt), timeZone)));
  for (const session of runs.filter(isMeaningfulSession)) dates.add(calendarDate(new Date(session.completedAt), timeZone));
  // Reuse the reward derivation with the full history, then subtract the pre-week total
  // so combo and diminishing-run context remain correct at the window boundary.
  const before = new Date(now);
  before.setTime(rows.reduce((first, row) => Math.min(first, Date.parse(row.createdAt)),
    runs.reduce((first, row) => Math.min(first, Date.parse(row.completedAt)), now.getTime())) - 1);
  const allXp = deriveRewards(answers, sessions, now).xp;
  const beforeXp = deriveRewards(answers, sessions, before).xp;
  return { startDate, endDate, answered: rows.length, correct: rows.filter(answer => answer.correct).length, activeDays: dates.size,
    completedRuns: runs.filter(session => session.mode === "run" && isMeaningfulSession(session)).length,
    listeningTasks: rows.filter(answer => answer.skill === "listening").length, speakingCycles: rows.filter(answer => answer.skill === "speaking").length,
    writingSubmissions: rows.filter(answer => answer.skill === "writing").length, xp: Math.max(0, allXp - beforeXp),
    learningMetrics: deriveLearningMetrics(answers, sessions, now) };
}

export type Quest = { id: string; title: string; progress: number; target: number; complete: boolean };
export function deriveQuests(answers: readonly LearningAnswer[], sessions: readonly LearningSession[], now: Date, timeZone: string): Quest[] {
  const date = studyDate(now, timeZone);
  const rows = orderedAnswers(answers, now).filter(answer => answer.studyDate === date);
  const runs = orderedSessions(sessions, now).filter(session => session.studyDate === date && session.mode === "run" && isMeaningfulSession(session));
  const values: Array<Omit<Quest, "complete">> = [
    { id: "daily-run", title: "Complete one Daily Run", progress: Math.min(1, runs.length), target: 1 },
    { id: "recall", title: "Recall five answers without hints", progress: Math.min(5, rows.filter(answer => answer.correct && !answer.hinted && answer.format === "recall").length), target: 5 },
    { id: "repair", title: "Correct one earlier mistake", progress: Math.min(1, rows.filter(answer => answer.correct && !answer.hinted && answer.corrected).length), target: 1 },
  ];
  return values.map(value => ({ ...value, complete: value.progress >= value.target }));
}

function escapeIcs(value: string): string { return value.replace(/\\/gu, "\\\\").replace(/\r\n|\r|\n/gu, "\\n").replace(/,/gu, "\\,").replace(/;/gu, "\\;"); }
function compactUtc(value: Date): string { return value.toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z"); }
function localStamp(value: number): string { return compactUtc(new Date(value)).slice(0, -1); }
function offsetText(minutes: number): string { const abs = Math.abs(minutes); return `${minutes < 0 ? "-" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}${String(abs % 60).padStart(2, "0")}`; }
/** Fold on UTF-8 octet boundaries, including the leading continuation space. */
function foldIcs(line: string): string {
  const result: string[] = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 75) { result.push(current); current = " "; bytes = 1; }
    current += character; bytes += size;
  }
  result.push(current);
  return result.join("\r\n");
}

export type DailyReminderOptions = {
  timeZone: string; time: string; startDate: string; url: string; now?: Date; uid?: string;
  /** Finite recurrence keeps the exported timezone definition exact for its whole life. */
  occurrences?: number;
};
/** RFC5545 daily local-time reminder with a complete VTIMEZONE for its recurrence. */
export function createDailyReminderIcs(options: DailyReminderOptions): string {
  if (!isCalendarDate(options.startDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(options.time)) throw new Error("Invalid reminder date or time");
  if (!/^[A-Za-z0-9_+\-/]+$/u.test(options.timeZone)) throw new Error("Invalid reminder timezone");
  const occurrences = options.occurrences ?? 366;
  if (!Number.isInteger(occurrences) || occurrences < 1 || occurrences > 3660) throw new Error("Invalid recurrence count");
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid reminder timestamp");
  const url = new URL(options.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Reminder link must be a web URL");
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: options.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const offsetAt = (milliseconds: number): number => {
    const fields = formatter.formatToParts(new Date(milliseconds));
    const get = (name: string): number => Number(fields.find(field => field.type === name)?.value);
    return Math.round((Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - Math.floor(milliseconds / 1000) * 1000) / 60000);
  };
  const startYear = Number(options.startDate.slice(0, 4));
  if (startYear < 1970 || startYear > 9988) throw new Error("Reminder year must be between 1970 and 9988");
  const endDate = shiftCalendarDate(options.startDate, occurrences);
  const from = Date.UTC(startYear - 1, 0, 1);
  const until = Date.UTC(Number(endDate.slice(0, 4)) + 1, 0, 1);
  const initialOffset = offsetAt(from);
  const observances = new Map<string, { kind: "STANDARD" | "DAYLIGHT"; from: number; to: number; dates: string[] }>();
  let previousOffset = initialOffset;
  for (let timestamp = from + 86400000; timestamp <= until; timestamp += 86400000) {
    const nextOffset = offsetAt(timestamp);
    if (nextOffset === previousOffset) continue;
    let low = timestamp - 86400000;
    let high = timestamp;
    while (high - low > 1000) { const middle = Math.floor((low + high) / 2000) * 1000; if (offsetAt(middle) === previousOffset) low = middle; else high = middle; }
    const key = `${previousOffset}:${nextOffset}`;
    const row = observances.get(key) ?? { kind: nextOffset > previousOffset ? "DAYLIGHT" : "STANDARD", from: previousOffset, to: nextOffset, dates: [] };
    row.dates.push(localStamp(high + previousOffset * 60000)); observances.set(key, row);
    previousOffset = nextOffset;
  }
  const zone = ["BEGIN:VTIMEZONE", `TZID:${options.timeZone}`, "BEGIN:STANDARD", `DTSTART:${startYear - 1}0101T000000`, `TZOFFSETFROM:${offsetText(initialOffset)}`, `TZOFFSETTO:${offsetText(initialOffset)}`, "END:STANDARD"];
  for (const row of observances.values()) zone.push(`BEGIN:${row.kind}`, `DTSTART:${row.dates[0]!}`, `TZOFFSETFROM:${offsetText(row.from)}`, `TZOFFSETTO:${offsetText(row.to)}`, ...(row.dates.length > 1 ? [`RDATE:${row.dates.slice(1).join(",")}`] : []), `END:${row.kind}`);
  zone.push("END:VTIMEZONE");
  const uid = options.uid ?? `wortwerk-reminder-${compactUtc(now)}@local`;
  if (!/^[A-Za-z0-9@._-]+$/u.test(uid)) throw new Error("Invalid reminder UID");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wortwerk//Daily practice//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...zone,
    "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${compactUtc(now)}`, `DTSTART;TZID=${options.timeZone}:${options.startDate.replace(/-/gu, "")}T${options.time.replace(":", "")}00`,
    "DURATION:PT5M", `RRULE:FREQ=DAILY;COUNT=${occurrences}`, "SUMMARY:Daily practice", `DESCRIPTION:${escapeIcs("A few minutes of practice. Open your current review: " + url.href)}`, `URL:${url.href}`, "BEGIN:VALARM", "TRIGGER:PT0S", "ACTION:DISPLAY", "DESCRIPTION:Time for daily practice", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  return lines.map(foldIcs).join("\r\n") + "\r\n";
}
