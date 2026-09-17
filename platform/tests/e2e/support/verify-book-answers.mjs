import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210').replace(/\/$/,'');
const output=resolve('../research/book-answers',process.env.STUDY_TEST_LABEL??'dev');
await mkdir(output,{recursive:true});
const book=JSON.parse(await readFile('apps/web/generated/interactive-book.json','utf8'));
const answers=JSON.parse(await readFile('apps/web/generated/book-answers.json','utf8'));
const speech=JSON.parse(await readFile('apps/web/generated/study-speech.json','utf8'));
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1050},serviceWorkers:'block'});
page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
const select=async id=>{await page.getByLabel('Go to page',{exact:true}).selectOption(id);await page.waitForURL(`**page=${id}`);await page.locator('.book-original img').waitFor();await page.waitForFunction(id=>document.querySelector('.book-original img')?.getAttribute('src')?.endsWith(`${id}.webp`)&&document.querySelector('.book-original img')?.naturalWidth>0,id);};
try{
  await page.goto(`${base}/book/?page=coursebook-cover`,{waitUntil:'networkidle'});
  for(const kind of ['coursebook','workbook']){
    if(kind==='workbook')await page.getByRole('button',{name:'Workbook',exact:true}).click();
    await page.waitForFunction(kind=>document.querySelector('.book-page-picker select')?.value.startsWith(kind),kind);
    const expected=book.pages.filter(p=>p.kind===kind);
    assert(await page.locator('.book-page-picker option').count()===expected.length,`${kind}: page picker contains every source page`);
    for(const p of expected){
      await select(p.id);
      assert(await page.locator('.book-original img').evaluate(img=>img.naturalWidth>=1900),`${p.id}: original page loads at readable resolution`);
      const available=answers.filter(a=>a.pageId===p.id);
      if(available.length){
        assert(await page.locator('.book-answer-content').count()===0,`${p.id}: answers start hidden`);
        await page.getByRole('button',{name:/^Show answers/}).click();
        assert(await page.locator('[data-book-answer]').count()===available.length,`${p.id}: all ${available.length} known answers render`);
        for(const a of available){const row=page.locator(`[data-book-answer="${a.id}"]`);const german=(await row.locator('.book-answer-content > div[lang] > p > .study-german').allTextContents()).join('\n');assert(german===a.text.split(/\n+/).join('\n'),`${a.id}: displayed answer matches the source projection exactly`);}
      }else assert(await page.locator('.book-answer-empty').isVisible(),`${p.id}: missing key is explicitly identified`);
    }
  }
  await page.getByRole('button',{name:'Coursebook',exact:true}).click();
  await select('coursebook-26');
  await page.getByRole('button',{name:'Next page →',exact:true}).click();await page.waitForURL('**page=coursebook-27');
  assert((await page.locator('.book-chapter-title').innerText()).includes('Grammar'),'Next goes from magazine to grammar page 27');
  await page.getByRole('button',{name:'Next page →',exact:true}).click();await page.waitForURL('**page=coursebook-28');
  assert((await page.locator('.book-chapter-title').innerText()).includes('Communication'),'Next reaches communication page 28');
  await page.screenshot({path:`${output}/coursebook-28-desktop.png`});
  await select('coursebook-31');
  await page.getByRole('button',{name:/^Show answers/}).click();
  await page.getByRole('button',{name:'Hide answer: Exercise 5a',exact:true}).click();
  const pronoun=page.locator('[data-book-answer]').filter({has:page.getByRole('heading',{name:'Exercise 5a',exact:true})});
  assert(await pronoun.locator('.book-answer-content').count()===0,'Individual answer can be hidden');
  await page.getByRole('button',{name:'Show answer: Exercise 5a',exact:true}).click();
  assert((await pronoun.innerText()).includes('Sie, Er, Es'),'Individual answer reveals correct pronouns');
  const spoken=page.waitForResponse(response=>response.url().endsWith(speech['Sie, Er, Es']));
  await pronoun.getByRole('button',{name:'Listen: Sie, Er, Es',exact:true}).click();
  assert((await spoken).ok(),'Answer listen control fetches its exact generated German clip');
  await pronoun.getByRole('button',{name:/Save to review/}).click();
  assert(await pronoun.getByRole('button',{name:/Remove from review/}).isVisible(),'Answer can be selected for later review');
  await pronoun.getByRole('button',{name:/Remove from review/}).click();
  assert(await pronoun.getByRole('button',{name:/Save to review/}).isVisible(),'Answer can be deselected from review');
  await page.screenshot({path:`${output}/answers-desktop.png`});
  await page.getByRole('button',{name:'Full screen ↗',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Coursebook · Page 31'});
  await dialog.getByRole('button',{name:/^Show answers/}).click();
  assert(await dialog.locator('[data-book-answer]').count()===4,'Answers remain available in full-screen reading');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Workbook',exact:true}).click();await select('workbook-20');
  await page.getByRole('button',{name:/^Show answers/}).click();
  assert(await page.getByText('Official sample response',{exact:true}).isVisible(),'Open writing answers are labelled as official examples');
  await page.locator('.listening-transcript summary').first().click();
  assert((await page.locator('.listening-transcript').first().innerText()).includes('Hallo Richard'),'New workbook test audio has its matching transcript');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${output}/workbook-test-mobile.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Phone answer controls do not cause page overflow');
  await page.getByRole('button',{name:'Full screen ↗',exact:true}).click();
  const mobileDialog=page.getByRole('dialog',{name:'Workbook · Page 20'});
  await mobileDialog.getByRole('button',{name:/^Show answers/}).click();
  assert(await mobileDialog.locator('[data-book-answer]').count()===2,'Phone full screen includes both test answers');
  await mobileDialog.locator('[data-book-answer]').last().scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/answers-fullscreen-mobile.png`});
  assert(await mobileDialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Phone full-screen answers fit the dialog width');
  await mobileDialog.getByRole('button',{name:'Close full screen',exact:true}).click();
  await select('workbook-cover');
  await page.getByRole('button',{name:'☆ Bookmark',exact:true}).click();await page.reload({waitUntil:'networkidle'});
  assert(await page.getByRole('button',{name:'★ Bookmarked',exact:true}).isVisible(),'Cover bookmark survives reload');
  assert(errors.length===0,`No browser runtime errors (${errors.length})`);
  await writeFile(`${output}/checks.json`,JSON.stringify({base,checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,output}));
}finally{await browser.close();}
