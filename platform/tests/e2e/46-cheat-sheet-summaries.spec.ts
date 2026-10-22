import {printLiveSheet} from "./helpers/print-live-sheet";
import { expect, test } from "@playwright/test";

for (const width of [320, 1440]) {
  for (const sheet of ["countries", "home"]) {
    test(`${sheet} prints the live page without changing its state at ${width}px`, async ({page}, testInfo) => {
      await page.setViewportSize({width,height:1000});
      await page.goto(`cheat-sheets/${sheet}/`);
      const input=page.getByRole("textbox",{name:"Find a country or language",exact:true});
      const index=page.locator("#country-index");
      if(sheet==="countries"){
        await input.fill("Iran");
        await index.getByRole("button",{name:"Hide answers & recall",exact:true}).click();
        await expect(index.locator(".country-row")).toHaveCount(1);
        await expect(index.getByRole("button",{name:/^Reveal/})).toBeVisible();
      }
      if(sheet==="home")await page.getByRole("button",{name:"Slow audio off",exact:true}).click();
      const map=page.locator(sheet==="countries"?"#country-index":"#home-patterns");
      const content=await map.innerText();
      await page.evaluate(()=>{window.print=()=>{document.documentElement.dataset.printRequested="true";};});
      await page.getByRole("button",{name:"Print / save as PDF",exact:true}).click();
      await expect(page.locator("html")).toHaveAttribute("data-print-requested","true");
      await printLiveSheet(page,testInfo,sheet,async()=>{
        await expect(map).toBeVisible();
        if(sheet==="countries"){
          await expect(index.locator(".country-row")).toHaveCount(1);
          await expect(index.locator(".country-row h3")).toContainText("Iran");
          await expect(index.locator(".country-languages")).toContainText("Try saying it first.");
          await expect.poll(()=>index.locator("img").evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
        }else{
          await expect(map.locator(".home-pronoun-map > div")).toHaveCount(4);
          await expect(map).toContainText("Die Möbel sind schön.");
        }
      },width===1440);
      await expect(map).toHaveText(content,{useInnerText:true});
      if(sheet==="home"){
        await expect(page.getByRole("button",{name:"Slow audio on",exact:true})).toHaveAttribute("aria-pressed","true");
        await expect(page.locator(".home-quiz")).toContainText("Question 1 /");
      }
      if(sheet==="countries"){
        await expect(input).toHaveValue("Iran");
        await expect(index.getByRole("button",{name:"Show all answers",exact:true})).toHaveAttribute("aria-pressed","true");
        await expect(index.getByRole("button",{name:/^Reveal/})).toBeVisible();
      }
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    });
  }
}

test("home saved anchors lead to the shared subject vocabulary", async ({page}) => {
  await page.goto("cheat-sheets/home/#home-bett");
  await expect(page.locator("#home-bett")).toBeAttached();
  await expect(page.locator(".home-word-card,.home-memory-lanes,.home-focus")).toHaveCount(0);
  await page.getByRole("link",{name:"Open home subject sheet",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>new URLSearchParams(location.search).get("lesson"))).toBe("1,2,3,4");
  await expect(page.getByRole("heading",{name:"Home & furniture",exact:true})).toBeVisible();
});

test("home pronunciation follows the saved speed when its slow override is off", async ({page}) => {
  await page.addInitScript(() => {
    const NativeAudio=window.Audio;
    (window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio=[];
    window.Audio=class extends NativeAudio { constructor(src?:string){super(src);(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.push(this);} };
  });
  await page.goto("settings/");
  await page.getByRole("combobox",{name:"Audio speed"}).selectOption("0.75");
  await page.getByRole("button",{name:"Save preferences"}).click();
  await expect(page.getByText("Settings saved.",{exact:true})).toBeVisible();
  await page.goto("cheat-sheets/home/");
  for (const rate of [0.75,0.8,0.75]) {
    if (rate===0.8) await page.getByRole("button",{name:"Slow audio off",exact:true}).click();
    else if (await page.getByRole("button",{name:"Slow audio on",exact:true}).count()) await page.getByRole("button",{name:"Slow audio on",exact:true}).click();
    await page.locator(".home-pronoun-map").getByRole("button",{name:"Listen: Der Stuhl ist schön.",exact:true}).click();
    await expect.poll(() => page.evaluate(() => {
      const audio=(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.at(-1);
      return audio?{rate:audio.playbackRate,advanced:audio.currentTime>0}:null;
    })).toEqual({rate,advanced:true});
    const stop=page.locator(".home-pronoun-map").getByRole("button",{name:"Stop: Der Stuhl ist schön.",exact:true});
    if(await stop.count()) await stop.click();
  }
});

for (const width of [390,1440]) test(`shared overviews preserve verb, number and register selections at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:1000});
  for (const [sheet,content] of [["verbs",".verb-atlas"],["numbers",".number-ladder"],["conversation",".conversation-atlas"]] as const) {
    await page.goto(`cheat-sheets/${sheet}/`);
    if(sheet==="conversation") await page.getByRole("button",{name:"Formal · Sie",exact:true}).click();
    const overview=page.locator(".sheet-overview");
    const launch=overview.getByRole("button",{name:"Expand overview"});
    await expect(overview.locator(content)).toHaveCount(1);
    await launch.click();
    const dialog=overview.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(overview.locator(content)).toHaveCount(1);
    if(sheet==="verbs") await dialog.locator(".verb-atlas button").filter({has:page.locator("small",{hasText:/^sein$/})}).click();
    if(sheet==="numbers") await dialog.getByRole("button",{name:"200 zweihundert",exact:true}).click();
    if(sheet==="conversation") await expect(dialog).toContainText("Wie heißen Sie?");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(launch).toBeFocused();
    await expect(overview.locator(content)).toHaveCount(1);
    if(sheet==="verbs") await expect(page.getByRole("combobox",{name:"Choose a verb"})).toHaveValue("sein");
    if(sheet==="numbers") await expect(page.locator(".sheet-number-input input")).toHaveValue("200");
    if(sheet==="conversation") await expect(page.getByRole("button",{name:"Formal · Sie",exact:true})).toHaveAttribute("aria-pressed","true");
  }
});
