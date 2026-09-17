import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210/german-learning-exam').replace(/\/$/,'');
const output=resolve('../research/lesson-expansion',process.env.STUDY_TEST_LABEL??'lesson-nine-export');
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({serviceWorkers:'block'}),checks=[];
try{
 for(const width of [320,390])for(const id of ['coursebook-64','coursebook-55','workbook-60','coursebook-65','workbook-69']){
  await page.setViewportSize({width,height:844});await page.goto(`${base}/book/?page=${id}`,{waitUntil:'networkidle'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(`${id} overflows ${width}px`);
  checks.push(`${id}: lesson selector and heading fit ${width}px`);
  if(id==='coursebook-64'){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:resolve(output,`book-${width}-phone.png`)});}
 }
 await writeFile(resolve(output,'small-phone-book.json'),JSON.stringify({base,checks},null,2));console.log(JSON.stringify({base,passed:checks.length}));
}finally{await browser.close();}
