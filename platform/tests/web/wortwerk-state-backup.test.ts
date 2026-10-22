import { describe, expect, it } from "vitest";
import { applyBackup, createCompleteBackup, type BackupStore } from "../../apps/web/lib/study/backup";
import { emptyStudy, STUDY_KEY } from "../../apps/web/lib/study/storage";
import { defaultStudyScope } from "../../apps/web/lib/study/scope";
import {
  applyWortwerkBackup, createWortwerkCompleteBackup, parseWortwerkBackup,
} from "../../apps/web/lib/wortwerk/backup";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store";

function memoryStore(): BackupStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  };
}
const options = { now: () => new Date("2026-10-22T12:00:00.000Z"), deviceId: "backup-device" };

describe("Wortwerk complete backup bridge", () => {
  it("round trips the existing complete backup together with raw answers, sessions and study docs", () => {
    const source = memoryStore();
    const game = createWortwerkStore(memoryStore(), options);
    const study = { ...emptyStudy(), bookmarks: ["coursebook-12"] };
    applyBackup(source, { study, scope: { ...defaultStudyScope(), mode: "one", lessons: [3] } });
    const answer = game.appendEvent("answer", { packId: "fixture", itemId: "one", dimension: "meaning", correct: true });
    const session = game.appendEvent("session", { sessionId: "s1", completed: true });
    game.setDoc("study.position", { book: "momente-a1", lesson: 3, page: 30 });
    game.setDoc("settings", { sounds: false });
    const full = createWortwerkCompleteBackup(source, game);
    const target = memoryStore();
    const targetGame = createWortwerkStore(memoryStore(), options);
    applyWortwerkBackup(target, parseWortwerkBackup(JSON.stringify(full)), targetGame);
    const restored = createCompleteBackup(target);
    expect(restored.study).toEqual(study);
    expect(restored.scope.lessons).toEqual([3]);
    expect(targetGame.getSnapshot().events).toEqual([answer, session]);
    expect(targetGame.getDoc("study.position")).toEqual({ book: "momente-a1", lesson: 3, page: 30 });
    expect(targetGame.getDoc("settings")).toEqual({ sounds: false });
  });

  it("accepts old complete, learner-only and study-only backups without removing game history", () => {
    const target = memoryStore();
    const game = createWortwerkStore(memoryStore(), options);
    const answer = game.appendEvent("answer", { correct: false });
    const old = createCompleteBackup(memoryStore());
    for (const legacy of [old, old.learner, { ...emptyStudy(), bookmarks: ["workbook-99"] }]) {
      applyWortwerkBackup(target, parseWortwerkBackup(JSON.stringify(legacy)), game);
      expect(game.getSnapshot().events).toEqual([answer]);
    }
    expect(createCompleteBackup(target).study.bookmarks).toEqual(["workbook-99"]);
  });

  it("rejects a bad game section or unsupported format before changing any legacy key", () => {
    const target = memoryStore();
    applyBackup(target, { study: { ...emptyStudy(), bookmarks: ["coursebook-10"] } });
    const before = [...target.values];
    const game = createWortwerkStore(memoryStore(), options);
    const full = createWortwerkCompleteBackup(memoryStore(), game);
    for (const wortwerk of [{ schemaVersion: 99 }, { schemaVersion: 2, events: [{ id: "broken" }], docs: [] }]) {
      expect(() => parseWortwerkBackup(JSON.stringify({ ...full, wortwerk }))).toThrow();
      expect(() => applyWortwerkBackup(target, { legacy: { study: emptyStudy() }, wortwerk: wortwerk as never }, game)).toThrow();
      expect([...target.values]).toEqual(before);
    }
    expect(() => parseWortwerkBackup(JSON.stringify({ ...full, version: 2 }))).toThrow(/Unsupported/);
    expect(() => parseWortwerkBackup('{"format":"german-learning-wortwerk","version":1}')).toThrow(/incomplete/);
  });

  it("rejects a malformed legacy section before importing valid game history", () => {
    const target = memoryStore();
    const game = createWortwerkStore(memoryStore(), options);
    const sourceGame = createWortwerkStore(memoryStore(), options);
    sourceGame.appendEvent("answer", { correct: true });
    expect(() => applyWortwerkBackup(target, {
      legacy: { study: { ...emptyStudy(), saved: { bad: { id: "wrong" } } } as never }, wortwerk: sourceGame.exportBackup(),
    }, game)).toThrow();
    expect(target.values.size).toBe(0);
    expect(game.getSnapshot().events).toHaveLength(0);
  });

  it("detects conflicting event IDs before legacy writes and preserves newer local answers", () => {
    const target = memoryStore();
    const game = createWortwerkStore(memoryStore(), options);
    const answer = game.appendEvent("answer", { correct: true });
    const oldBackup = game.exportBackup();
    const later = game.appendEvent("answer", { correct: false });
    applyWortwerkBackup(target, { legacy: {}, wortwerk: oldBackup }, game);
    expect(game.getSnapshot().events).toEqual([answer, later]);
    const before = [...target.values];
    const conflicting = { ...oldBackup, events: [{ ...answer, payload: { correct: false } }] };
    expect(() => applyWortwerkBackup(target, { legacy: { study: emptyStudy() }, wortwerk: conflicting }, game)).toThrow(/Conflicting/);
    expect([...target.values]).toEqual(before);
    expect(game.getSnapshot().events).toEqual([answer, later]);
  });

  it("does not import game events after legacy storage fails partway through its write", () => {
    const backing = memoryStore();
    applyBackup(backing, { study: { ...emptyStudy(), bookmarks: ["coursebook-10"] } });
    const before = [...backing.values];
    const failing: BackupStore = { ...backing, setItem(key, value) { if (key === STUDY_KEY) throw new Error("full"); backing.setItem(key, value); } };
    const sourceGame = createWortwerkStore(memoryStore(), options);
    sourceGame.appendEvent("answer", { correct: true });
    const game = createWortwerkStore(memoryStore(), options);
    expect(() => applyWortwerkBackup(failing, {
      legacy: { study: emptyStudy() }, wortwerk: sourceGame.exportBackup(),
    }, game)).toThrow(/preserved/);
    expect([...backing.values]).toEqual(before);
    expect(game.getSnapshot().events).toHaveLength(0);
  });

  it("rolls back legacy data if the final game merge fails after validation", () => {
    const target = memoryStore();
    const original = { ...emptyStudy(), bookmarks: ["coursebook-10"] };
    applyBackup(target, { study: original });
    const before = [...target.values];
    const game = createWortwerkStore(memoryStore(), options);
    const failingGame = { ...game, restoreBackup: () => { throw new Error("concurrent event conflict"); } };
    expect(() => applyWortwerkBackup(target, { legacy: { study: emptyStudy() }, wortwerk: game.exportBackup() }, failingGame)).toThrow(/preserved/);
    expect([...target.values]).toEqual(before);
  });
});
