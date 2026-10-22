import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTestDb } from './classes-db.js';
import { createSession } from '../src/auth/session.js';
import { handleSync } from '../src/routes/sync.js';
import type { PlatformEnv } from '../src/types.js';

async function setup(){
  const db=createTestDb();db.sqlite.exec(readFileSync(new URL('../migrations/0002_sync.sql',import.meta.url),'utf8'));
  for(const id of ['student-a','student-b'])await db.prepare("INSERT INTO users(id,username,display_name,role,created_at) VALUES(?,?,?,'student',?)").bind(id,id,id,new Date().toISOString()).run();
  const a=await createSession(db,'student-a'),b=await createSession(db,'student-b');
  const env:PlatformEnv={DB:db,ASSETS:{fetch:async()=>new Response('asset')}};
  async function request(path:string,body?:unknown,token=a.token,origin='https://german.learnilabs.com'){
    return handleSync(new Request(`https://german.learnilabs.com${path}`,{method:body===undefined?'GET':'POST',headers:{Cookie:`__Host-gl_session=${token}`,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
  }
  return {db,a,b,env,request};
}
const event={id:'018fa100-0000-7000-8000-000000000001',store:'wortwerk.v2',deviceId:'device-a',createdAt:'2026-10-22T10:00:00.000Z',schemaVersion:1,type:'answer',payload:{answer:'a'}};

test('sync event union deduplicates, rejects conflicting ids and isolates users',async()=>{
  const x=await setup();try{
    const push={deviceId:'device-a',store:event.store,events:[event]};
    assert.equal((await x.request('/api/sync/push',push))?.status,200);await x.request('/api/sync/push',push);
    const result=await (await x.request(`/api/sync/pull?store=${event.store}&since=0`))?.json();assert.equal(result.events.length,1);assert.ok(result.cursor>0);
    const other=await (await x.request(`/api/sync/pull?store=${event.store}&since=0`,undefined,x.b.token))?.json();assert.equal(other.events.length,0);
    await assert.rejects(x.request('/api/sync/push',{...push,events:[{...event,payload:{changed:true}}]}),(e:unknown)=>!!e&&typeof e==='object'&&'status'in e&&e.status===409);
    await assert.rejects(x.request('/api/sync/push',push,x.a.token,'https://evil.invalid'),(e:unknown)=>!!e&&typeof e==='object'&&'status'in e&&e.status===403);
  }finally{x.db.close()}
});

test('document updates advance shared pull cursor and LWW tie breaks consistently',async()=>{
  const x=await setup();try{
    const a={store:'study.position',key:'position',updatedAt:'2026-10-22T10:00:00.000Z',deviceId:'device-a',schemaVersion:1,value:{lesson:2}};
    await x.request('/api/sync/push',{deviceId:'device-a',store:a.store,docs:[a]});
    const first=await (await x.request('/api/sync/pull?store=study.position&since=0'))?.json();assert.equal(first.docs[0].value.lesson,2);
    const b={...a,deviceId:'device-b',value:{lesson:3}};
    await x.request('/api/sync/push',{deviceId:'device-b',store:b.store,docs:[b]});
    const second=await (await x.request(`/api/sync/pull?store=study.position&since=${first.cursor}`))?.json();assert.ok(second.cursor>first.cursor);assert.equal(second.docs[0].value.lesson,3);
    await x.request('/api/sync/push',{deviceId:'device-a',store:a.store,docs:[a]});
    const unchanged=await (await x.request(`/api/sync/pull?store=study.position&since=${second.cursor}`))?.json();assert.equal(unchanged.docs.length,0);assert.equal(unchanged.cursor,second.cursor);
  }finally{x.db.close()}
});

test('anonymous, unknown stores, future clocks and forged assignment progress fail closed',async()=>{
  const x=await setup();try{
    await assert.rejects(x.request('/api/sync/pull?store=wortwerk.v2',undefined,''),(e:unknown)=>!!e&&typeof e==='object'&&'status'in e&&e.status===401);
    await assert.rejects(x.request('/api/sync/pull?store=users'));
    await assert.rejects(x.request('/api/sync/push',{deviceId:'device-a',store:event.store,events:[{...event,createdAt:'2099-01-01T00:00:00Z'}]}));
    await assert.rejects(x.request('/api/sync/push',{deviceId:'device-a',store:event.store,events:[{...event,type:'assignment.progress',payload:{assignmentId:'other-class',answered:1,correct:1,bySkill:{},completed:false}}]}));
    assert.equal((await x.db.prepare('SELECT COUNT(*) AS count FROM sync_events').first<{count:number}>())?.count,0);
  }finally{x.db.close()}
});

test('account transitions cannot send one account queue under another account cookie',async()=>{
  const x=await setup();try{
    await assert.rejects(x.request('/api/sync/push',{userId:'student-a',deviceId:'device-a',store:event.store,events:[event]},x.b.token),(e:unknown)=>!!e&&typeof e==='object'&&'status'in e&&e.status===403);
    await assert.rejects(x.request('/api/sync/pull?store=wortwerk.v2&userId=student-a',undefined,x.b.token),(e:unknown)=>!!e&&typeof e==='object'&&'status'in e&&e.status===403);
    assert.equal((await x.db.prepare('SELECT COUNT(*) AS count FROM sync_events').first<{count:number}>())?.count,0);
  }finally{x.db.close()}
});
