import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('..',import.meta.url).pathname;
const manifest=JSON.parse(await fs.readFile(path.join(root,'packages/c1/assets-manifest.json'),'utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
let next=0,downloaded=0;
async function worker(){while(next<manifest.files.length){const item=manifest.files[next++];const target=path.join(root,'apps/web/public/c1',item.path);try{if(sha(await fs.readFile(target))===item.outputSha256)continue;}catch{}
const response=await fetch(manifest.origin+'/'+item.path);if(!response.ok)throw Error(`Asset fetch failed ${response.status}: ${item.path}`);let data=Buffer.from(await response.arrayBuffer());if(sha(data)!==item.sourceSha256)throw Error(`Source hash changed: ${item.path}`);
if(item.path.endsWith('.json'))data=Buffer.from(data.toString('utf8').replace(/"\/(data|media|pages|study-media)\//g,'"/c1/$1/'));
if(sha(data)!==item.outputSha256)throw Error(`Output hash mismatch: ${item.path}`);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);downloaded++;}}
await Promise.all(Array.from({length:6},worker));console.log(`C1 assets: ${manifest.files.length} verified, ${downloaded} restored.`);
