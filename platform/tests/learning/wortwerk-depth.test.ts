import { describe, expect, it } from "vitest";
import type { ContentPack, DifficultyProfile, PackLexeme } from "../../packages/content/src/types/packs.js";
import type { DimensionProgress, ItemProgress, LearningAnswer, LearningCapability, LearningSession } from "../../packages/learning/src/wortwerk/types.js";
import { advanceChallenge, answerChallenge, boundedRunBonus, challengeRemainingSeconds, createChallenge, derivePersonalBest, puzzleShareGrid, selectDailyPuzzle } from "../../packages/learning/src/wortwerk/challenges.js";
import { createDailyReminderIcs, deriveBadges, deriveCollection, deriveQuests, deriveReadiness, deriveSkillStrength, deriveUnitProgress, deriveWeeklyRecap } from "../../packages/learning/src/wortwerk/engagement-depth.js";
const now = new Date("2026-10-22T12:00:00Z");
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "fixture", optionsCount: 4, timerSeconds: 60, audioSpeedRange: [0.7, 1], hintsAllowed: true, maxPassageLength: 200, distractorCloseness: 1, typedAnswerRatio: 0.5 };
const word: PackLexeme = { type: "lexeme", id: "w", lemma: "Fixture", pos: "noun", meaning: "Fixture meaning", unitId: "u1", source: "course", tags: [], bookRef: { book: "fixture", lesson: 1 }, frequencyRank: 100 };
const pack: ContentPack = { schemaVersion: 1, id: "pack", language: "xx", cefr: "B2", title: "Fixture", units: [{ id: "u1", title: "One", canDo: ["A source can-do"] }, { id: "u2", title: "Two", canDo: [] }], maps: [], difficulty: "fixture", review: { status: "pending-german-review" }, items: [word, { ...word, id: "w2", unitId: "u2", frequencyRank: 30000 }, { ...word, type: "examTask", id: "exam", section: "reading", timing: 30, itemRefs: ["w", "w2"] }] };
function segment(overrides: Partial<DimensionProgress> = {}): DimensionProgress { return { dimension: "meaning", state: "secured", format: "recall", attempts: 2, correct: 2, lapses: 0, strength: 0.8, due: false, dueAt: null, lastSeen: null, securedAt: "2026-10-01T12:00:00Z", recallDates: ["2026-09-30", "2026-10-01"], gold: false, ...overrides }; }
const progress: ItemProgress[] = [{ packId: "pack", itemId: "w", segments: { meaning: segment() }, complete: true, gold: false }, { packId: "pack", itemId: "w2", segments: { meaning: segment({ state: "new", strength: 0, attempts: 0, securedAt: null }) }, complete: false, gold: false }];
function answer(overrides: Partial<LearningAnswer> = {}): LearningAnswer { return { eventId: "event", packId: "pack", itemId: "w", dimension: "meaning", templateId: "corners.meaning.recall", format: "recall", correct: true, hinted: false, createdAt: now.toISOString(), studyDate: "2026-10-22", skill: "vocabulary", ...overrides }; }
function session(overrides: Partial<LearningSession> = {}): LearningSession { return { sessionId: "session", mode: "run", startedAt: "2026-10-22T11:55:00Z", completedAt: now.toISOString(), answered: 20, correct: 18, completed: true, studyDate: "2026-10-22", scopeKey: "pack:all", difficultyId: "fixture", ...overrides }; }

describe("Wortwerk engagement depth", () => {
  it("uses permanent secured evidence for journey gates and current strength for meters", () => {
    const units = deriveUnitProgress(pack, progress);
    expect(units[0]).toMatchObject({ secured: 1, complete: true, bossUnlocked: true, strength: 0.8, unlocked: true, canDo: ["A source can-do"] });
    expect(units[1]).toMatchObject({ complete: false, unlocked: true, bossUnlocked: false });
    const lapse = [{ ...progress[0]!, segments: { meaning: segment({ strength: 0, due: true, lapses: 1 }) } }];
    expect(deriveUnitProgress(pack, lapse)[0]).toMatchObject({ complete: true, strength: 0, bossUnlocked: true });
  });
  it("does not promote a unit by dropping missing item evidence", () => {
    const extra = { ...pack, items: [...pack.items, { ...word, id: "missing" }] };
    expect(deriveUnitProgress(extra, progress)[0]).toMatchObject({ items: 2, securedRatio: 0.5, complete: false, bossUnlocked: false });
  });
  it("deduplicates format variants when deriving skill levels", () => {
    const capabilities: LearningCapability[] = [{ packId: "pack", itemId: "w", dimensions: ["meaning"], templates: [
      { id: "one", dimension: "meaning", skill: "vocabulary", format: "recognition" },
      { id: "two", dimension: "meaning", skill: "vocabulary", format: "recall" },
    ] }];
    expect(deriveSkillStrength(capabilities, progress)).toEqual([{ skill: "vocabulary", items: 1, segments: 1, secured: 1, strength: 0.8, level: 1 }]);
  });
  it("readiness includes missing evidence as zero and marks production as self-check", () => {
    expect(deriveReadiness(pack, [progress[0]!])[0]).toMatchObject({ section: "reading", items: 2, observedItems: 1, strength: 0.4, securedRatio: 0.5, selfCheck: false });
    const production = { ...pack, items: [...pack.items, { ...word, type: "writingPrompt" as const, id: "writing", prompt: "Fixture prompt" }, { ...word, type: "examTask" as const, id: "writing-exam", section: "writing", timing: 40, itemRefs: ["writing"] }] };
    expect(deriveReadiness(production, progress).find(section => section.section === "writing")?.selfCheck).toBe(true);
  });
  it("collects only successful unhinted evidence and derives rarity from frequency plus difficulty", () => {
    const cards = deriveCollection(pack, [answer(), answer({ eventId: "hinted", itemId: "w2", hinted: true })], progress, difficulty, now);
    expect(cards.map(card => [card.item.id, card.collected, card.rarity])).toEqual([["w", true, "common"], ["w2", false, "legendary"]]);
    expect(cards[0]).toMatchObject({ complete: true, gold: false });
  });
  it("derives authored badges and titles from evidence without hardcoded names", () => {
    const authored: ContentPack = { ...pack, badges: [
      { id: "one", title: "Fixture badge", titleAward: "Fixture title", requirement: { type: "secured", count: 1, dimension: "meaning", filters: [{ field: "unitId", value: "u1" }] } },
      { id: "practice", title: "Fixture practice", requirement: { type: "practice", count: 2, outcome: "unhinted-recall", skill: "vocabulary" } },
      { id: "habit", title: "Fixture habit", requirement: { type: "streak", days: 7 } },
    ] };
    const badges = deriveBadges(authored, [answer(), answer({ eventId: "hinted", hinted: true })], progress, { now, streak: 7 });
    expect(badges.map(badge => [badge.badge.title, badge.current, badge.earned, badge.titleAward])).toEqual([
      ["Fixture badge", 1, true, "Fixture title"], ["Fixture practice", 1, false, undefined], ["Fixture habit", 7, true, undefined],
    ]);
  });
  it("recap uses seven local calendar days and reuses private learning metrics", () => {
    const rows = [answer({ eventId: "old", createdAt: "2026-10-15T21:59:00Z", studyDate: "2026-10-15" }), answer({ eventId: "start", createdAt: "2026-10-15T22:01:00Z", studyDate: "2026-10-15", skill: "listening" }), answer({ eventId: "today", skill: "writing", templateId: "write.prompt", hinted: true, selfAssessed: true })];
    const recap = deriveWeeklyRecap(rows, [session()], now, "Europe/Berlin");
    expect(recap).toMatchObject({ startDate: "2026-10-16", endDate: "2026-10-22", answered: 2, correct: 2, activeDays: 2, completedRuns: 1, listeningTasks: 1, writingSubmissions: 1 });
    expect(recap.xp).toBe(11);
    expect(recap.learningMetrics.runCompletion).toBe(1);
  });
  it("daily quests are finite, do not count hints as recall, and separate Quick review from goal", () => {
    const rows = [answer({ corrected: true }), answer({ eventId: "hint", hinted: true })];
    const quests = deriveQuests(rows, [session({ mode: "quick", answered: 5, correct: 5 })], now, "Europe/Berlin");
    expect(quests.map(quest => [quest.id, quest.progress, quest.complete])).toEqual([["daily-run", 0, false], ["recall", 1, false], ["repair", 1, true]]);
  });
  it("keeps abandoned and skipped Runs out of completed recap counts and the full-Run quest", () => {
    const unfinished = session({ answered: 7, correct: 6, completed: false });
    expect(deriveWeeklyRecap([], [unfinished], now, "UTC").completedRuns).toBe(0);
    expect(deriveQuests([], [unfinished], now, "UTC")[0]).toMatchObject({ progress: 0, complete: false });
    const finished = { ...unfinished, completed: true };
    expect(deriveWeeklyRecap([], [finished], now, "UTC").completedRuns).toBe(1);
    expect(deriveQuests([], [finished], now, "UTC")[0]).toMatchObject({ progress: 1, complete: true });
  });
});

describe("Wortwerk finite challenges", () => {
  it("selects exactly six items deterministically across input order and duplicate ids", () => {
    const ids = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const selected = selectDailyPuzzle("pack", ids, "2026-10-22");
    expect(selected).toHaveLength(6);
    expect(selectDailyPuzzle("pack", [...ids].reverse().concat(ids), "2026-10-22")).toEqual(selected);
    expect(selectDailyPuzzle("pack", ids, "2026-10-23")).not.toEqual(selected);
    expect(selectDailyPuzzle("pack", ids.slice(0, 5), "2026-10-22")).toEqual([]);
    expect(puzzleShareGrid(["correct", "incorrect", "almost"])).toBe("🟩🟥🟦⬜⬜⬜");
  });
  it("Blitz expires at sixty elapsed seconds even when the tab receives no ticks", () => {
    const state = createChallenge({ mode: "blitz", now });
    expect(challengeRemainingSeconds(state, now)).toBe(60);
    const later = new Date(now.getTime() + 61000);
    const expired = answerChallenge(state, { eventId: "late", correct: true }, later);
    expect(expired).toMatchObject({ status: "finished", endReason: "time", answered: 0 });
    expect(challengeRemainingSeconds(state, later)).toBe(0);
    const observed = advanceChallenge(state, new Date(now.getTime() + 30000));
    expect(challengeRemainingSeconds(observed, new Date(now.getTime() + 10000))).toBe(30);
  });
  it("only Boss and Blitz have three strikes, duplicate answer ids are idempotent", () => {
    let state = createChallenge({ mode: "boss", now, total: 5 });
    state = answerChallenge(state, { eventId: "one", correct: false }, now);
    state = answerChallenge(state, { eventId: "one", correct: false }, now);
    expect(state.strikes).toBe(1);
    state = answerChallenge(state, { eventId: "two", correct: false }, now);
    state = answerChallenge(state, { eventId: "three", correct: false }, now);
    expect(state).toMatchObject({ status: "finished", endReason: "strikes", answered: 3, strikes: 3 });
    expect(answerChallenge(state, { eventId: "four", correct: true }, now).answered).toBe(3);
    expect(() => createChallenge({ mode: "run" as "boss", now, total: 5 })).toThrow();
    expect(() => createChallenge({ mode: "boss", now })).toThrow();
  });
  it("Boss can finish its finite queue without a timer", () => {
    let state = createChallenge({ mode: "boss", now, total: 1 });
    expect(challengeRemainingSeconds(state, now)).toBeNull();
    state = answerChallenge(state, { eventId: "one", correct: true }, now);
    expect(state).toMatchObject({ status: "finished", endReason: "complete", correct: 1 });
  });
  it("ghosts compare only completed sessions with the same mode, scope and difficulty", () => {
    const sessions = [session({ sessionId: "good", mode: "blitz", correct: 12 }), session({ sessionId: "other-scope", mode: "blitz", scopeKey: "other", correct: 20 }), session({ sessionId: "other-difficulty", mode: "blitz", difficultyId: "other", correct: 20 }), session({ sessionId: "partial", mode: "blitz", completed: false, correct: 20 })];
    expect(derivePersonalBest(sessions, { mode: "blitz", scopeKey: "pack:all", difficultyId: "fixture", now })).toMatchObject({ score: 12, sessionId: "good" });
    expect(derivePersonalBest(sessions, { mode: "boss", scopeKey: "pack:all", difficultyId: "fixture", now })).toBeNull();
  });
  it("surprise bonuses are deterministic, optional, frequency-bounded and size-capped", () => {
    const rows = Array.from({ length: 1000 }, (_, index) => boundedRunBonus(`session-${index}`));
    const eligible = rows.filter(row => row.eligible);
    expect(eligible.length).toBeGreaterThan(150);
    expect(eligible.length).toBeLessThan(250);
    expect(eligible.every(row => row.extraTasks === 3 && row.xpCap === 30)).toBe(true);
    expect(boundedRunBonus("session-1")).toEqual(boundedRunBonus("session-1"));
  });
});

describe("Wortwerk local-time calendar reminders", () => {
  it.each(["Europe/Berlin", "America/New_York", "Asia/Kolkata"])("emits valid timezone-aware recurring ICS for %s", timeZone => {
    const calendar = createDailyReminderIcs({ timeZone, time: "19:30", startDate: "2026-10-22", url: "https://example.test/play/?a=1&b=2", now });
    expect(calendar).toContain(`DTSTART;TZID=${timeZone}:20261022T193000\r\n`);
    expect(calendar).toContain("RRULE:FREQ=DAILY;COUNT=366\r\n");
    expect(calendar).toContain(`BEGIN:VTIMEZONE\r\nTZID:${timeZone}\r\n`);
    expect(calendar).toContain("BEGIN:VEVENT\r\nUID:");
    expect(calendar).toContain("BEGIN:VALARM\r\nTRIGGER:PT0S\r\nACTION:DISPLAY");
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(calendar.replace(/\r\n/gu, "")).not.toContain("\n");
    expect(calendar.split("\r\n").every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
    if (timeZone !== "Asia/Kolkata") expect(calendar).toContain("BEGIN:DAYLIGHT");
    if (timeZone === "Asia/Kolkata") expect(calendar).toContain("TZOFFSETTO:+0530");
  });
  it("contains the real DST transition wall-clock times in Berlin and New York", () => {
    const berlin = createDailyReminderIcs({ timeZone: "Europe/Berlin", time: "19:30", startDate: "2026-01-01", url: "https://example.test/play/", now });
    expect(berlin).toContain("20260329T020000");
    expect(berlin).toContain("20261025T030000");
    const ny = createDailyReminderIcs({ timeZone: "America/New_York", time: "19:30", startDate: "2026-01-01", url: "https://example.test/play/", now });
    expect(ny).toContain("20260308T020000");
    expect(ny).toContain("20261101T020000");
  });
  it("rejects malformed date, time, timezone, URL and UID injection", () => {
    const options = { timeZone: "Europe/Berlin", time: "19:30", startDate: "2026-10-22", url: "https://example.test/play/", now };
    for (const extra of [{ startDate: "2026-02-30" }, { time: "25:00" }, { timeZone: "Invalid/Zone" }, { timeZone: "UTC\r\nBEGIN:VEVENT" }, { url: "javascript:alert(1)" }, { uid: "x\r\nBEGIN:VEVENT" }]) expect(() => createDailyReminderIcs({ ...options, ...extra })).toThrow();
  });
});
