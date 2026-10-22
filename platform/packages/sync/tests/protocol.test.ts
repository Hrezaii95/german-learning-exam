import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncRegistry, mergeEvents, mergeDocuments, validateEvent, validateDocument } from '../src/index.ts';

test('event union is idempotent and rejects conflicting ids', () => {
  const event = { id:'018fa100-0000-7000-8000-000000000001',store:'learner.events',deviceId:'device-a',createdAt:'2026-10-22T10:00:00.000Z',schemaVersion:1,type:'learner.event',payload:{kind:'exposure'} };
  assert.equal(mergeEvents([event],[event]).length,1);
  assert.throws(()=>mergeEvents([event],[{...event,payload:{kind:'changed'}}]),/conflicting/i);
});

test('LWW conflict resolution is order independent, including equal clocks', () => {
  const a={store:'learner.docs',key:'settings',deviceId:'device-a',updatedAt:'2026-10-22T10:00:00.000Z',schemaVersion:1,value:{timezone:'UTC'}};
  const b={...a,deviceId:'device-b',value:{timezone:'Asia/Yerevan'}};
  assert.deepEqual(mergeDocuments([a],[b]),mergeDocuments([b],[a]));
  assert.deepEqual(mergeDocuments([b],[b]),[b]);
});

test('registry rejects mismatched duplicate registration and payload validation is bounded', () => {
  const registry=new SyncRegistry();
  registry.register({store:'learner.events',schemaVersion:1,strategy:'event-log'});
  assert.throws(()=>registry.register({store:'learner.events',schemaVersion:2,strategy:'event-log'}),/registered/i);
  assert.throws(()=>validateEvent({store:'learner.events'},new Date()),/invalid/i);
  const base={store:'learner.docs',key:'settings',deviceId:'device-a',updatedAt:'2099-01-01T00:00:00.000Z',schemaVersion:1,value:null};
  assert.throws(()=>validateDocument(base,new Date('2026-10-22T10:00:00Z')),/future/i);
});
