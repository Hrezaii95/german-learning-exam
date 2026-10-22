import { describe, expect, it } from "vitest";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store";
import {
  deriveWortwerkState, deriveHabitSessions, parseWortwerkEvidence, recordAnswer, recordAssignmentProgress,
  recordSession, resolveWortwerkTimeZone,
} from "../../apps/web/lib/wortwerk/learning-state";
import type { GeneratedTask, GradeResult } from "../../packages/wortwerk/src/tasks.js";
import type { SyncEvent } from "../../apps/web/lib/wortwerk/sync-store";

const date = new Date("2026-10-22T10:00:00.000Z");
const result: GradeResult = { correct: true, outcome: "correct", hinted: false, normalizedAnswer: "answer" };
const task: GeneratedTask = {
  id: "task-1", templateId: "corners.meaning.recall", itemId: "word-1", packId: "fixture",
  skill: "vocabulary", mechanic: "corners", dimension: "meaning", format: "recall",
  testedDimensions: ["meaning"], revealFields: ["meaning"],
  question: { instruction: "Type the meaning", text: "Wort", options: [], input: "text", lang: "de", helperKeys: [] },
  solution: { accepted: ["word"] }, feedback: { answer: "word", summary: "Meaning" },
};
function makeStore(now = date) { return createWortwerkStore(undefined, { now: () => now, deviceId: "test" }); }
function raw(payload: unknown, overrides: Partial<SyncEvent> = {}): SyncEvent {
  return { id: "019a0b12-3456-7000-8000-000000000001", store: "wortwerk", deviceId: "remote",
    createdAt: date.toISOString(), schemaVersion: 1, type: "answer", payload, ...overrides };
}
const answerPayload = { packId: "fixture", itemId: "word-1", dimension: "meaning", templateId: "corners.meaning.recall",
  format: "recall", correct: true, hinted: false, studyDate: "2026-10-22", calendarDate: "2026-10-22", skill: "vocabulary" };

describe("Wortwerk event adapters", () => {
  it.each([
    ["UTC", "2026-10-22T02:59:00.000Z", "2026-10-22T03:01:00.000Z"],
    ["Europe/Berlin", "2026-03-29T00:59:00.000Z", "2026-03-29T01:01:00.000Z"],
    ["Europe/Berlin", "2026-10-25T01:59:00.000Z", "2026-10-25T02:01:00.000Z"],
    ["America/New_York", "2026-03-08T06:59:00.000Z", "2026-03-08T07:01:00.000Z"],
    ["America/New_York", "2026-11-01T07:59:00.000Z", "2026-11-01T08:01:00.000Z"],
  ])("keeps dated habit effort across the 03:00 cutoff in %s (%s)", (timeZone, beforeAt, afterAt) => {
    let now = new Date(beforeAt);
    const store = createWortwerkStore(undefined, { now: () => now, deviceId: "cutoff" });
    const startedAt = new Date(now.getTime() - 300000).toISOString();
    const input = { sessionId: "cross-cutoff", mode: "run" as const, startedAt, correct: 0, answered: 0, completed: false };
    for (let answered = 1; answered <= 5; answered++) recordSession({ ...input, answered, correct: answered }, { store, now, timeZone });
    const yesterday = parseWortwerkEvidence(store.getSnapshot().events).sessions[0]!.studyDate;
    now = new Date(afterAt);
    recordSession({ ...input, answered: 6, correct: 6 }, { store, now, timeZone });
    const derive = () => deriveWortwerkState(store.getSnapshot(), { now, timeZone });
    const first = derive();
    expect(first.habit.checkInDays.find(day => day.date === yesterday)).toMatchObject({ studied: true });
    expect(first.habit.checkInDays.find(day => day.today)).toMatchObject({ studied: false });
    expect(first.habit).toMatchObject({ streak: 1, goalRuns: 0 });
    const events = store.getSnapshot().events;
    expect(deriveHabitSessions([...events].reverse().concat(events), now)).toEqual(deriveHabitSessions(events, now));
    recordSession({ ...input, answered: 6, correct: 6, completed: true }, { store, now, timeZone });
    expect(derive().habit).toMatchObject({ streak: 1, goalRuns: 1 });
    expect(derive().habit.checkInDays.find(day => day.today)?.studied).toBe(false);
    for (let answered = 7; answered <= 10; answered++) recordSession({ ...input, answered, correct: answered }, { store, now, timeZone });
    expect(derive().habit.checkInDays.find(day => day.today)?.studied).toBe(true);
    expect(derive().habit.streak).toBe(2);
  });
  it("takes event identity and time from the envelope and ignores unrelated events", () => {
    const event = raw({ ...answerPayload, eventId: "spoof", createdAt: "1900-01-01", extra: "ignored" });
    const evidence = parseWortwerkEvidence([event, event, raw({}, { type: "unknown" }), raw(answerPayload, { schemaVersion: 2 })]);
    expect(evidence.answers).toHaveLength(1);
    expect(evidence.answers[0]?.eventId).toBe(event.id);
    expect(evidence.answers[0]?.createdAt).toBe(date.toISOString());
    expect(evidence.answers[0]).not.toHaveProperty("extra");
    expect(evidence.sessions).toEqual([]);
  });

  it("rejects malformed known fields, impossible calendar dates and invalid envelopes", () => {
    const badPayloads = [null, { ...answerPayload, packId: "" }, { ...answerPayload, hinted: "yes" },
      { ...answerPayload, format: "magic" }, { ...answerPayload, studyDate: "2026-02-30" },
      { ...answerPayload, calendarDate: "2026-10-25" }, { ...answerPayload, studyDate: "2030-01-01", calendarDate: "2030-01-01" }, { ...answerPayload, latencyMs: -1 },
      { ...answerPayload, sessionId: 22 }, { ...answerPayload, corrected: "yes" }];
    for (const payload of badPayloads) expect(parseWortwerkEvidence([raw(payload)]).answers).toEqual([]);
    const malformed = [null, raw(answerPayload, { createdAt: "invalid" }), raw(answerPayload, { store: "other" })] as unknown as SyncEvent[];
    expect(parseWortwerkEvidence(malformed).answers).toEqual([]);
  });

  it("marks synced self assessment as hinted even if its claimed hint flag is false", () => {
    for (const extra of [{ selfAssessed: true }, { selfAssessed: true, skill: "speaking" }, { selfAssessed: true, skill: "writing" }]) {
      expect(parseWortwerkEvidence([raw({ ...answerPayload, ...extra })]).answers[0]?.hinted).toBe(true);
    }
  });

  it("records local calendar date separately from the 03:00 grace study date across DST", () => {
    const now = new Date("2026-10-25T00:30:00.000Z"); // Berlin 02:30 before its DST clock change
    const store = makeStore(now);
    const event = recordAnswer(task, result, { store, now, timeZone: "Europe/Berlin", sessionId: "session", latencyMs: 1200 });
    expect(event.payload).toMatchObject({ calendarDate: "2026-10-25", studyDate: "2026-10-24", sessionId: "session", latencyMs: 1200 });
    expect(parseWortwerkEvidence(store.getSnapshot().events).answers[0]?.eventId).toBe(event.id);
  });

  it("keeps self checks and almost answers out of objective recall evidence", () => {
    const store = makeStore();
    recordAnswer(task, { ...result, assessment: "self" }, { store, now: date });
    recordAnswer(task, { ...result, correct: false, outcome: "almost", hinted: false }, { store, now: date });
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.answers.every(answer => answer.hinted)).toBe(true);
    expect(() => recordAnswer(task, { ...result, correct: false }, { store, now: date })).toThrow(/result/);
  });

  it("coalesces session starts and finishes using the latest raw event in stable order", () => {
    const store = makeStore();
    const input = { sessionId: "session", mode: "run" as const, startedAt: date.toISOString(), answered: 0, correct: 0, completed: false };
    const start = recordSession(input, { store, now: date });
    const finish = recordSession({ ...input, answered: 5, correct: 4, completed: true }, { store, now: date });
    const evidence = parseWortwerkEvidence([finish, start]);
    expect(evidence.sessions).toHaveLength(1);
    expect(evidence.sessions[0]).toMatchObject({ completed: true, answered: 5, correct: 4 });
    expect(() => recordSession({ ...input, answered: 1, correct: 2 }, { store, now: date })).toThrow(/session/);
    expect(() => recordSession({ ...input, startedAt: "2026-10-23T10:00:00.000Z" }, { store, now: date })).toThrow(/session/);
  });

  it("derives habit, XP and capability segments from raw sync evidence", () => {
    const store = makeStore();
    for (let index = 0; index < 5; index++) recordAnswer(task, result, { store, now: date, sessionId: "quick" });
    recordSession({ sessionId: "quick", mode: "quick", startedAt: date.toISOString(), answered: 5, correct: 5, completed: true }, { store, now: date, timeZone: "UTC" });
    const state = deriveWortwerkState(store.getSnapshot(), { now: date, timeZone: "UTC", capabilities: [{ packId: "fixture", itemId: "word-1", dimensions: ["meaning", "plural"], templates: [] }] });
    expect(state.habit.streak).toBe(1);
    expect(state.habit.goalComplete).toBe(false);
    expect(state.rewards.xp).toBeGreaterThan(0);
    expect(state.summary.segments).toBe(2);
    expect(state.progress[0]?.segments.meaning?.recallDates).toEqual(["2026-10-22"]);
    expect(state.summary.secured).toBe(0);
    const future = deriveWortwerkState(store.getSnapshot(), { now: new Date("2026-10-21T10:00:00.000Z"), timeZone: "UTC" });
    expect(future.answers).toEqual([]);
    expect(future.sessions).toEqual([]);
  });

  it("ignores future session updates without hiding the earlier valid session state", () => {
    const store = makeStore();
    const input = { sessionId: "session", mode: "run" as const, startedAt: date.toISOString(), answered: 0, correct: 0, completed: false };
    const start = recordSession(input, { store, now: date });
    const futureTime = "2026-10-23T10:00:00.000Z";
    const finish = raw({ ...input, completedAt: futureTime, studyDate: "2026-10-23", answered: 5, correct: 5, completed: true },
      { id: "019a0b12-3456-7000-8000-000000000099", type: "session", createdAt: futureTime });
    store.applyRemoteEvents([finish]);
    const state = deriveWortwerkState(store.getSnapshot(), { now: date, timeZone: "UTC" });
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.completed).toBe(false);
    expect(state.snapshot.events).toHaveLength(2);
    expect(start.type).toBe("session");
  });

  it("emits assignment progress from session answers with the shared contract", () => {
    const store = makeStore();
    recordAnswer(task, result, { store, now: date, sessionId: "assignment-session" });
    recordAnswer({ ...task, skill: "listening", dimension: "listening" }, { ...result, outcome: "incorrect", correct: false }, { store, now: date, sessionId: "assignment-session" });
    recordSession({ sessionId: "assignment-session", mode: "run", startedAt: date.toISOString(), answered: 2, correct: 1, completed: true }, { store, now: date, assignmentId: "assignment-1" });
    const progress = store.getSnapshot().events.find(event => event.type === "assignment.progress");
    expect(progress?.payload).toEqual({ assignmentId: "assignment-1", answered: 2, correct: 1, completed: true,
      bySkill: { vocabulary: { answered: 1, correct: 1 }, listening: { answered: 1, correct: 0 } } });
    const count = store.getSnapshot().events.length;
    expect(() => recordSession({ sessionId: "assignment-session", mode: "run", startedAt: date.toISOString(), answered: 9, correct: 1, completed: true }, { store, now: date, assignmentId: "assignment-1" })).toThrow(/evidence/);
    expect(store.getSnapshot().events).toHaveLength(count);
  });

  it("validates assignment totals and tolerates invalid synced timezone settings", () => {
    const store = makeStore();
    expect(() => recordAssignmentProgress("a", { answered: 2, correct: 1, completed: false, bySkill: { vocabulary: { answered: 1, correct: 1 } } }, { store })).toThrow(/totals/);
    store.setDoc("settings", { timeZone: "not-a-zone" });
    expect(() => recordAnswer(task, result, { store, now: date })).not.toThrow();
    expect(resolveWortwerkTimeZone("not-a-zone", "invalid-fallback")).toBe("UTC");
    expect(resolveWortwerkTimeZone("America/New_York")).toBe("America/New_York");
  });
});
