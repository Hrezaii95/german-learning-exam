import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210/german-learning-exam').replace(/\/$/,'');
const output=resolve('../research/lesson-expansion',process.env.STUDY_TEST_LABEL??'lesson-eight-export');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const check=label=>checks.push(label);
try{
 await page.goto(base+'/cheat-sheets/time/',{waitUntil:'networkidle'});
 const scope=page.locator('details.study-scope');await scope.locator('summary').click();await scope.getByRole('button',{name:'One lesson',exact:true}).click();await scope.getByLabel('Selected lesson',{exact:true}).selectOption('8');await scope.locator('summary').click();
 await expect(page.locator('#time-map article')).toHaveCount(3);check('am, um and the night exception are visible together');
 await page.locator('#time-map').screenshot({path:resolve(output,'time-map-desktop.png')});
 await expect(page.getByRole('img',{name:'Clock showing 15:30',exact:true})).toBeVisible();await expect(page.locator('.clock-answer h3')).toHaveText('halb vier');check('The default clock teaches half past three, not half past four');
 await page.getByLabel('Clock minute',{exact:true}).selectOption('35');await expect(page.locator('.clock-answer h3')).toHaveText('fünf nach halb vier');
 await page.locator('.time-mode').getByRole('button',{name:'Official · 24-hour',exact:true}).click();await expect(page.locator('.clock-answer h3')).toHaveText('fünfzehn Uhr fünfunddreißig');check('Changing mode preserves the actual time');
 const response=page.waitForResponse(r=>r.url().endsWith('.mp3'));await page.locator('.clock-answer').getByRole('button',{name:'Listen: Es ist fünfzehn Uhr fünfunddreißig.',exact:true}).click();if(!(await response).ok())throw Error('Clock audio failed');check('The exact official time plays file-backed speech');
 await page.getByLabel('Show the answer',{exact:true}).uncheck();await expect(page.locator('.clock-answer h3')).toHaveCount(0);await page.getByLabel('Show the answer',{exact:true}).check();check('Recall mode hides and reveals the answer');
 await page.getByLabel('Clock minute',{exact:true}).selectOption('30');await page.locator('.time-mode').getByRole('button',{name:'Everyday · 12-hour',exact:true}).click();
 await page.locator('.clock-answer [lang="de"]').filter({hasText:'Es ist halb vier.'}).first().evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
 await page.getByRole('button',{name:'Meaning of selection',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Quick dictionary',exact:true});await expect(dialog.locator('article').first()).toContainText('half past three');
 await dialog.locator('article').first().getByRole('button',{name:'Save to review: Es ist halb vier.',exact:true}).click();await dialog.getByRole('button',{name:'Close dictionary',exact:true}).click();await expect(page.locator('.clock-answer').getByRole('button',{name:'Remove from review: Es ist halb vier.',exact:true})).toBeVisible();check('Dictionary saving matches the displayed afternoon clock');
 await page.getByLabel('Clock hour',{exact:true}).selectOption('3');await expect(page.locator('.clock-answer').getByRole('button',{name:'Remove from review: Es ist halb vier.',exact:true})).toBeVisible();await page.locator('.clock-answer').getByRole('button',{name:'Remove from review: Es ist halb vier.',exact:true}).click();check('Morning and afternoon share one review entry for the same spoken time');
 await page.getByLabel('Clock hour',{exact:true}).selectOption('0');await expect(page.locator('.clock-answer h3')).toHaveText('halb eins');check('The clock wraps correctly through midnight');
 await page.getByLabel('Clock hour',{exact:true}).selectOption('15');await page.locator('#clock-lab').screenshot({path:resolve(output,'clock-desktop.png')});
 await page.locator('.week-map').getByRole('button',{name:/Sonntag/}).click();await page.locator('.time-places').getByRole('button',{name:'der Klub in einen Klub',exact:true}).click();await expect(page.locator('.plan-answer')).toContainText('Am Sonntag gehen wir in einen Klub.');await expect(page.locator('.time-word-order [data-verb="true"]')).toContainText('gehen');check('Weekday and masculine destination produce the correct plan');
 await page.getByLabel('Put the time first',{exact:true}).uncheck();await expect(page.locator('.plan-answer')).toContainText('Wir gehen am Sonntag in einen Klub.');check('Moving the time leaves the verb in position 2');
 await page.locator('.plan-answer').getByRole('button',{name:'Save to review: Wir gehen am Sonntag in einen Klub.',exact:true}).click();await page.reload({waitUntil:'networkidle'});await page.locator('.week-map').getByRole('button',{name:/Sonntag/}).click();await page.locator('.time-places').getByRole('button',{name:'der Klub in einen Klub',exact:true}).click();await page.getByLabel('Put the time first',{exact:true}).uncheck();await expect(page.locator('.plan-answer').getByRole('button',{name:'Remove from review: Wir gehen am Sonntag in einen Klub.',exact:true})).toBeVisible();check('The chosen plan survives a page reload in saved review');
 await page.setViewportSize({width:390,height:844});await page.locator('#clock-lab').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(output,'clock-phone.png')});await page.locator('#plan-lab').screenshot({path:resolve(output,'plan-phone.png')});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(`Overflow at ${width}px`);check(`The clock and plan fit a ${width}px phone`);}
 await page.goto(base+'/cheat-sheets/questions/',{waitUntil:'networkidle'});await expect(page.getByLabel('Practice topic',{exact:true})).toHaveValue('availability');await expect(page.locator('#question-map').getByRole('button',{name:/Wann/})).toBeVisible();await expect(page.locator('#question-map').getByRole('button',{name:/Wie spät/})).toBeVisible();check('Both time questions follow the Lesson 8 selection');
 await page.goto(base+'/book/?page=workbook-90',{waitUntil:'networkidle'});await expect(page.getByLabel('Go to page',{exact:true})).toHaveValue('workbook-90');check('The extra listening page is reachable within Lesson 8');
 if(errors.length)throw Error(errors.join('; '));check('No browser exceptions');
 await writeFile(resolve(output,'time-verification.json'),JSON.stringify({base,checks,errors},null,2));console.log(JSON.stringify({base,passed:checks.length}));
}catch(e){await page.screenshot({path:resolve(output,'time-failure.png')});throw e;}finally{await browser.close();}
