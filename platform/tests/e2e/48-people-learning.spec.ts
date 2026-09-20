import {expect,test} from "@playwright/test";

for(const width of [320,390,768,1440])test(`people family viewpoint, saved sentence and card return at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(()=>{
    const NativeAudio=window.Audio;
    (window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio=[];
    window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.push(this);}};
  });
  await page.goto("cheat-sheets/people/");
  const family=page.locator(".people-family"),focus=family.locator(".family-focus");
  if(width<=800)await family.getByRole("combobox",{name:"Explore a family member"}).selectOption("mia");
  else await family.getByRole("button",{name:"Explore Mia: die Tochter",exact:true}).click();
  await expect(focus).toContainText("Mia ist meine Tochter.");
  await family.getByRole("button",{name:"I am Martin",exact:true}).click();
  await expect(focus).toContainText("Mia ist meine Enkelin.");
  await expect(focus).toContainText("Mia is my granddaughter.");
  await expect(focus.locator("h3").getByRole("button",{name:"Look up Enkelin",exact:true})).toHaveText("Enkelin.");
  await focus.getByRole("button",{name:"Listen: Mia ist meine Enkelin.",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>{
    const audio=(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.at(-1);
    return !!audio&&audio.currentTime>0&&audio.src.includes("/audio/");
  })).toBe(true);
  await focus.getByRole("button",{name:/^Save to review:/}).click();
  await expect(focus.getByRole("button",{name:/^Remove from review:/})).toBeVisible();
  await focus.getByRole("link",{name:"Open word card →",exact:true}).click();
  await page.getByRole("link",{name:/Back/}).first().click();
  await expect(page).toHaveURL(/cheat-sheets\/people\/?#family-martin-mia$/);
  await expect(focus).toContainText("Mia ist meine Enkelin.");
  await page.reload();
  await expect(focus).toContainText("Mia ist meine Enkelin.");
  await expect(focus.getByRole("button",{name:/^Remove from review:/})).toBeVisible();
  await focus.getByRole("button",{name:/^Remove from review:/}).click();
  await page.reload();
  await expect(focus.getByRole("button",{name:/^Save to review:/})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await family.screenshot({path:testInfo.outputPath(`people-family-${width}.png`)});
});

for(const width of [390,1440])test(`people bounded browsing, scoped recall and saved-filter return at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto("cheat-sheets/people/");
  const cards=page.locator("[data-sheet-card]");
  await expect(cards).toHaveCount(12);
  await page.getByRole("button",{name:"Show 12 more cards",exact:true}).click();
  await expect(cards).toHaveCount(24);
  const last=cards.last();
  const cardId=await last.getAttribute("data-sheet-card");
  await last.getByRole("link",{name:"Full card →",exact:true}).click();
  await page.getByRole("link",{name:/Back/}).first().click();
  await expect(cards).toHaveCount(24);
  await expect(page).toHaveURL(new RegExp(`page=2#sheet-card-${cardId}$`));
  const search=page.getByRole("textbox",{name:"Find a card",exact:true});
  await search.fill("Tante");
  await expect(cards).toHaveCount(1);
  await expect(page.locator(".sheet-quiz")).toContainText("Question 1 / 1");
  await page.locator(".sheet-quiz").getByRole("button",{name:"die",exact:true}).click();
  await expect(page.locator(".sheet-quiz")).toContainText("Exactly.");
  await cards.first().getByRole("button",{name:/^Save to review:/}).click();
  await page.getByRole("button",{name:"Show saved cards",exact:true}).click();
  await cards.first().getByRole("link",{name:"Full card →",exact:true}).click();
  await page.getByRole("link",{name:/Back/}).first().click();
  await expect(search).toHaveValue("Tante");
  await expect(page.getByRole("button",{name:"Showing saved cards",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(cards).toHaveCount(1);
  await cards.first().getByRole("button",{name:/^Remove from review:/}).click();
  await expect(cards).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"No matching practice items",exact:true})).toBeVisible();
});

test("people prints a complete family summary while preserving the learning view",async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("cheat-sheets/people/");
  await page.getByRole("button",{name:"I am Martin",exact:true}).click();
  await page.getByRole("textbox",{name:"Find a card",exact:true}).fill("Tante");
  const summary=page.locator(".sheet-print-summary");
  await expect(summary).toBeHidden();
  await page.emulateMedia({media:"print"});
  await expect(summary).toBeVisible();
  await expect(summary.locator(".family-member")).toHaveCount(10);
  await expect(page.locator(".people-family")).toBeHidden();
  await expect(summary).toContainText("Mia ist meine Enkelin.");
  await expect(summary).toContainText("die Lehrerinnen");
  await page.evaluate(()=>document.fonts.ready);
  for(const format of ["A4","Letter"] as const){
    const path=testInfo.outputPath(`people-${format}.pdf`);
    await page.pdf({path,format,printBackground:true,margin:{top:"12mm",bottom:"12mm",left:"12mm",right:"12mm"}});
    await testInfo.attach(`people-${format}`,{path,contentType:"application/pdf"});
  }
  await page.emulateMedia({media:"screen"});
  await expect(page.getByRole("button",{name:"I am Martin",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByRole("textbox",{name:"Find a card",exact:true})).toHaveValue("Tante");
});
