import {printLiveSheet} from "./helpers/print-live-sheet";
import {expect,test} from "@playwright/test";

for(const width of [320,1440])test(`food sentence selection, portions and saved context at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>{const NativeAudio=window.Audio;(window as unknown as {clips:HTMLAudioElement[]}).clips=[];window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {clips:HTMLAudioElement[]}).clips.push(this);}};});await page.goto("cheat-sheets/food/");
 const lab=page.locator("#food-lab");await lab.getByRole("combobox",{name:"Food for these examples",exact:true}).selectOption("10");await lab.getByRole("button",{name:"Listen: Ich möchte ein Stück Käse.",exact:true}).click();await expect.poll(()=>page.evaluate(()=>{const clip=(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1);return !!clip&&clip.currentTime>0;})).toBe(true);await expect(lab).toContainText("das Stück → ein Stück Käse");
 await lab.getByRole("checkbox",{name:"Make it negative",exact:true}).check();await expect(lab.locator(".food-output")).toHaveAttribute("data-tone","neuter");await expect(lab.locator(".food-output")).toContainText("Ich möchte kein Stück Käse.");await lab.getByRole("button",{name:/^Save to review:/}).click();
 await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"Ich möchte kein Stück Käse."}).getByRole("link",{name:"Open in context",exact:true}).click();await expect(lab.getByRole("checkbox",{name:"Make it negative",exact:true})).toBeChecked();await expect(lab.getByRole("combobox",{name:"Food for these examples",exact:true})).toHaveValue("10");await lab.getByRole("button",{name:/^Remove from review:/}).click();
 const ordering=page.locator("#food-order");await ordering.getByRole("button",{name:"Reveal my turn",exact:true}).click();await expect(ordering.locator('[data-role="customer"]')).toContainText("Ich möchte ein Stück Käse.");await ordering.getByRole("button",{name:"Ich möchte eine Stück Käse.",exact:true}).click();await expect(ordering.getByRole("status")).toContainText("Look at the noun");await ordering.screenshot({path:info.outputPath(`food-order-${width}.png`)});
 await page.locator("#food-board").screenshot({path:info.outputPath(`food-menu-${width}.png`)});await page.getByRole("link",{name:"Open food subject sheet",exact:true}).click();await expect.poll(()=>page.evaluate(()=>new URLSearchParams(location.search).get("lesson"))).toBe("9");await page.goBack();await expect(lab.getByRole("combobox",{name:"Food for these examples",exact:true})).toHaveValue("10");
 const replies=page.locator("#food-replies");await replies.getByRole("combobox",{name:"Other person's preference",exact:true}).selectOption("false");await replies.getByRole("button",{name:/^Save to review:/}).click();await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"Ich mag keinen Tee. – Ich schon."}).getByRole("link",{name:"Open in context",exact:true}).click();await expect(replies.getByRole("combobox",{name:"Other person's preference",exact:true})).toHaveValue("false");await expect(replies.locator(".food-dialogue")).toContainText("Ich schon.");const compounds=page.locator("#food-compounds");await compounds.getByRole("combobox",{name:"Choose a compound",exact:true}).selectOption("3");await compounds.getByRole("button",{name:/^Save to review:/}).click();await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"die Tomate + die Suppe → die Tomatensuppe"}).getByRole("link",{name:"Open in context",exact:true}).click();await expect(compounds.getByRole("combobox",{name:"Choose a compound",exact:true})).toHaveValue("3");
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test("food shared vocabulary, plurals and retained practice",async({page},info)=>{
 await page.goto("cheat-sheets/food/");
 await expect(page.locator(".food-board,.food-selected,[data-sheet-card]")).toHaveCount(0);
 await expect(page.locator("#sheet-practice")).toContainText("Question 1 /");
 await page.getByRole("link",{name:"Open food subject sheet",exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>new URLSearchParams(location.search).get("lesson"))).toBe("9");
 await page.getByRole("searchbox",{name:"Find a word or form",exact:true}).fill("Tee");
 await page.locator("[data-subject-entry]").filter({hasText:"der Tee"}).first().click();
 await expect(page.locator(".subject-word-dropdown")).toContainText("die Tees");
 await page.goBack();
});

test("food prints the chosen compound and live case map",async({page},info)=>{
  await page.goto("cheat-sheets/food/");
  const compound=page.getByRole("combobox",{name:"Choose a compound",exact:true});
  await compound.selectOption("1");
  const result=page.locator(".food-compound");
  const text=await result.innerText();
  const terms=result.locator(":scope > div > strong");
  const labels=result.locator(":scope > div > small");
  const selectedTerms=["der Apfel","der Saft","der Apfelsaft"];
  const teachingLabels=["DESCRIBES THE KIND","CHOOSES THE ARTICLE","THE NEW WORD"];
  await expect(terms).toHaveText(selectedTerms,{useInnerText:true});
  await expect(labels).toHaveText(teachingLabels,{useInnerText:true});
  const section=page.locator("#food-compounds");
  await expect(section.locator(".study-save")).toHaveCount(1);
  await printLiveSheet(page,info,"food",async()=>{
    await expect(result).toBeVisible();
    for(const leaf of await result.locator(":scope > div > strong, :scope > div > small").all())await expect(leaf).toBeVisible();
    await expect(terms).toHaveText(selectedTerms,{useInnerText:true});
    await expect(labels).toHaveText(teachingLabels,{useInnerText:true});
    await expect(compound).toBeHidden();
    for(const control of await section.locator(".study-save,.study-audio,.study-audio-button").all())await expect(control).toBeHidden();
    await expect(page.locator(".food-case-map")).toBeVisible();
  });
  await expect(compound).toHaveValue("1");
  await expect(result).toHaveText(text,{useInnerText:true});
});
