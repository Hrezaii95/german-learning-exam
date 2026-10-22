import type { SyncDoc, SyncEvent } from "./sync-store";

export const WORTWERK_STORAGE_KEY = "wortwerk.v2";
const EVENT_STORE = "wortwerk";
const DOC_STORE = "wortwerk-docs";
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WortwerkStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};
export type WortwerkSnapshot = {
  schemaVersion: 2;
  deviceId: string;
  events: readonly SyncEvent[];
  docs: readonly SyncDoc[];
  storageStatus: "persistent" | "memory" | "future-version";
};
export type WortwerkBackup = {
  schemaVersion: 2; events: SyncEvent[]; docs: SyncDoc[];
};
export type WortwerkStoreOptions = {
  now?: () => Date;
  randomBytes?: (length: number) => Uint8Array;
  deviceId?: string;
};

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  try {
    const crypto = (globalThis as { crypto?: { getRandomValues<T extends Uint8Array>(value: T): T } }).crypto;
    if (crypto) return crypto.getRandomValues(bytes);
  } catch { /* Restricted browser contexts still get in-memory operation. */ }
  for (let index = 0; index < length; index++) bytes[index] = Math.floor(Math.random() * 256);
  return bytes;
}

/** A monotonic UUIDv7 factory; sequence bits also separate calls in one millisecond. */
export function createUuidV7Factory(options: WortwerkStoreOptions = {}): () => string {
  const now = options.now ?? (() => new Date());
  const entropy = options.randomBytes ?? randomBytes;
  let lastMs = -1;
  let sequence = 0;
  return () => {
    const observedMs = now().getTime();
    if (!Number.isSafeInteger(observedMs) || observedMs < 0 || observedMs > 0xffffffffffff) throw new Error("Invalid UUID timestamp");
    let ms = Math.max(observedMs, lastMs);
    if (ms === lastMs) {
      sequence++;
      if (sequence > 0xfff) { ms++; sequence = 0; }
    } else sequence = 0;
    lastMs = ms;
    const bytes = entropy(16);
    if (!(bytes instanceof Uint8Array) || bytes.length !== 16) throw new Error("UUID entropy must contain 16 bytes");
    let timestamp = ms;
    for (let index = 5; index >= 0; index--) { bytes[index] = timestamp % 256; timestamp = Math.floor(timestamp / 256); }
    bytes[6] = 0x70 | (sequence >>> 8);
    bytes[7] = sequence & 0xff;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateJson(value: unknown, ancestors = new Set<object>(), depth = 0): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (depth > 100 || typeof value !== "object" || value === null || (Array.isArray(value) ? Object.getPrototypeOf(value) !== Array.prototype : !isRecord(value))) throw new Error("Wortwerk data must be finite, plain JSON");
  if (ancestors.has(value)) throw new Error("Wortwerk data must not contain cycles");
  ancestors.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === "length") continue;
    if (typeof key !== "string") throw new Error("Wortwerk JSON must not contain symbol keys");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new Error("Wortwerk JSON must not contain accessors or hidden values");
    validateJson(descriptor.value, ancestors, depth + 1);
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new Error("Wortwerk JSON arrays must not be sparse");
    for (let index = 0; index < value.length; index++) if (!Object.prototype.hasOwnProperty.call(value, index)) throw new Error("Wortwerk JSON arrays must not be sparse");
  }
  ancestors.delete(value);
}

function cloneJson<T>(value: T): T {
  validateJson(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function freezeJson<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function parseEvent(value: unknown): SyncEvent {
  if (!isRecord(value) || typeof value.id !== "string" || !UUID_V7.test(value.id)
    || value.store !== EVENT_STORE || typeof value.deviceId !== "string" || !value.deviceId
    || !isTimestamp(value.createdAt) || !Number.isSafeInteger(value.schemaVersion) || (value.schemaVersion as number) < 1
    || typeof value.type !== "string" || !value.type || !("payload" in value)) throw new Error("Invalid Wortwerk event");
  return freezeJson(cloneJson({ id: value.id, store: EVENT_STORE, deviceId: value.deviceId,
    createdAt: value.createdAt, schemaVersion: value.schemaVersion as number, type: value.type, payload: value.payload }));
}

function parseDoc(value: unknown): SyncDoc {
  if (!isRecord(value) || value.store !== DOC_STORE || typeof value.key !== "string" || !value.key
    || typeof value.deviceId !== "string" || !value.deviceId || !isTimestamp(value.updatedAt)
    || !Number.isSafeInteger(value.schemaVersion) || (value.schemaVersion as number) < 1 || !("value" in value)) throw new Error("Invalid Wortwerk document");
  return freezeJson(cloneJson({ store: DOC_STORE, key: value.key, updatedAt: value.updatedAt,
    deviceId: value.deviceId, schemaVersion: value.schemaVersion as number, value: value.value }));
}

function compareText(left: string, right: string): number { return left === right ? 0 : left > right ? 1 : -1; }

function newerDoc(left: SyncDoc, right: SyncDoc): SyncDoc {
  const time = compareText(left.updatedAt, right.updatedAt);
  if (time !== 0) return time > 0 ? left : right;
  const device = compareText(left.deviceId, right.deviceId);
  if (device !== 0) return device > 0 ? left : right;
  // Same device/time is possible after a restore: converge deterministically.
  return compareText(canonicalJson(left), canonicalJson(right)) >= 0 ? left : right;
}

function defaultStorage(): WortwerkStorage | undefined {
  try { return (globalThis as { localStorage?: WortwerkStorage }).localStorage; }
  catch { return undefined; }
}

export type WortwerkStore = ReturnType<typeof createWortwerkStore>;

export function createWortwerkStore(storage: WortwerkStorage | undefined = defaultStorage(), options: WortwerkStoreOptions = {}) {
  const now = options.now ?? (() => new Date());
  const uuid = createUuidV7Factory(options);
  const listeners = new Set<() => void>();
  let deviceId = options.deviceId ?? uuid();
  let events: SyncEvent[] = [];
  let docs: SyncDoc[] = [];
  let storageStatus: WortwerkSnapshot["storageStatus"] = storage ? "persistent" : "memory";
  let preserveFuture = false;
  let snapshot: WortwerkSnapshot;
  let lastDocMs = -1;

  function publish(notify = true) {
    snapshot = Object.freeze({ schemaVersion: 2, deviceId, events: Object.freeze([...events]), docs: Object.freeze([...docs]), storageStatus });
    if (notify) for (const listener of listeners) listener();
  }

  function merge(incomingEvents: unknown[], incomingDocs: unknown[]): boolean {
    const nextEvents = [...events];
    const byId = new Map(nextEvents.map(event => [event.id, event]));
    // Parse the entire batch first, so corrupt remote data cannot partially apply.
    const parsedEvents = incomingEvents.map(parseEvent);
    const parsedDocs = incomingDocs.map(parseDoc);
    for (const event of parsedEvents) {
      const existing = byId.get(event.id);
      if (existing && canonicalJson(existing) !== canonicalJson(event)) throw new Error(`Conflicting Wortwerk event id: ${event.id}`);
      if (!existing) { nextEvents.push(event); byId.set(event.id, event); }
    }
    const byKey = new Map(docs.map(doc => [doc.key, doc]));
    for (const doc of parsedDocs) {
      const existing = byKey.get(doc.key);
      byKey.set(doc.key, existing ? newerDoc(existing, doc) : doc);
    }
    const nextDocs = [...byKey.values()].sort((left, right) => compareText(left.key, right.key));
    const changed = nextEvents.length !== events.length || canonicalJson(nextDocs) !== canonicalJson(docs);
    if (changed) { events = nextEvents; docs = nextDocs; }
    return changed;
  }

  function readStored(initial = false): boolean {
    if (!storage || preserveFuture) return false;
    let raw: string | null;
    try { raw = storage.getItem(WORTWERK_STORAGE_KEY); }
    catch { storageStatus = "memory"; return false; }
    if (raw === null) return false;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && typeof parsed.schemaVersion === "number" && parsed.schemaVersion > 2) {
        preserveFuture = true; storageStatus = "future-version"; return false;
      }
      if (!isRecord(parsed) || parsed.schemaVersion !== 2 || typeof parsed.deviceId !== "string" || !parsed.deviceId
        || !Array.isArray(parsed.events) || !Array.isArray(parsed.docs)) throw new Error("Unsupported Wortwerk storage version");
      const changed = merge(parsed.events, parsed.docs);
      if (initial && !options.deviceId) deviceId = parsed.deviceId;
      return changed;
    } catch { storageStatus = "memory"; return false; }
  }

  function persist() {
    if (!storage || preserveFuture) return;
    try {
      storage.setItem(WORTWERK_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, deviceId, events, docs }));
      storageStatus = "persistent";
    } catch { storageStatus = "memory"; }
  }

  readStored(true);
  publish(false);

  const browserEvents = globalThis as {
    addEventListener?: (type: string, listener: (event: { key?: string | null }) => void) => void;
    removeEventListener?: (type: string, listener: (event: { key?: string | null }) => void) => void;
  };
  const onStorage = (event: { key?: string | null }) => {
    if (event.key === WORTWERK_STORAGE_KEY || event.key === null) refresh();
  };

  function refresh() {
    const previousStatus = storageStatus;
    const changed = readStored();
    if (changed || previousStatus !== storageStatus) publish();
  }

  function commit(incomingEvents: unknown[], incomingDocs: unknown[]) {
    const previousStatus = storageStatus;
    // Merge another tab's data before a write; arrays retain arrival order for cursors.
    const refreshed = readStored();
    const changed = merge(incomingEvents, incomingDocs);
    if (changed || refreshed) persist();
    if (changed || refreshed || previousStatus !== storageStatus) publish();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      if (listeners.size === 0) browserEvents.addEventListener?.("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) browserEvents.removeEventListener?.("storage", onStorage);
      };
    },
    refresh,
    appendEvent(type: string, payload: unknown): SyncEvent {
      const event = parseEvent({ id: uuid(), store: EVENT_STORE, deviceId, createdAt: now().toISOString(), schemaVersion: 1, type, payload });
      commit([event], []);
      return event;
    },
    getDoc<T = unknown>(key: string): T | undefined { return docs.find(doc => doc.key === key)?.value as T | undefined; },
    setDoc(key: string, value: unknown): SyncDoc {
      refresh();
      const observedMs = now().getTime();
      const existing = docs.find(doc => doc.key === key);
      // Local sequential writes win even within the same clock tick or after a clock rollback.
      lastDocMs = Math.max(observedMs, lastDocMs + 1, existing ? Date.parse(existing.updatedAt) + 1 : 0);
      const doc = parseDoc({ store: DOC_STORE, key, value, deviceId, updatedAt: new Date(lastDocMs).toISOString(), schemaVersion: 1 });
      commit([], [doc]);
      return doc;
    },
    localEventsSince(cursor: string | null): { events: SyncEvent[]; cursor: string } {
      refresh();
      let offset = 0;
      if (cursor !== null) {
        const match = /^v1:(\d+)$/.exec(cursor);
        if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) > events.length) throw new Error("Invalid Wortwerk sync cursor");
        offset = Number(match[1]);
      }
      return { events: [...events.slice(offset)], cursor: `v1:${events.length}` };
    },
    applyRemoteEvents(incoming: SyncEvent[]) { if (!Array.isArray(incoming)) throw new Error("Invalid remote event batch"); commit(incoming, []); },
    localDocs(): SyncDoc[] { refresh(); return [...docs]; },
    applyRemoteDocs(incoming: SyncDoc[]) { if (!Array.isArray(incoming)) throw new Error("Invalid remote document batch"); commit([], incoming); },
    exportBackup(): WortwerkBackup { refresh(); return cloneJson({ schemaVersion: 2, events: [...events], docs: [...docs] }); },
    restoreBackup(backup: unknown) {
      if (!isRecord(backup) || backup.schemaVersion !== 2 || !Array.isArray(backup.events) || !Array.isArray(backup.docs)) throw new Error("Unsupported Wortwerk backup");
      commit(backup.events, backup.docs);
    },
  };
}

export const wortwerkStore = createWortwerkStore();
