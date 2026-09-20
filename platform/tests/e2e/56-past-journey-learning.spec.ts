import {expect,test} from "@playwright/test";

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const NativeAudio=window.Audio;
  (window as unknown as {clips:HTMLAudioElement[]}).clips=[];
  window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {clips:HTMLAudioElement[]}).clips.push(this);}};
 });
});

for(const width of [320,1440]){
 test(`yesterday timeline, opening-hours recall and saved context at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await page.goto("cheat-sheets/past/");
  const lab=page.locator("#past-lab");
  await lab.getByRole("button",{name:/Morning trinken/}).click();
  await lab.getByRole("combobox",{name:"Past sentence person",exact:true}).selectOption("1");
  await lab.getByRole("combobox",{name:"Past sentence type",exact:true}).selectOption("question");
  await expect(lab.locator(".past-result")).toContainText("Hast du gestern Kaffee getrunken?");
  await lab.getByRole("button",{name:"Listen: Hast du gestern Kaffee getrunken?",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1)?.currentTime??0)).toBeGreaterThan(0);
  await lab.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"Hast du gestern Kaffee getrunken?"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(page).toHaveURL(/\/cheat-sheets\/past\/#past-lab-5-1-question/);
  await page.reload();
  await expect(lab.getByRole("combobox",{name:"Past activity",exact:true})).toHaveValue("5");
  await expect(lab.getByRole("combobox",{name:"Past sentence type",exact:true})).toHaveValue("question");
  await lab.getByRole("button",{name:/^Remove from review:/}).click();
  await lab.screenshot({path:info.outputPath(`past-timeline-${width}.png`)});
  const hours=page.locator("#past-hours");
  await hours.getByRole("button",{name:"ab Start; no end stated",exact:true}).click();
  await hours.getByRole("button",{name:"The practice is open from 08:00 until 13:00.",exact:true}).click();
  await expect(hours.getByRole("status")).toContainText("no closing time is stated");
  await hours.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"Die Praxis ist ab acht Uhr geöffnet."}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(hours.getByRole("button",{name:"ab Start; no end stated",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(hours.getByRole("status")).toHaveCount(0);
  await hours.screenshot({path:info.outputPath(`past-hours-${width}.png`)});
  await page.locator("#past-pattern-ieren").getByRole("button",{name:"Save to review: telefoniert",exact:true}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"telefoniert"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(page.locator("#past-pattern-ieren")).toHaveAttribute("data-selected","true");
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });

 test(`season wheel, trip auxiliary and year return at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await page.goto("cheat-sheets/journeys/");
  const calendar=page.locator("#season-calendar");
  await calendar.getByRole("group",{name:"Choose a season"}).getByRole("button",{name:"der Winter winter",exact:true}).click();
  await calendar.getByRole("group",{name:"winter months"}).getByRole("button",{name:"der Januar January",exact:true}).click();
  await expect(calendar.locator(".season-output")).toContainText("Im Januar bin ich nach Hamburg gefahren.");
  await calendar.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"Im Januar bin ich nach Hamburg gefahren."}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(calendar.getByRole("group",{name:"winter months"}).getByRole("button",{name:"der Januar January",exact:true})).toHaveAttribute("aria-pressed","true");
  await calendar.screenshot({path:info.outputPath(`journey-calendar-${width}.png`)});
  const lab=page.locator("#journey-lab");
  await lab.getByRole("button",{name:"3 · Visit besuchen",exact:true}).click();
  await lab.getByRole("combobox",{name:"Journey person",exact:true}).selectOption("3");
  await lab.getByRole("checkbox",{name:"Make a yes/no question",exact:true}).check();
  await expect(lab.locator(".journey-result")).toContainText("Haben wir Anna besucht?");
  await expect(lab.locator(".journey-aux-trail")).toContainText("haben");
  await lab.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"Haben wir Anna besucht?"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(lab.getByRole("combobox",{name:"Journey action",exact:true})).toHaveValue("10");
  await expect(lab.getByRole("checkbox",{name:"Make a yes/no question",exact:true})).toBeChecked();
  await lab.screenshot({path:info.outputPath(`journey-lab-${width}.png`)});
  const years=page.locator("#journey-years");
  await years.getByRole("textbox",{name:"Year to pronounce",exact:true}).fill("2007");
  await expect(years.locator(".year-chunks")).toHaveText("zweitausendsieben");
  await years.getByRole("button",{name:"Listen: zweitausendsieben",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1)?.currentTime??0)).toBeGreaterThan(0);
  await years.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"zweitausendsieben"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(page).toHaveURL(/\/cheat-sheets\/journeys\/#journey-years-.*-2007$/);
  await page.reload();
  await expect(years.getByRole("textbox",{name:"Year to pronounce",exact:true})).toHaveValue("2007");
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });
}

test("past and journey cards remain scoped and their summaries export",async({page},info)=>{
 for(const sheet of ["past","journeys"]){
  await page.goto(`cheat-sheets/${sheet}/`);
  await page.getByRole("button",{name:"Show saved cards",exact:true}).click();
  await expect(page.locator("#sheet-practice")).toContainText("No matching practice items");
  await page.getByRole("button",{name:"Showing saved cards",exact:true}).click();
  await expect(page.locator("[data-sheet-card]")).toHaveCount(12);
  await page.emulateMedia({media:"print"});await page.evaluate(()=>document.fonts.ready);
  for(const format of ["A4","Letter"] as const)await page.pdf({path:info.outputPath(`${sheet}-${format}.pdf`),format,printBackground:true,margin:{top:"12mm",bottom:"12mm",left:"12mm",right:"12mm"}});
  await page.emulateMedia({media:"screen"});
 }
});
