import {expect,test} from "@playwright/test";
import {gotoApp} from "./support/app";
const scope=Buffer.from(JSON.stringify({v:1,skills:["gender"],count:5})).toString("base64url");
for(const width of [390,1280])for(const interaction of ["tap","keyboard","drag"] as const)for(const mode of ["quick","run"] as const){
 test(`Wortwerk ${mode} persists by ${interaction} at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:width===390?844:900});
  await page.emulateMedia({reducedMotion:"reduce"});
  await gotoApp(page,"/play/packs");
  const fixture=page.getByRole("checkbox",{name:/Enable Fixture only/});
  await expect(fixture).not.toBeChecked();await fixture.check();
  await gotoApp(page,`/play/run?mode=${mode}&scope=${scope}`);
  await page.getByRole("button",{name:mode==="quick"?"Start Quick review":"Start Daily Run",exact:true}).click();
  for(let step=0;step<20;step++){
   if(await page.getByRole("heading",{name:mode==="quick"?"Quick review complete":"Daily Run complete",exact:true}).isVisible())break;
   const typed=page.getByRole("textbox",{name:"Your answer",exact:true});
   if(await typed.count()){
    await typed.fill("practice");await page.getByRole("button",{name:"Check answer",exact:true}).click();
   }else{
    const option=page.locator(".ww-corners__option").first();
    if(interaction==="keyboard"){await option.focus();await page.keyboard.press("Enter");}
    else if(interaction==="drag"){
     const prompt=await page.locator(".ww-corners__prompt").boundingBox();const target=await option.boundingBox();
     expect(prompt).not.toBeNull();expect(target).not.toBeNull();
     await page.mouse.move(prompt!.x+prompt!.width/2,prompt!.y+prompt!.height/2);await page.mouse.down();
     await page.mouse.move(target!.x+target!.width/2,target!.y+target!.height/2,{steps:8});await page.mouse.up();
    }else await option.click();
   }
   await expect(page.getByRole("region",{name:"Answer feedback"})).toBeVisible();
   await page.getByRole("button",{name:/^(Next task|See results)$/}).click();
  }
  await expect(page.getByRole("heading",{name:mode==="quick"?"Quick review complete":"Daily Run complete",exact:true})).toBeVisible();
  await gotoApp(page,"/play");await page.reload();
  await expect(page.getByText("1 day in your streak",{exact:true})).toBeVisible();
  await expect(page.getByRole("img",{name:`Daily Run goal: ${mode==="quick"?0:1} of 1`})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator(".ww-page").screenshot({path:info.outputPath(`wortwerk-${mode}-${interaction}-${width}.png`)});
 });
}
