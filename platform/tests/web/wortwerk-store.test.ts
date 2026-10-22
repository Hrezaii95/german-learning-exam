import { describe, expect, it } from "vitest";
import { createUuidV7Factory, createWortwerkStore, WORTWERK_STORAGE_KEY, type WortwerkStorage } from "../../apps/web/lib/wortwerk/store";
import { createWortwerkSyncStores, type SyncDoc, type SyncEvent } from "../../apps/web/lib/wortwerk/sync-store";

const instant = "2026-10-22T10:00:00.000Z";
const uuid = (tail: string) => `019a0b12-3456-7000-8000-${tail.padStart(12, "0")}`;
const fixedOptions = { now: () => new Date(instant), deviceId: "device-a" };
function memoryStorage(): WortwerkStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
function event(id = uuid("1"), type = "answer", payload: unknown = { correct: true }): SyncEvent {
  return { id, store: "wortwerk", deviceId: "remote", createdAt: instant, schemaVersion: 1, type, payload };
}
function doc(value: unknown, updatedAt = instant, deviceId = "remote", key = "settings"): SyncDoc {
  return { store: "wortwerk-docs", key, deviceId, updatedAt, schemaVersion: 1, value };
}

describe("Wortwerk event persistence", () => {
  it("keeps a stable snapshot, immutable raw events and restores on reload", () => {
    const storage = memoryStorage();
    const store = createWortwerkStore(storage, fixedOptions);
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => { notifications++; });
    const payload = { dimension: "gender", correct: true, nested: { score: 1 } };
    const answer = store.appendEvent("answer", payload);
    payload.nested.score = 999;
    expect(answer.payload).toEqual({ dimension: "gender", correct: true, nested: { score: 1 } });
    expect(Object.isFrozen(answer.payload)).toBe(true);
    expect(store.getSnapshot()).not.toBe(before);
    expect(notifications).toBe(1);
    unsubscribe();
    store.setDoc("study.position", { lesson: 3 });
    expect(notifications).toBe(1);
    const reloaded = createWortwerkStore(storage, fixedOptions);
    expect(reloaded.getSnapshot().events).toEqual([answer]);
    expect(reloaded.getDoc("study.position")).toEqual({ lesson: 3 });
    expect(reloaded.getSnapshot().storageStatus).toBe("persistent");
  });

  it("generates monotonic UUIDv7 identifiers across same-tick calls and clock rollback", () => {
    let time = Date.parse(instant);
    const makeId = createUuidV7Factory({ now: () => new Date(time), randomBytes: length => new Uint8Array(length) });
    const first = makeId();
    const second = makeId();
    time--;
    const third = makeId();
    expect(first).toMatch(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    expect([first, second, third].sort()).toEqual([first, second, third]);
    expect(new Set([first, second, third]).size).toBe(3);
    expect(parseInt(first.replaceAll("-", "").slice(0, 12), 16)).toBe(Date.parse(instant));
  });

  it("rolls its sequence into the next millisecond without duplicate IDs", () => {
    const makeId = createUuidV7Factory({ now: () => new Date(instant), randomBytes: length => new Uint8Array(length) });
    const ids = Array.from({ length: 4100 }, makeId);
    expect(new Set(ids).size).toBe(4100);
    expect([...ids].sort()).toEqual(ids);
  });

  it("keeps events in memory when private storage rejects reads and writes", () => {
    const storage = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } };
    const store = createWortwerkStore(storage, fixedOptions);
    store.appendEvent("answer", { correct: false });
    store.setDoc("settings", { sounds: false });
    expect(store.getSnapshot().events).toHaveLength(1);
    expect(store.getDoc("settings")).toEqual({ sounds: false });
    expect(store.getSnapshot().storageStatus).toBe("memory");
  });

  it("preserves future-version storage verbatim while allowing memory-only practice", () => {
    const storage = memoryStorage();
    const future = '{"schemaVersion":99,"important":"future state"}';
    storage.values.set(WORTWERK_STORAGE_KEY, future);
    const store = createWortwerkStore(storage, fixedOptions);
    store.appendEvent("answer", { correct: true });
    store.setDoc("settings", {});
    expect(store.getSnapshot().storageStatus).toBe("future-version");
    expect(store.getSnapshot().events).toHaveLength(1);
    expect(storage.values.get(WORTWERK_STORAGE_KEY)).toBe(future);
  });

  it("does not guess a migration for an unrecognised legacy shape or crash on corrupt JSON", () => {
    for (const raw of ["{broken", '{"schemaVersion":1,"progress":{"W1":999}}']) {
      const storage = memoryStorage();
      storage.values.set(WORTWERK_STORAGE_KEY, raw);
      const store = createWortwerkStore(storage, fixedOptions);
      expect(store.getSnapshot().events).toHaveLength(0);
      expect(store.getSnapshot().storageStatus).toBe("memory");
      expect(storage.values.get(WORTWERK_STORAGE_KEY)).toBe(raw);
    }
  });

  it("rejects non-JSON values without changing the event history", () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const getter = Object.defineProperty({}, "value", { enumerable: true, get: () => "hidden" });
    for (const payload of [undefined, NaN, Infinity, { a: undefined }, new Date(), cycle, getter, [,"sparse"], new Map()]) {
      expect(() => store.appendEvent("answer", payload)).toThrow();
    }
    expect(store.getSnapshot().events).toHaveLength(0);
  });

  it("merges another tab's history before writing instead of overwriting it", () => {
    const storage = memoryStorage();
    const first = createWortwerkStore(storage, { ...fixedOptions, deviceId: "a" });
    const second = createWortwerkStore(storage, { ...fixedOptions, deviceId: "b" });
    const a = first.appendEvent("answer", { itemId: "A" });
    const b = second.appendEvent("answer", { itemId: "B" });
    first.refresh();
    expect(first.getSnapshot().events.map(value => value.id)).toEqual([a.id, b.id]);
    expect(createWortwerkStore(storage).getSnapshot().events).toHaveLength(2);
  });
});

describe("Wortwerk sync and backups", () => {
  it("registers the event log and settings documents without transport", async () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    const adapters = createWortwerkSyncStores(store);
    expect(adapters.map(value => [value.store, value.strategy])).toEqual([["wortwerk", "event-log"], ["wortwerk-docs", "lww-doc"]]);
    await adapters[0]!.applyRemoteEvents!([event()]);
    await adapters[1]!.applyRemoteDocs!([doc({ quiet: true })]);
    expect((await adapters[0]!.localEventsSince!(null)).events).toHaveLength(1);
    expect((await adapters[1]!.localDocs!())[0]?.value).toEqual({ quiet: true });
  });

  it("applies duplicates idempotently, preserves unknown event types and rejects conflicting IDs atomically", () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    const answer = event();
    store.applyRemoteEvents([answer, answer]);
    const snapshot = store.getSnapshot();
    store.applyRemoteEvents([answer]);
    expect(store.getSnapshot()).toBe(snapshot);
    const future = event(uuid("2"), "future.metric", { custom: "future" });
    store.applyRemoteEvents([future]);
    expect(store.getSnapshot().events[1]?.type).toBe("future.metric");
    expect(() => store.applyRemoteEvents([event(uuid("3")), { ...answer, payload: { correct: false } }])).toThrow(/Conflicting/);
    expect(store.getSnapshot().events).toHaveLength(2);
    expect(() => store.applyRemoteEvents([{ ...answer, id: "a-v4-or-invalid-id" }])).toThrow();
  });

  it("uses arrival cursors so a late event with an older UUID is still uploaded", () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    store.applyRemoteEvents([event(uuid("99"))]);
    const initial = store.localEventsSince(null);
    expect(initial.cursor).toBe("v1:1");
    store.applyRemoteEvents([event(uuid("1"))]);
    expect(store.localEventsSince(initial.cursor).events.map(value => value.id)).toEqual([uuid("1")]);
    expect(store.localEventsSince("v1:2").events).toEqual([]);
    expect(() => store.localEventsSince("v1:999")).toThrow(/cursor/);
    expect(() => store.localEventsSince("not-a-cursor")).toThrow(/cursor/);
  });

  it("converges document timestamps and device ties independently of arrival order", () => {
    const first = createWortwerkStore(undefined, fixedOptions);
    const second = createWortwerkStore(undefined, fixedOptions);
    const a = doc({ goal: 10 }, instant, "a");
    const b = doc({ goal: 20 }, instant, "b");
    const older = doc({ goal: 1 }, "2026-10-21T10:00:00.000Z", "z");
    first.applyRemoteDocs([a, b, older]);
    second.applyRemoteDocs([b, older, a]);
    expect(first.getDoc("settings")).toEqual({ goal: 20 });
    expect(first.localDocs()).toEqual(second.localDocs());
    const snapshot = first.getSnapshot();
    first.applyRemoteDocs([b]);
    expect(first.getSnapshot()).toBe(snapshot);
  });

  it("uses increasing local document timestamps for same-tick edits", () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    const first = store.setDoc("study.scope", { count: 10 });
    const second = store.setDoc("study.scope", { count: 20 });
    expect(second.updatedAt > first.updatedAt).toBe(true);
    expect(store.getDoc("study.scope")).toEqual({ count: 20 });
  });

  it("refreshes another tab's newer document before assigning a local edit timestamp", () => {
    const storage = memoryStorage();
    const first = createWortwerkStore(storage, { ...fixedOptions, deviceId: "a" });
    const second = createWortwerkStore(storage, { ...fixedOptions, deviceId: "b" });
    first.applyRemoteDocs([doc({ goal: 30 }, "2026-10-23T10:00:00.000Z")]);
    const edited = second.setDoc("settings", { goal: 40 });
    expect(edited.updatedAt > "2026-10-23T10:00:00.000Z").toBe(true);
    expect(second.getDoc("settings")).toEqual({ goal: 40 });
    expect(createWortwerkStore(storage).getDoc("settings")).toEqual({ goal: 40 });
  });

  it("rejects an invalid backup atomically across events and documents", () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    expect(() => store.restoreBackup({ schemaVersion: 2, events: [event()], docs: [{ ...doc({}), updatedAt: "invalid" }] })).toThrow();
    expect(store.getSnapshot().events).toHaveLength(0);
    expect(store.localDocs()).toHaveLength(0);
  });

  it("backs up raw history and merges restored events without losing new answers", () => {
    const store = createWortwerkStore(undefined, fixedOptions);
    const first = store.appendEvent("answer", { itemId: "W1" });
    store.setDoc("study.position", { lesson: 2 });
    const backup = store.exportBackup();
    const later = store.appendEvent("answer", { itemId: "W2" });
    store.restoreBackup(backup);
    expect(store.getSnapshot().events.map(value => value.id)).toEqual([first.id, later.id]);
    const fresh = createWortwerkStore(undefined, fixedOptions);
    fresh.restoreBackup(JSON.parse(JSON.stringify(backup)));
    expect(fresh.getSnapshot().events).toEqual([first]);
    expect(fresh.getDoc("study.position")).toEqual({ lesson: 2 });
    expect(() => fresh.restoreBackup({ schemaVersion: 3 })).toThrow(/Unsupported/);
  });
});
