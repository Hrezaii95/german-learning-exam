import { describe, expect, it } from "vitest";
import { calendarDate, calendarDaysBetween, shiftCalendarDate, studyDate } from "../../packages/learning/src/wortwerk/dates.js";
import { answerXp, deriveHabit, deriveLearningMetrics, deriveRewards, deriveRunResults } from "../../packages/learning/src/wortwerk/engagement.js";
import type { LearningAnswer, LearningSession } from "../../packages/learning/src/wortwerk/types.js";

function session(day: number, patch: Partial<LearningSession> = {}): LearningSession {
  const date = new Date(Date.UTC(2026, 8, day, 12)).toISOString();
  return { sessionId: `session-${day}`, mode: "quick", startedAt: date, completedAt: date, answered: 5, correct: 4,
    completed: true, studyDate: date.slice(0, 10), ...patch };
}
const instant = (day: number): Date => new Date(Date.UTC(2026, 8, day, 12));
function answer(day: number, patch: Partial<LearningAnswer> = {}): LearningAnswer {
  const date = instant(day).toISOString();
  return { eventId: `answer-${day}`, packId: "fixture", itemId: "item", dimension: "meaning", templateId: "meaning.recall",
    format: "recall", correct: true, hinted: false, createdAt: date, studyDate: date.slice(0, 10), ...patch };
}

describe("Wortwerk local-day habits", () => {
  it("keeps the streak with Quick review without filling the full Run goal", () => {
    const habit = deriveHabit([session(1)], instant(1), "UTC");
    expect(habit).toMatchObject({ streak: 1, goalRuns: 0, goalComplete: false, doneForToday: false });
    expect(deriveHabit([session(1, { mode: "run" })], instant(1), "UTC")).toMatchObject({ goalRuns: 1, doneForToday: true });
    expect(deriveHabit([session(1, { answered: 4, correct: 4 })], instant(1), "UTC").streak).toBe(0);
    expect(deriveHabit([session(1, { completed: false })], instant(1), "UTC").streak).toBe(1);
    for(const mode of ["blitz","boss","free"] as const)expect(deriveHabit([session(1, { mode })], instant(1), "UTC").streak).toBe(0);
    expect(deriveHabit([session(1, { mode:"run", completed:false, answered:7 })], instant(1), "UTC")).toMatchObject({streak:1,goalRuns:0,goalComplete:false,doneForToday:false});
  });

  it("rebuilds cumulative session evidence without counting snapshots as separate Runs", () => {
    const started=session(1,{mode:"run",answered:0,correct:0,completed:false});
    const five={...started,completedAt:"2026-09-01T12:01:00.000Z",answered:5,correct:4};
    const finished={...five,completedAt:"2026-09-01T12:02:00.000Z",answered:8,correct:7,completed:true};
    const now=new Date("2026-09-01T12:03:00.000Z");
    expect(deriveHabit([five,started],now,"UTC")).toMatchObject({streak:1,goalRuns:0});
    expect(deriveHabit([finished,started,five,finished],now,"UTC")).toMatchObject({streak:1,goalRuns:1});
  });

  it("uses a 03:00 grace and calendar arithmetic through Berlin DST", () => {
    expect(studyDate(new Date("2026-03-29T00:30:00Z"), "Europe/Berlin")).toBe("2026-03-28");
    expect(studyDate(new Date("2026-03-29T01:00:00Z"), "Europe/Berlin")).toBe("2026-03-29");
    expect(studyDate(new Date("2026-10-25T01:30:00Z"), "Europe/Berlin")).toBe("2026-10-24");
    expect(studyDate(new Date("2026-10-25T02:00:00Z"), "Europe/Berlin")).toBe("2026-10-25");
    expect(calendarDate(new Date("2026-03-29T00:30:00Z"), "Europe/Berlin")).toBe("2026-03-29");
  });

  it("uses the same grace through New York spring and autumn clocks", () => {
    expect(studyDate(new Date("2026-03-08T06:59:00Z"), "America/New_York")).toBe("2026-03-07");
    expect(studyDate(new Date("2026-03-08T07:00:00Z"), "America/New_York")).toBe("2026-03-08");
    expect(studyDate(new Date("2026-11-01T06:30:00Z"), "America/New_York")).toBe("2026-10-31");
    expect(studyDate(new Date("2026-11-01T08:00:00Z"), "America/New_York")).toBe("2026-11-01");
    expect(shiftCalendarDate("2026-03-08", -1)).toBe("2026-03-07");
    expect(calendarDaysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("does not expire yesterday's streak while today's study day is still open", () => {
    expect(deriveHabit([session(1)], instant(2), "UTC").streak).toBe(1);
    expect(deriveHabit([session(1)], instant(3), "UTC").streak).toBe(0);
  });

  it("earns one freeze each seven meaningful days, holds at most two and spends on closed gaps", () => {
    const sessions = Array.from({ length: 21 }, (_, index) => session(index + 1));
    expect(deriveHabit(sessions, instant(21), "UTC").freezes).toBe(2);
    expect(deriveHabit(sessions, instant(23), "UTC")).toMatchObject({ streak: 22, freezes: 1 });
    const continued = deriveHabit([...sessions, session(23)], instant(23), "UTC");
    expect(continued.streak).toBe(23);
    expect(continued.checkInDays.find(d => d.date === "2026-09-22")?.frozen).toBe(true);
    expect(deriveHabit(sessions, instant(25), "UTC")).toMatchObject({ streak: 0, freezes: 0, longestStreak: 23 });
  });

  it("does not earn multiple freezes from repeat sessions on one day and ignores sync duplicates", () => {
    const repeats = Array.from({ length: 20 }, (_, index) => session(1, { sessionId: `repeat-${index}` }));
    expect(deriveHabit([...repeats, ...repeats], instant(1), "UTC")).toMatchObject({ streak: 1, freezes: 0 });
  });
});

describe("Wortwerk rewards and private learning measures", () => {
  it("uses specified evidence rewards, combos and diminishing XP after three full Runs", () => {
    const correct = { correct: true, hinted: false };
    expect(answerXp(correct)).toBe(10);
    expect(answerXp({ ...correct, hinted: true })).toBe(5);
    expect(answerXp({ ...correct, corrected: true })).toBe(5);
    expect(answerXp({ ...correct, kind: "listening" })).toBe(3);
    expect(answerXp({ ...correct, kind: "speaking" })).toBe(3);
    expect(answerXp({ ...correct, kind: "writing" })).toBe(8);
    expect(answerXp({ ...correct, kind: "boss" })).toBe(30);
    expect(answerXp({ ...correct, combo: 5 })).toBe(20);
    expect(answerXp({ ...correct, combo: 10 })).toBe(30);
    expect(answerXp({ ...correct, completedRunsToday: 2 })).toBe(10);
    expect(answerXp({ ...correct, completedRunsToday: 3 })).toBe(5);
    expect(answerXp({ ...correct, completedRunsToday: 4 })).toBe(2);
    expect(answerXp({ ...correct, correct: false })).toBe(0);
  });

  it("does not diminish XP for incomplete or short Runs that only maintain the streak", () => {
    const at=new Date("2026-09-01T15:00:00.000Z");
    const event=answer(1,{eventId:"after-incomplete",createdAt:"2026-09-01T14:00:00.000Z",sessionId:"current"});
    const incomplete=Array.from({length:4},(_,index)=>session(1,{sessionId:`incomplete-${index}`,mode:"run",answered:7,completed:false}));
    expect(deriveRewards([event],incomplete,at).xp).toBe(10);
    const short=incomplete.map(row=>({...row,completed:true,answered:4,correct:4}));
    expect(deriveRewards([event],short,at).xp).toBe(10);
    const complete=incomplete.slice(0,3).map(row=>({...row,completed:true}));
    expect(deriveRewards([event],complete,at).xp).toBe(5);
  });

  it("derives rewards from idempotent raw events and resets combos on misses", () => {
    const events = Array.from({ length: 10 }, (_, index) => answer(index + 1, { sessionId: "one" }));
    expect(deriveRewards([...events, ...events], [], instant(11))).toEqual({ xp: 170, bestCombo: 10 });
    expect(deriveRewards([...events, answer(11, { sessionId: "one", correct: false })], [], instant(11)).bestCombo).toBe(10);
  });

  it("leads run results with corrections and week-delayed recall", () => {
    const rows = [answer(8, { correct: false }), answer(9), answer(10, { itemId: "other" })];
    const results = deriveRunResults(rows, [answer(1), answer(1, { eventId: "other-first", itemId: "other" })]);
    expect(results).toMatchObject({ answered: 3, correct: 2, corrected: ["item"], rememberedFromLastWeek: 1 });
    expect(results.bySkill.meaning).toEqual({ answered: 3, correct: 2 });
  });

  it("reports sample sizes and null for learning measures that are not available yet", () => {
    expect(deriveLearningMetrics([], [], instant(20))).toEqual({ return7Day: null, runCompletion: null, delayedRecall: { tested: 0, correct: 0, accuracy: null } });
    const metrics = deriveLearningMetrics([answer(1), answer(8), answer(16, { correct: false })],
      [session(1, { mode: "run" }), session(2, { mode: "run", completed: false })], instant(20));
    expect(metrics).toEqual({ return7Day: true, runCompletion: 0.5, delayedRecall: { tested: 2, correct: 1, accuracy: 0.5 } });
    expect(deriveLearningMetrics([answer(1)], [], instant(20)).return7Day).toBe(false);
    expect(deriveLearningMetrics([answer(1), answer(8, { hinted: true })], [], instant(20)).delayedRecall.tested).toBe(0);
  });
});
