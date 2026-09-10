import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210').replace(/\/$/,'');
const output=resolve('../research/collection-cheatsheet',process.env.STUDY_TEST_LABEL??'dev');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(60000);
const checks=[],errors=[];
const assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
page.on('pageerror',e=>errors.push(e.message));
try{
  for(const [sheet,count] of [['people',64],['verbs',99],['numbers',104],['conversation',47]]){
    await page.goto(`${base}/cheat-sheets/${sheet}/`,{waitUntil:'networkidle'});
    assert(await page.locator('[data-sheet-card]').count()===count,`${sheet}: all ${count} canonical cards render`);
    await page.getByRole('button',{name:'Expand overview',exact:true}).click();
    assert(await page.locator('.sheet-overview-dialog').isVisible(),`${sheet}: full-screen overview opens`);
    await page.keyboard.press('Escape');
    assert(!await page.locator('.sheet-overview-dialog').isVisible(),`${sheet}: Escape closes overview`);
    await page.screenshot({path:`${output}/${sheet}-desktop.png`});
  }
  await page.getByRole('button',{name:'Formal · Sie',exact:true}).click();
  await page.getByRole('button',{name:'How you are',exact:true}).click();
  assert((await page.locator('.conversation-bubbles').innerText()).includes('Und Ihnen?'),'Formal dialogue matches question and answer register');
  await page.goto(`${base}/cheat-sheets/numbers/`,{waitUntil:'networkidle'});
  await page.getByLabel('Type a whole number').fill('452');
  assert((await page.locator('.number-stage').innerText()).includes('vierhundertzweiundfünfzig'),'Number builder preserves German place order');
  await page.getByLabel('Price in euros').fill('0,01');
  assert((await page.locator('.sheet-price').innerText()).includes('ein Cent'),'Price tool handles one cent');
  await page.getByLabel('Type a whole number').fill('-2');
  assert(await page.locator('.number-stage').getByRole('alert').isVisible(),'Number builder rejects out-of-range input');
  await page.goto(`${base}/cheat-sheets/verbs/`,{waitUntil:'networkidle'});
  await page.getByLabel('Choose a verb').selectOption('sprechen');
  await page.getByLabel('Choose a person').selectOption('1');
  assert((await page.locator('.verb-stage').innerText()).includes('sprichst'),'Conjugation dial applies du vowel change');
  const requestPromise=page.waitForRequest(r=>r.url().includes('/audio/collection-sheet/')||r.url().includes('/audio/word-cards-v1/'));
  await page.locator('.verb-stage').getByRole('button',{name:/Listen/}).click();
  const audio=await requestPromise;
  assert((await page.request.get(audio.url())).ok(),'Conjugated phrase audio is served successfully');
  await page.getByRole('button',{name:'Hide answers & recall',exact:true}).click();
  assert(await page.getByRole('button',{name:'Reveal German',exact:true}).count()===99,'Recall mode conceals all German cards');
  await page.getByRole('button',{name:'Reveal German',exact:true}).first().click();
  assert(await page.getByRole('button',{name:'Reveal German',exact:true}).count()===98,'Recall reveals one card at a time');
  await page.locator('#sheet-practice').getByRole('button',{name:'sprichst',exact:true}).click();
  assert((await page.locator('#sheet-practice [role=status]').innerText()).includes('Exactly.'),'Quiz gives correct feedback');
  await page.goto(`${base}/cheat-sheets/people/`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'der Vater',exact:true}).first().click();
  assert((await page.locator('.sheet-focus').innerText()).includes('die Väter'),'Family chart shows correct plural');
  const first=page.locator('[data-sheet-card]').first();
  await first.getByRole('button',{name:/Save/}).click();
  await page.getByRole('button',{name:'Show saved cards',exact:true}).click();
  assert(await page.locator('[data-sheet-card]').count()===1,'Saved-card filter follows review selection');
  await page.locator('[data-sheet-card]').getByRole('button',{name:/Remove/}).click();
  assert(await page.locator('[data-sheet-card]').count()===0,'Deselecting a card removes it from saved review');
  for(const width of [320,390,600]){
    await page.setViewportSize({width,height:844});
    await page.goto(`${base}/cheat-sheets/numbers/`,{waitUntil:'networkidle'});
    assert(await page.locator('.mobile-navigation').isVisible(),`${width}px: phone bar visible`);
    for(const label of ['Book','Lessons','Cheat sheets','My review']){
      const box=await page.getByRole('navigation',{name:'Mobile',exact:true}).getByRole('link',{name:label,exact:true}).boundingBox();
      assert(box&&box.width>=44&&box.height>=44,`${width}px: ${label} has a usable touch target`);
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px: no horizontal page overflow`);
    await page.getByRole('button',{name:'Open navigation menu'}).click();
    assert(await page.getByRole('dialog',{name:'Where to next?'}).isVisible(),`${width}px: navigation menu opens`);
    assert(await page.evaluate(()=>document.body.style.overflow==='hidden'),`${width}px: open menu locks background scroll`);
    await page.keyboard.press('Escape');
    assert(await page.getByRole('button',{name:'Open navigation menu'}).evaluate(el=>el===document.activeElement),`${width}px: Escape restores menu focus`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.sheet-mobile-switcher summary').click();
  assert(await page.getByRole('navigation',{name:'Choose a cheat sheet on phone'}).getByRole('link').count()===6,'Phone selector exposes all six sheets');
  await page.getByRole('navigation',{name:'Choose a cheat sheet on phone'}).getByRole('link',{name:/Conversation/}).click();
  await page.waitForURL('**/cheat-sheets/conversation/');
  assert(await page.getByRole('heading',{name:'Keep the conversation moving.'}).isVisible(),'Phone sheet navigation reaches conversation');
  await page.screenshot({path:`${output}/conversation-mobile.png`});
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await page.screenshot({path:`${output}/navigation-mobile.png`});
  await page.getByRole('navigation',{name:'All study areas'}).getByRole('link',{name:/Listening/}).click();
  await page.waitForURL('**/listening/');
  assert(!await page.locator('.mobile-menu').isVisible(),'Menu route navigation closes the menu');
  for(const sheet of ['people','verbs','numbers','conversation']){
    await page.goto(`${base}/cheat-sheets/${sheet}/`,{waitUntil:'networkidle'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${sheet}: phone layout has no overflow`);
    await page.screenshot({path:`${output}/${sheet}-mobile.png`});
  }
  assert(errors.length===0,`No browser runtime or hydration errors (${errors.length})`);
  await writeFile(`${output}/checks.json`,JSON.stringify({base,checks,errors},null,2));
  console.log(JSON.stringify({passed:checks.length,output}));
}finally{await browser.close();}
