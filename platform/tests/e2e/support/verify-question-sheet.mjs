import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210').replace(/\/$/,'');
const output=resolve('../research/question-cheatsheet',process.env.STUDY_TEST_LABEL??'dev');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated|server rendered|React error/i.test(message.text()))errors.push(message.text());});
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
try{
  await page.goto(`${base}/cheat-sheets/questions/`,{waitUntil:'networkidle'});
  assert(await page.getByRole('heading',{name:'Ask for the missing piece.'}).isVisible(),'Question sheet is reachable');
  assert(await page.getByRole('navigation',{name:'Choose a cheat sheet',exact:true}).getByRole('link').count()===14,'All fourteen sheets are connected');
  const map=page.locator('#question-map .question-map').first();
  assert(await map.getByRole('button').count()===14,'Overview contains fourteen core question patterns');
  await page.screenshot({caret:'initial',path:`${output}/overview-desktop.png`});
  await map.getByRole('button',{name:/Wer\?/}).click();
  const focus=page.locator('#question-word');
  assert((await focus.innerText()).includes('Wer ist das?'),'Selecting a word shows its complete example');
  await focus.getByRole('button',{name:'Hide example answer',exact:true}).click();
  assert(!(await focus.innerText()).includes('Das ist meine Schwester.'),'Recall hides the example answer');
  await focus.getByRole('button',{name:'Reveal example answer',exact:true}).click();
  assert((await focus.innerText()).includes('Das ist meine Schwester.'),'Recall reveals the example answer');
  await focus.getByRole('button',{name:'Save to review: Wer ist das?',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});
  await map.getByRole('button',{name:/Wer\?/}).click();
  assert(await focus.getByRole('button',{name:'Remove from review: Wer ist das?',exact:true}).isVisible(),'Saved question survives reload');
  await focus.getByRole('button',{name:'Remove from review: Wer ist das?',exact:true}).click();
  await page.getByRole('button',{name:'Expand overview',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'One map for the missing information'});
  assert(await dialog.getByRole('button').count()===15,'Expanded infographic includes all fourteen patterns and close control');
  await page.keyboard.press('Escape');
  const builder=page.locator('#question-builder');
  const result=builder.locator('.question-builder-result');
  for(const [topic,informal,formal,yesFormal,yes] of [
    ['home','Wo wohnst du?','Wo wohnen Sie?','Wohnen Sie in Berlin?','Wohnst du in Berlin?'],
    ['origin','Woher kommst du?','Woher kommen Sie?','Kommen Sie aus dem Iran?','Kommst du aus dem Iran?'],
    ['age','Wie alt bist du?','Wie alt sind Sie?','Sind Sie 26 Jahre alt?','Bist du 26 Jahre alt?'],
    ['price','Wie viel kostet der Stuhl?','Wie viel kostet der Stuhl?','Kostet der Stuhl 59 Euro?','Kostet der Stuhl 59 Euro?'],
  ]){
    await page.getByLabel('Practice topic',{exact:true}).selectOption(topic);
    assert((await result.innerText()).includes(informal),`${topic}: informal W-question`);
    await builder.getByRole('button',{name:'Informal · du',exact:true}).click();
    assert((await result.innerText()).includes(formal),`${topic}: formal W-question`);
    await builder.getByRole('button',{name:'W-question',exact:true}).click();
    assert((await result.innerText()).includes(yesFormal),`${topic}: formal yes/no question`);
    await builder.getByRole('button',{name:'Formal · Sie',exact:true}).click();
    assert((await result.innerText()).includes(yes),`${topic}: informal yes/no question`);
    await builder.getByRole('button',{name:'Yes/no question',exact:true}).click();
  }
  const audioResponse=page.waitForResponse(r=>r.url().endsWith('.mp3'));
  await result.getByRole('button',{name:'Listen: Wie viel kostet der Stuhl?',exact:true}).click();
  assert((await audioResponse).ok(),'The builder plays a real audio file');
  await builder.screenshot({caret:'initial',path:`${output}/word-order-desktop.png`});
  const replies=page.locator('#question-replies');
  await replies.getByRole('button',{name:'Ordinary question',exact:true}).click();
  assert((await replies.locator('.question-reply').innerText()).includes('Doch, ich komme aus dem Iran.'),'Doch contradicts the negative question');
  await replies.getByRole('button',{name:'Fact: I am from Iran',exact:true}).click();
  assert((await replies.locator('.question-reply').innerText()).includes('Nein, ich komme nicht aus dem Iran.'),'Nein confirms the negative fact');
  await page.goto(`${base}/cheat-sheets/questions/#question-wessen`,{waitUntil:'networkidle'});
  await focus.getByRole('button',{name:'Listen: Wessen?',exact:true}).waitFor();
  assert(/study extra/i.test(await focus.innerText()),'Saved deep links restore the requested question and its source label');
  await page.getByRole('button',{name:'Explore the wider question family',exact:true}).click();
  assert(await page.locator('.question-extras .question-map button').count()===5,'Five optional question-family previews are available');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.sheet-mobile-switcher summary').click();
  assert(await page.getByRole('navigation',{name:'Choose a cheat sheet on phone'}).getByRole('link').count()===14,'Phone navigation reaches all fourteen sheets');
  await page.locator('.sheet-mobile-switcher summary').click();
  await builder.scrollIntoViewIfNeeded();await page.screenshot({caret:'initial',path:`${output}/word-order-mobile.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Phone layout has no horizontal overflow');
  const practice=page.locator('#question-practice');
  const correct=['Wie','Woher','Wo','Wohnst du in Berlin?','viele','wohnen','Doch, ich komme aus dem Iran.','One: Wie viel'];
  for(const [i,answer] of correct.entries()){
    await practice.getByRole('button',{name:answer,exact:true}).click();
    assert((await practice.getByRole('status').innerText()).includes('Exactly.'),`Quiz ${i+1} gives correct feedback`);
    await practice.getByRole('button',{name:'Next question →',exact:true}).click();
  }
  assert((await practice.getByRole('status').innerText()).includes('8 / 8'),'Quiz records the complete score');
  await practice.getByRole('button',{name:'Practise again',exact:true}).click();
  assert((await practice.innerText()).includes('Question 1 / 8'),'Quiz can restart');
  assert(errors.length===0,'No browser runtime errors');
  await writeFile(`${output}/checks.json`,JSON.stringify({base,passed:checks.length,checks,errors},null,2));
  console.log(JSON.stringify({base,passed:checks.length}));
}catch(error){await page.screenshot({caret:'initial',path:`${output}/failure.png`});await writeFile(`${output}/failure.json`,JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}finally{await browser.close();}
