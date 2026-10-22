import { canonicalJson, mergeDocuments, type SyncDoc, type SyncStore } from '../../../../packages/sync/src/index.js';
import type { SyncStorage } from '../../../../packages/sync/src/client.js';
import { emptyStudy, parseStudy, STUDY_KEY } from '../study/storage';
import { defaultStudyScope, parseStudyScope, STUDY_SCOPE_KEY } from '../study/scope';
import type { StudyState } from '../study/types';

function documents(storage:SyncStorage):Array<{key:string;value:unknown}> {
  const study=parseStudy(storage.getItem(STUDY_KEY)),scope=parseStudyScope(storage.getItem(STUDY_SCOPE_KEY));
  return [
    {key:'scope',value:scope},{key:'resume',value:study.resume},{key:'lastLesson',value:study.lastLesson??null},{key:'reader',value:study.reader??null},
    ...Object.values(study.saved).map(value=>({key:`saved:${value.id}`,value})),
    ...study.bookmarks.map(value=>({key:`bookmark:${value}`,value})),
    ...study.completedPages.map(value=>({key:`completed:${value}`,value})),
    ...(study.reviewedProfessions??[]).map(value=>({key:`profession:${value}`,value})),
    ...Object.entries(study.lessonSessions??{}).map(([key,value])=>({key:`session:${key}`,value})),
    ...Object.entries(study.audioProgress??{}).map(([key,value])=>({key:`audio:${key}`,value})),
  ];
}
/** Legacy study views use separate local keys; keep each saved item as its own LWW document. */
export function createStudySyncStore(storage:SyncStorage,userId:string,deviceId:string,afterRemote:()=>void,assertScope:()=>void=()=>undefined):SyncStore {
  const rawStorage=storage;
  storage={getItem(key){assertScope();const value=rawStorage.getItem(key);assertScope();return value},setItem(key,value){assertScope();rawStorage.setItem(key,value);assertScope()},removeItem(key){assertScope();rawStorage.removeItem(key);assertScope()}};
  const metadataKey=`german-learning:sync-study-meta:v1:${encodeURIComponent(userId)}`;
  let metadata:SyncDoc[]=JSON.parse(storage.getItem(metadataKey)??'[]') as SyncDoc[];
  function observe():void {
    const next=new Map(documents(storage).map(doc=>[doc.key,doc.value]));
    for(const old of metadata)if(!next.has(old.key))next.set(old.key,null);
    const old=new Map(metadata.map(d=>[d.key,d]));
    const defaults:Record<string,unknown>={scope:defaultStudyScope(),resume:null,lastLesson:null,reader:null};
    metadata=[...next].map(([key,value])=>{
      const previous=old.get(key);
      return previous&&canonicalJson(previous.value)===canonicalJson(value)?previous:{store:'study.docs',key,value,deviceId,schemaVersion:1,updatedAt:!previous&&Object.hasOwn(defaults,key)&&canonicalJson(defaults[key])===canonicalJson(value)?'1970-01-01T00:00:00.000Z':new Date().toISOString()};
    });
    storage.setItem(metadataKey,JSON.stringify(metadata));
  }
  return {store:'study.docs',schemaVersion:1,strategy:'lww-doc',
    async localDocs(){observe();return metadata},
    async applyRemoteDocs(docs){
      observe();const merged=mergeDocuments(metadata,docs),old=new Map(metadata.map(d=>[d.key,canonicalJson(d)]));
      const current=parseStudy(storage.getItem(STUDY_KEY));
      const study:StudyState={...current,saved:{...current.saved},bookmarks:[...current.bookmarks],completedPages:[...current.completedPages],reviewedProfessions:[...(current.reviewedProfessions??[])],lessonSessions:{...current.lessonSessions},audioProgress:{...current.audioProgress}};
      let scope=parseStudyScope(storage.getItem(STUDY_SCOPE_KEY));
      for(const doc of merged) {
        if(old.get(doc.key)===canonicalJson(doc))continue;
        if(doc.store!=='study.docs')throw new Error('Invalid study document');
        const split=doc.key.indexOf(':'),kind=split<0?doc.key:doc.key.slice(0,split),id=split<0?'':doc.key.slice(split+1);
        const value=doc.value;
        switch(kind){
          case 'scope':scope=parseStudyScope(JSON.stringify(value));break;
          case 'resume':study.resume=value as string|null;break;
          case 'lastLesson':if(value===null)delete study.lastLesson;else study.lastLesson=value as number;break;
          case 'reader':if(value===null)delete study.reader;else study.reader=value as NonNullable<StudyState['reader']>;break;
          case 'saved':if(value===null)delete study.saved[id];else study.saved[id]=value as StudyState['saved'][string];break;
          case 'bookmark':study.bookmarks=study.bookmarks.filter(v=>v!==id);if(value!==null){if(value!==id)throw new Error('Invalid bookmark');study.bookmarks.push(id)}break;
          case 'completed':study.completedPages=study.completedPages.filter(v=>v!==id);if(value!==null){if(value!==id)throw new Error('Invalid completed page');study.completedPages.push(id)}break;
          case 'profession':study.reviewedProfessions=study.reviewedProfessions?.filter(v=>v!==id)??[];if(value!==null){if(value!==id)throw new Error('Invalid reviewed item');study.reviewedProfessions.push(id)}break;
          case 'session':if(value===null)delete study.lessonSessions?.[id];else{study.lessonSessions??={};study.lessonSessions[id]=value as NonNullable<StudyState['lessonSessions']>[string]}break;
          case 'audio':if(value===null)delete study.audioProgress?.[id];else{study.audioProgress??={};study.audioProgress[id]=value as number}break;
          default:throw new Error('Invalid study document key');
        }
      }
      // Full existing parser validation happens before either local key is written.
      const validated=parseStudy(JSON.stringify(study));
      const oldStudy=storage.getItem(STUDY_KEY),oldScope=storage.getItem(STUDY_SCOPE_KEY);
      try{storage.setItem(STUDY_KEY,JSON.stringify(validated));storage.setItem(STUDY_SCOPE_KEY,JSON.stringify(scope));storage.setItem(metadataKey,JSON.stringify(merged));metadata=merged}
      catch(error){if(oldStudy===null)storage.removeItem(STUDY_KEY);else storage.setItem(STUDY_KEY,oldStudy);if(oldScope===null)storage.removeItem(STUDY_SCOPE_KEY);else storage.setItem(STUDY_SCOPE_KEY,oldScope);throw error}
      afterRemote();
    },
  };
}
export {emptyStudy};
