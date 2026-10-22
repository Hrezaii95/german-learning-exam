"use client";
import { createEmptyLearnerState, createKeyValueLearnerStateAdapter } from '@german-learning/learning';
import { SyncEngine, type SyncSnapshot } from '../../../../packages/sync/src/client.js';
import { SyncRegistry, type SyncStore } from '../../../../packages/sync/src/index.js';
import { ALPHA_CONTENT_BUNDLE, learnerPublishedContentResolver } from '../learner-state/registry';
import { createCompleteBackup, emptyCompleteBackup, parseBackup, mergeBackup, applyBackup, BACKUP_KEYS, type CompleteBackup } from '../study/backup';
import { wrapLearnerStateAdapter } from './learner-adapter';
import { createStudySyncStore } from './study-store';

export type BrowserSyncSnapshot=SyncSnapshot & {needsConsent:boolean};
const signedOut:BrowserSyncSnapshot={status:'signed-out',pending:0,lastSyncedAt:null,needsConsent:false};
let snapshot:BrowserSyncSnapshot=signedOut;
const listeners=new Set<()=>void>();
let engine:SyncEngine|null=null,userId:string|null=null,registry:SyncRegistry|null=null,activeEpoch:string|null=null;
let timer:number|null=null,cleanupEvents:(()=>void)|null=null,unsubscribeEngine:(()=>void)|null=null;
let transition=Promise.resolve(),isolationFailure:Error|null=null;
let pendingRecovery:{values:Array<[string,string|null]>;owner:string|null}|null=null;
let cleanupOwner:string|null=null;
const externalStores=new Map<string,{userId:string;store:SyncStore}>();
const OWNER='german-learning:local-owner:v1',EPOCH='german-learning:local-owner-epoch:v1',ANONYMOUS='german-learning:anonymous-backup:v1';
const accountKey=(id:string)=>`german-learning:account-local:v1:${encodeURIComponent(id)}`;
const consentKey=(id:string)=>`german-learning:device-progress-consent:v1:${encodeURIComponent(id)}`;
function publish(next:BrowserSyncSnapshot):void{snapshot=next;for(const listener of listeners){try{listener()}catch{/* Subscribers cannot corrupt sync. */}}}
export const getSyncSnapshot=():BrowserSyncSnapshot=>snapshot;
export const subscribeSync=(listener:()=>void):(()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener)};
export const getServerSyncSnapshot=():BrowserSyncSnapshot=>signedOut;
function changed():void {
  const storage=window.localStorage;
  // Same-tab writes do not generate native storage events. Each existing consumer
  // filters its own key and reads newValue; notify the complete validated snapshot.
  const updates=BACKUP_KEYS.map(key=>({key,newValue:storage.getItem(key)}));
  for(const update of updates)window.dispatchEvent(new StorageEvent('storage',{...update,storageArea:storage,url:window.location.href}));
}
function owns(id:string,epoch:string|null):boolean {return window.localStorage.getItem(OWNER)===id&&window.localStorage.getItem(EPOCH)===epoch}
function abortWithoutPersisting():SyncEngine|null {
  if(timer!==null){window.clearInterval(timer);timer=null}
  cleanupEvents?.();cleanupEvents=null;unsubscribeEngine?.();unsubscribeEngine=null;
  const previous=engine;engine=null;previous?.stop();registry=null;return previous;
}
function foreignAccount():Error {
  abortWithoutPersisting();
  isolationFailure=new Error('Another account is active in another tab. Reload before syncing.');
  publish({...snapshot,status:'error',error:isolationFailure.message});
  // The owned account UI immediately hard-reloads; no stale app controller should keep writing.
  window.dispatchEvent(new window.CustomEvent('german-learning:account-storage-changed'));
  return isolationFailure;
}
function assertOwnership(id:string,epoch:string|null):void {if(!owns(id,epoch))throw foreignAccount()}
function persistOwner(owner:string):void {
  if(owner.startsWith('!transition:'))throw new Error('Another account transition is in progress.');
  const epoch=window.localStorage.getItem(EPOCH);
  const backup=createCompleteBackup(window.localStorage);
  if(window.localStorage.getItem(OWNER)!==owner||window.localStorage.getItem(EPOCH)!==epoch)throw new Error('Account changed while saving local progress.');
  window.localStorage.setItem(accountKey(owner),JSON.stringify(backup));
}
function persistActive():void {if(userId){assertOwnership(userId,activeEpoch);persistOwner(userId)}}
function hasProgress(backup:CompleteBackup):boolean {return backup.learner.events.length>0||backup.learner.notes.length>0||backup.learner.tags.length>0||backup.learner.activityProgress.length>0||Object.keys(backup.study.saved).length>0||backup.study.completedPages.length>0||backup.study.bookmarks.length>0}
/** A bridge must namespace storage and recreate Lane 2 stores for this exact account. */
export function registerExternalSyncStores(stores:SyncStore[],scope?:{userId:string;isolated:true}):void {
  if(!stores.length)return;
  if(!scope?.isolated||scope.userId!==userId)throw new Error('External sync stores require account-isolated storage.');
  assertOwnership(scope.userId,activeEpoch);
  for(const store of stores){externalStores.set(`${scope.userId}:${store.store}`,{userId:scope.userId,store});registry?.register(store)}
}
function restoreRaw(values:Array<[string,string|null]>,owner:string|null):void {
  const storage=window.localStorage;
  // Epochs never rewind: an older engine remains invalid after a failed transition/rollback.
  storage.setItem(EPOCH,crypto.randomUUID());storage.setItem(OWNER,`!transition:${crypto.randomUUID()}`);
  for(const [key,value] of values){if(value===null)storage.removeItem(key);else storage.setItem(key,value)}
  if(owner===null)storage.removeItem(OWNER);else storage.setItem(OWNER,owner);
}
function switchBackup(incoming:Parameters<typeof applyBackup>[1],owner:string|null):void {
  const storage=window.localStorage;
  const recovery={values:BACKUP_KEYS.map(key=>[key,storage.getItem(key)] as [string,string|null]),owner:storage.getItem(OWNER)};
  try{
    // Invalidate every tab before changing any shared learner key; no old engine can capture new-owner data.
    storage.setItem(EPOCH,crypto.randomUUID());storage.setItem(OWNER,`!transition:${crypto.randomUUID()}`);
    applyBackup(storage,incoming);
    if(owner===null)storage.removeItem(OWNER);else storage.setItem(OWNER,owner);
  }catch(error){try{restoreRaw(recovery.values,recovery.owner)}catch{pendingRecovery=recovery}throw error}
}
function enqueue(operation:()=>Promise<void>):Promise<void> {
  const work=transition.then(operation);transition=work.then(()=>undefined,()=>undefined);
  return work.catch(error=>{isolationFailure=error instanceof Error?error:new Error('Local account isolation failed.');publish({...snapshot,status:'error',error:isolationFailure.message});throw isolationFailure});
}
async function halt():Promise<void> {
  const priorId=userId,priorEpoch=activeEpoch,previous=abortWithoutPersisting();await previous?.settled();
  if(priorId&&owns(priorId,priorEpoch))persistOwner(priorId);
  userId=null;activeEpoch=null;
}
async function start(id:string,network=true):Promise<void> {
  if(typeof window==='undefined')return;
  if(userId===id&&((network&&engine)||(!network&&!engine))){assertOwnership(id,activeEpoch);persistActive();return}
  if(!id||id.length>100)throw new Error('Invalid account');
  if(userId===id){const epoch=activeEpoch,previous=abortWithoutPersisting();await previous?.settled();assertOwnership(id,epoch)}else await halt();
  const storage=window.localStorage,owner=storage.getItem(OWNER);
  if(owner?.startsWith('!transition:'))throw new Error('Another account transition is in progress.');
  if(owner!==id){
    if(!owner)storage.setItem(ANONYMOUS,JSON.stringify(createCompleteBackup(storage)));else persistOwner(owner);
    const local=storage.getItem(accountKey(id));switchBackup(local?parseBackup(local):emptyCompleteBackup(),id);
  }else if(storage.getItem(EPOCH)===null)storage.setItem(EPOCH,crypto.randomUUID());
  userId=id;activeEpoch=storage.getItem(EPOCH);const epoch=activeEpoch;
  const guard=()=>assertOwnership(id,epoch);guard();changed();
  const unsigned=storage.getItem(ANONYMOUS),prior=unsigned?JSON.parse(unsigned) as CompleteBackup:null;
  const needsConsent=storage.getItem(consentKey(id))===null&&prior!==null&&hasProgress(prior);
  if(!needsConsent&&storage.getItem(consentKey(id))===null)storage.setItem(consentKey(id),'separate');
  if(!network){
    // A confirmed forced-password identity still owns its local keys; only network sync is paused.
    publish({status:'paused',pending:0,lastSyncedAt:null,needsConsent});
    const storageChanged=(event:StorageEvent)=>{if((event.key===OWNER||event.key===EPOCH)&&!owns(id,epoch))foreignAccount()};
    window.addEventListener('storage',storageChanged);cleanupEvents=()=>window.removeEventListener('storage',storageChanged);
    persistActive();return;
  }
  let device=storage.getItem('german-learning:device-id:v1');if(!device){device=crypto.randomUUID();storage.setItem('german-learning:device-id:v1',device)}
  const base=createKeyValueLearnerStateAdapter({store:storage,publishedIds:learnerPublishedContentResolver,expectedContentBundle:ALPHA_CONTENT_BUNDLE});
  const learner=wrapLearnerStateAdapter(base,{deviceId:device,userId:id,storage,emptyState:()=>createEmptyLearnerState({contentBundle:ALPHA_CONTENT_BUNDLE}),afterRemote:changed,assertScope:guard});
  registry=new SyncRegistry();registry.register(learner.docStore);registry.register(learner.eventStore);registry.register(createStudySyncStore(storage,id,device,changed,guard));
  for(const entry of externalStores.values())if(entry.userId===id)registry.register(entry.store);
  const current=new SyncEngine({userId:id,deviceId:device,storage,registry,fetch:(url,init)=>fetch(url,init),online:()=>navigator.onLine,assertScope:guard});engine=current;
  unsubscribeEngine=current.subscribe(()=>publish({...current.getSnapshot(),needsConsent:snapshot.needsConsent}));publish({...current.getSnapshot(),needsConsent});
  const cycle=(force=false)=>{void current.cycle(force).then(()=>{if(engine===current){try{persistActive()}catch(error){publish({...snapshot,status:'error',error:error instanceof Error?error.message:'Local progress could not be saved.'})}}})};
  // Observe same-tab writes without modifying the existing lane-owned controller.
  timer=window.setInterval(()=>cycle(),5000);
  const focus=()=>cycle(true),online=()=>cycle(true),storageChanged=(event:StorageEvent)=>{if((event.key===OWNER||event.key===EPOCH)&&!owns(id,epoch))foreignAccount()};
  const periodic=window.setInterval(()=>cycle(true),600000);
  window.addEventListener('focus',focus);window.addEventListener('online',online);window.addEventListener('offline',online);window.addEventListener('storage',storageChanged);
  cleanupEvents=()=>{window.removeEventListener('focus',focus);window.removeEventListener('online',online);window.removeEventListener('offline',online);window.removeEventListener('storage',storageChanged);window.clearInterval(periodic)};
  await current.cycle(true);guard();persistActive();
}
export function startAccountSync(id:string):Promise<void>{return enqueue(async()=>{if(isolationFailure)throw isolationFailure;await start(id)})}
/** Isolate a confirmed identity's local progress without any protected API request.
 * Used while a mandatory password change blocks sync. Enabling the same identity later reuses these keys.
 */
export function isolateAccountStorage(id:string):Promise<void>{return enqueue(async()=>{if(isolationFailure)throw isolationFailure;await start(id,false)})}
export function stopAccountSync(options:{restoreStaleOwner?:boolean}={}):Promise<void>{return enqueue(async()=>{
  if(typeof window==='undefined')return;
  const storage=window.localStorage;
  // A stale tab must never restore its anonymous backup over another tab's active account.
  if(userId&&!owns(userId,activeEpoch)&&!pendingRecovery){const previous=abortWithoutPersisting();await previous?.settled();userId=null;activeEpoch=null;cleanupOwner=null;isolationFailure=null;publish(signedOut);return}
  if(pendingRecovery){cleanupOwner=pendingRecovery.owner;restoreRaw(pendingRecovery.values,pendingRecovery.owner);pendingRecovery=null}
  const owner=storage.getItem(OWNER);
  if(!engine&&!userId&&cleanupOwner!==owner){
    if(!owner||!options.restoreStaleOwner){isolationFailure=null;publish(signedOut);return}
    // A loading/unavailable cleanup never clears another tab. Even a confirmed
    // signed-out view rechecks the current shared cookie before stale recovery.
    const epoch=storage.getItem(EPOCH);
    const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});
    if(response.status!==401||storage.getItem(OWNER)!==owner||storage.getItem(EPOCH)!==epoch){isolationFailure=null;publish(signedOut);return}
    cleanupOwner=owner;
  }
  if(!engine&&!userId&&!owner){cleanupOwner=null;isolationFailure=null;publish(signedOut);return}
  cleanupOwner=userId??cleanupOwner;
  await halt();
  const unsigned=storage.getItem(ANONYMOUS);switchBackup(unsigned?parseBackup(unsigned):emptyCompleteBackup(),null);
  cleanupOwner=null;isolationFailure=null;publish(signedOut);changed();
})}
export async function resolveDeviceProgressConsent(add:boolean):Promise<void>{
  const expectedUser=userId;await transition;if(isolationFailure)throw isolationFailure;
  if(userId!==expectedUser)throw new Error('Account changed before consent was saved.');if(!userId)return;
  const id=userId;assertOwnership(id,activeEpoch);const storage=window.localStorage;
  if(add){const raw=storage.getItem(ANONYMOUS);if(raw){const incoming=parseBackup(raw);assertOwnership(id,activeEpoch);applyBackup(storage,mergeBackup(createCompleteBackup(storage),incoming));assertOwnership(id,activeEpoch);changed()}}
  storage.setItem(consentKey(id),add?'added':'separate');publish({...snapshot,needsConsent:false});persistActive();await engine?.cycle(true);
}
/** Call after a validated backup import. An account change invalidates the operation. */
export async function notifyImportedBackup():Promise<void>{const expectedUser=userId;await transition;if(isolationFailure)throw isolationFailure;if(userId!==expectedUser)throw new Error('Account changed during import.');if(userId)assertOwnership(userId,activeEpoch);changed();persistActive();await engine?.cycle(true)}
