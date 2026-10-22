/// <reference lib="dom" />
import { canonicalJson, mergeDocuments, mergeEvents, SYNC_LIMITS, type SyncDoc, type SyncEvent, type SyncRegistry, type SyncStore } from './index.js';

export interface SyncStorage { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem(key:string):void }
export type SyncStatus='synced'|'syncing'|'offline'|'error'|'signed-out'|'paused';
/** `synced` means the observed local queue is empty after a successful network cycle.
 * `lastSyncedAt` is that cycle's completion time, never the time of an idle local poll.
 * It starts null after constructing/restarting an engine; errors/offline retain the last success.
 */
export type SyncSnapshot={status:SyncStatus;pending:number;lastSyncedAt:string|null;error?:string};
export type SyncFetch=(url:string,init?:RequestInit)=>Promise<Response>;
type PersistentState={version:1;events:SyncEvent[];docs:SyncDoc[];pull:Record<string,number>;local:Record<string,string>;docFingerprints:Record<string,string>};
type Options={userId:string;deviceId:string;storage:SyncStorage;registry:SyncRegistry;fetch:SyncFetch;online?:()=>boolean;now?:()=>Date;assertScope?:()=>void};
const empty=():PersistentState=>({version:1,events:[],docs:[],pull:{},local:{},docFingerprints:{}});

/** A queue belongs to one immutable user id. Never reuse an engine after account changes. */
export class SyncEngine {
  private readonly key:string;
  private state:PersistentState;
  private stopped=false;
  private running:Promise<void>|null=null;
  private listeners=new Set<()=>void>();
  private snapshot:SyncSnapshot={status:'syncing',pending:0,lastSyncedAt:null};
  private failures=0;
  private retryAt=0;
  private lastPullAt:number|null=null;
  private now():Date {return this.options.now?.()??new Date()}
  private readonly abort=new AbortController();
  constructor(private readonly options:Options) {
    if(!options.userId||options.userId.length>100)throw new Error('Invalid sync user');
    this.key=`german-learning:sync:v1:${encodeURIComponent(options.userId)}`;
    const raw=options.storage.getItem(this.key);
    this.state=raw?JSON.parse(raw) as PersistentState:empty();
    if(this.state.version!==1||!Array.isArray(this.state.events)||!Array.isArray(this.state.docs)||!this.state.pull||!this.state.local||!this.state.docFingerprints)throw new Error('Invalid persisted sync queue');
    this.snapshot={...this.snapshot,pending:this.state.events.length+this.state.docs.length};
    if(!raw)this.save();
  }
  getSnapshot=():SyncSnapshot=>this.snapshot;
  subscribe=(listener:()=>void):(()=>void)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener)};
  private publish(status:SyncStatus,error?:string):void {
    this.snapshot={status,pending:this.state.events.length+this.state.docs.length,lastSyncedAt:this.snapshot.lastSyncedAt,...(error?{error}:{})};
    for(const listener of this.listeners)listener();
  }
  private save():void { this.options.storage.setItem(this.key,JSON.stringify(this.state)); }
  stop():void {this.stopped=true;this.abort.abort();this.listeners.clear()}
  async settled():Promise<void>{await this.running;}
  /** Persist a local change before attempting any network operation. */
  private guard():void {if(this.stopped)throw new Error('Sync stopped');this.options.assertScope?.()}
  private async collect():Promise<void> {
    this.guard();
    for(const store of this.options.registry.all()) {
      this.guard();
      if(store.strategy==='event-log'&&store.localEventsSince) {
        const next=await store.localEventsSince(this.state.local[store.store]??null);this.guard();
        const previous=this.state;
        this.state={...previous,events:mergeEvents(previous.events,next.events),local:{...previous.local,[store.store]:next.cursor}};
        try{this.save()}catch(error){this.state=previous;throw error}
      }
      if(store.strategy==='lww-doc'&&store.localDocs) {
        const docs=await store.localDocs(),changed:SyncDoc[]=[];this.guard();
        const fingerprints={...this.state.docFingerprints};
        for(const doc of docs){const key=`${doc.store}:${doc.key}`,fingerprint=canonicalJson(doc);if(fingerprints[key]!==fingerprint){changed.push(doc);fingerprints[key]=fingerprint}}
        const previous=this.state;
        this.state={...previous,docs:mergeDocuments(previous.docs,changed),docFingerprints:fingerprints};
        try{this.save()}catch(error){this.state=previous;throw error}
      }
    }
  }
  async cycle(force=false):Promise<void> {
    if(this.running)return this.running;
    if(this.stopped)return;
    this.running=this.execute(force).finally(()=>{this.running=null});
    return this.running;
  }
  private async request(url:string,init?:RequestInit):Promise<Record<string,unknown>> {
    this.guard();
    const response=await this.options.fetch(url,{...init,credentials:'same-origin',cache:'no-store',signal:this.abort.signal});
    if(!response.ok)throw new Error(response.status===401?'Sign in again to sync.':`Sync request failed (${response.status}).`);
    this.guard();
    const body=await response.json() as Record<string,unknown>;
    this.guard();
    return body;
  }
  private async push(store:SyncStore):Promise<void> {
    while(!this.stopped) {
      const events=this.state.events.filter(e=>e.store===store.store).slice(0,SYNC_LIMITS.batchItems);
      const docs=this.state.docs.filter(d=>d.store===store.store).slice(0,SYNC_LIMITS.batchItems);
      if(!events.length&&!docs.length)return;
      const body=()=>JSON.stringify({userId:this.options.userId,deviceId:this.options.deviceId,store:store.store,...(store.strategy==='event-log'?{events}:{docs})});
      while(new TextEncoder().encode(body()).byteLength>SYNC_LIMITS.bodyBytes){if(events.length>1)events.pop();else if(docs.length>1)docs.pop();else throw new Error('Sync record exceeds request limit.')}
      await this.request('/api/sync/push',{method:'POST',headers:{'Content-Type':'application/json'},body:body()});
      const ids=new Set(events.map(e=>`${e.store}:${e.id}`)),fingerprints=new Set(docs.map(canonicalJson));
      this.state={...this.state,events:this.state.events.filter(e=>!ids.has(`${e.store}:${e.id}`)),docs:this.state.docs.filter(d=>!fingerprints.has(canonicalJson(d)))};
      this.save();
    }
  }
  private async pull(store:SyncStore):Promise<void> {
    let since=this.state.pull[store.store]??0;
    for(let pages=0;pages<100&&!this.stopped;pages++) {
      const body=await this.request(`/api/sync/pull?store=${encodeURIComponent(store.store)}&since=${since}&userId=${encodeURIComponent(this.options.userId)}`);
      if(!Number.isSafeInteger(body.cursor)||Number(body.cursor)<since||!Array.isArray(body.events)||!Array.isArray(body.docs))throw new Error('Invalid sync response');
      const events=body.events as SyncEvent[],docs=body.docs as SyncDoc[];
      if(events.some(e=>e.store!==store.store)||docs.some(d=>d.store!==store.store))throw new Error('Invalid sync response store');
      this.guard();
      if(events.length&&store.applyRemoteEvents)await store.applyRemoteEvents(events);
      this.guard();
      if(docs.length&&store.applyRemoteDocs)await store.applyRemoteDocs(docs);
      this.guard();
      // Only acknowledge after the adapter has validated and applied the entire batch.
      const next=Number(body.cursor);
      this.state={...this.state,pull:{...this.state.pull,[store.store]:next}};
      this.save();
      if(body.hasMore!==true)return;
      if(next===since)throw new Error('Sync cursor did not advance');
      since=next;
    }
  }
  private async execute(force:boolean):Promise<void> {
    try {
      await this.collect();
      if(this.stopped)return;
      if(this.options.online?.()===false){this.publish('offline');return}
      const now=this.now().getTime();
      if(!force&&now<this.retryAt){this.publish('error','Sync will retry shortly.');return}
      const pending=this.state.events.length+this.state.docs.length>0;
      const pullDue=force||pending||this.failures>0||this.lastPullAt===null||now<this.lastPullAt||now-this.lastPullAt>=600000;
      // Five-second browser ticks observe/persist edits; idle ticks make no server requests.
      if(!pending&&!pullDue){this.publish('synced');return}
      this.publish('syncing');
      for(const store of this.options.registry.all()){await this.push(store);if(pullDue)await this.pull(store)}
      // Preserve edits made during network requests. Remote echoes drain idempotently next cycle.
      await this.collect();
      const completedAt=this.now();
      if(pullDue)this.lastPullAt=completedAt.getTime();
      this.snapshot={...this.snapshot,lastSyncedAt:completedAt.toISOString()};
      this.failures=0;this.retryAt=0;
      this.publish(this.state.events.length||this.state.docs.length?'syncing':'synced');
    } catch(error) {
      if(this.stopped)return;
      this.failures++;
      this.retryAt=this.now().getTime()+Math.min(600000,5000*2**Math.min(this.failures-1,7));
      this.publish(this.options.online?.()===false?'offline':'error',error instanceof Error?error.message:'Sync failed.');
    }
  }
}
