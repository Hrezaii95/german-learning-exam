import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertWrite, HttpError, readJson } from '../src/http.js';
import { deriveArgon2 } from '../src/auth/argon2-runtime.js';
import { hashPassword, verifyPassword, needsPasswordRehash } from '../src/auth/password.js';

test('writes require exact same Origin and JSON media type', async () => {
  const url = 'https://german.learnilabs.com/api/auth/login';
  for (const origin of [undefined, 'https://evil.invalid', 'null', 'https://german.learnilabs.com.evil.invalid']) {
    const headers: Record<string,string> = {'Content-Type':'application/json'};
    if (origin) headers.Origin=origin;
    assert.throws(() => assertWrite(new Request(url,{method:'POST',headers,body:'{}'})), (error:unknown)=>error instanceof HttpError && error.status===403);
  }
  assert.throws(()=>assertWrite(new Request(url,{method:'POST',headers:{Origin:'https://german.learnilabs.com','Content-Type':'text/plain'},body:'{}'})));
  assert.deepEqual(await readJson(new Request(url,{method:'POST',headers:{Origin:'https://german.learnilabs.com','Content-Type':'application/json; charset=utf-8'},body:'{"username":"student1"}'})),{username:'student1'});
});

test('JSON parsing rejects arrays, malformed data and oversized streams', async () => {
  const make=(body:string)=>new Request('https://german.learnilabs.com/api/test',{method:'POST',headers:{Origin:'https://german.learnilabs.com','Content-Type':'application/json'},body});
  for (const body of ['[]','null','true','{"broken"']) await assert.rejects(readJson(make(body)),HttpError);
  await assert.rejects(readJson(make('{"large":"'+'x'.repeat(2000)+'"}'),100), (error:unknown)=>error instanceof HttpError && error.status===413);
});

test('Argon2id uses approved PHC parameters, rejects bad passwords and untrusted costs', async () => {
  const hash = await hashPassword('a sufficiently long test password',new Uint8Array(16).fill(7));
  assert.match(hash,/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert.equal(await verifyPassword('a sufficiently long test password',hash),true);
  assert.equal(await verifyPassword('a different test password',hash),false);
  assert.equal(needsPasswordRehash(hash),false);
  assert.equal(await verifyPassword('test',hash.replace('m=19456','m=99999999')),false);
  assert.equal(await verifyPassword('test','malformed'),false);
});

test('bounded legacy Argon2id parameters verify and request upgrade without accepting cost bombs', async () => {
  const salt = new Uint8Array(16).fill(5);
  const digest = await deriveArgon2('legacy synthetic fixture',salt,{memoryKiB:8192,iterations:1,parallelism:1,hashLength:32});
  const base64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/=+$/,'');
  const encoded=`$argon2id$v=19$m=8192,t=1,p=1$${base64(salt)}$${base64(digest)}`;
  assert.equal(needsPasswordRehash(encoded),true);
  assert.equal(await verifyPassword('legacy synthetic fixture',encoded),true);
  assert.equal(await verifyPassword('wrong synthetic fixture',encoded),false);
  assert.equal(await verifyPassword('legacy synthetic fixture',encoded.replace('t=1','t=500')),false);
});

test('Wasm wrapper copies digest and clears complete reusable memory on success and failure',async()=>{
  const {computeWithWipedMemory}=await import('../src/auth/wasm-memory.js');
  const memory=new WebAssembly.Memory({initial:1});
  const bytes=new Uint8Array(memory.buffer);
  const password=new TextEncoder().encode('synthetic fixture input');
  const output=computeWithWipedMemory(memory,password,()=>{bytes.fill(7);return bytes.subarray(128,160);});
  assert.deepEqual(output,new Uint8Array(32).fill(7));
  assert.ok(bytes.every(value=>value===0));assert.ok(password.every(value=>value===0));
  const again=new TextEncoder().encode('synthetic failed input');
  assert.throws(()=>computeWithWipedMemory(memory,again,()=>{bytes.fill(9);throw new Error('fixture failure');}));
  assert.ok(bytes.every(value=>value===0));assert.ok(again.every(value=>value===0));
});
