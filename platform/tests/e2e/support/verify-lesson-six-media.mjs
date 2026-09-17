import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210/german-learning-exam').replace(/\/$/,'');
const lesson=Number(process.env.STUDY_TEST_LESSON??6);
const name=({5:'five',6:'six',7:'seven'})[lesson];
if(!name)throw Error('Choose an integrated lesson: 5, 6 or 7');
const output=resolve('../research/lesson-expansion',process.env.STUDY_TEST_LABEL??'lesson-six-export');
const book=JSON.parse(await readFile('apps/web/generated/interactive-book.json','utf8'));
const speech=JSON.parse(await readFile('apps/web/generated/study-speech.json','utf8'));
const unit=JSON.parse(await readFile(`apps/web/generated/lesson-${name}-study.json`,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const media=book.audio.filter(a=>a.lesson===lesson).map(a=>({path:a.src,sha256:a.sha256,kind:'original'}));
const examples=lesson===7?['Ich kann sehr gut schwimmen.','Können Sie gar nicht Rad fahren?','Ich fahre nie Rad.']:lesson===6?['Ich brauche einen Kalender.','Ich brauche keine Mäuse.','Ich habe Passwörter.']:[];
for(const text of [...unit.phrases.map(p=>p.de),...examples]){
 const path=speech[text];if(!path)throw Error(`Missing speech: ${text}`);
 media.push({path,sha256:hash(await readFile(resolve('apps/web/public',path.slice(1)))),kind:'speech'});
}
let next=0;const checks=[];
await Promise.all(Array.from({length:4},async()=>{
 while(next<media.length){
  const item=media[next++];
  const response=await fetch(base+item.path,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error(`${response.status}: ${item.path}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(hash(bytes)!==item.sha256)throw Error(`Media bytes differ: ${item.path}`);
  checks.push({...item,bytes:bytes.length});
 }
}));
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'media-verification.json'),JSON.stringify({base,lesson,passed:checks.length,checks:checks.sort((a,b)=>a.path.localeCompare(b.path))},null,2));
console.log(JSON.stringify({base,lesson,passed:checks.length}));
