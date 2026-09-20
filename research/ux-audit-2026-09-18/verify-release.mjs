import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../platform/node_modules/playwright/index.mjs';

// Reuse the original audit's route inventory. Each run retains its own evidence.
const root = new URL('./', import.meta.url);
const base = process.env.AUDIT_BASE || 'http://127.0.0.1:4331/german-learning-exam/';
const label = process.env.AUDIT_LABEL || 'step-9-local';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid evidence label');
const output = new URL(`${label}/`, root);
await mkdir(output, {recursive:true});
const inventory = JSON.parse(await readFile(new URL('inventory.json', root), 'utf8'));
const browser = await chromium.launch();
const results = [];
function deadline(work,ms){
  let timer;
  return Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Audit operation exceeded ${ms}ms`)),ms);})]).finally(()=>clearTimeout(timer));
}
try {
  await Promise.all([390,1440].map(async width => {
    const context = await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
    for (const entry of inventory.routes) {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const result = {route:entry.route,width,errors:[]};
      page.on('pageerror', error => result.errors.push(error.message));
      page.on('crash',()=>result.errors.push('Browser renderer crashed'));
      try {
        const response = await page.goto(new URL(entry.route.replace(/^\//,''),base).href,{waitUntil:'load',timeout:60000});
        result.status = response.status();
        await page.locator('main h1').first().waitFor({timeout:15000});
        // Font metrics and client effects must settle before contrast/layout measurement.
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(350);
        result.layout = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,h1:document.querySelector('main h1')?.textContent,domNodes:document.querySelectorAll('*').length}));
        await page.addScriptTag({path:fileURLToPath(new URL('../../platform/node_modules/axe-core/axe.min.js',root))});
        result.accessibility = await deadline(page.evaluate(async () => {
          const audit = await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
          const compact = item => ({id:item.id,impact:item.impact,description:item.description,helpUrl:item.helpUrl,nodes:item.nodes.map(node=>({target:node.target,html:node.html,summary:node.failureSummary}))});
          return {violations:audit.violations.map(compact),incomplete:audit.incomplete.map(compact),passedRules:audit.passes.length};
        }),45000);
        await page.screenshot({path:fileURLToPath(new URL(`${entry.key}-${width}.png`,output)),timeout:20000});
        result.reviewedExceptions=[];
        if(entry.route==='/book/' && result.accessibility.violations.some(item=>item.id==='target-size')){
          const originals=await page.locator('.book-hotspot').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label').replace(/^Select line: /,'')));
          await page.getByRole('combobox',{name:'Reading view',exact:true}).selectOption('read');
          await page.locator('.book-readable-lines .book-line').first().waitFor();
          const alternatives=await page.locator('.book-readable-lines .book-line').evaluateAll(nodes=>nodes.map(node=>{
            const action=node.querySelector('.study-meaning-button');
            const bounds=action?.getBoundingClientRect();
            return {text:node.querySelector('.study-german')?.getAttribute('aria-label'),width:bounds?.width??0,height:bounds?.height??0};
          }));
          if(originals.length===alternatives.length && originals.every((text,index)=>alternatives[index].text===text && alternatives[index].width>=24 && alternatives[index].height>=24)){
            result.reviewedExceptions.push({id:'target-size',selector:'.book-hotspot',basis:'Equivalent control: every source-page hotspot has the same line and a meaning button of at least 24 by 24 pixels in Read text.',verifiedLines:originals.length,reference:'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html'});
          }
        }
        result.unresolvedViolations=result.accessibility.violations.map(issue=>({...issue,nodes:issue.nodes.filter(node=>!(issue.id==='target-size' && result.reviewedExceptions.length && /class="book-hotspot/.test(node.html)))})).filter(issue=>issue.nodes.length);
      } catch(error) {result.errors.push(String(error));}
      finally {await page.close();}
      results.push(result);
      console.log(`${width} ${entry.route}: ${result.status}, ${result.accessibility?.violations.length ?? '?'} accessibility findings, ${result.errors.length} errors`);
      await writeFile(new URL(`routes-${width}.json`,output),JSON.stringify({base,checkedAt:new Date().toISOString(),results:results.filter(item=>item.width===width)},null,2)+'\n');
    }
    await context.close();
  }));
} finally {await browser.close();}
const failed=results.filter(result=>result.status!==200 || result.errors.length || result.layout.scrollWidth>result.width+1 || result.unresolvedViolations.length);
await writeFile(new URL('summary.json',output),JSON.stringify({base,checkedAt:new Date().toISOString(),routes:inventory.routes.length,views:results.length,failed:failed.map(({route,width,status,errors,accessibility})=>({route,width,status,errors,violations:accessibility?.violations.map(item=>item.id)}))},null,2)+'\n');
console.log(`${results.length} rendered views; ${failed.length} require follow-up.`);
if(failed.length) process.exitCode=1;
