import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const origin=process.env.LINGOVO_PREVIEW_URL||'http://127.0.0.1:3011';
const artifacts=path.resolve(process.env.LINGOVO_PREVIEW_ARTIFACTS||'../release-work/landing-check');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
const report=[];
try{
  for(const locale of ['hy','ru','en','de']){
    for(const width of [320,390,820,1440]){
      const context=await browser.newContext({viewport:{width,height:width>1000?1000:844}});
      await context.addInitScript(value=>localStorage.setItem('german-learning-locale-v1',value),locale);
      const page=await context.newPage();const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const response=await page.goto(origin,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      await page.locator('.landing-art-stage[data-ready=true]').first().waitFor();
      const film=locale==='hy'||locale==='ru'?'Armenian':'English';
      const data=await page.evaluate(()=>({lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth+1,controls:document.querySelectorAll('select').length,src:document.querySelector('video').getAttribute('src'),preload:document.querySelector('video').preload,autoplay:document.querySelector('video').autoplay,title:document.title,heading:document.querySelector('h1').textContent}));
      assert.equal(data.lang,locale);assert.equal(data.overflow,false,JSON.stringify({locale,width,data}));assert.equal(data.controls,1);
      assert.ok(data.src.endsWith(`Lingovo-Launch-${film}.mp4`));assert.equal(data.preload,'none');assert.equal(data.autoplay,false);
      assert.ok(data.title.includes(data.heading.replace(/\s+/g,' ').trim()));
      assert.equal(await page.locator('main a[href="/lessons/01"]').count()>0,true);
      assert.equal(await page.locator('main a[href="/prepare/c1"]').count()>0,true);
      if(width===390||width===1440){
        await page.screenshot({path:path.join(artifacts,`${locale}-${width}-hero.png`)});
        await page.locator('.launch-section').screenshot({path:path.join(artifacts,`${locale}-${width}-video.png`)});
      }
      assert.deepEqual(errors,[]);
      report.push({locale,width,...data,errors});await context.close();
    }
  }
  const page=await browser.newPage();await page.goto(origin,{waitUntil:'networkidle'});
  const selector=page.locator('select');
  const codecs=await page.locator('video').evaluate(el=>({h264:el.canPlayType('video/mp4; codecs="avc1.640028"'),aac:el.canPlayType('audio/mp4; codecs="mp4a.40.2"')}));
  await writeFile(path.join(artifacts,'report.json'),JSON.stringify({origin,layoutPassed:true,playbackVerified:false,codecs,results:report},null,2));
  console.log(`Passed ${report.length} language/layout checks; browser codecs: ${JSON.stringify(codecs)}`);
  for(const locale of ['en','hy','ru','en']){
    await selector.selectOption(locale);
    const expected=locale==='en'?'English':'Armenian';
    await page.waitForFunction(name=>document.querySelector('video').src.endsWith(`Lingovo-Launch-${name}.mp4`),expected);
    assert.equal(await page.locator('video').evaluate(el=>el.paused),true);
    await page.locator('video').evaluate(async el=>{el.muted=true;await el.play();});
    await page.waitForFunction(()=>document.querySelector('video').currentTime>0.1);
    report.push({playback:locale,src:await page.locator('video').getAttribute('src'),currentTime:await page.locator('video').evaluate(el=>el.currentTime)});
    await page.locator('video').evaluate(el=>el.pause());
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-scroll-art]')].every(el=>el.dataset.motionProgress==='1.000'));
  report.push({reducedMotion:'static final composition'});
  await page.close();
  await writeFile(path.join(artifacts,'report.json'),JSON.stringify({origin,checks:report.length,passed:true,playbackVerified:true,results:report},null,2));
  console.log(`Passed ${report.length} landing checks: language, responsive layout, playback and reduced motion.`);
}finally{await browser.close();}
