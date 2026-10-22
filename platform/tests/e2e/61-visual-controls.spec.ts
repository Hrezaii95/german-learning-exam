import {readFileSync} from "node:fs";
import {expect,test,type Locator,type Page} from "@playwright/test";

const projection=JSON.parse(readFileSync(new URL("../../apps/web/generated/learner-projection.json",import.meta.url),"utf8")) as {activities:{id:string;canonicalPath:string}[]};
const activity=projection.activities.find(item=>item.id==="activity:lesson-02-core-professions");
if(!activity)throw new Error("Missing actual profession activity fixture");
const activityPath=activity.canonicalPath.replace(/^\//,"")+"/";
const switchNames=["Group by gender","Group by plural pattern","Group by subject tags","Group by lesson"];

async function visit(page:Page,path:string){
  await page.goto(path);
  await page.evaluate(async()=>{await document.fonts.ready;});
}

async function groupingGeometry(button:Locator){
  return button.evaluate(node=>{
    const outer=node.getBoundingClientRect();
    const textRects=(element:Element)=>{const range=document.createRange();range.selectNodeContents(element);return [...range.getClientRects()].map(rect=>({left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}));};
    const label=node.querySelector("strong")!,state=node.querySelector("small")!;
    const stateRects=textRects(state),labelRects=textRects(label);
    return {state:state.textContent,lines:new Set(stateRects.map(rect=>Math.round(rect.top*2)/2)).size,inside:[...stateRects,...labelRects].every(rect=>rect.left>=outer.left-1&&rect.right<=outer.right+1&&rect.top>=outer.top-1&&rect.bottom<=outer.bottom+1)};
  });
}

for(const width of [320,390,768,1366])test(`grouping labels and On/Off states remain whole inside all four switches at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});
  await visit(page,"cheat-sheets/subjects/people/?q=Ingenieur&view=illustrated");
  const grouping=page.getByRole("group",{name:"Infographic grouping",exact:true});
  await expect(grouping.getByRole("switch")).toHaveCount(4);
  for(const name of switchNames){
    const button=grouping.getByRole("switch",{name,exact:true});
    await expect(button).toBeVisible();
    for(let state=0;state<2;state++){
      const checked=await button.getAttribute("aria-checked");
      const geometry=await groupingGeometry(button);
      expect(geometry.state,`${name} must expose its actual state`).toBe(checked==="true"?"On":"Off");
      expect(geometry.lines,`${name} state must stay on one line`).toBe(1);
      expect(geometry.inside,`${name} text must stay inside its button`).toBe(true);
      await button.click();
      await expect(button).toHaveAttribute("aria-checked",checked==="true"?"false":"true");
    }
  }
  await page.screenshot({path:testInfo.outputPath(`grouping-${width}.png`),fullPage:true});
});

async function workbookGeometry(track:Locator){
  return track.evaluate(node=>{
    const box=node.getBoundingClientRect(),style=getComputedStyle(node);
    const left=box.left+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft);
    const right=box.right-parseFloat(style.borderRightWidth)-parseFloat(style.paddingRight);
    const rect=(selector:string)=>{const b=node.querySelector(selector)!.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};};
    return {left,right,width:right-left,audio:rect("audio"),transcript:rect(".listening-transcript"),actions:rect(".workbook-audio__actions")};
  });
}

for(const width of [320,768,1366])test(`workbook native player and separate transcript/actions rows retain usable geometry at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});
  await visit(page,activityPath);
  const track=page.locator(".workbook-audio__track").filter({has:page.locator('audio[src*="/source-workbook-approved-v1/1_15_"]')});
  await expect(track).toHaveCount(1);
  const audio=track.locator("audio"),transcript=track.locator(".listening-transcript");
  await expect(audio).toHaveAttribute("controls","");
  await expect(transcript.locator(".listening-transcript-lines > p")).toHaveCount(0);
  await track.getByRole("button",{name:"Study 0.8×",exact:true}).click();
  await track.getByRole("button",{name:"Repeat",exact:true}).click();
  await expect.poll(()=>audio.evaluate((node:HTMLAudioElement)=>Number.isFinite(node.duration)&&node.duration>0)).toBe(true);
  await expect.poll(()=>audio.evaluate((node:HTMLAudioElement)=>node.currentTime)).toBeGreaterThan(0);
  await expect.poll(()=>audio.evaluate((node:HTMLAudioElement)=>node.playbackRate)).toBe(0.8);
  for(const open of [false,true]){
    if(open){await transcript.locator("summary").click();await expect(transcript.locator(".listening-transcript-lines > p").first()).toBeVisible();}
    const geometry=await workbookGeometry(track);
    expect(geometry.audio.left).toBeGreaterThanOrEqual(geometry.left-1);
    expect(geometry.audio.right).toBeLessThanOrEqual(geometry.right+1);
    if(width===1366)expect(geometry.audio.width,"desktop native player needs a readable transport").toBeGreaterThanOrEqual(300);
    else expect(Math.abs(geometry.audio.width-geometry.width),"narrow player must fill its available row").toBeLessThanOrEqual(2);
    for(const name of ["transcript","actions"] as const){
      expect(Math.abs(geometry[name].left-geometry.left),`${name} must start a full row`).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry[name].width-geometry.width),`${name} must span the full row`).toBeLessThanOrEqual(2);
    }
    expect(geometry.transcript.top).toBeGreaterThanOrEqual(geometry.audio.bottom-1);
    expect(geometry.actions.top).toBeGreaterThanOrEqual(geometry.transcript.bottom-1);
    console.log(JSON.stringify({viewportWidth:width,transcriptOpen:open,...geometry}));
  }
  await audio.evaluate((node:HTMLAudioElement)=>node.pause());
  await audio.focus();
  await expect(audio).toBeFocused();
  // Native timeline keyboard seeking is a separate manual QA: host ArrowRight
  // did not reliably seek in Chromium, so no programmatic time change stands in.
  await track.screenshot({path:testInfo.outputPath(`workbook-${width}.png`)});
});
