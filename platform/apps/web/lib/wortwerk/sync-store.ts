import { wortwerkStore, type WortwerkStore } from "./store";

// Structural contract copied from docs/lanes/CONTRACTS.md §4. Lane 3 owns transport.
export type SyncEvent = {
  id: string; store: string; deviceId: string; createdAt: string;
  schemaVersion: number; type: string; payload: unknown;
};
export type SyncDoc = {
  store: string; key: string; updatedAt: string; deviceId: string;
  schemaVersion: number; value: unknown;
};
export interface SyncStore {
  store: string;
  schemaVersion: number;
  strategy: "event-log" | "lww-doc";
  localEventsSince?(cursor: string | null): Promise<{ events: SyncEvent[]; cursor: string }>;
  applyRemoteEvents?(events: SyncEvent[]): Promise<void>;
  localDocs?(): Promise<SyncDoc[]>;
  applyRemoteDocs?(docs: SyncDoc[]): Promise<void>;
}

export function createWortwerkSyncStores(store: WortwerkStore): SyncStore[] {
  return [
    {
      store: "wortwerk", schemaVersion: 1, strategy: "event-log",
      localEventsSince: async cursor => store.localEventsSince(cursor),
      applyRemoteEvents: async events => { store.applyRemoteEvents(events); },
    },
    {
      store: "wortwerk-docs", schemaVersion: 1, strategy: "lww-doc",
      localDocs: async () => store.localDocs(),
      applyRemoteDocs: async docs => { store.applyRemoteDocs(docs); },
    },
  ];
}

export const wortwerkSyncStores: SyncStore[] = createWortwerkSyncStores(wortwerkStore);
