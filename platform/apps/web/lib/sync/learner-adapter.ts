import { createEmptyLearnerState, parseLearnerEvent, type LearnerStateEnvelope, type LearnerStateStorageAdapter } from '@german-learning/learning';
import { canonicalJson, mergeDocuments, type SyncDoc, type SyncEvent, type SyncStore } from '../../../../packages/sync/src/index.js';
import type { SyncStorage } from '../../../../packages/sync/src/client.js';

type Metadata={order:string[];docs:SyncDoc[]};
type Options={deviceId:string;userId:string;storage:SyncStorage;now?:()=>Date;emptyState:()=>LearnerStateEnvelope;onChange?:()=>void;afterRemote?:()=>void;assertScope?:()=>void};
type Entry={field:'settings'|'resume'|'notes'|'tags'|'activityProgress'|'reviewCards'|'recordings';id?:string};
function entries(state:LearnerStateEnvelope):Array<{key:string;value:unknown}> {
  return [
    {key:'settings',value:state.settings},{key:'resume',value:state.resume},
    ...state.notes.map(value=>({key:`note:${value.noteId}`,value})),
    ...state.tags.map(value=>({key:`tag:${value.contentId}:${value.tag}`,value})),
    ...state.activityProgress.map(value=>({key:`activity:${value.activityId}`,value})),
    ...state.reviewCards.map(value=>({key:`card:${value.cardId}`,value})),
    ...state.recordings.map(value=>({key:`recording:${value.recordingId}`,value})),
  ];
}
function entry(key:string):Entry|null {
  if(key==='settings'||key==='resume')return {field:key};
  const split=key.indexOf(':'),prefix=key.slice(0,split),id=key.slice(split+1);
  const fields={note:'notes',tag:'tags',activity:'activityProgress',card:'reviewCards',recording:'recordings'} as const;
  if(split<1||!id||!Object.hasOwn(fields,prefix))return null;
  return {field:fields[prefix as keyof typeof fields],id};
}
function itemKey(field:Entry['field'],value:unknown):string {
  if(!value||typeof value!=='object')throw new Error('Invalid synced learner document');
  const v=value as Record<string,unknown>;
  const id=field==='notes'?v.noteId:field==='tags'?`${String(v.contentId)}:${String(v.tag)}`:field==='activityProgress'?v.activityId:field==='reviewCards'?v.cardId:v.recordingId;
  if(typeof id!=='string')throw new Error('Invalid synced learner document');
  return id;
}
/** Wrap the existing validator/adapter; remote data must pass its normal replace validation. */
export function wrapLearnerStateAdapter(base:LearnerStateStorageAdapter,options:Options):{
  adapter:LearnerStateStorageAdapter;eventStore:SyncStore;docStore:SyncStore;observe():Promise<void>;
} {
  const unguarded=base;
  base={async load(){options.assertScope?.();const value=await unguarded.load();options.assertScope?.();return value},async replace(value){options.assertScope?.();await unguarded.replace(value);options.assertScope?.()},async clear(){options.assertScope?.();await unguarded.clear();options.assertScope?.()}};
  options.assertScope?.();
  const key=`german-learning:sync-learner-meta:v1:${encodeURIComponent(options.userId)}`;
  let metadata:Metadata=JSON.parse(options.storage.getItem(key)??'{"order":[],"docs":[]}') as Metadata;
  const save=()=>{options.assertScope?.();options.storage.setItem(key,JSON.stringify(metadata))};
  let remote=false;
  async function observe():Promise<void> {
    const state=await base.load();if(!state)return;
    const known=new Set(metadata.order);
    for(const event of state.events)if(!known.has(event.eventId)){metadata.order.push(event.eventId);known.add(event.eventId)}
    const current=entries(state),byKey=new Map(current.map(e=>[e.key,e.value]));
    for(const previous of metadata.docs)if(!byKey.has(previous.key))byKey.set(previous.key,null);
    const previous=new Map(metadata.docs.map(d=>[d.key,d]));
    const defaults=new Map(entries(options.emptyState()).map(e=>[e.key,canonicalJson(e.value)]));
    metadata.docs=[...byKey].map(([docKey,value])=>{
      const old=previous.get(docKey);
      return old&&canonicalJson(old.value)===canonicalJson(value)?old:{store:'learner.docs',key:docKey,value,deviceId:options.deviceId,schemaVersion:1,updatedAt:!old&&defaults.get(docKey)===canonicalJson(value)?'1970-01-01T00:00:00.000Z':(options.now?.()??new Date()).toISOString()};
    });
    save();
  }
  const adapter:LearnerStateStorageAdapter={
    load:()=>base.load(),
    async replace(state){await base.replace(state);if(!remote){await observe();options.onChange?.()}},
    async clear(){await base.clear();metadata={order:[],docs:[]};save();if(!remote)options.onChange?.()},
  };
  const eventStore:SyncStore={store:'learner.events',schemaVersion:1,strategy:'event-log',
    async localEventsSince(cursor){
      await observe();const state=await base.load();
      const map=new Map(state?.events.map(e=>[e.eventId,e])??[]);
      const start=Number(cursor??0);if(!Number.isSafeInteger(start)||start<0)throw new Error('Invalid learner cursor');
      const events=metadata.order.slice(start).flatMap(id=>{
        const event=map.get(id);return event?[{id:event.eventId,store:'learner.events',deviceId:`learner:${event.sessionId}`,createdAt:event.timestamp,schemaVersion:1,type:'learner.event',payload:event}]:[];
      });
      return {events,cursor:String(metadata.order.length)};
    },
    async applyRemoteEvents(events){
      const state=await base.load()??options.emptyState();
      const merged=new Map(state.events.map(e=>[e.eventId,e]));
      for(const event of events){
        if(event.type!=='learner.event'||event.store!=='learner.events')throw new Error('Invalid learner event');
        const value=parseLearnerEvent(event.payload);
        if(value.eventId!==event.id||Date.parse(value.timestamp)!==Date.parse(event.createdAt))throw new Error('Invalid learner event identity');
        const existing=merged.get(value.eventId);
        if(existing&&canonicalJson(existing)!==canonicalJson(value))throw new Error('Conflicting learner event');
        merged.set(value.eventId,value);
      }
      remote=true;
      try{await base.replace({...state,events:[...merged.values()]});await observe();options.afterRemote?.()}finally{remote=false}
    },
  };
  const docStore:SyncStore={store:'learner.docs',schemaVersion:1,strategy:'lww-doc',
    async localDocs(){await observe();return metadata.docs},
    async applyRemoteDocs(docs){
      await observe();const state=await base.load()??options.emptyState();
      const winning=mergeDocuments(metadata.docs,docs);
      const old=new Map(metadata.docs.map(d=>[d.key,canonicalJson(d)]));
      const updates=winning.filter(doc=>old.get(doc.key)!==canonicalJson(doc));
      let candidate={...state} as LearnerStateEnvelope;
      for(const doc of updates){
        if(doc.store!=='learner.docs')throw new Error('Invalid learner document store');
        const target=entry(doc.key);if(!target)throw new Error('Invalid learner document key');
        if(target.field==='settings'||target.field==='resume')candidate={...candidate,[target.field]:doc.value};
        else{
          const field=target.field;
          const rows=candidate[field] as readonly unknown[];
          const rest=rows.filter(value=>itemKey(field,value)!==target.id);
          if(doc.value!==null){if(itemKey(field,doc.value)!==target.id)throw new Error('Invalid learner document identity');rest.push(doc.value)}
          candidate={...candidate,[field]:rest};
        }
      }
      remote=true;
      try{await base.replace(candidate);metadata={...metadata,docs:winning};save();options.afterRemote?.()}finally{remote=false}
    },
  };
  return {adapter,eventStore,docStore,observe};
}
export const emptyLearnerForBundle=(state:LearnerStateEnvelope):LearnerStateEnvelope=>createEmptyLearnerState({contentBundle:state.contentBundle});
