import {printLiveSheet} from "./helpers/print-live-sheet";
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
  await page.locator(".study-saved-card").filter({hasText:"Hast du gestern Kaffee getrunken?"}).getByRole("link",{name:"Open in context",exact:true}).click();
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
  await page.locator(".study-saved-card").filter({hasText:"Die Praxis ist ab acht Uhr geöffnet."}).getByRole("link",{name:"Open in context",exact:true}).click();
  await expect(hours.getByRole("button",{name:"ab Start; no end stated",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(hours.getByRole("status")).toHaveCount(0);
  await hours.screenshot({path:info.outputPath(`past-hours-${width}.png`)});
  await page.locator("#past-pattern-ieren").getByRole("button",{name:"Save to review: telefoniert",exact:true}).click();
  await page.goto("saved/");
  await page.locator(".study-saved-card").filter({hasText:"telefoniert"}).getByRole("link",{name:"Open in context",exact:true}).click();
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
  await page.locator(".study-saved-card").filter({hasText:"Im Januar bin ich nach Hamburg gefahren."}).getByRole("link",{name:"Open in context",exact:true}).click();
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
  await page.locator(".study-saved-card").filter({hasText:"Haben wir Anna besucht?"}).getByRole("link",{name:"Open in context",exact:true}).click();
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
  await page.locator(".study-saved-card").filter({hasText:"zweitausendsieben"}).getByRole("link",{name:"Open in context",exact:true}).click();
  await expect(page).toHaveURL(/\/cheat-sheets\/journeys\/#journey-years-.*-2007$/);
  await page.reload();
  await expect(years.getByRole("textbox",{name:"Year to pronounce",exact:true})).toHaveValue("2007");
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });
}

test("past and journey print the current sentence and reference diagrams",async({page},info)=>{
  for(const sheet of ["past","journeys"]){
    await page.goto(`cheat-sheets/${sheet}/`);
  const subject=sheet==="past"?"past":"seasons",lesson=sheet==="past"?11:12,label=sheet==="past"?"past tense":"seasons & journeys";
  const target=new URL((await page.getByRole("link",{name:`Open ${label} subject sheet`,exact:true}).getAttribute("href"))!,page.url());
  expect(target.pathname.replace(/\/$/, "").endsWith(`/cheat-sheets/subjects/${subject}`)).toBe(true);
  expect(target.searchParams.get("lesson")).toBe(String(lesson));
  await expect(page.locator("[data-sheet-card]")).toHaveCount(0);
  await expect(page.locator("#sheet-practice")).toContainText("Question 1 /");

    const lab=page.locator(sheet==="past"?"#past-lab":"#journey-lab");
    const person=lab.getByRole("combobox",{name:sheet==="past"?"Past sentence person":"Journey sentence person",exact:true});
    await person.selectOption("1");
    await lab.getByRole("checkbox",{name:sheet==="past"?"Reveal final participle":"Reveal the auxiliary",exact:true}).check();
    const result=lab.locator(sheet==="past"?".past-result":".journey-result");
    const text=await result.innerText();
    await printLiveSheet(page,info,sheet,async()=>{
      await expect(lab).toBeVisible();
      await expect(result).toContainText(text);
      await expect(lab.locator(sheet==="past"?".past-parts":".journey-parts")).toBeVisible();
      if(sheet==="past")await expect(page.locator(".past-pattern-grid > article")).toHaveCount(4);
      else await expect(page.locator(".season-wheel")).toBeVisible();
    });
    await expect(person).toHaveValue("1");
    await expect(result).toHaveText(text,{useInnerText:true});
  }
});

const inlinePrintCases=[
  {sheet:"past",labels:"#past-patterns > label",count:1,teaching:".past-pattern-grid > article,.past-pattern-grid .past-formula,.past-result"},
  {sheet:"objects",labels:".object-lab > div:first-child > label",count:2,teaching:".object-result,.object-description,.object-picture,.object-pickers > button"},
  {sheet:"office",labels:"#office-lab > label,#phone-details .phone-turn > label,#phone-lab > div:first-child > label.object-toggle",count:4,teaching:".office-sentence,.office-role-trail,.office-desk > button,#phone-details .phone-turn > p,#phone-details [role=status]"},
  {sheet:"hobbies",labels:".hobby-selection > label",count:1,teaching:".hobby-meaning-map,.hobby-frame,.hobby-selection > .hobby-illustration"},
  {sheet:"food",labels:"#food-lab > label,#food-compounds > label,#food-order > label",count:3,teaching:".food-output,.food-compound,.food-order-turns,.food-intent-map"},
  {sheet:"time",labels:".clock-answer > label.time-recall,#plan-lab > label",count:4,teaching:".clock-answer > div[aria-live],.clock-layout svg.learning-clock,.time-word-order,.plan-answer"},
  {sheet:"travel",labels:"#travel-bracket > label",count:1,teaching:".travel-result,.travel-parts,.travel-bridge-parts,.travel-route > button"},
  {sheet:"journeys",labels:"#journey-years > label",count:1,teaching:".journey-year-output,.year-chunks,.journey-result,.journey-parts"},
  {sheet:"conversation",labels:"#conversation-spelling > label,#conversation-spelling .spelling-name > label",count:2,teaching:'.spelling-focus,.spelling-name-letters,.spelling-soundboard > div > button[aria-label^="Choose letter"]'},
  {sheet:"numbers",labels:"#number-builder > label.sheet-number-input,#number-listening > label,#number-listening form > label,#number-price > label,.collection-numbers .sheet-rule-grid > article:not(#number-price) > label",count:5,teaching:".number-stage,.number-reading-order,.number-price-tag"},
];

for(const printCase of inlinePrintCases)test(`${printCase.sheet} print omits inline settings and keeps the selected teaching state`,async({page},info)=>{
  await page.goto(`cheat-sheets/${printCase.sheet}/${printCase.sheet==="past"?"#past-patterns-0-1-question-2-3":""}`);
  if(printCase.sheet==="past")await page.getByRole("checkbox",{name:"Show participles in the pattern cards",exact:true}).uncheck();
  if(printCase.sheet==="objects")await page.getByRole("checkbox",{name:"Correct a guess with kein / keine",exact:true}).check();
  if(printCase.sheet==="office"){
    await page.getByRole("checkbox",{name:"Make it plural",exact:true}).check();
    await page.getByRole("textbox",{name:"Name to spell",exact:true}).fill("Mia");
    await page.getByRole("textbox",{name:"Digits you heard",exact:true}).fill("1234");
    await page.getByRole("button",{name:"Check digits",exact:true}).click();
    const overview=page.locator(".office-desk-overview");
    if(await overview.getAttribute("open")===null)await overview.locator("summary").click();
  }
  if(printCase.sheet==="food")await page.getByRole("combobox",{name:"Food for these examples",exact:true}).selectOption("3");
  if(printCase.sheet==="time")await page.getByRole("checkbox",{name:"Put the time first",exact:true}).check();
  if(printCase.sheet==="travel")await page.getByRole("combobox",{name:"Travel verb",exact:true}).selectOption("5");
  if(printCase.sheet==="journeys")await page.getByRole("textbox",{name:"Year to pronounce",exact:true}).fill("2007");
  if(printCase.sheet==="conversation"){
    await page.getByRole("combobox",{name:"Choose a letter",exact:true}).selectOption("W");
    await page.getByRole("textbox",{name:"Name to spell",exact:true}).fill("Mia");
  }
  if(printCase.sheet==="numbers")await page.getByRole("textbox",{name:"Type a whole number from 0 to 1,000,000",exact:true}).fill("452");
  const labels=page.locator(printCase.labels),fields=labels.locator("input,select");
  await expect(labels).toHaveCount(printCase.count);
  for(const label of await labels.all())await expect(label).toBeVisible();
  const beforeFields=await fields.evaluateAll(nodes=>nodes.map(node=>({value:(node as HTMLInputElement).value,checked:node instanceof HTMLInputElement?node.checked:null})));
  for(const selector of printCase.teaching.split(","))await expect(page.locator(selector).first()).toBeAttached();
  const teaching=page.locator(printCase.teaching);
  expect(await teaching.count()).toBeGreaterThan(0);
  const beforeTeaching=await teaching.evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,pressed:node.getAttribute("aria-pressed"),selected:node.getAttribute("data-selected")})));
  await printLiveSheet(page,info,`${printCase.sheet}-inline-settings`,async()=>{
    for(const label of await labels.all())await expect(label).toBeHidden();
    // Keep this global form-control assertion strict: every live route control
    // must be hidden by its real print ancestors, including conditional fields.
    for(const control of await page.locator("main input,main select,main textarea,main audio,main .study-primary,main .study-secondary,main .btn").all())await expect(control).toBeHidden();
    for(const content of await teaching.all())await expect(content).toBeVisible();
    expect(await teaching.evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,pressed:node.getAttribute("aria-pressed"),selected:node.getAttribute("data-selected")})))).toEqual(beforeTeaching);
    if(printCase.sheet==="past")await expect(page.locator("#past-pattern-ieren")).toHaveAttribute("data-selected","true");
  });
  expect(await fields.evaluateAll(nodes=>nodes.map(node=>({value:(node as HTMLInputElement).value,checked:node instanceof HTMLInputElement?node.checked:null})))).toEqual(beforeFields);
  for(const label of await labels.all())await expect(label).toBeVisible();
});
