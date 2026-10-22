import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

/** Real browser-like storage, existing backup validators and real runtime composition. */
test('account switching preserves unsigned data, requires consent, isolates accounts and queues offline edits',async()=>{
  const dom=new JSDOM('',{url:'https://german.learnilabs.com'});
  const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),priorEvent=Object.getOwnPropertyDescriptor(globalThis,'StorageEvent'),priorFetch=globalThis.fetch;
  Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});
  Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
  Object.defineProperty(globalThis,'StorageEvent',{value:dom.window.StorageEvent,configurable:true});
  let online=true;Object.defineProperty(dom.window.navigator,'onLine',{get:()=>online,configurable:true});
  const pushes:Array<{userId:string;store:string;events?:unknown[];docs?:unknown[]}>=[];
  globalThis.fetch=(async(input:string|URL|Request,init?:RequestInit)=>{
    const url=String(input);
    if(url.startsWith('/api/sync/push')){pushes.push(JSON.parse(String(init?.body)));return new Response('{"ok":true}')}
    return new Response('{"events":[],"docs":[],"cursor":0,"hasMore":false}');
  }) as typeof fetch;
  const runtime=await import('../../../apps/web/lib/sync/browser.ts');
  const originalSetItem=dom.window.Storage.prototype.setItem;
  let failRestore=false;
  dom.window.Storage.prototype.setItem=function(key:string,value:string){if(failRestore&&key==='german-learning-os:study-book:v1')throw new Error('Fixture storage failure');return originalSetItem.call(this,key,value)};
  const store=dom.window.localStorage;
  try{
    store.setItem('german-learning-os:study-book:v1',JSON.stringify({version:1,saved:{'anon-word':{id:'anon-word',title:'Anonymous',meaning:'before login',kind:'word',href:'/words/anon/'}},bookmarks:[],completedPages:[],resume:null}));
    const unsignedBytes=store.getItem('german-learning-os:study-book:v1');
    await runtime.stopAccountSync();
    assert.equal(store.getItem('german-learning-os:study-book:v1'),unsignedBytes,'initial UI cleanup must preserve unsigned bytes');
    await runtime.startAccountSync('account-a');
    assert.equal(runtime.getSyncSnapshot().needsConsent,true);
    assert.equal(Object.keys(JSON.parse(store.getItem('german-learning-os:study-book:v1')!).saved).length,0);
    assert.ok(pushes.every(push=>!JSON.stringify(push).includes('Anonymous')));
    await runtime.resolveDeviceProgressConsent(true);
    assert.equal(runtime.getSyncSnapshot().needsConsent,false);
    assert.equal(JSON.parse(store.getItem('german-learning-os:study-book:v1')!).saved['anon-word'].title,'Anonymous');
    assert.ok(pushes.some(push=>push.userId==='account-a'&&JSON.stringify(push).includes('Anonymous')));
    await runtime.stopAccountSync();
    assert.equal(JSON.parse(store.getItem('german-learning-os:study-book:v1')!).saved['anon-word'].title,'Anonymous');
    const unsigned=JSON.parse(store.getItem('german-learning-os:study-book:v1')!);
    unsigned.saved['later-anon']={id:'later-anon',title:'Later anonymous edit',meaning:'after logout',kind:'word',href:'/words/later/'};
    store.setItem('german-learning-os:study-book:v1',JSON.stringify(unsigned));
    const latestUnsigned=store.getItem('german-learning-os:study-book:v1');
    await runtime.stopAccountSync();
    assert.equal(store.getItem('german-learning-os:study-book:v1'),latestUnsigned,'repeated UI cleanup must not restore a stale anonymous backup');
    await runtime.startAccountSync('account-b');await runtime.resolveDeviceProgressConsent(false);
    assert.equal(Object.keys(JSON.parse(store.getItem('german-learning-os:study-book:v1')!).saved).length,0);
    assert.ok(pushes.filter(push=>push.userId==='account-b').every(push=>!JSON.stringify(push).includes('Anonymous')));
    online=false;
    store.setItem('german-learning-os:study-book:v1',JSON.stringify({version:1,saved:{'b-word':{id:'b-word',title:'Only B',meaning:'offline',kind:'word',href:'/words/b/'}},bookmarks:[],completedPages:[],resume:null}));
    await runtime.notifyImportedBackup();assert.equal(runtime.getSyncSnapshot().status,'offline');assert.ok(runtime.getSyncSnapshot().pending>0);
    online=true;await runtime.notifyImportedBackup();assert.ok(pushes.some(push=>push.userId==='account-b'&&JSON.stringify(push).includes('Only B')));
    assert.throws(()=>runtime.registerExternalSyncStores([{store:'wortwerk.v2',schemaVersion:1,strategy:'event-log'}]),/isolated/);
    await runtime.startAccountSync('account-a');
    const restored=JSON.parse(store.getItem('german-learning-os:study-book:v1')!);
    assert.ok(restored.saved['anon-word']);assert.equal(restored.saved['b-word'],undefined);
    failRestore=true;
    await assert.rejects(runtime.stopAccountSync(),/could not be saved|storage failure/);
    await assert.rejects(runtime.startAccountSync('must-not-start'),/could not be saved|storage failure/);
    assert.ok(pushes.every(push=>push.userId!=='must-not-start'),'storage failure must block the next account');
    failRestore=false;await runtime.stopAccountSync();
    assert.ok(JSON.parse(store.getItem('german-learning-os:study-book:v1')!).saved['later-anon'],'successful retry restores latest unsigned progress');
  }finally{
    failRestore=false;await runtime.stopAccountSync();dom.window.Storage.prototype.setItem=originalSetItem;dom.window.close();globalThis.fetch=priorFetch;
    if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else Reflect.deleteProperty(globalThis,'window');
    if(priorNavigator)Object.defineProperty(globalThis,'navigator',priorNavigator);else Reflect.deleteProperty(globalThis,'navigator');
    if(priorEvent)Object.defineProperty(globalThis,'StorageEvent',priorEvent);else Reflect.deleteProperty(globalThis,'StorageEvent');
  }
});

// The second test runs in an isolated module instance for each simulated tab.
test('a stale tab never captures or uploads another tab account progress',async()=>{
  const dom=new JSDOM('',{url:'https://german.learnilabs.com'});
  const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),priorEvent=Object.getOwnPropertyDescriptor(globalThis,'StorageEvent'),priorFetch=globalThis.fetch;
  Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});Object.defineProperty(globalThis,'StorageEvent',{value:dom.window.StorageEvent,configurable:true});
  let cookieUser='account-a';const accepted:unknown[]=[],attempts:Array<{userId:string;docs?:unknown[];events?:unknown[]}>=[];
  globalThis.fetch=(async(input:string|URL|Request,init?:RequestInit)=>{
    if(String(input).startsWith('/api/sync/push')){const body=JSON.parse(String(init?.body));attempts.push(body);if(body.userId!==cookieUser)return new Response('{}',{status:403});accepted.push(body);return new Response('{"ok":true}')}
    const url=new URL(String(input),'https://german.learnilabs.com');if(url.searchParams.get('userId')!==cookieUser)return new Response('{}',{status:403});return new Response('{"events":[],"docs":[],"cursor":0,"hasMore":false}');
  }) as typeof fetch;
  const a=await import('../../../apps/web/lib/sync/browser.ts?tab-a'),b=await import('../../../apps/web/lib/sync/browser.ts?tab-b'),c=await import('../../../apps/web/lib/sync/browser.ts?tab-c');
  let accountEvents=0;dom.window.addEventListener('german-learning:account-storage-changed',()=>{accountEvents++});
  try{
    await a.startAccountSync('account-a');cookieUser='account-b';await b.startAccountSync('account-b');
    dom.window.localStorage.setItem('german-learning-os:study-book:v1',JSON.stringify({version:1,saved:{'b-private':{id:'b-private',title:'Private B note',meaning:'must remain B',kind:'word',href:'/words/b/'}},bookmarks:[],completedPages:[],resume:null}));
    const activeB=dom.window.localStorage.getItem('german-learning-os:study-book:v1');
    await c.stopAccountSync();assert.equal(dom.window.localStorage.getItem('german-learning-os:study-book:v1'),activeB,'a fresh tab cleanup must not restore over active B');
    await assert.rejects(a.notifyImportedBackup(),/account|another tab/i);
    const queueA=dom.window.localStorage.getItem('german-learning:sync:v1:account-a');
    assert.ok(!queueA?.includes('Private B note'),'stale tab must never queue another account data');
    cookieUser='account-a';await assert.rejects(a.notifyImportedBackup(),/account|another tab/i);
    assert.ok(accepted.every(body=>!JSON.stringify(body).includes('Private B note')));
    assert.ok(accountEvents>0,'the stale UI is told to reload');
    cookieUser='account-b';await b.notifyImportedBackup();assert.ok(accepted.some(body=>JSON.stringify(body).includes('Private B note')));
    const before=dom.window.localStorage.getItem('german-learning-os:study-book:v1');await a.stopAccountSync();
    assert.equal(dom.window.localStorage.getItem('german-learning-os:study-book:v1'),before,'foreign-tab stop must preserve the active owner');
  }finally{
    await a.stopAccountSync().catch(()=>{});await b.stopAccountSync().catch(()=>{});dom.window.close();globalThis.fetch=priorFetch;
    if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else Reflect.deleteProperty(globalThis,'window');if(priorNavigator)Object.defineProperty(globalThis,'navigator',priorNavigator);else Reflect.deleteProperty(globalThis,'navigator');if(priorEvent)Object.defineProperty(globalThis,'StorageEvent',priorEvent);else Reflect.deleteProperty(globalThis,'StorageEvent');
  }
});

test('a forced-password identity isolates storage without protected requests, then enables only its own sync',async()=>{
  const dom=new JSDOM('',{url:'https://german.learnilabs.com'});
  const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),priorEvent=Object.getOwnPropertyDescriptor(globalThis,'StorageEvent'),priorFetch=globalThis.fetch;
  Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});Object.defineProperty(globalThis,'StorageEvent',{value:dom.window.StorageEvent,configurable:true});
  const requests:string[]=[],pushes:Array<{userId:string;docs?:unknown[];events?:unknown[]}>=[];
  globalThis.fetch=(async(input:string|URL|Request,init?:RequestInit)=>{
    requests.push(String(input));if(String(input).startsWith('/api/sync/push')){pushes.push(JSON.parse(String(init?.body)));return new Response('{"ok":true}')}
    return new Response('{"events":[],"docs":[],"cursor":0,"hasMore":false}');
  }) as typeof fetch;
  const a=await import('../../../apps/web/lib/sync/browser.ts?forced-a'),b=await import('../../../apps/web/lib/sync/browser.ts?forced-b');
  const store=dom.window.localStorage;
  const study=(id:string,title:string)=>JSON.stringify({version:1,saved:{[id]:{id,title,meaning:'private',kind:'word',href:`/words/${id}/`}},bookmarks:[],completedPages:[],resume:null});
  try{
    await a.startAccountSync('account-a');store.setItem('german-learning-os:study-book:v1',study('a-secret','A personal note'));await a.notifyImportedBackup();
    const before=requests.length;
    await b.isolateAccountStorage('account-b');
    assert.equal(requests.length,before,'forced-password isolation must make no protected API calls');
    assert.equal(b.getSyncSnapshot().status,'paused');
    assert.equal(store.getItem('german-learning:local-owner:v1'),'account-b');
    assert.equal(Object.keys(JSON.parse(store.getItem('german-learning-os:study-book:v1')!).saved).length,0,'B never sees prior A content');
    assert.ok(store.getItem('german-learning:account-local:v1:account-a')?.includes('A personal note'),'A backup is preserved before B takes ownership');
    store.setItem('german-learning-os:study-book:v1',study('b-secret','B personal note'));await b.notifyImportedBackup();
    await b.isolateAccountStorage('account-b');
    assert.equal(requests.length,before,'paused B edits stay local until password change');
    assert.ok(store.getItem('german-learning-os:study-book:v1')?.includes('B personal note'));
    await b.startAccountSync('account-b');
    const bPushes=pushes.filter(push=>push.userId==='account-b');assert.ok(bPushes.some(push=>JSON.stringify(push).includes('B personal note')));assert.ok(bPushes.every(push=>!JSON.stringify(push).includes('A personal note')));
    const after=requests.length;await b.startAccountSync('account-b');assert.equal(requests.length,after,'enabling an already active identity is idempotent');
  }finally{
    await a.stopAccountSync().catch(()=>{});await b.stopAccountSync().catch(()=>{});dom.window.close();globalThis.fetch=priorFetch;
    if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else Reflect.deleteProperty(globalThis,'window');if(priorNavigator)Object.defineProperty(globalThis,'navigator',priorNavigator);else Reflect.deleteProperty(globalThis,'navigator');if(priorEvent)Object.defineProperty(globalThis,'StorageEvent',priorEvent);else Reflect.deleteProperty(globalThis,'StorageEvent');
  }
});

test('remote changes and account transitions notify learner, saved-study and scope consumers with current values',async()=>{
  const dom=new JSDOM('',{url:'https://german.learnilabs.com/saved/'});
  const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),priorEvent=Object.getOwnPropertyDescriptor(globalThis,'StorageEvent'),priorFetch=globalThis.fetch;
  Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});Object.defineProperty(globalThis,'StorageEvent',{value:dom.window.StorageEvent,configurable:true});
  const {parseStudy,STUDY_KEY}=await import('../../../apps/web/lib/study/storage.ts');
  const {parseStudyScope,STUDY_SCOPE_KEY}=await import('../../../apps/web/lib/study/scope.ts');
  const {BACKUP_KEYS}=await import('../../../apps/web/lib/study/backup.ts');
  let visibleStudy=parseStudy(null),visibleScope=parseStudyScope(null),remoteSent=false;
  const notifications:Array<{key:string|null;newValue:string|null;storage:Storage|null;url:string}>=[];
  dom.window.addEventListener('storage',(event:StorageEvent)=>{
    notifications.push({key:event.key,newValue:event.newValue,storage:event.storageArea,url:event.url});
    // These are the same exact-key/newValue consumers used by StudyProvider and StudyScope.
    if(event.key===STUDY_KEY)visibleStudy=parseStudy(event.newValue);
    if(event.key===STUDY_SCOPE_KEY)visibleScope=parseStudyScope(event.newValue);
  });
  globalThis.fetch=(async(input:string|URL|Request)=>{
    const url=new URL(String(input),'https://german.learnilabs.com');
    if(url.pathname==='/api/sync/push')return new Response('{"ok":true}');
    if(url.searchParams.get('store')==='study.docs'){
      const docs=remoteSent?[]:[{store:'study.docs',key:'saved:remote-word',value:{id:'remote-word',title:'Remote word',meaning:'synced',kind:'word',href:'/words/remote/',note:'Remote personal note'},updatedAt:new Date().toISOString(),deviceId:'device-other',schemaVersion:1}];remoteSent=true;
      return new Response(JSON.stringify({events:[],docs,cursor:1,hasMore:false}));
    }
    return new Response('{"events":[],"docs":[],"cursor":0,"hasMore":false}');
  }) as typeof fetch;
  const runtime=await import('../../../apps/web/lib/sync/browser.ts?storage-consumers');
  try{
    dom.window.localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({mode:'one',lessons:[2],concepts:[],source:'all'}));
    await runtime.startAccountSync('account-a');
    assert.equal(visibleStudy.saved['remote-word']?.note,'Remote personal note','the existing saved-study consumer must see a same-tab remote note');
    assert.equal(visibleScope.mode,'all','the existing scope consumer must see isolated account defaults');
    for(const key of BACKUP_KEYS){const rows=notifications.filter(e=>e.key===key);assert.ok(rows.length>0,`missing event for ${key}`);assert.equal(rows.at(-1)?.newValue,dom.window.localStorage.getItem(key));assert.equal(rows.at(-1)?.storage,dom.window.localStorage);assert.equal(rows.at(-1)?.url,dom.window.location.href)}
    await runtime.isolateAccountStorage('account-b');
    assert.equal(visibleStudy.saved['remote-word'],undefined,'switching to B must clear A saved-note UI state');
    await runtime.stopAccountSync();
    assert.equal(visibleScope.mode,'one');assert.deepEqual(visibleScope.lessons,[2],'logout must refresh the restored unsigned scope view');
  }finally{
    await runtime.stopAccountSync().catch(()=>{});dom.window.close();globalThis.fetch=priorFetch;
    if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else Reflect.deleteProperty(globalThis,'window');if(priorNavigator)Object.defineProperty(globalThis,'navigator',priorNavigator);else Reflect.deleteProperty(globalThis,'navigator');if(priorEvent)Object.defineProperty(globalThis,'StorageEvent',priorEvent);else Reflect.deleteProperty(globalThis,'StorageEvent');
  }
});
