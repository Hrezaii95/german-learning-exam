import { describe, expect, it } from "vitest";
import { boundedRunBonus } from "../../packages/learning/src/wortwerk/challenges.js";
import { deriveRewards } from "../../packages/learning/src/wortwerk/engagement.js";
import type { LearningAnswer, LearningSession } from "../../packages/learning/src/wortwerk/types.js";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import { parseWortwerkEvidence, recordSession } from "../../apps/web/lib/wortwerk/learning-state.js";
const now = new Date("2026-10-22T13:00:00.000Z");
function session(id: string, patch: Partial<LearningSession> = {}): LearningSession {
  return { sessionId: id, mode: "run", startedAt: "2026-10-22T12:00:00.000Z", completedAt: "2026-10-22T12:01:00.000Z",
    answered: 8, correct: 8, completed: true, studyDate: "2026-10-22", scopeKey: "pack:scope", difficultyId: "fixture", ...patch };
}
function answer(id: string, patch: Partial<LearningAnswer> = {}): LearningAnswer {
  return { eventId: id, packId: "pack", itemId: id, dimension: "meaning", templateId: "corners.meaning", format: "recognition",
    correct: true, hinted: false, createdAt: "2026-10-22T12:02:30.000Z", studyDate: "2026-10-22", ...patch };
}
const eligibleId = Array.from({ length: 100 }, (_, i) => `run-${i}`).find(id => boundedRunBonus(id).eligible)!;
const ineligibleId = Array.from({ length: 100 }, (_, i) => `run-${i}`).find(id => !boundedRunBonus(id).eligible)!;
function child(id: string, bonusOf = eligibleId): LearningSession {
  return session(id, { mode: "free", bonusOf, startedAt: "2026-10-22T12:02:00.000Z", completedAt: "2026-10-22T12:03:00.000Z", answered: 3, correct: 3 });
}
function withoutBonus(sessions: LearningSession[]): LearningSession[] { return sessions.map(({ bonusOf: _bonusOf, ...rest }) => rest); }
function extra(rows: LearningAnswer[], sessions: LearningSession[]): number {
  return deriveRewards(rows, sessions, now).xp - deriveRewards(rows, withoutBonus(sessions), now).xp;
}
describe("finite challenge rewards replay from raw evidence", () => {
  it("adds the Boss completion reward once, independently of its normal answers", () => {
    const partial = session("boss", { mode: "boss", completed: false, answered: 1, correct: 1 });
    const completed = { ...partial, completed: true, answered: 3, correct: 2, completedAt: "2026-10-22T12:02:00.000Z" };
    const rows = [answer("a", { sessionId: "boss" })];
    expect(deriveRewards(rows, [partial], now).xp).toBe(10);
    expect(deriveRewards(rows, [completed, partial, completed], now).xp).toBe(40);
    expect(deriveRewards(rows, [{ ...completed, completed: false }], now).xp).toBe(10);
    expect(deriveRewards([], [session("empty", { mode: "boss", answered: 0, correct: 0 })], now).xp).toBe(0);
    expect(deriveRewards([], [session("strikes", { mode: "boss", answered: 5, correct: 2 })], now).xp).toBe(0);
  });
  it("uses the actual detective template completion and keeps ordinary listening at three", () => {
    expect(deriveRewards([answer("a", { skill: "listening", templateId: "listen.dialogue" })], [], now).xp).toBe(30);
    expect(deriveRewards([answer("a", { skill: "listening", templateId: "listen.pick" })], [], now).xp).toBe(3);
    expect(deriveRewards([answer("a", { skill: "listening", templateId: "listen.dialogue", hinted: true })], [], now).xp).toBe(5);
  });
  it("doubles three earned answers, caps extra XP at thirty and never repeats a parent bonus", () => {
    const sessions = [session(eligibleId), child("bonus-one"), child("bonus-two")];
    const rows = ["bonus-one", "bonus-two"].flatMap(sessionId => Array.from({ length: 3 }, (_, index) => answer(`${sessionId}-${index}`, { sessionId })));
    expect(extra(rows, sessions)).toBe(30);
    expect(deriveRewards([...rows, ...rows], [...sessions, ...sessions], now)).toEqual(deriveRewards(rows, sessions, now));
    const detective = rows.slice(0, 3).map(row => ({ ...row, templateId: "listen.dialogue", skill: "listening" }));
    expect(extra(detective, sessions)).toBe(30);
  });
  it("counts misses and hints inside the three answers and does not extend the reward window", () => {
    const rows = [answer("a", { sessionId: "bonus-one", correct: false }), answer("b", { sessionId: "bonus-one", hinted: true }), answer("c", { sessionId: "bonus-one" }), answer("d", { sessionId: "bonus-one" })];
    expect(extra(rows, [session(eligibleId), child("bonus-one")])).toBe(15);
    expect(extra(rows, [session(eligibleId), child("bonus-one", ineligibleId)])).toBe(0);
    expect(extra(rows, [session(eligibleId, { completed: false }), child("bonus-one")])).toBe(0);
    expect(extra(rows, [session(eligibleId), { ...child("bonus-one"), scopeKey: "other-pack:scope" }])).toBe(0);
    expect(extra(rows, [session(eligibleId), { ...child("bonus-one"), difficultyId: "other" }])).toBe(0);
    expect(extra(rows, [session(eligibleId), { ...child("bonus-one"), startedAt: "2026-10-22T11:59:00.000Z" }])).toBe(0);
    expect(extra(rows.map(row => ({ ...row, createdAt: "2026-10-22T12:04:00.000Z" })), [session(eligibleId), child("bonus-one")])).toBe(0);
  });
  it("persists the bounded bonus relationship without adding a saved session mode", () => {
    const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined }, { now: () => now });
    recordSession(child("bonus"), { store, now });
    expect(parseWortwerkEvidence(store.getSnapshot().events, now).sessions[0]).toMatchObject({ mode: "free", bonusOf: eligibleId });
    for (const patch of [{ mode: "run" as const }, { bonusOf: "bonus" }, { answered: 4, correct: 4 }]) {
      expect(() => recordSession({ ...child("bonus"), ...patch }, { store, now })).toThrow("Invalid session evidence");
    }
  });
});
