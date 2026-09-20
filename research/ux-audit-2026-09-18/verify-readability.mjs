import {chromium} from '../../platform/node_modules/@playwright/test/index.mjs';
import {startStaticServer} from '../../platform/tests/e2e/support/static-server.mjs';
import {mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const live=process.argv.includes('--live');const local=live?null:await startStaticServer({port:0});
const base=live?'https://hrezaii95.github.io/german-learning-exam':local.baseUrl;
const out=resolve('../research/ux-audit-2026-09-18',live?'step-1-live':'step-1-local');await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({serviceWorkers:'block'}),results=[];
try{
for(const [route,width,target,name] of [
 ['/lessons/12/',1440,'.lesson-concept','lesson-desktop'],
 ['/lessons/03/',390,'.lesson-concept','lesson-phone'],
 ['/cheat-sheets/',320,'.country-row','country-phone'],
 ['/cheat-sheets/home/',1440,'.home-memory-lanes','home-overview'],
 ['/phrases/id-71613a6167652d63617375616c/',390,'.infographic-panel__steps','diagram-phone']
]){
 await page.setViewportSize({width,height:1000});await page.goto(base+route,{waitUntil:'networkidle'});
 const element=route==='/cheat-sheets/'?page.locator(target).filter({hasText:'Großbritannien'}).first():page.locator(target).first();
 await element.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${name}.png`)});
 const dimensions=await element.evaluate(e=>({width:e.getBoundingClientRect().width,childWidth:e.querySelector('div')?.getBoundingClientRect().width??null}));
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 if(overflow)throw new Error(`${route} overflows at ${width}`);
 if(route.startsWith('/lessons/')&&dimensions.childWidth<150)throw new Error('Squeezed text column');
 const launcher=page.getByRole('button',{name:'Open dictionary',exact:true});
 if(await launcher.evaluate(e=>getComputedStyle(e).position)==='fixed')throw new Error('Floating dictionary covers content');
 results.push({route,viewportWidth:width,...dimensions,overflow});
}
await writeFile(resolve(out,'verification.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify({passed:true,base,results}));
}finally{await browser.close();await new Promise(r=>local?local.server.close(r):r());}
