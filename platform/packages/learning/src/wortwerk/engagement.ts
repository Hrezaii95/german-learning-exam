import { calendarDaysBetween, isCalendarDate, shiftCalendarDate, studyDate } from "./dates.js";
import { orderedAnswers } from "./progress.js";
import type { LearningAnswer, LearningSession } from "./types.js";

export function orderedSessions(sessions: readonly LearningSession[], now: Date): LearningSession[] {
  const latest = new Map<string, LearningSession>();
  const rows = [...sessions].filter(s => s && typeof s.sessionId === "string" && s.sessionId.length > 0
    && ["run", "quick", "blitz", "boss", "free"].includes(s.mode)
    && isCalendarDate(s.studyDate) && Number.isFinite(Date.parse(s.startedAt))
    && Number.isFinite(Date.parse(s.completedAt)) && Date.parse(s.completedAt) >= Date.parse(s.startedAt)
    && Date.parse(s.completedAt) <= now.getTime() && Number.isInteger(s.answered) && s.answered >= 0
    && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.answered && typeof s.completed === "boolean")
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.sessionId.localeCompare(b.sessionId)
      || a.answered - b.answered || Number(a.completed) - Number(b.completed));
  // Per-answer snapshots share one session id. Keep its latest cumulative
  // evidence, including a final completion, rather than its initial zero row.
  for (const row of rows) latest.set(row.sessionId, row);
  return [...latest.values()].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.sessionId.localeCompare(b.sessionId));
}

export function isMeaningfulSession(session: LearningSession): boolean {
  return session.answered >= 5 && (session.mode === "run" || session.mode === "quick");
}

export type HabitSummary = {
  studyDate: string; streak: number; longestStreak: number; freezes: number;
  goalRuns: number; goalComplete: boolean; doneForToday: boolean;
  checkInDays: { date: string; studied: boolean; frozen: boolean; today: boolean }[];
};

/** Freeze earning/spending is replayed from dated evidence; no hidden balance cache. */
export function deriveHabit(sessions: readonly LearningSession[], now: Date, timeZone: string): HabitSummary {
  const today = studyDate(now, timeZone);
  const rows = orderedSessions(sessions, now);
  const dates = [...new Set(rows.filter(isMeaningfulSession).map(s => s.studyDate))].filter(d => d <= today).sort();
  const active = new Set(dates);
  const frozen = new Set<string>();
  let streak = 0;
  let longestStreak = 0;
  let freezes = 0;
  let activeDays = 0;
  let previous: string | null = null;
  const closeGap = (after: string, gap: number): void => {
    const protectedDays = streak > 0 ? Math.min(gap, freezes) : 0;
    for (let offset = 1; offset <= protectedDays; offset += 1) frozen.add(shiftCalendarDate(after, offset));
    freezes -= protectedDays;
    streak += protectedDays;
    longestStreak = Math.max(longestStreak, streak);
    if (gap > protectedDays) streak = 0;
  };
  for (const date of dates) {
    if (previous) closeGap(previous, Math.max(0, calendarDaysBetween(previous, date) - 1));
    streak += 1; activeDays += 1;
    if (activeDays % 7 === 0) freezes = Math.min(2, freezes + 1);
    longestStreak = Math.max(longestStreak, streak);
    previous = date;
  }
  if (previous) closeGap(previous, Math.max(0, calendarDaysBetween(previous, today) - 1));
  const goalRuns = rows.filter(s => s.studyDate === today && s.mode === "run" && s.completed && isMeaningfulSession(s)).length;
  const checkInDays = Array.from({ length: 7 }, (_, index) => {
    const date = shiftCalendarDate(today, index - 6);
    return { date, studied: active.has(date), frozen: frozen.has(date), today: date === today };
  });
  return { studyDate: today, streak, longestStreak, freezes, goalRuns,
    goalComplete: goalRuns > 0, doneForToday: goalRuns > 0, checkInDays };
}

export type RewardKind = "retrieval" | "listening" | "speaking" | "writing" | "detective" | "boss";
export function answerXp(input: {
  kind?: RewardKind; correct: boolean; hinted: boolean; corrected?: boolean;
  combo?: number; completedRunsToday?: number;
}): number {
  const kind = input.kind ?? "retrieval";
  const cycle = kind === "speaking" || kind === "writing" || kind === "detective" || kind === "boss";
  if (!input.correct && !cycle) return 0;
  const base = input.corrected ? 5 : input.hinted ? 5 : kind === "listening" || kind === "speaking" ? 3
    : kind === "writing" ? 8 : kind === "detective" || kind === "boss" ? 30 : 10;
  const combo = input.combo ?? 0;
  const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
  const runs = Math.max(0, Math.floor(input.completedRunsToday ?? 0));
  const diminishing = runs < 3 ? 1 : Math.max(0.1, Math.pow(0.5, runs - 2));
  return Math.max(0, Math.floor(base * multiplier * diminishing));
}

export function deriveRewards(answers: readonly LearningAnswer[], sessions: readonly LearningSession[], now: Date): { xp: number; bestCombo: number } {
  const events = orderedAnswers(answers, now);
  const runs = orderedSessions(sessions, now).filter(s => s.mode === "run" && s.completed && isMeaningfulSession(s));
  const combos = new Map<string, number>();
  const mistakes = new Set<string>();
  let xp = 0;
  let bestCombo = 0;
  for (const event of events) {
    const session = event.sessionId ?? event.studyDate;
    const combo = event.correct && !event.hinted ? (combos.get(session) ?? 0) + 1 : 0;
    combos.set(session, combo); bestCombo = Math.max(bestCombo, combo);
    const completedRunsToday = runs.filter(s => s.studyDate === event.studyDate && Date.parse(s.completedAt) < Date.parse(event.createdAt)
      && s.sessionId !== event.sessionId).length;
    const mistakeKey = JSON.stringify([session, event.packId, event.itemId, event.dimension]);
    const corrected = event.correct && !event.hinted && (event.corrected === true || mistakes.has(mistakeKey));
    if (!event.correct) mistakes.add(mistakeKey);
    else if (corrected) mistakes.delete(mistakeKey);
    const kind: RewardKind = event.skill === "listening" ? "listening" : event.skill === "speaking" ? "speaking"
      : event.skill === "writing" ? "writing" : "retrieval";
    xp += answerXp({ kind, correct: event.correct, hinted: event.hinted, corrected, combo, completedRunsToday });
  }
  return { xp, bestCombo };
}

export type RunResults = {
  answered: number; correct: number; corrected: string[]; rememberedFromLastWeek: number;
  bySkill: Record<string, { answered: number; correct: number }>;
};

export function deriveRunResults(answers: readonly LearningAnswer[], history: readonly LearningAnswer[] = []): RunResults {
  const now = new Date(8_640_000_000_000_000);
  const rows = orderedAnswers(answers, now);
  const previous = orderedAnswers(history, now);
  const missed = new Set<string>();
  const corrected = new Set<string>();
  const remembered = new Set<string>();
  const bySkill: RunResults["bySkill"] = Object.create(null) as RunResults["bySkill"];
  for (const event of rows) {
    const key = JSON.stringify([event.packId, event.itemId, event.dimension]);
    if (!event.correct) missed.add(key);
    else if (!event.hinted && (missed.has(key) || event.corrected)) corrected.add(event.itemId);
    const prior = previous.filter(a => a.packId === event.packId && a.itemId === event.itemId && a.dimension === event.dimension
      && Date.parse(a.createdAt) < Date.parse(event.createdAt)).reduce<LearningAnswer | undefined>((latest, row) =>
        !latest || Date.parse(row.createdAt) > Date.parse(latest.createdAt) ? row : latest, undefined);
    if (prior && event.correct && !event.hinted && event.format === "recall"
      && calendarDaysBetween(prior.studyDate, event.studyDate) >= 7) remembered.add(key);
    const skill = event.skill ?? event.dimension;
    const count = bySkill[skill] ?? { answered: 0, correct: 0 };
    count.answered += 1; count.correct += Number(event.correct); bySkill[skill] = count;
    previous.push(event);
  }
  return { answered: rows.length, correct: rows.filter(a => a.correct).length,
    corrected: [...corrected], rememberedFromLastWeek: remembered.size, bySkill };
}

export function deriveLearningMetrics(answers: readonly LearningAnswer[], sessions: readonly LearningSession[], now: Date): {
  return7Day: boolean | null; runCompletion: number | null;
  delayedRecall: { tested: number; correct: number; accuracy: number | null };
} {
  const rows = orderedAnswers(answers, now);
  const runs = orderedSessions(sessions, now).filter(s => s.mode === "run");
  const first = rows[0];
  const last = rows.at(-1);
  const eligible = !!first && !!last && calendarDaysBetween(first.studyDate, last.studyDate) >= 7;
  const seen = new Map<string, LearningAnswer>();
  let tested = 0;
  let correct = 0;
  for (const event of rows) {
    const key = JSON.stringify([event.packId, event.itemId, event.dimension]);
    const previous = seen.get(key);
    if (previous && event.format === "recall" && !event.hinted && calendarDaysBetween(previous.studyDate, event.studyDate) >= 7) {
      tested += 1; correct += Number(event.correct);
    }
    seen.set(key, event);
  }
  // A seven-day return is measurable only once seven days have elapsed.
  const matured = first ? now.getTime() - Date.parse(first.createdAt) >= 7 * 86_400_000 : false;
  return { return7Day: matured ? eligible : null,
    runCompletion: runs.length ? runs.filter(s => s.completed).length / runs.length : null,
    delayedRecall: { tested, correct, accuracy: tested ? correct / tested : null } };
}
