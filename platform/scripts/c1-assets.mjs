import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('..',import.meta.url).pathname;
const manifest=JSON.parse(await fs.readFile(path.join(root,'packages/c1/assets-manifest.json'),'utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
let next=0,downloaded=0;
async function worker(){while(next<manifest.files.length){const item=manifest.files[next++];const target=path.join(root,'apps/web/public/c1',item.path);try{if(sha(await fs.readFile(target))===item.outputSha256)continue;}catch{}
// Recover the exact reviewed asset revision if the original mutable site changes.
// The mirror already contains rewritten /c1 paths; both paths retain hash checks.
const mirror=process.env.LINGOVO_C1_ASSET_ORIGIN||'https://41a22798.german-learning-armenia.pages.dev/c1';
let data;
try{
 const response=await fetch(mirror+'/'+item.path,{headers:{'User-Agent':'Mozilla/5.0'}});
 if(!response.ok)throw Error(`Asset mirror ${response.status}`);
 data=Buffer.from(await response.arrayBuffer());
 if(sha(data)!==item.outputSha256)throw Error('Mirror asset revision mismatch');
}catch{
 const response=await fetch(manifest.origin+'/'+item.path,{headers:{'User-Agent':'Mozilla/5.0'}});if(!response.ok)throw Error(`Asset fetch failed ${response.status}: ${item.path}`);data=Buffer.from(await response.arrayBuffer());if(sha(data)!==item.sourceSha256)throw Error(`Source hash changed: ${item.path}`);
 if(item.path.endsWith('.json'))data=Buffer.from(data.toString('utf8').replace(/"\/(data|media|pages|study-media)\//g,'"/c1/$1/'));
}
if(sha(data)!==item.outputSha256)throw Error(`Output hash mismatch: ${item.path}`);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);downloaded++;}}
await Promise.all(Array.from({length:6},worker));console.log(`C1 assets: ${manifest.files.length} verified, ${downloaded} restored.`);
