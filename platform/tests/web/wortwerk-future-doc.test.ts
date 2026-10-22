import { describe, expect, it } from "vitest";
import { createWortwerkStore, WORTWERK_STORAGE_KEY } from "../../apps/web/lib/wortwerk/store.js";
import type { SyncDoc } from "../../apps/web/lib/wortwerk/sync-store.js";

const now = new Date("2026-10-22T12:00:00.000Z");
const options = { now: () => now, deviceId: "current-device" };
function future(key = "settings"): SyncDoc {
  return { store: "wortwerk-docs", key, deviceId: "future-device", schemaVersion: 2,
    updatedAt: "2026-10-22T11:00:00.000Z", value: { futureOnly: ["keep", { nested: true }] } };
}

describe("future Wortwerk documents", () => {
  it("preserves a future record and exact stored bytes when a current UI tries to edit it", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const store = createWortwerkStore(storage, options);
    store.applyRemoteDocs([future()]);
    const snapshot = store.getSnapshot();
    const bytes = values.get(WORTWERK_STORAGE_KEY);
    const returned = store.setDoc("settings", { enabledPackIds: [] });
    expect(returned).toBe(snapshot.docs[0]);
    expect(returned.schemaVersion).toBe(2);
    expect(store.getSnapshot()).toBe(snapshot);
    expect(values.get(WORTWERK_STORAGE_KEY)).toBe(bytes);
    expect(store.getDoc("settings")).toEqual(future().value);
  });

  it("refreshes another tab's future version before deciding whether a document is writable", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const current = createWortwerkStore(storage, options);
    current.setDoc("study.scope", { v: 1 });
    const other = createWortwerkStore(storage, options);
    other.applyRemoteDocs([{ ...future("study.scope"), updatedAt: "2026-10-22T13:00:00.000Z" }]);
    const bytes = values.get(WORTWERK_STORAGE_KEY);
    const returned = current.setDoc("study.scope", { v: 1, count: 20 });
    expect(returned.schemaVersion).toBe(2);
    expect(current.getDoc("study.scope")).toEqual(future().value);
    expect(values.get(WORTWERK_STORAGE_KEY)).toBe(bytes);
  });

  it("keeps current documents and answer events writable beside a protected future document", () => {
    const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined }, options);
    store.applyRemoteDocs([future()]);
    const initial = store.setDoc("study.position", { lesson: 1 });
    const updated = store.setDoc("study.position", { lesson: 2 });
    store.appendEvent("answer", { correct: true });
    expect(initial.schemaVersion).toBe(1);
    expect(updated.updatedAt > initial.updatedAt).toBe(true);
    expect(store.getDoc("study.position")).toEqual({ lesson: 2 });
    expect(store.getSnapshot().events).toHaveLength(1);
    expect(store.localDocs().find(doc => doc.key === "settings")).toEqual(future());
  });

  it("preserves future documents under private-mode memory fallback without throwing", () => {
    const store = createWortwerkStore({ getItem: () => { throw new Error("private"); }, setItem: () => { throw new Error("quota"); } }, options);
    store.applyRemoteDocs([future()]);
    expect(() => store.setDoc("settings", { sounds: false })).not.toThrow();
    expect(store.getSnapshot().storageStatus).toBe("memory");
    expect(store.localDocs()).toEqual([future()]);
  });
});
