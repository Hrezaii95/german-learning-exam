import {
  calendarDate, calendarDaysBetween, isCalendarDate, studyDate,
  deriveHabit, deriveLearningMetrics, deriveProgress, deriveRewards, summarizeProgress,
  orderedAnswers, orderedSessions, type LearningAnswer, type LearningCapability,
  type LearningFormat, type LearningSession,
} from "../../../../packages/learning/src/wortwerk/index.js";
import type { GeneratedTask, GradeResult } from "../../../../packages/wortwerk/src/tasks.js";
import { wortwerkStore, type WortwerkSnapshot, type WortwerkStore } from "./store";
import type { SyncEvent } from "./sync-store";

const FORMATS: readonly LearningFormat[] = ["recognition", "reduced-cues", "recall"];
const MODES: readonly LearningSession["mode"][] = ["run", "quick", "blitz", "boss", "free"];
const EMPTY_CAPABILITIES: readonly LearningCapability[] = Object.freeze([]);

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}
function count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function optionalString(value: unknown): value is string | undefined { return value === undefined || nonempty(value); }
function optionalBoolean(value: unknown): value is boolean | undefined { return value === undefined || typeof value === "boolean"; }
function plausibleDates(createdAt: string, study: string, calendar?: string): boolean {
  const utc = createdAt.slice(0, 10);
  if (calendar !== undefined) return Math.abs(calendarDaysBetween(utc, calendar)) <= 1
    && [0, 1].includes(calendarDaysBetween(study, calendar));
  // UTC offsets plus the 03:00 grace can cross at most two calendar labels.
  return Math.abs(calendarDaysBetween(utc, study)) <= 2;
}
function compareEvent(left: SyncEvent, right: SyncEvent): number {
  return left.createdAt === right.createdAt ? (left.id === right.id ? 0 : left.id > right.id ? 1 : -1) : left.createdAt > right.createdAt ? 1 : -1;
}

/** Invalid persisted settings cannot stop signed-out practice. */
export function resolveWortwerkTimeZone(value: unknown, fallback = "UTC"): string {
  if (typeof value === "string" && value) {
    try { new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0)); return value; }
    catch { /* Invalid synced setting: use the caller's valid local fallback. */ }
  }
  try { new Intl.DateTimeFormat("en", { timeZone: fallback }).format(new Date(0)); return fallback; }
  catch { return "UTC"; }
}

function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

export function wortwerkSettings(snapshot: WortwerkSnapshot): Record<string, unknown> {
  const value = snapshot.docs.find(doc => doc.key === "settings")?.value;
  return record(value) ? value : {};
}

function parseAnswer(event: SyncEvent): LearningAnswer | null {
  const value = event.payload;
  if (!record(value) || !nonempty(value.packId) || !nonempty(value.itemId) || !nonempty(value.dimension)
    || !nonempty(value.templateId) || !FORMATS.includes(value.format as LearningFormat)
    || typeof value.correct !== "boolean" || typeof value.hinted !== "boolean" || !isCalendarDate(value.studyDate)
    || (value.calendarDate !== undefined && !isCalendarDate(value.calendarDate))
    || !optionalString(value.sessionId) || !optionalString(value.skill) || !optionalBoolean(value.corrected)
    || !optionalBoolean(value.selfAssessed)
    || (value.latencyMs !== undefined && (typeof value.latencyMs !== "number" || !Number.isFinite(value.latencyMs) || value.latencyMs < 0))) return null;
  if (!plausibleDates(event.createdAt, value.studyDate, value.calendarDate as string | undefined)) return null;
  // A stored self check is useful practice evidence, never an objective recall pass.
  const selfAssessed = value.selfAssessed === true || value.skill === "speaking" || value.skill === "writing";
  return {
    eventId: event.id, createdAt: event.createdAt,
    packId: value.packId, itemId: value.itemId, dimension: value.dimension, templateId: value.templateId,
    format: value.format as LearningFormat, correct: value.correct, hinted: value.hinted || selfAssessed,
    studyDate: value.studyDate,
    ...(value.calendarDate !== undefined ? { calendarDate: value.calendarDate as string } : {}),
    ...(value.sessionId !== undefined ? { sessionId: value.sessionId } : {}),
    ...(value.skill !== undefined ? { skill: value.skill } : {}),
    ...(value.corrected !== undefined ? { corrected: value.corrected } : {}),
    ...(value.latencyMs !== undefined ? { latencyMs: value.latencyMs as number } : {}),
  };
}

function parseSession(event: SyncEvent): LearningSession | null {
  const value = event.payload;
  if (!record(value) || !nonempty(value.sessionId) || !MODES.includes(value.mode as LearningSession["mode"])
    || !timestamp(value.startedAt) || !timestamp(value.completedAt) || Date.parse(value.completedAt) < Date.parse(value.startedAt)
    || Date.parse(value.completedAt) > Date.parse(event.createdAt)
    || !count(value.answered) || !count(value.correct) || value.correct > value.answered
    || typeof value.completed !== "boolean" || !isCalendarDate(value.studyDate)
    || !optionalString(value.scopeKey) || !optionalString(value.difficultyId)) return null;
  if (!plausibleDates(value.completedAt, value.studyDate)) return null;
  return {
    sessionId: value.sessionId, mode: value.mode as LearningSession["mode"],
    startedAt: value.startedAt, completedAt: value.completedAt,
    answered: value.answered, correct: value.correct, completed: value.completed, studyDate: value.studyDate,
    ...(value.scopeKey !== undefined ? { scopeKey: value.scopeKey } : {}),
    ...(value.difficultyId !== undefined ? { difficultyId: value.difficultyId } : {}),
  };
}

/** Read only recognised v1 evidence; other raw events stay in the sync log. */
export function parseWortwerkEvidence(events: readonly SyncEvent[], now?: Date): { answers: LearningAnswer[]; sessions: LearningSession[] } {
  const answers: LearningAnswer[] = [];
  const seenAnswers = new Set<string>();
  const latestSessions = new Map<string, { event: SyncEvent; session: LearningSession }>();
  const validEnvelopes = events.filter(event => event && event.store === "wortwerk" && event.schemaVersion === 1 && nonempty(event.id) && timestamp(event.createdAt) && (!now || Date.parse(event.createdAt) <= now.getTime()));
  for (const event of [...validEnvelopes].sort(compareEvent)) {
    if (event.type === "answer") {
      const answer = parseAnswer(event);
      if (answer && !seenAnswers.has(event.id)) { answers.push(answer); seenAnswers.add(event.id); }
    } else if (event.type === "session") {
      const session = parseSession(event);
      if (!session) continue;
      const previous = latestSessions.get(session.sessionId);
      if (!previous || compareEvent(previous.event, event) < 0) latestSessions.set(session.sessionId, { event, session });
    }
  }
  return { answers, sessions: [...latestSessions.values()].map(row => row.session) };
}

export type WortwerkDerivationOptions = {
  now: Date; timeZone: string; capabilities?: readonly LearningCapability[];
};
export function deriveWortwerkState(snapshot: WortwerkSnapshot, { now, timeZone, capabilities = EMPTY_CAPABILITIES }: WortwerkDerivationOptions) {
  const evidence = parseWortwerkEvidence(snapshot.events, now);
  const answers = orderedAnswers(evidence.answers, now);
  const sessions = orderedSessions(evidence.sessions, now);
  const zone = resolveWortwerkTimeZone(timeZone);
  const progress = deriveProgress(capabilities, answers, now);
  return {
    snapshot, answers, sessions, progress, summary: summarizeProgress(progress),
    habit: deriveHabit(sessions, now, zone), rewards: deriveRewards(answers, sessions, now),
    metrics: deriveLearningMetrics(answers, sessions, now),
  };
}

export type RecordAnswerOptions = {
  sessionId?: string; corrected?: boolean; latencyMs?: number; selfAssessed?: boolean;
  store?: WortwerkStore; now?: Date; timeZone?: string;
};
export function recordAnswer(task: GeneratedTask, result: GradeResult, options: RecordAnswerOptions = {}): SyncEvent {
  const store = options.store ?? wortwerkStore;
  const now = options.now ?? new Date();
  const timeZone = resolveWortwerkTimeZone(options.timeZone ?? wortwerkSettings(store.getSnapshot()).timeZone ?? wortwerkSettings(store.getSnapshot()).timezone, deviceTimeZone());
  if (!["correct", "almost", "incorrect"].includes(result.outcome) || typeof result.correct !== "boolean"
    || typeof result.hinted !== "boolean" || result.correct !== (result.outcome === "correct")) throw new Error("Invalid answer result");
  const selfAssessed = options.selfAssessed === true || result.assessment === "self" || task.solution.selfCheck === true
    || task.skill === "speaking" || task.skill === "writing";
  const payload = {
    packId: task.packId, itemId: task.itemId, dimension: task.dimension, templateId: task.templateId,
    skill: task.skill, format: task.format, correct: result.correct,
    hinted: result.hinted || result.outcome === "almost" || selfAssessed,
    studyDate: studyDate(now, timeZone), calendarDate: calendarDate(now, timeZone),
    ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
    ...(options.corrected !== undefined ? { corrected: options.corrected } : {}),
    ...(options.latencyMs !== undefined ? { latencyMs: options.latencyMs } : {}),
    ...(selfAssessed ? { selfAssessed: true } : {}),
  };
  const candidate: SyncEvent = { id: "validation", store: "wortwerk", deviceId: "validation", createdAt: now.toISOString(), schemaVersion: 1, type: "answer", payload };
  if (!parseAnswer(candidate)) throw new Error("Invalid answer evidence");
  return store.appendEvent("answer", payload);
}

export type AssignmentProgress = {
  answered: number; correct: number; bySkill: Record<string, { answered: number; correct: number }>; completed: boolean;
};
export function recordAssignmentProgress(assignmentId: string, progress: AssignmentProgress, { store = wortwerkStore }: { store?: WortwerkStore } = {}): SyncEvent {
  if (!nonempty(assignmentId) || !count(progress.answered) || !count(progress.correct) || progress.correct > progress.answered
    || typeof progress.completed !== "boolean" || !record(progress.bySkill)) throw new Error("Invalid assignment progress");
  let answered = 0;
  let correct = 0;
  for (const [skill, row] of Object.entries(progress.bySkill)) {
    if (!nonempty(skill) || !record(row) || !count(row.answered) || !count(row.correct) || row.correct > row.answered) throw new Error("Invalid assignment skill progress");
    answered += row.answered; correct += row.correct;
  }
  if (answered !== progress.answered || correct !== progress.correct) throw new Error("Assignment totals must match skill totals");
  return store.appendEvent("assignment.progress", { assignmentId, answered: progress.answered, correct: progress.correct, bySkill: progress.bySkill, completed: progress.completed });
}

export type RecordSessionInput = {
  sessionId: string; mode: LearningSession["mode"]; startedAt: string;
  answered: number; correct: number; completed: boolean;
  completedAt?: string; scopeKey?: string; difficultyId?: string;
};
export type RecordSessionOptions = { store?: WortwerkStore; now?: Date; timeZone?: string; assignmentId?: string };
export function recordSession(input: RecordSessionInput, options: RecordSessionOptions = {}): SyncEvent {
  const store = options.store ?? wortwerkStore;
  const now = options.now ?? new Date();
  const timeZone = resolveWortwerkTimeZone(options.timeZone ?? wortwerkSettings(store.getSnapshot()).timeZone ?? wortwerkSettings(store.getSnapshot()).timezone, deviceTimeZone());
  const completedAt = input.completedAt ?? now.toISOString();
  if (!timestamp(completedAt)) throw new Error("Invalid session evidence");
  const payload = { ...input, completedAt, studyDate: studyDate(new Date(completedAt), timeZone) };
  const candidate: SyncEvent = { id: "validation", store: "wortwerk", deviceId: "validation", createdAt: now.toISOString(), schemaVersion: 1, type: "session", payload };
  if (!parseSession(candidate)) throw new Error("Invalid session evidence");
  let assignment: AssignmentProgress | undefined;
  if (options.assignmentId !== undefined) {
    const answers = parseWortwerkEvidence(store.getSnapshot().events).answers.filter(answer => answer.sessionId === input.sessionId);
    const bySkill: AssignmentProgress["bySkill"] = Object.create(null) as AssignmentProgress["bySkill"];
    for (const answer of answers) {
      const skill = answer.skill ?? answer.dimension;
      const row = bySkill[skill] ?? { answered: 0, correct: 0 };
      row.answered++; row.correct += Number(answer.correct); bySkill[skill] = row;
    }
    if (!nonempty(options.assignmentId) || answers.length !== input.answered || answers.filter(answer => answer.correct).length !== input.correct) throw new Error("Assignment evidence must match this session's answers");
    assignment = { answered: input.answered, correct: input.correct, completed: input.completed, bySkill };
  }
  const event = store.appendEvent("session", payload);
  if (assignment && options.assignmentId) recordAssignmentProgress(options.assignmentId, assignment, { store });
  return event;
}
