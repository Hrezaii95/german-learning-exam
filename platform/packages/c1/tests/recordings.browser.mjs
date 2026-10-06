// Runs the real React recorder, MediaRecorder and IndexedDB with a synthetic mic.
// No Next server/build cache or real microphone is used.
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';
import {chromium,expect} from '@playwright/test';

const root=fileURLToPath(new URL('../',import.meta.url));
const bundled=await build({stdin:{contents:`
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SpeakingRecorder} from './src/components/study-media.tsx';
function Harness(){const [visible,setVisible]=useState(true);const [id,setId]=useState('recording-check-one');return <main><h1>Isolated C1 recording check</h1><button onClick={()=>setVisible(!visible)}>{visible?'Leave recorder':'Return to recorder'}</button><button onClick={()=>setId(id==='recording-check-one'?'recording-check-two':'recording-check-one')}>{id==='recording-check-one'?'Next task':'Previous task'}</button>{visible&&<SpeakingRecorder key={id} lang="en" recordingId={id}/>}</main>}
createRoot(document.getElementById('app')).render(<Harness/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'esm',platform:'browser',target:'chrome120',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH':'""'}});
const api=await transform(readFileSync(new URL('../src/lib/recordings.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm',target:'chrome120'});
const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>C1 isolated recorder test</title><div id="app"></div><script type="module" src="/app.js"></script></html>';
const server=createServer((request,response)=>{const route=new URL(request.url,'http://localhost').pathname;const js=route==='/app.js'?bundled.outputFiles[0].text:route==='/recordings.js'?api.code:null;response.writeHead(200,{'Content-Type':js?'text/javascript':'text/html'});response.end(js??html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const executablePath=process.env.C1_CHROMIUM_PATH||(existsSync('/tmp/chromium')?'/tmp/chromium':undefined);
let browser;
const failures=[];
async function record(page){
  await expect(page.getByRole('button',{name:'Record',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Record',exact:true}).click();
  await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('.speech-clock').textContent()).not.toBe('1:30');
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
}
async function metadata(page,id='recording-check-one'){
  return page.evaluate(async id=>{const {loadRecording}=await import('/recordings.js');const value=await loadRecording(id);return value?{bytes:value.blob.size,mime:value.blob.type,savedAt:value.savedAt}:null;},id);
}
try{
  browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({permissions:['microphone'],acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',error=>failures.push(error.message));
  await page.goto(origin);await record(page);
  await expect(page.getByText(/^Latest recording saved on this device\./)).toBeVisible();
  const first=await metadata(page);expect(first.bytes).toBeGreaterThan(500);expect(first.mime).toContain('audio/');
  await expect.poll(()=>page.locator('audio').evaluate(audio=>audio.readyState)).toBeGreaterThan(0);
  await page.reload();await expect(page.getByText(/^Latest recording saved on this device\./)).toBeVisible();
  expect(await metadata(page)).toEqual(first);
  await page.getByRole('button',{name:'Next task',exact:true}).click();
  await expect(page.locator('audio')).toHaveCount(0);expect(await metadata(page,'recording-check-two')).toBeNull();
  await page.getByRole('button',{name:'Previous task',exact:true}).click();
  await expect(page.getByText(/^Latest recording saved on this device\./)).toBeVisible();

  // Leaving during capture stops the recorder and preserves its latest Blob.
  await page.getByRole('button',{name:'Record',exact:true}).click();
  await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('.speech-clock').textContent()).not.toBe('1:30');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Leave recorder',exact:true}).click();
  await expect(page.locator('.speaking-recorder')).toHaveCount(0);
  await expect.poll(async()=>(await metadata(page))?.savedAt??0).toBeGreaterThan(first.savedAt);
  await page.getByRole('button',{name:'Return to recorder',exact:true}).click();
  await expect(page.getByText(/^Latest recording saved on this device\./)).toBeVisible();
  const afterNavigation=await metadata(page);expect(afterNavigation.bytes).toBeGreaterThan(500);

  // Private/device storage failure must still leave a usable audio download.
  const unavailable=await browser.newContext({permissions:['microphone'],acceptDownloads:true});
  await unavailable.addInitScript(()=>{IDBFactory.prototype.open=function(){throw new DOMException('Storage unavailable for test','SecurityError');};});
  const fallback=await unavailable.newPage();fallback.on('pageerror',error=>failures.push(error.message));
  await fallback.goto(origin);await record(fallback);
  await expect(fallback.getByText(/^Recording is not saved permanently yet\./)).toBeVisible();
  const downloadPromise=fallback.waitForEvent('download');
  await fallback.getByRole('link',{name:'Download recording',exact:true}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^lingovo-speaking\.(webm|m4a|ogg)$/);expect(await download.failure()).toBeNull();
  expect(readFileSync(await download.path()).length).toBeGreaterThan(500);
  await expect(fallback.getByText('Download started. Keep the file.')).toBeVisible();
  expect(failures).toEqual([]);
  console.log(JSON.stringify({result:'PASS',checks:['real synthetic-mic MediaRecorder capture','IndexedDB Blob restored after reload','recordings isolated by task ID','stop-and-save when leaving during capture','download fallback when IndexedDB is unavailable'],firstRecording:first,recordingAfterNavigation:afterNavigation,browserErrors:failures},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
