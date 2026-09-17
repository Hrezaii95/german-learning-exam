import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const base=(process.env.STUDY_TEST_BASE??'http://localhost:4331/german-learning-exam').replace(/\/$/,'');
const output=resolve('../research/book-answers',process.env.STUDY_TEST_LABEL??'export');
const read=async name=>JSON.parse(await readFile(`apps/web/generated/${name}.json`,'utf8'));
const [book,answers,speech]=await Promise.all([read('interactive-book'),read('book-answers'),read('study-speech')]);
const clips=[...new Set([
  ...book.audio.filter(track=>track.id.includes('-m1-')).map(track=>track.src),
  ...answers.flatMap(answer=>answer.text.split(/\n+/).map(text=>{
    if(!speech[text])throw Error(`Missing speech: ${text}`);
    return speech[text];
  })),
])];
const pending=[...clips],checks=[];
async function worker(){
  while(pending.length){
    const path=pending.shift();
    const expected=await readFile(`apps/web/public${path}`);
    const response=await fetch(`${base}${path}`,{signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error(`${path}: HTTP ${response.status}`);
    const actual=Buffer.from(await response.arrayBuffer());
    if(!actual.equals(expected))throw Error(`${path}: deployed bytes differ`);
    checks.push({path,bytes:actual.length,sha256:createHash('sha256').update(actual).digest('hex')});
  }
}
await Promise.all(Array.from({length:4},worker));
await mkdir(output,{recursive:true});
await writeFile(`${output}/media-checks.json`,JSON.stringify({base,passed:checks.length,checks:checks.sort((a,b)=>a.path.localeCompare(b.path))},null,2));
console.log(JSON.stringify({base,passed:checks.length}));
