import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncEngine } from '../src/client.ts';
import { SyncRegistry, mergeEvents, type SyncEvent } from '../src/index.ts';

function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)},values};}
const event=(suffix:number,deviceId:string):SyncEvent=>({id:`018fa100-0000-7000-8000-${String(suffix).padStart(12,'0')}`,store:'learner.events',schemaVersion:1,type:'learner.event',payload:{number:suffix},deviceId,createdAt:'2026-10-22T10:00:00.000Z'});
function localStore(){let events:SyncEvent[]=[];return {store:'learner.events',schemaVersion:1,strategy:'event-log' as const,append:(e:SyncEvent)=>{events=mergeEvents(events,[e])},all:()=>events,localEventsSince:async(cursor:string|null)=>({events:events.slice(Number(cursor??0)),cursor:String(events.length)}),applyRemoteEvents:async(next:SyncEvent[])=>{events=mergeEvents(events,next)}};}
function server(){const rows:SyncEvent[]=[];return {rows,fetch:async(input:string,init?:RequestInit)=>{
  if(input.startsWith('/api/sync/push')){const body=JSON.parse(String(init?.body));for(const e of body.events??[]){if(!rows.some(x=>x.id===e.id))rows.push(e)}return new Response(JSON.stringify({ok:true}));}
  const url=new URL(input,'https://app.invalid');const since=Number(url.searchParams.get('since')??0);return new Response(JSON.stringify({events:rows.slice(since),docs:[],cursor:rows.length,hasMore:false}));
}};}

test('two devices union progress; offline queue survives restart and retry is idempotent',async()=>{
  const remote=server(),a=localStore(),b=localStore(),sa=storage(),sb=storage();let online=true;
  const ar=new SyncRegistry(),br=new SyncRegistry();ar.register(a);br.register(b);
  let engineA=new SyncEngine({userId:'student-a',deviceId:'device-a',storage:sa,registry:ar,fetch:remote.fetch,online:()=>online});
  const engineB=new SyncEngine({userId:'student-a',deviceId:'device-b',storage:sb,registry:br,fetch:remote.fetch});
  a.append(event(1,'device-a'));await engineA.cycle();await engineB.cycle();assert.equal(b.all().length,1);
  online=false;a.append(event(2,'device-a'));await engineA.cycle();assert.equal(engineA.getSnapshot().status,'offline');assert.equal(engineA.getSnapshot().pending,1);
  engineA.stop();online=true;engineA=new SyncEngine({userId:'student-a',deviceId:'device-a',storage:sa,registry:ar,fetch:remote.fetch,online:()=>online});
  await engineA.cycle();await engineA.cycle();await engineB.cycle();assert.equal(remote.rows.length,2);assert.equal(b.all().length,2);
});

test('pending queues and pull cursors are isolated by user',async()=>{
  const backing=storage(),a=localStore(),r=new SyncRegistry();r.register(a);a.append(event(1,'device-a'));
  const first=new SyncEngine({userId:'first',deviceId:'device-a',storage:backing,registry:r,fetch:server().fetch,online:()=>false});await first.cycle();assert.equal(first.getSnapshot().pending,1);first.stop();
  const second=new SyncEngine({userId:'second',deviceId:'device-a',storage:backing,registry:new SyncRegistry(),fetch:server().fetch,online:()=>false});await second.cycle();assert.equal(second.getSnapshot().pending,0);
  assert.ok([...backing.values.keys()].some(k=>k.includes('first')));assert.ok([...backing.values.keys()].some(k=>k.includes('second')));
});

test('idle polling does not pull until ten minutes; a focus request pulls immediately',async()=>{
  const local=localStore(),r=new SyncRegistry();r.register(local);let clock=Date.parse('2026-10-22T10:00:00Z'),pulls=0;
  const remote=server();const fetch=async(url:string,init?:RequestInit)=>{if(url.startsWith('/api/sync/pull'))pulls++;return remote.fetch(url,init)};
  const engine=new SyncEngine({userId:'student-a',deviceId:'device-a',storage:storage(),registry:r,fetch,now:()=>new Date(clock)});
  await engine.cycle();assert.equal(pulls,1);
  const lastSync=engine.getSnapshot().lastSyncedAt;
  for(let i=0;i<10;i++){clock+=5000;await engine.cycle()}
  assert.equal(pulls,1,'five-second local polling must not trigger idle D1 reads');
  assert.equal(engine.getSnapshot().lastSyncedAt,lastSync,'idle local polls do not claim a new server sync');
  clock=Date.parse('2026-10-22T10:09:59Z');await engine.cycle();assert.equal(pulls,1);
  clock+=1000;await engine.cycle();assert.equal(pulls,2);
  clock+=1000;await engine.cycle(true);assert.equal(pulls,3,'focus forces a fresh pull');
  engine.stop();
});

test('offline writes remain durable while transient errors obey injected-clock backoff',async()=>{
  const local=localStore(),r=new SyncRegistry(),backing=storage();r.register(local);let clock=Date.parse('2026-10-22T10:00:00Z'),online=false,requests=0,fail=true;
  const remote=server();const fetch=async(url:string,init?:RequestInit)=>{requests++;if(fail)throw new Error('Network unavailable');return remote.fetch(url,init)};
  const engine=new SyncEngine({userId:'student-a',deviceId:'device-a',storage:backing,registry:r,fetch,online:()=>online,now:()=>new Date(clock)});
  local.append(event(1,'device-a'));await engine.cycle();assert.equal(requests,0);assert.equal(engine.getSnapshot().pending,1);assert.equal(engine.getSnapshot().status,'offline');
  online=true;await engine.cycle();assert.equal(requests,1);assert.equal(engine.getSnapshot().status,'error');
  fail=false;clock+=4999;await engine.cycle();assert.equal(requests,1,'retry waits five seconds after first failure');assert.equal(engine.getSnapshot().pending,1);
  clock+=1;await engine.cycle();assert.equal(remote.rows.length,1);assert.equal(engine.getSnapshot().status,'synced');assert.equal(engine.getSnapshot().lastSyncedAt,new Date(clock).toISOString());
  engine.stop();
});
