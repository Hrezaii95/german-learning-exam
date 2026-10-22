import { isCalendarDate } from "./dates.js";
import { orderedSessions } from "./engagement.js";
import type { LearningSession } from "./types.js";

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) { result ^= char.codePointAt(0)!; result = Math.imul(result, 16777619); }
  return result >>> 0;
}
function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

/** Same pack and local calendar date give everyone the same six, regardless of history. */
export function selectDailyPuzzle(packId: string, itemIds: readonly string[], date: string): string[] {
  if (!packId || !isCalendarDate(date)) throw new Error("Puzzle needs a pack and local calendar date");
  const ids = [...new Set(itemIds.filter(id => typeof id === "string" && id.length > 0))];
  if (ids.length < 6) return [];
  return ids.sort((a, b) => hash(`${packId}:${date}:${a}`) - hash(`${packId}:${date}:${b}`) || compare(a, b)).slice(0, 6);
}
export type PuzzleOutcome = "correct" | "incorrect" | "almost" | "unanswered";
/** No words, ids, answers or learner identity appear in a share grid. */
export function puzzleShareGrid(outcomes: readonly PuzzleOutcome[]): string {
  const cells: Record<PuzzleOutcome, string> = { correct: "🟩", incorrect: "🟥", almost: "🟦", unanswered: "⬜" };
  return Array.from({ length: 6 }, (_, index) => cells[outcomes[index] ?? "unanswered"]).join("");
}

export type ChallengeMode = "blitz" | "boss";
export type ChallengeState = {
  mode: ChallengeMode; startedAt: string; deadlineAt: string | null; lastObservedAt: string;
  total: number | null; answered: number; correct: number; strikes: number; maxStrikes: 3;
  answerIds: string[]; status: "active" | "finished"; endReason: "time" | "strikes" | "complete" | null;
};
function instant(now: Date): number {
  const value = now.getTime();
  if (!Number.isFinite(value)) throw new Error("Invalid challenge instant");
  return value;
}
export function createChallenge(input: { mode: ChallengeMode; now: Date; total?: number }): ChallengeState {
  const started = instant(input.now);
  if (input.mode !== "blitz" && input.mode !== "boss") throw new Error("Only Boss and Blitz have strikes");
  if (input.total !== undefined && (!Number.isInteger(input.total) || input.total < 1 || input.total > 10000)) throw new Error("Invalid challenge size");
  if (input.mode === "boss" && input.total === undefined) throw new Error("Boss needs a finite task count");
  return { mode: input.mode, startedAt: input.now.toISOString(), deadlineAt: input.mode === "blitz" ? new Date(started + 60000).toISOString() : null,
    lastObservedAt: input.now.toISOString(), total: input.total ?? null, answered: 0, correct: 0, strikes: 0, maxStrikes: 3,
    answerIds: [], status: "active", endReason: null };
}
/** Elapsed timestamps count background time; delayed ticks cannot extend a Blitz. */
export function advanceChallenge(state: ChallengeState, now: Date): ChallengeState {
  const observed = Math.max(instant(now), Date.parse(state.lastObservedAt), Date.parse(state.startedAt));
  if (state.status === "finished") return state;
  const next = { ...state, lastObservedAt: new Date(observed).toISOString() };
  if (state.deadlineAt !== null && observed >= Date.parse(state.deadlineAt)) return { ...next, status: "finished", endReason: "time" };
  return next;
}
export function answerChallenge(state: ChallengeState, answer: { eventId: string; correct: boolean }, now: Date): ChallengeState {
  const current = advanceChallenge(state, now);
  if (current.status === "finished" || !answer.eventId || current.answerIds.includes(answer.eventId)) return current;
  if (typeof answer.correct !== "boolean") throw new Error("Challenge answer must be a boolean");
  const answered = current.answered + 1;
  const strikes = current.strikes + Number(!answer.correct);
  const endReason = strikes >= 3 ? "strikes" : current.total !== null && answered >= current.total ? "complete" : null;
  return { ...current, answered, correct: current.correct + Number(answer.correct), strikes,
    answerIds: [...current.answerIds, answer.eventId], status: endReason ? "finished" : "active", endReason };
}
export function challengeRemainingSeconds(state: ChallengeState, now: Date): number | null {
  if (state.deadlineAt === null) return null;
  const observed = Math.max(instant(now), Date.parse(state.lastObservedAt), Date.parse(state.startedAt));
  return Math.max(0, Math.ceil((Date.parse(state.deadlineAt) - observed) / 1000));
}

export type PersonalBest = { score: number; answered: number; accuracy: number; sessionId: string; completedAt: string };
/** The caller's scope key includes pack identity; exact scope and difficulty must match. */
export function derivePersonalBest(sessions: readonly LearningSession[], input: {
  mode: ChallengeMode; scopeKey: string; difficultyId: string; now: Date;
}): PersonalBest | null {
  if (!input.scopeKey || !input.difficultyId) return null;
  const best = orderedSessions(sessions, input.now).filter(session => session.completed && session.mode === input.mode
    && session.scopeKey === input.scopeKey && session.difficultyId === input.difficultyId && session.answered > 0)
    .sort((a, b) => b.correct - a.correct || b.answered - a.answered || compare(a.completedAt, b.completedAt) || compare(a.sessionId, b.sessionId))[0];
  return best ? { score: best.correct, answered: best.answered, accuracy: best.correct / best.answered, sessionId: best.sessionId, completedAt: best.completedAt } : null;
}

/** Eligibility is deterministic; accepting it is always optional, and rewards are capped. */
export function boundedRunBonus(sessionId: string): { eligible: boolean; extraTasks: 0 | 3; xpCap: 0 | 30 } {
  const eligible = !!sessionId && hash(`bonus:${sessionId}`) % 5 === 0;
  return { eligible, extraTasks: eligible ? 3 : 0, xpCap: eligible ? 30 : 0 };
}
