/** Lane contract §4: portable registry and deterministic merge primitives. */
export type SyncEvent = { id: string; store: string; deviceId: string; createdAt: string; schemaVersion: number; type: string; payload: unknown };
export type SyncDoc = { store: string; key: string; updatedAt: string; deviceId: string; schemaVersion: number; value: unknown };
export interface SyncStore {
  store: string; schemaVersion: number; strategy: 'event-log' | 'lww-doc';
  localEventsSince?(cursor: string | null): Promise<{events: SyncEvent[];cursor:string}>;
  applyRemoteEvents?(events: SyncEvent[]): Promise<void>;
  localDocs?(): Promise<SyncDoc[]>;
  applyRemoteDocs?(docs: SyncDoc[]): Promise<void>;
}
export const SYNC_LIMITS = { batchItems: 100, valueBytes: 65536, bodyBytes: 262144, clockSkewMs: 300000 } as const;
export const SUPPORTED_STORES: Readonly<Record<string, 'event-log' | 'lww-doc'>> = Object.freeze({
  'learner.events':'event-log', 'learner.docs':'lww-doc', 'study.docs':'lww-doc',
  'wortwerk':'event-log', 'wortwerk.v2':'event-log', 'wortwerk.events':'event-log',
  'study.position':'lww-doc', 'study.scope':'lww-doc', 'wortwerk.settings':'lww-doc',
});
export class SyncRegistry {
  private stores = new Map<string, SyncStore>();
  register(store: SyncStore): void {
    const known=this.stores.get(store.store);
    if (known && (known.schemaVersion!==store.schemaVersion || known.strategy!==store.strategy)) throw new Error('Store already registered with a different schema');
    if (!Number.isSafeInteger(store.schemaVersion)||store.schemaVersion<1) throw new Error('Invalid schema version');
    this.stores.set(store.store,store);
  }
  get(store: string): SyncStore | undefined { return this.stores.get(store); }
  all(): SyncStore[] { return [...this.stores.values()]; }
  clear(): void { this.stores.clear(); }
}
export function canonicalJson(value: unknown): string {
  const seen=new Set<object>();
  function normalize(v: unknown, depth=0): unknown {
    if(depth>32) throw new Error('Invalid JSON depth');
    if(v===null || typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'&&Number.isFinite(v))return v;
    if(typeof v!=='object'||seen.has(v))throw new Error('Invalid JSON value');
    seen.add(v);
    let result: unknown;
    if(Array.isArray(v))result=v.map(x=>normalize(x,depth+1));
    else {
      const record=v as Record<string,unknown>;
      const out: Record<string,unknown>=Object.create(null);
      for(const key of Object.keys(record).sort()) {
        if(['__proto__','prototype','constructor'].includes(key))throw new Error('Invalid JSON key');
        out[key]=normalize(record[key],depth+1);
      }
      result=out;
    }
    seen.delete(v);
    return result;
  }
  return JSON.stringify(normalize(value)).replace(/[^\x00-\x7f]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
}
function record(value: unknown): Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid sync record');
  return value as Record<string,unknown>;
}
function text(value: unknown, name: string, max=120): string {
  if(typeof value!=='string'||value.length<1||value.length>max||/[\x00-\x1f]/.test(value))throw new Error(`Invalid ${name}`);
  return value;
}
function clock(value: unknown,now:Date):string {
  const s=text(value,'timestamp',40);
  if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))throw new Error('Invalid timestamp');
  const n=Date.parse(s);
  if(n>now.getTime()+SYNC_LIMITS.clockSkewMs)throw new Error('Timestamp is in the future');
  return new Date(n).toISOString();
}
function common(value: Record<string,unknown>): {store:string;deviceId:string;schemaVersion:number} {
  const store=text(value.store,'store',80), deviceId=text(value.deviceId,'device',80);
  if(!/^[a-zA-Z0-9._:-]+$/.test(deviceId))throw new Error('Invalid device');
  if(!Object.hasOwn(SUPPORTED_STORES,store))throw new Error('Invalid sync store');
  if(value.schemaVersion!==1)throw new Error('Invalid sync schema version');
  return {store,deviceId,schemaVersion:1};
}
function bounded(value: unknown): unknown {
  const data=canonicalJson(value);
  if(new TextEncoder().encode(data).byteLength>SYNC_LIMITS.valueBytes)throw new Error('Invalid oversized sync value');
  return JSON.parse(data) as unknown;
}
export function validateEvent(value:unknown,now=new Date()):SyncEvent {
  const v=record(value),c=common(v);
  if(SUPPORTED_STORES[c.store]!=='event-log')throw new Error('Invalid event store');
  const id=text(v.id,'event id',36);
  // Existing learner envelopes used UUIDv4; preserving their IDs is required for safe migration.
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Error('Invalid event id');
  return {...c,id,createdAt:clock(v.createdAt,now),type:text(v.type,'event type',80),payload:bounded(v.payload)};
}
export function validateDocument(value:unknown,now=new Date()):SyncDoc {
  const v=record(value),c=common(v);
  if(SUPPORTED_STORES[c.store]!=='lww-doc')throw new Error('Invalid document store');
  return {...c,key:text(v.key,'document key',200),updatedAt:clock(v.updatedAt,now),value:bounded(v.value)};
}
export function mergeEvents(local:readonly SyncEvent[],remote:readonly SyncEvent[]):SyncEvent[] {
  const values=new Map<string,SyncEvent>();
  for(const event of [...local,...remote]) {
    const key=`${event.store}:${event.id}`,previous=values.get(key);
    if(previous&&canonicalJson(previous)!==canonicalJson(event))throw new Error('Conflicting event id');
    values.set(key,event);
  }
  return [...values.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
}
export function compareDocuments(a:SyncDoc,b:SyncDoc):number {
  return Date.parse(a.updatedAt)-Date.parse(b.updatedAt)||(a.deviceId<b.deviceId?-1:a.deviceId>b.deviceId?1:0)||((canonicalJson(a.value)<canonicalJson(b.value))?-1:canonicalJson(a.value)>canonicalJson(b.value)?1:0);
}
export function mergeDocuments(local:readonly SyncDoc[],remote:readonly SyncDoc[]):SyncDoc[] {
  const values=new Map<string,SyncDoc>();
  for(const doc of [...local,...remote]) {
    const key=`${doc.store}:${doc.key}`,previous=values.get(key);
    if(!previous||compareDocuments(doc,previous)>0)values.set(key,doc);
  }
  return [...values.values()].sort((a,b)=>a.store.localeCompare(b.store)||a.key.localeCompare(b.key));
}
