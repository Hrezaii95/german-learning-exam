import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const lesson=Number(process.env.STUDY_TEST_LESSON??5),segment=String(lesson).padStart(2,'0');
const base=(process.env.STUDY_TEST_BASE??'http://localhost:3210/german-learning-exam').replace(/\/$/,'');
const output=resolve('../research/lesson-expansion',process.env.STUDY_TEST_LABEL??`lesson-${lesson}-export`);
await mkdir(output,{recursive:true});
const unit=JSON.parse(await readFile(`apps/web/generated/lesson-${lesson===5?'five':'six'}-study.json`,'utf8'));
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(pass,label)=>{if(!pass)throw Error(label);checks.push(label);};
const visit=path=>page.goto(base+path,{waitUntil:'networkidle'});
try{
 await visit(`/lessons/${segment}/`);const scope=page.locator('details.study-scope');await scope.locator('summary').click();await scope.getByRole('button',{name:'One lesson',exact:true}).click();await scope.getByLabel('Selected lesson',{exact:true}).selectOption(String(lesson));await scope.locator('summary').click();
 const tabs=page.getByRole('navigation',{name:`Lesson ${lesson} study sections`});
 await expect(page.locator('.lesson-concept')).toHaveCount(unit.concepts.length);check(true,'All lesson grammar concepts render');
 await tabs.getByRole('button',{name:'Verbs',exact:true}).click();await expect(page.locator('.lesson-concept')).toHaveCount(unit.verbs.length);check(true,'All verb paradigms render');
 await tabs.getByRole('button',{name:'Phrases',exact:true}).click();await expect(page.locator('.lesson-concept')).toHaveCount(unit.phrases.length);check(true,'All phrases render');
 await tabs.getByRole('button',{name:'Words',exact:true}).click();check(await page.locator('[data-word-family]').count()>=unit.words.length,'Every source entry has a word card');
 await tabs.getByRole('button',{name:'Practice',exact:true}).click();
 for(const q of unit.quiz){await page.getByRole('button',{name:q.answer,exact:true}).click();await expect(page.getByRole('heading',{name:'Correct!',exact:true})).toBeVisible();await page.getByRole('button',{name:'Next question →',exact:true}).click();}
 await expect(page.getByRole('heading',{name:`${unit.quiz.length} / ${unit.quiz.length}`,exact:true})).toBeVisible();check(true,'Every quiz question advances and scores correctly');
 for(const [path,count] of [['grammar',unit.concepts.length],['verbs',unit.verbs.length],['phrases',unit.phrases.length]]){await visit(`/${path}/`);await expect(page.locator('.course-patterns .lesson-concept')).toHaveCount(count);check(true,`${path} hub follows Lesson ${lesson}`);}
 await visit('/listening/');check(await page.locator('audio').count()>0,'Selected lesson has original audio players');await page.locator('.listening-transcript summary').first().click();check(await page.locator('.listening-transcript-body').first().isVisible(),'Listening transcripts are available');
 await visit('/cheat-sheets/objects/');await expect(page.getByRole('heading',{name:'One object. One colour trail.',exact:true})).toBeVisible();
 if(lesson===5){await page.getByRole('button',{name:'die Uhr watch',exact:true}).click();await expect(page.locator('.object-result')).toContainText('Das ist eine Uhr.');await page.getByLabel('Correct a guess with kein / keine').check();await expect(page.locator('.object-result')).toContainText('Das ist keine Uhr.');check(true,'Article builder switches gender and negation correctly');await page.screenshot({path:resolve(output,'objects-desktop.png')});}
 await page.setViewportSize({width:390,height:844});await visit(`/lessons/${segment}/`);await page.screenshot({path:resolve(output,'lesson-mobile.png')});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Lesson fits phone width');
 await visit(lesson===5?'/cheat-sheets/objects/':'/cheat-sheets/office/');await page.screenshot({path:resolve(output,'sheet-mobile.png')});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Cheat sheet fits phone width');
 check(errors.length===0,`No browser exceptions: ${errors.join('; ')}`);
 await writeFile(resolve(output,'verification.json'),JSON.stringify({base,lesson,checks,errors},null,2));console.log(JSON.stringify({base,lesson,passed:checks.length}));
}finally{await browser.close();}
