import {printLiveSheet} from "./helpers/print-live-sheet";
import {expect,test} from "@playwright/test";
for(const width of [320,1440])test(`travel scenes, sentence bracket and saved audio context at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>{const NativeAudio=window.Audio;(window as unknown as {clips:HTMLAudioElement[]}).clips=[];window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {clips:HTMLAudioElement[]}).clips.push(this);}};});await page.goto("cheat-sheets/travel/");
 await page.locator(".travel-route").getByRole("button",{name:/CHANGE umsteigen/}).click();const lab=page.locator("#travel-bracket");await lab.getByRole("combobox",{name:"Travel sentence person",exact:true}).selectOption("3");await expect(lab.locator(".travel-result")).toContainText("Wir steigen in Hamburg um.");await lab.getByRole("combobox",{name:"Travel sentence type",exact:true}).selectOption("modal");await expect(lab.locator(".travel-bridge-parts")).toContainText("WHOLE INFINITIVE · END");await expect(lab.locator(".travel-bridge-parts")).toContainText("umsteigen");await expect(lab.locator(".travel-result")).toContainText("Wir können in Hamburg umsteigen.");await lab.getByRole("button",{name:/^Save to review:/}).click();await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"Wir können in Hamburg umsteigen."}).getByRole("link",{name:"Open in context",exact:true}).click();await expect(lab.getByRole("combobox",{name:"Travel sentence type",exact:true})).toHaveValue("modal");await expect(lab.getByRole("combobox",{name:"Travel verb",exact:true})).toHaveValue("5");await expect(lab.getByRole("combobox",{name:"Travel sentence person",exact:true})).toHaveValue("3");await lab.getByRole("button",{name:/^Remove from review:/}).click();await lab.screenshot({path:info.outputPath(`travel-bracket-${width}.png`)});await page.locator("#travel-route").screenshot({path:info.outputPath(`travel-route-${width}.png`)});
 const listening=page.locator("#travel-listening");await expect(listening.getByRole("button",{name:/^Save to review:/})).toHaveCount(0);await listening.getByRole("button",{name:"Listen: announcement to identify",exact:true}).click();await expect.poll(()=>page.evaluate(()=>{const clip=(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1);return !!clip&&clip.currentTime>0;})).toBe(true);await listening.getByRole("button",{name:"Bahnsteig 3",exact:true}).click();await expect(listening.getByRole("status")).toContainText("Correct.");await listening.getByRole("button",{name:"Next announcement",exact:true}).click();await listening.getByRole("button",{name:"Gleis 2",exact:true}).click();await listening.getByRole("button",{name:/^Save to review:/}).click();await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"Die U-Bahn fährt an Gleis zwei ein."}).getByRole("link",{name:"Open in context",exact:true}).click();await expect(listening).toContainText("Which track?");await listening.getByRole("button",{name:"Show practice transcript",exact:true}).click();await expect(listening.locator(".travel-transcript")).toContainText("Die U-Bahn fährt an Gleis zwei ein.");await listening.screenshot({path:info.outputPath(`travel-listening-${width}.png`)});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test("travel vocabulary handoff and retained practice",async({page},info)=>{
 await page.goto("cheat-sheets/travel/");const target=new URL((await page.getByRole("link",{name:"Open travel subject sheet",exact:true}).getAttribute("href"))!,page.url());expect(target.pathname.endsWith("/cheat-sheets/subjects/travel")).toBe(true);expect(target.searchParams.get("lesson")).toBe("10");await expect(page.locator("[data-sheet-card],.travel-nouns")).toHaveCount(0);await expect(page.locator("#sheet-practice")).toContainText("Question 1 /");
});

test("travel prints the current sentence bracket and route",async({page},info)=>{
  await page.goto("cheat-sheets/travel/");
  const lab=page.locator("#travel-bracket");
  await lab.getByRole("combobox",{name:"Travel verb",exact:true}).selectOption("5");
  await lab.getByRole("combobox",{name:"Travel sentence person",exact:true}).selectOption("3");
  await lab.getByRole("combobox",{name:"Travel sentence type",exact:true}).selectOption("modal");
  await expect(lab.locator(".travel-result")).toContainText("Wir können in Hamburg umsteigen.");
  await printLiveSheet(page,info,"travel",async()=>{
    await expect(page.locator("#travel-route")).toBeVisible();
    await expect(lab.locator(".travel-parts")).toBeVisible();
    await expect(lab.locator(".travel-result")).toContainText("Wir können in Hamburg umsteigen.");
  });
  await expect(lab.getByRole("combobox",{name:"Travel verb",exact:true})).toHaveValue("5");
  await expect(lab.getByRole("combobox",{name:"Travel sentence type",exact:true})).toHaveValue("modal");
});
