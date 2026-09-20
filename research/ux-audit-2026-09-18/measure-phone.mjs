import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '../../platform/node_modules/playwright/index.mjs';
import {expect} from '../../platform/node_modules/@playwright/test/index.mjs';

const base=process.env.AUDIT_BASE||'https://hrezaii95.github.io/german-learning-exam/';
const output=new URL('step-9-phone-performance/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const results=[];
try{
 for(const route of ['vocabulary/','listening/','search/']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular3g'});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  let transferred=0;
  const requests=new Map(),resources=[];
  cdp.on('Network.requestWillBeSent',event=>requests.set(event.requestId,event.request.url));
  cdp.on('Network.loadingFinished',event=>{transferred+=event.encodedDataLength;resources.push({url:requests.get(event.requestId),bytes:event.encodedDataLength});});
  const result={route,errors:[]};
  page.on('pageerror',error=>result.errors.push(error.message));
  await page.addInitScript(()=>{
   window.auditLcp=0;window.auditLongTasks=[];
   new PerformanceObserver(list=>{window.auditLcp=list.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(list=>window.auditLongTasks.push(...list.getEntries().map(entry=>entry.duration))).observe({type:'longtask',buffered:true});
  });
  try{
   const started=Date.now();
   const response=await page.goto(new URL(route,base).href,{waitUntil:'load',timeout:120000});
   result.status=response.status();
   await expect(page.locator('main h1')).toBeVisible();
   const ready=Date.now();
   result.initialMetrics=await page.evaluate(()=>({fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcpMs:window.auditLcp,longTasks:window.auditLongTasks,domNodes:document.querySelectorAll('*').length,scrollHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth}));
   if(route==='vocabulary/'){
    await expect(page.locator('[data-word-family]')).toHaveCount(12);
    await page.locator('main input[type="search"]').fill('Elektriker');
    await page.getByRole('button',{name:'Apply filters',exact:true}).click();
    await expect(page.locator('[data-word-family]')).toHaveCount(1,{timeout:15000});
   }else if(route==='listening/'){
    await expect(page.locator('.recording-browser>div>button')).toHaveCount(12);
    await page.getByLabel('Find a recording',{exact:true}).fill('zzzz-no-recording');
    await expect(page.locator('.book-track')).toHaveCount(0,{timeout:15000});
   }else{
    await page.getByRole('searchbox',{name:'Search learning content'}).fill('Stuhl');
    await page.getByRole('searchbox',{name:'Search learning content'}).press('Enter');
    await expect(page.locator('.search-learning-result').first()).toBeVisible({timeout:15000});
   }
   result.loadMs=ready-started;
   result.firstActionMs=Date.now()-ready;
   result.metrics=await page.evaluate(()=>({fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcpMs:window.auditLcp,longTasks:window.auditLongTasks,domNodes:document.querySelectorAll('*').length,scrollHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth}));
   result.transferredBytes=transferred;
   result.largestResources=resources.sort((a,b)=>b.bytes-a.bytes).slice(0,20);
  }catch(error){result.errors.push(String(error));}
  await context.close();
  results.push(result);
  await writeFile(new URL('measurements.json',output),JSON.stringify({base,checkedAt:new Date().toISOString(),profile:{width:390,height:844,cpuSlowdown:4,downloadBytesPerSecond:200000,uploadBytesPerSecond:93750,latencyMs:150,httpCache:'disabled',serviceWorkers:'blocked'},results},null,2)+'\n');
  console.log(JSON.stringify(result));
 }
}finally{await browser.close();}
if(results.some(result=>result.errors.length))process.exitCode=1;
