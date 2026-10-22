import { requireSession } from '../auth/session.js';
import { HttpError, json, readJson, requireDb } from '../http.js';
import type { D1PreparedStatement, PlatformEnv } from '../types.js';
import { canonicalJson, SYNC_LIMITS, SUPPORTED_STORES, validateDocument, validateEvent, type SyncDoc, type SyncEvent } from '../../../../packages/sync/src/index.js';
import { deriveAssignmentProgress, validateAssignmentProgress } from '../classes/progress.js';

const sqlDoc=`INSERT INTO sync_docs(user_id,store,doc_key,value_json,updated_at,device_id,schema_version)
VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,store,doc_key) DO UPDATE SET
value_json=excluded.value_json,updated_at=excluded.updated_at,device_id=excluded.device_id,schema_version=excluded.schema_version
WHERE excluded.updated_at>sync_docs.updated_at OR (excluded.updated_at=sync_docs.updated_at AND excluded.device_id>sync_docs.device_id)
OR (excluded.updated_at=sync_docs.updated_at AND excluded.device_id=sync_docs.device_id AND excluded.value_json>sync_docs.value_json)`;
function inputError(error:unknown):never {
  if(error instanceof HttpError)throw error;
  throw new HttpError(400,'invalid_sync_batch','Invalid sync records.');
}
function batchInput(value:unknown):{deviceId:string;store:string;events:SyncEvent[];docs:SyncDoc[]} {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'invalid_sync_batch');
  const body=value as Record<string,unknown>;
  if(typeof body.deviceId!=='string'||!/^[a-zA-Z0-9._:-]{1,80}$/.test(body.deviceId)||typeof body.store!=='string'||!Object.hasOwn(SUPPORTED_STORES,body.store))throw new HttpError(400,'invalid_sync_store');
  const strategy=SUPPORTED_STORES[body.store];
  const items=strategy==='event-log'?body.events:body.docs;
  if(!Array.isArray(items)||items.length>SYNC_LIMITS.batchItems||('events'in body&&'docs'in body))throw new HttpError(400,'invalid_sync_batch');
  const events:SyncEvent[]=[],docs:SyncDoc[]=[];
  try {
    for(const item of items) {
      if(strategy==='event-log'){const event=validateEvent(item);if(event.store!==body.store)throw new Error('store mismatch');events.push(event)}
      else {const doc=validateDocument(item);if(doc.store!==body.store)throw new Error('store mismatch');docs.push(doc)}
    }
  } catch(error){inputError(error)}
  return {deviceId:body.deviceId,store:body.store,events,docs};
}
export async function handleSync(request:Request,env:PlatformEnv):Promise<Response|null> {
  const url=new URL(request.url);
  if(!['/api/sync/push','/api/sync/pull'].includes(url.pathname))return null;
  const user=await requireSession(request,env);
  const db=requireDb(env);
  if(url.pathname==='/api/sync/push') {
    if(request.method!=='POST')throw new HttpError(405,'method_not_allowed');
    const input=await readJson(request,SYNC_LIMITS.bodyBytes);
    if(input.userId!==undefined&&input.userId!==user.id)throw new HttpError(403,'account_changed');
    const body=batchInput(input);
    const statements:D1PreparedStatement[]=[];
    for(const event of body.events) {
      if(event.type==='assignment.progress')await validateAssignmentProgress(db,user.id,event);
      const existing=await db.prepare('SELECT payload_json FROM sync_events WHERE user_id=? AND store=? AND event_id=?').bind(user.id,body.store,event.id).first<{payload_json:string}>();
      const encoded=canonicalJson(event);
      if(existing&&existing.payload_json!==encoded)throw new HttpError(409,'conflicting_event_id');
      statements.push(db.prepare('INSERT OR IGNORE INTO sync_events(user_id,store,event_id,device_id,created_at,payload_json,event_type,schema_version) VALUES(?,?,?,?,?,?,?,?)').bind(user.id,event.store,event.id,event.deviceId,event.createdAt,encoded,event.type,event.schemaVersion));
    }
    for(const doc of body.docs)statements.push(db.prepare(sqlDoc).bind(user.id,doc.store,doc.key,canonicalJson(doc.value),doc.updatedAt,doc.deviceId,doc.schemaVersion));
    statements.push(db.prepare('INSERT INTO devices(user_id,id,label,last_sync_at) VALUES(?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET last_sync_at=excluded.last_sync_at').bind(user.id,body.deviceId,'Learning device',new Date().toISOString()));
    try{await db.batch(statements)}catch(error){
      if(error instanceof Error&&error.message.includes('conflicting_event_id'))throw new HttpError(409,'conflicting_event_id');
      throw error;
    }
    // Derived assignment records are retry-safe. A retry replays this even if the event already existed.
    for(const event of body.events)if(event.type==='assignment.progress')await deriveAssignmentProgress(db,user.id,event);
    return json({ok:true,accepted:body.events.length+body.docs.length});
  }
  if(request.method!=='GET')throw new HttpError(405,'method_not_allowed');
  if(url.searchParams.has('userId')&&url.searchParams.get('userId')!==user.id)throw new HttpError(403,'account_changed');
  const store=url.searchParams.get('store'),raw=url.searchParams.get('since')??'0';
  if(!store||!Object.hasOwn(SUPPORTED_STORES,store))throw new HttpError(400,'invalid_sync_store');
  if(!/^\d{1,15}$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new HttpError(400,'invalid_sync_cursor');
  const since=Number(raw);
  type Row={server_seq:number;kind:'event'|'doc';event_json:string|null;doc_key:string|null;value_json:string|null;updated_at:string|null;device_id:string|null;schema_version:number|null};
  const result=await db.prepare(`SELECT c.server_seq,c.kind,e.payload_json AS event_json,d.doc_key,d.value_json,d.updated_at,d.device_id,d.schema_version
FROM sync_changes c
LEFT JOIN sync_events e ON c.kind='event' AND e.user_id=c.user_id AND e.store=c.store AND e.event_id=c.record_key
LEFT JOIN sync_docs d ON c.kind='doc' AND d.user_id=c.user_id AND d.store=c.store AND d.doc_key=c.record_key
WHERE c.user_id=? AND c.store=? AND c.server_seq>? ORDER BY c.server_seq LIMIT ?`).bind(user.id,store,since,SYNC_LIMITS.batchItems+1).all<Row>();
  const rows=result.results.slice(0,SYNC_LIMITS.batchItems);
  const events:SyncEvent[]=[],docs:SyncDoc[]=[];
  for(const row of rows) {
    if(row.kind==='event'&&row.event_json)events.push(JSON.parse(row.event_json) as SyncEvent);
    if(row.kind==='doc'&&row.doc_key&&row.value_json!==null&&row.updated_at&&row.device_id)docs.push({store,key:row.doc_key,value:JSON.parse(row.value_json) as unknown,updatedAt:row.updated_at,deviceId:row.device_id,schemaVersion:row.schema_version??1});
  }
  return json({events,docs,cursor:rows.at(-1)?.server_seq??since,hasMore:result.results.length>SYNC_LIMITS.batchItems});
}
