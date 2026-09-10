import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = (process.env.STUDY_TEST_BASE ?? 'http://127.0.0.1:4331/german-learning-exam').replace(/\/$/, '');
const output = resolve('../research/selection-meaning', process.env.STUDY_TEST_LABEL ?? 'export');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: {width:1440,height:1000}, serviceWorkers:'block' });
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(30000);
const checks=[], errors=[];
page.on('pageerror', e=>errors.push(e.message));
const assert=(condition,message)=>{if(!condition)throw Error(message);checks.push(message);};
const dictionary=page.getByRole('dialog',{name:'Quick dictionary'});
async function selectText(locator, excerpt) {
  await locator.evaluate((el, excerpt)=>{
    const range=document.createRange();range.selectNodeContents(el);
    if(excerpt){
      const start=el.textContent.indexOf(excerpt);if(start<0)throw Error('Selection excerpt missing');
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,offset=0,started=false;
      while((node=walker.nextNode())){const end=offset+node.textContent.length;
        if(!started&&start<end){range.setStart(node,start-offset);started=true;}
        if(started&&start+excerpt.length<=end){range.setEnd(node,start+excerpt.length-offset);break;}
        offset=end;
      }
    }
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  }, excerpt);
  await page.getByRole('button',{name:'Meaning of selection',exact:true}).waitFor();
}
try {
  await page.goto(`${base}/lessons/04/`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Look up Stuhl',exact:true}).first().click();
  await dictionary.waitFor();
  assert((await dictionary.innerText()).includes('chair'),'Clicked word opens its vocabulary meaning');
  assert(await dictionary.locator('.study-tone-male').count()>0,'Masculine forms carry the blue vocabulary color');
  assert((await dictionary.innerText()).includes('Masculine · der'),'Gender is labelled in text as well as color');
  assert(await dictionary.locator('.study-tone-plural').count()>0,'Plural has its distinct purple color');
  assert(await dictionary.locator('.study-tone-male').first().evaluate(el=>getComputedStyle(el).color)==='rgb(23, 77, 172)','Masculine uses the existing semantic ink token');
  const cardLink=await dictionary.getByRole('link',{name:'Open study card →',exact:true}).first().getAttribute('href');
  assert(cardLink.includes('/vocabulary/'),'Matching vocabulary card is directly linked');
  await dictionary.getByLabel('German or English',{exact:true}).fill('Lampe');
  assert(await dictionary.locator('.study-tone-female').count()>0,'Feminine forms carry the pink vocabulary color');
  await dictionary.getByLabel('German or English',{exact:true}).fill('Bett');
  assert(await dictionary.locator('.study-tone-neuter').count()>0,'Neuter forms carry the green vocabulary color');
  await page.screenshot({path:`${output}/gender-card-desktop.png`});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Phrases',exact:true}).click();
  const phrase=page.locator('.lesson-phrases .study-german').filter({hasText:'Das finde ich auch.'}).first();
  await phrase.scrollIntoViewIfNeeded();
  // Real mouse drag must select across word buttons without opening a word lookup.
  const first=await phrase.getByRole('button',{name:'Look up Das',exact:true}).boundingBox();
  const last=await phrase.getByRole('button',{name:'Look up auch',exact:true}).boundingBox();
  await page.mouse.move(first.x+1,first.y+first.height/2); await page.mouse.down();
  await page.mouse.move(last.x+last.width,last.y+last.height/2,{steps:20}); await page.mouse.up();
  await page.getByRole('button',{name:'Meaning of selection',exact:true}).waitFor();
  assert(!await dictionary.isVisible(),'Dragging across words does not trigger an accidental word popup');
  await page.getByRole('button',{name:'Meaning of selection',exact:true}).click();
  assert((await dictionary.innerText()).includes('I think so too.'),'Highlighted phrase shows its full meaning');
  const phraseCard=dictionary.locator('[data-lookup-kind=phrase]').first();
  assert(/\/lessons\/04\/?#phrases$/.test(await phraseCard.getByRole('link',{name:'Open phrase card →'}).getAttribute('href')),'Phrase result links to the existing lesson phrase card');
  await phraseCard.getByRole('button',{name:'Save to review: Das finde ich auch.',exact:true}).click();
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button',{name:'Remove from review: Das finde ich auch.',exact:true}).count()===1,'Saving through lookup selects the same existing phrase card');
  await page.getByRole('navigation',{name:'Lesson 4 study sections'}).getByRole('button',{name:/^Words/}).click();
  await page.getByRole('button',{name:'Open dictionary',exact:true}).click();
  await dictionary.getByLabel('German or English',{exact:true}).fill('Das finde ich auch.');
  await dictionary.getByRole('link',{name:'Open phrase card →',exact:true}).first().click();
  await page.locator('.lesson-phrases').waitFor();
  assert(await page.getByRole('button',{name:'Phrases',exact:true}).getAttribute('aria-current')==='page','Phrase link selects the phrase tab even from the same lesson');
  await page.goto(`${base}/book/?page=coursebook-30`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Select line: Schau doch mal, da! Der Stuhl ist so schön.',exact:true}).click();
  assert((await dictionary.innerText()).includes('The chair is so beautiful.'),'Clicking an original-page sentence opens its complete meaning');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Full screen ↗',exact:true}).click();
  await selectText(page.locator('.book-fullscreen .book-selected-line .study-german'));
  await page.getByRole('button',{name:'Meaning of selection',exact:true}).click({timeout:5000});
  assert(await dictionary.isVisible(),'Selection lookup works above the full-screen reader');
  await page.keyboard.press('Escape');
  assert(await page.locator('.book-fullscreen').isVisible(),'Closing lookup keeps the full-screen reading position');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Reading mode',exact:true}).click();
  await page.getByRole('button',{name:'Meaning: Das ist ein Sonderangebot.',exact:true}).click();
  assert((await dictionary.innerText()).includes('That is a special offer.'),'Line Meaning button works without text selection');
  await dictionary.getByLabel('German or English',{exact:true}).fill('Wie alt bist du?');
  assert((await dictionary.innerText()).includes('How old are you?'),'Earlier conversation sentence has an English meaning');
  const oldPhrase=dictionary.getByRole('link',{name:'Open phrase card →'}).first();
  await oldPhrase.click();
  await page.waitForURL(/\/phrases\/id-/);
  assert((await page.locator('main').innerText()).includes('Wie alt bist du?'),'Existing phrase card opens successfully');
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${base}/book/?page=coursebook-29`,{waitUntil:'networkidle'});
  await page.locator('.listening-transcript summary').first().click();
  const transcript=page.locator('.listening-transcript-lines .study-german').filter({hasText:'Das Bild ist so schön.'}).first();
  await selectText(transcript, 'Das Bild ist so schön.');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Selection toolbar stays inside the mobile viewport');
  await page.getByRole('button',{name:'Meaning of selection',exact:true}).click();
  assert((await dictionary.innerText()).includes('The picture is so beautiful.'),'Mobile transcript selection gives sentence meaning');
  await page.screenshot({path:`${output}/sentence-mobile.png`});
  await dictionary.getByLabel('German or English',{exact:true}).fill('Ein unbekannter Beispielsatz xyz.');
  assert((await dictionary.innerText()).includes('No local definition'),'Unknown sentence has an honest fallback');
  const fallback=await dictionary.getByRole('link',{name:'Translate selection ↗'}).getAttribute('href');
  assert(new URL(fallback).searchParams.get('text')==='Ein unbekannter Beispielsatz xyz.','Translation link carries the complete selected sentence');
  assert(errors.length===0,`No browser errors: ${errors.join('; ')}`);
  await writeFile(`${output}/verification.json`,JSON.stringify({base,passed:true,checks,errors},null,2));
  console.log(JSON.stringify({base,passed:checks.length,errors}));
} catch(error) {await writeFile(`${output}/verification.json`,JSON.stringify({base,passed:false,checks,errors,failure:String(error)},null,2));throw error;}
finally {await browser.close();}
