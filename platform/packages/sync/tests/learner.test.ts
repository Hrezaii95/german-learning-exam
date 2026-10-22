import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyLearnerState,createKeyValueLearnerStateAdapter,type LearnerEvent } from '../../learning/src/index.ts';
import { ALPHA_CONTENT_BUNDLE,learnerPublishedContentResolver } from '../../../apps/web/lib/learner-state/registry.ts';
import { wrapLearnerStateAdapter } from '../../../apps/web/lib/sync/learner-adapter.ts';
const backing=()=>{const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}}};
const emptyState=()=>createEmptyLearnerState({contentBundle:ALPHA_CONTENT_BUNDLE});
const event:LearnerEvent={schemaVersion:'1.0.0',kind:'objectiveAttempt',eventId:'22222222-2222-4222-8222-000000000001',sessionId:'11111111-1111-4111-8111-111111111111',timestamp:'2026-10-22T10:00:00.000Z',conceptId:'lex:ingenieur',taskFamily:'typedRecall',graderOutcome:'correct',latencyMs:900,hintsUsed:0,measuredDimensions:['recall'],sourceActivityMode:'recall'};

test('validated learner adapter replays union and retains original event identity across devices',async()=>{
  const a=backing(),b=backing();
  const adapterA=createKeyValueLearnerStateAdapter({store:a,publishedIds:learnerPublishedContentResolver,expectedContentBundle:ALPHA_CONTENT_BUNDLE});
  const adapterB=createKeyValueLearnerStateAdapter({store:b,publishedIds:learnerPublishedContentResolver,expectedContentBundle:ALPHA_CONTENT_BUNDLE});
  await adapterA.replace(emptyState());await adapterB.replace(emptyState());
  const aw=wrapLearnerStateAdapter(adapterA,{storage:a,userId:'same-user',deviceId:'device-a',emptyState});
  const bw=wrapLearnerStateAdapter(adapterB,{storage:b,userId:'same-user',deviceId:'device-b',emptyState});
  const state=(await aw.adapter.load())!;await aw.adapter.replace({...state,events:[event],settings:{...state.settings,timezone:'Asia/Yerevan'}});
  const batch=await aw.eventStore.localEventsSince!(null);
  await bw.docStore.applyRemoteDocs!(await aw.docStore.localDocs!());
  await bw.eventStore.applyRemoteEvents!(batch.events);await bw.eventStore.applyRemoteEvents!(batch.events);
  assert.equal((await bw.adapter.load())!.events.length,1);assert.equal((await bw.adapter.load())!.settings.timezone,'Asia/Yerevan');
  assert.deepEqual((await bw.eventStore.localEventsSince!(null)).events,batch.events);
  await assert.rejects(bw.eventStore.applyRemoteEvents!([{...batch.events[0]!,payload:{...event,conceptId:'lex:unpublished-invalid'}}]));
  assert.equal((await bw.adapter.load())!.events[0]!.conceptId,'lex:ingenieur');
});
