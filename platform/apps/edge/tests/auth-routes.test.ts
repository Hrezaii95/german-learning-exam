import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestDb } from './classes-db.js';
import { handleAuth } from '../src/routes/auth.js';
import { errorResponse } from '../src/http.js';
import { configureArgon2, deriveArgon2 } from '../src/auth/argon2-runtime.js';
import { hashPassword, verifyPassword } from '../src/auth/password.js';
import { createSession, requireSession, SESSION_COOKIE } from '../src/auth/session.js';
import { reserveLogin } from '../src/auth/rate-limit.js';
import type { PlatformEnv, Role } from '../src/types.js';

const ORIGIN='https://german.learnilabs.com';
const PASSWORD='synthetic fixture password';
async function fixture(role:Role='student',mustChange=false) {
  const db=createTestDb();
  const now=new Date().toISOString();
  await db.prepare('INSERT INTO users(id,username,display_name,role,must_change_password,created_at) VALUES(?,?,?,?,?,?)').bind('user-a','student1','Synthetic User',role,Number(mustChange),now).run();
  await db.prepare('INSERT INTO identities(id,user_id,provider,provider_subject,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind('identity-a','user-a','password','student1',await hashPassword(PASSWORD),now).run();
  const env:PlatformEnv={DB:db,ASSETS:{fetch:async()=>new Response('not found',{status:404})}};
  async function request(path:string,body?:unknown,cookie?:string,method=body===undefined?'GET':'POST') {
    const headers:Record<string,string>={};
    if(body!==undefined){headers.Origin=ORIGIN;headers['Content-Type']='application/json';}
    if(cookie) headers.Cookie=cookie;
    try { return await handleAuth(new Request(ORIGIN+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})}),env) ?? new Response(null,{status:404}); }
    catch(error){return errorResponse(error);}
  }
  return {db,env,request};
}
function cookie(response:Response):string {return response.headers.get('Set-Cookie')?.split(';')[0]??'';}

test('login rotates supplied session and stores only SHA256; me refreshes secure cookie',async()=>{
  const {db,request}=await fixture();
  try {
    const prior=await createSession(db,'user-a');
    const response=await request('/api/auth/login',{username:'STUDENT1',password:PASSWORD},`${SESSION_COOKIE}=${prior.token}`);
    assert.equal(response.status,200);
    const header=response.headers.get('Set-Cookie')??'';
    for(const flag of ['__Host-gl_session=','Path=/','HttpOnly','Secure','SameSite=Lax','Max-Age=2592000'])assert.ok(header.includes(flag));
    assert.notEqual(cookie(response),`${SESSION_COOKIE}=${prior.token}`);
    const rows=await db.prepare('SELECT id_hash FROM sessions').all<{id_hash:string}>();
    assert.equal(rows.results.length,1);
    assert.match(rows.results[0]?.id_hash??'',/^[a-f0-9]{64}$/);
    assert.notEqual(rows.results[0]?.id_hash,prior.token);
    const me=await request('/api/auth/me',undefined,cookie(response));
    assert.equal(me.status,200);
    assert.match(me.headers.get('cache-control')??'',/no-store/);
    const json=await me.json() as {user:{id:string},flags:Record<string,boolean>};
    assert.equal(json.user.id,'user-a');assert.equal(json.flags.google_login,false);assert.equal(json.flags.email_login,false);
    assert.ok(me.headers.has('Set-Cookie'));
    const old=await request('/api/auth/me',undefined,`${SESSION_COOKIE}=${prior.token}`);assert.equal(old.status,401);
  }finally{db.close();}
});

test('unknown, disabled and wrong-password accounts have the same generic error',async()=>{
  const {db,request}=await fixture();
  try{
    const a=await request('/api/auth/login',{username:'unknown1',password:PASSWORD});
    const b=await request('/api/auth/login',{username:'student1',password:'synthetic wrong password'});
    await db.prepare("UPDATE users SET status='disabled' WHERE id='user-a'").run();
    const c=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    assert.equal(a.status,401);assert.equal(b.status,401);assert.equal(c.status,401);
    assert.deepEqual(await a.json(),await b.json());assert.deepEqual(await c.json(),{error:'wrong_username_or_password',message:'Wrong username or password.'});
    assert.equal((await db.prepare('SELECT * FROM sessions').all()).results.length,0);
  }finally{db.close();}
});

test('D1 atomic reservations prevent concurrent requests bypassing the five-attempt cap',async()=>{
  const {db}=await fixture();
  try{
    const now=Date.now();
    const outcomes=await Promise.allSettled(Array.from({length:12},()=>reserveLogin(db,['fixture-user','fixture-ip'],now)));
    assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,5);
    assert.equal(outcomes.filter(result=>result.status==='rejected').length,7);
    const state=await db.prepare('SELECT attempts,blocked_until FROM auth_rate_limits WHERE key_hash=?').bind('fixture-user').first<{attempts:number;blocked_until:number}>();
    assert.equal(state?.attempts,5);assert.ok((state?.blocked_until??0)>now);
    await assert.rejects(reserveLogin(db,['fixture-user','fixture-ip'],now+1000));
    await assert.rejects(reserveLogin(db,['new-user-while-ip-blocked','fixture-ip'],now+1000));
    assert.equal((await db.prepare('SELECT * FROM auth_rate_limits WHERE key_hash=?').bind('new-user-while-ip-blocked').all()).results.length,0);
  }finally{db.close();}
});

test('forced password change blocks normal guards; password change revokes all old cookies',async()=>{
  const {db,env,request}=await fixture('admin',true);
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    const oldCookie=cookie(login);
    await assert.rejects(requireSession(new Request(ORIGIN+'/api/admin/users',{headers:{Cookie:oldCookie}}),env),/password_change_required/);
    assert.equal((await request('/api/auth/me',undefined,oldCookie)).status,200);
    const changed=await request('/api/auth/password/change',{currentPassword:PASSWORD,newPassword:'another synthetic fixture password'},oldCookie);
    assert.equal(changed.status,200);assert.notEqual(cookie(changed),oldCookie);
    assert.equal((await request('/api/auth/me',undefined,oldCookie)).status,401);
    const user=await requireSession(new Request(ORIGIN+'/api/admin/users',{headers:{Cookie:cookie(changed)}}),env,['admin']);
    assert.equal(user.mustChangePassword,false);
    const stored=await db.prepare('SELECT password_hash FROM identities').first<{password_hash:string}>();
    assert.equal(await verifyPassword('another synthetic fixture password',stored?.password_hash??''),true);
    assert.equal(await verifyPassword(PASSWORD,stored?.password_hash??''),false);
    const history=await request('/api/me/history',undefined,cookie(changed));
    assert.ok(!(await history.text()).includes(PASSWORD));
  }finally{db.close();}
});

test('expired/disabled sessions fail, duplicate host cookies are ignored, logout is revocable',async()=>{
  const {db,request}=await fixture();
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});const current=cookie(login);
    assert.equal((await request('/api/auth/me',undefined,current+'; '+current)).status,401);
    await db.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z'").run();
    assert.equal((await request('/api/auth/me',undefined,current)).status,401);
    const login2=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    await db.prepare("UPDATE users SET status='disabled' WHERE id='user-a'").run();
    assert.equal((await request('/api/auth/me',undefined,cookie(login2))).status,401);
    await db.prepare("UPDATE users SET status='active' WHERE id='user-a'").run();
    assert.equal((await request('/api/auth/logout',{},cookie(login2))).status,200);
    assert.equal((await request('/api/auth/me',undefined,cookie(login2))).status,401);
  }finally{db.close();}
});

test('self-service export strips credentials and deletion removes personal rows and audit actors',async()=>{
  const {db,request}=await fixture();
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});const current=cookie(login);
    await db.prepare('INSERT INTO devices(id,user_id,label) VALUES(?,?,?)').bind('device-a','user-a','Fixture').run();
    await db.prepare('INSERT INTO sync_docs(user_id,store,doc_key,value_json,updated_at,device_id) VALUES(?,?,?,?,?,?)').bind('user-a','notes','private','{"note":"my own private note"}',new Date().toISOString(),'device-a').run();
    const exported=await request('/api/me/export',undefined,current);assert.equal(exported.status,200);
    const content=await exported.text();
    assert.ok(content.includes('my own private note'));assert.ok(!content.includes('password_hash'));assert.ok(!content.includes('$argon2id$'));assert.ok(!content.includes('id_hash'));assert.ok(!content.includes(PASSWORD));
    const denied=await request('/api/me/delete',{password:PASSWORD,confirm:'no'},current);assert.equal(denied.status,400);
    const deleted=await request('/api/me/delete',{password:PASSWORD,confirm:'DELETE'},current);assert.equal(deleted.status,200);
    for(const table of ['users','identities','sessions','devices','sync_docs'])assert.equal((await db.prepare(`SELECT * FROM ${table}`).all()).results.length,0,table);
    const actors=await db.prepare('SELECT actor_id,target_id FROM audit_log').all<{actor_id:null;target_id:null}>();
    assert.ok(actors.results.length>0);assert.ok(actors.results.every(row=>row.actor_id===null&&row.target_id===null));
  }finally{db.close();}
});

test('reserved providers fail closed and cannot become enabled from a database flag',async()=>{
  const {db,request}=await fixture();
  try{
    await db.prepare("UPDATE feature_flags SET value_json='true' WHERE key IN ('google_login','email_login')").run();
    for(const path of ['/api/auth/google/start','/api/auth/google/callback','/api/auth/email/start','/api/auth/email/verify'])assert.equal((await request(path)).status,501);
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});const body=await login.json() as {flags:Record<string,boolean>};
    assert.equal(body.flags.email_login,false);assert.equal(body.flags.google_login,false);
  }finally{db.close();}
});

test('mutations reject cross-origin or absent Origin before querying auth or changing data',async()=>{
  const {db,env}=await fixture();
  try{
    for(const path of ['/api/auth/login','/api/auth/logout','/api/auth/password/change','/api/me/delete']){
      await assert.rejects(handleAuth(new Request(ORIGIN+path,{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body:'{}'}),env),/invalid_origin/);
    }
    assert.equal((await db.prepare('SELECT * FROM auth_rate_limits').all()).results.length,0);
  }finally{db.close();}
});

test('successful login upgrades bounded legacy hashes to the current approved cost',async()=>{
  const {db,request}=await fixture();
  try{
    const salt=new Uint8Array(16).fill(3);
    const digest=await deriveArgon2(PASSWORD,salt,{memoryKiB:8192,iterations:1,parallelism:1,hashLength:32});
    const base64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/=+$/,'');
    const legacy=`$argon2id$v=19$m=8192,t=1,p=1$${base64(salt)}$${base64(digest)}`;
    await db.prepare('UPDATE identities SET password_hash=?').bind(legacy).run();
    const response=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    assert.equal(response.status,200);
    const row=await db.prepare('SELECT password_hash FROM identities').first<{password_hash:string}>();
    assert.match(row?.password_hash??'',/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert.equal(await verifyPassword(PASSWORD,row?.password_hash??''),true);
    const audit=await db.prepare("SELECT action FROM audit_log WHERE action='auth.password_rehashed'").all();
    assert.equal(audit.results.length,1);
  }finally{db.close();}
});

test('password-change transaction failure preserves both old credentials and old sessions',async()=>{
  const {db,request}=await fixture('admin',true);
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    const oldCookie=cookie(login);
    const originalBatch=db.batch.bind(db);
    db.batch=async statements=>originalBatch([...statements,db.prepare('INSERT INTO fixture_missing_table(value) VALUES(1)')]);
    const changed=await request('/api/auth/password/change',{currentPassword:PASSWORD,newPassword:'changed synthetic fixture password'},oldCookie);
    assert.equal(changed.status,503);
    db.batch=originalBatch;
    const stored=await db.prepare('SELECT password_hash FROM identities').first<{password_hash:string}>();
    assert.equal(await verifyPassword(PASSWORD,stored?.password_hash??''),true,'failed transaction must roll back credential change');
    assert.equal((await request('/api/auth/me',undefined,oldCookie)).status,200);
    assert.equal((await db.prepare("SELECT must_change_password FROM users WHERE id='user-a'").first<{must_change_password:number}>())?.must_change_password,1);
    assert.equal((await db.prepare("SELECT * FROM audit_log WHERE action='auth.password_changed'").all()).results.length,0);
  }finally{db.close();}
});

test('password reset during verification cannot mint a session for the old password',async()=>{
  const {db,request}=await fixture();
  let release:()=>void=()=>{};
  let reached:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const paused=new Promise<void>(resolve=>{reached=resolve;});
  const {argon2id}=await import('hash-wasm');
  let wait=true;
  configureArgon2(async(password,salt,parameters)=>{
    if(wait&&password===PASSWORD){wait=false;reached();await gate;}
    return argon2id({password,salt,memorySize:parameters.memoryKiB,iterations:parameters.iterations,parallelism:parameters.parallelism,hashLength:parameters.hashLength,outputType:'binary'});
  });
  try{
    const pending=request('/api/auth/login',{username:'student1',password:PASSWORD});
    await paused;
    await db.batch([db.prepare('UPDATE identities SET password_hash=? WHERE user_id=?').bind(await hashPassword('reset synthetic fixture password'),'user-a'),db.prepare('DELETE FROM sessions WHERE user_id=?').bind('user-a')]);
    release();
    const response=await pending;
    assert.equal(response.status,401);
    assert.equal(response.headers.get('Set-Cookie'),null);
    assert.equal((await db.prepare('SELECT * FROM sessions').all()).results.length,0);
  }finally{release();configureArgon2();db.close();}
});

test('concurrent password changes have one CAS winner and cannot revoke its rotated session',async()=>{
  const {db,request}=await fixture('student',true);
  const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});
  let ready=0;let release:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const {argon2id}=await import('hash-wasm');
  configureArgon2(async(password,salt,parameters)=>{
    if(password===PASSWORD){ready++;if(ready===2)release();await gate;}
    return argon2id({password,salt,memorySize:parameters.memoryKiB,iterations:parameters.iterations,parallelism:parameters.parallelism,hashLength:parameters.hashLength,outputType:'binary'});
  });
  try{
    const responses=await Promise.all(['concurrent fixture password A','concurrent fixture password B'].map(newPassword=>request('/api/auth/password/change',{currentPassword:PASSWORD,newPassword},cookie(login))));
    assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
    const winner=responses.find(response=>response.status===200)!;
    const loser=responses.find(response=>response.status===409)!;
    assert.equal(loser.headers.get('Set-Cookie'),null);
    assert.equal((await request('/api/auth/me',undefined,cookie(winner))).status,200);
    assert.equal((await request('/api/auth/me',undefined,cookie(login))).status,401);
    assert.equal((await db.prepare('SELECT * FROM sessions').all()).results.length,1);
    assert.equal((await db.prepare("SELECT * FROM audit_log WHERE action='auth.password_changed'").all()).results.length,1);
  }finally{release();configureArgon2();db.close();}
});

test('account-deletion batch failure rolls back the audit and all personal-data deletion',async()=>{
  const {db,request}=await fixture();
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    const before=(await db.prepare('SELECT * FROM audit_log').all()).results.length;
    const originalBatch=db.batch.bind(db);
    db.batch=async statements=>originalBatch([...statements,db.prepare('INSERT INTO fixture_missing_table(value) VALUES(1)')]);
    const deleted=await request('/api/me/delete',{password:PASSWORD,confirm:'DELETE'},cookie(login));
    assert.equal(deleted.status,503);
    db.batch=originalBatch;
    assert.equal((await db.prepare('SELECT * FROM users').all()).results.length,1);
    assert.equal((await db.prepare('SELECT * FROM audit_log').all()).results.length,before);
    assert.equal((await request('/api/auth/me',undefined,cookie(login))).status,200);
  }finally{db.close();}
});

test('short invalid password attempts return generic errors before the WASM minimum-length check',async()=>{
  const {db,request}=await fixture();
  try{
    for(const username of ['student1','unknown1']){
      const response=await request('/api/auth/login',{username,password:'short'});
      assert.equal(response.status,401);
      assert.deepEqual(await response.json(),{error:'wrong_username_or_password',message:'Wrong username or password.'});
    }
  }finally{db.close();}
});

test('account device/history pagination is bounded, stable and scoped to the signed-in user',async()=>{
  const {db,request}=await fixture();
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});const current=cookie(login);
    for(let index=0;index<4;index++)await db.prepare('INSERT INTO devices(id,user_id,label,last_sync_at) VALUES(?,?,?,?)').bind(`device-${index}`,'user-a',`Synthetic device ${index}`,`2026-10-2${index}T00:00:00.000Z`).run();
    const first=await request('/api/me/devices?limit=2&offset=0',undefined,current);
    const second=await request('/api/me/devices?limit=2&offset=2',undefined,current);
    const pageA=await first.json() as {devices:{id:string}[],total:number,limit:number,offset:number};
    const pageB=await second.json() as {devices:{id:string}[],total:number,limit:number,offset:number};
    assert.equal(pageA.total,4);assert.equal(pageA.limit,2);assert.equal(pageA.offset,0);assert.equal(pageB.offset,2);
    assert.deepEqual(pageA.devices.map(row=>row.id),['device-3','device-2']);
    assert.deepEqual(pageB.devices.map(row=>row.id),['device-1','device-0']);
    for(let index=0;index<3;index++)await db.prepare('INSERT INTO audit_log(id,actor_id,action,target_type,target_id,created_at) VALUES(?,?,?,?,?,?)').bind(`history-${index}`,'user-a','fixture.history','user','user-a',`2026-10-2${index}T00:00:00.000Z`).run();
    const history=await request('/api/me/history?limit=1&offset=1',undefined,current);
    const historyPage=await history.json() as {history:{id:string}[],total:number,limit:number,offset:number};
    assert.equal(historyPage.limit,1);assert.equal(historyPage.offset,1);assert.equal(historyPage.total,4);assert.equal(historyPage.history.length,1);assert.ok(historyPage.history[0]?.id);
    for(const query of ['limit=0','limit=101','limit=NaN','limit=1.5','offset=-1','offset=1000001'])for(const path of ['/api/me/devices','/api/me/history'])assert.equal((await request(`${path}?${query}`,undefined,current)).status,400,`${path}?${query}`);
  }finally{db.close();}
});

test('self-deletion scrubs identifying audit metadata while preserving unrelated audit entries',async()=>{
  const {db,request}=await fixture();
  try{
    const login=await request('/api/auth/login',{username:'student1',password:PASSWORD});
    const now=new Date().toISOString();
    await db.prepare('INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) VALUES(?,?,?,?,?,?,?)').bind('private-audit',null,'admin.user.update','user','user-a',JSON.stringify({username:'private-username',displayName:'Private Full Name'}),now).run();
    await db.prepare('INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) VALUES(?,?,?,?,?,?,?)').bind('unrelated-audit',null,'system.fixture','system','unrelated',JSON.stringify({note:'unrelated metadata'}),now).run();
    const response=await request('/api/me/delete',{password:PASSWORD,confirm:'DELETE'},cookie(login));
    assert.equal(response.status,200);
    const affected=await db.prepare('SELECT actor_id,target_id,meta_json FROM audit_log WHERE id=?').bind('private-audit').first<{actor_id:null;target_id:null;meta_json:string}>();
    assert.equal(affected?.actor_id,null);assert.equal(affected?.target_id,null);assert.equal(affected?.meta_json,'{}');
    const unrelated=await db.prepare('SELECT target_id,meta_json FROM audit_log WHERE id=?').bind('unrelated-audit').first<{target_id:string;meta_json:string}>();
    assert.equal(unrelated?.target_id,'unrelated');assert.equal(unrelated?.meta_json,JSON.stringify({note:'unrelated metadata'}));
  }finally{db.close();}
});
