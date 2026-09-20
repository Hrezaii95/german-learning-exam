import {expect,test,type Page} from "@playwright/test";

async function observeAudio(page:Page){await page.addInitScript(()=>{const NativeAudio=window.Audio;(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio=[];window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.push(this);}};});}
async function playbackAdvanced(page:Page){await expect.poll(()=>page.evaluate(()=>{const audio=(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.at(-1);return !!audio&&audio.currentTime>0&&audio.src.includes("/audio/");})).toBe(true);}

for(const width of [320,1440])test(`verb parts, exact audio and saved-person return at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});await observeAudio(page);
  await page.goto("cheat-sheets/verbs/");
  const verb=page.getByRole("combobox",{name:"Choose a verb",exact:true});
  const person=page.getByRole("combobox",{name:"Choose a person",exact:true});
  await expect(page.locator(".verb-atlas button")).toHaveCount(12);
  await expect(verb.locator("option")).toHaveCount(111);
  await verb.selectOption("vermuten");await expect(page.locator(".verb-stage")).toContainText("ich vermute");
  await verb.selectOption("reagieren");await expect(page.locator(".verb-stage")).toContainText("ich reagiere");
  await verb.selectOption("arbeiten");await person.selectOption("1");
  await expect(page.locator(".verb-stem strong")).toHaveText("arbeit");
  await expect(page.locator(".verb-ending strong")).toHaveText("est");
  await page.locator(".verb-stage").getByRole("button",{name:"Listen: du arbeitest",exact:true}).click();await playbackAdvanced(page);
  await verb.selectOption("lesen");await expect(page.locator(".verb-stem strong")).toHaveText("lies");await expect(page.locator(".verb-ending strong")).toHaveText("t");
  await verb.selectOption("sein");await expect(page.locator(".verb-stem")).toContainText("Whole exception");await expect(page.locator(".verb-stem strong")).toHaveText("bist");
  await verb.selectOption("sich freuen");await expect(page.locator(".verb-tail")).toContainText("Reflexive pronoun");await expect(page.locator(".verb-tail strong")).toHaveText("dich");
  await verb.selectOption("ankommen");await expect(page.locator(".verb-tail")).toContainText("Separable prefix");await expect(page.locator(".verb-tail strong")).toHaveText("an");
  await page.locator(".verb-stage").getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"du kommst an"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(verb).toHaveValue("ankommen");await expect(person).toHaveValue("1");
  await page.reload();await expect(person).toHaveValue("1");
  await page.locator(".verb-stage").getByRole("button",{name:/^Remove from review:/}).click();
  await page.getByRole("button",{name:"Yes/no question",exact:true}).click();
  await expect(page.locator(".verb-sentence-rail > div").first()).toHaveClass(/is-verb/);
  await expect(page.locator(".verb-sentence-rail")).toContainText("Wohnst");
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator("#verb-explorer").screenshot({path:testInfo.outputPath(`verb-explorer-${width}.png`)});
  const scope=page.locator(".study-scope");await scope.locator("summary").click();await scope.getByRole("combobox",{name:"Material source"}).selectOption("teacher-extra");await scope.locator("summary").click();
  await expect(page.locator("#verb-explorer .study-scope-notice")).toContainText("outside your study selection");
  await expect(page.getByRole("heading",{name:"No matching practice items",exact:true})).toBeVisible();
  await page.goto("cheat-sheets/verbs/");await expect(page.locator("#verb-explorer")).toContainText("No verb models match");
});

for(const width of [320,1440])test(`question contrast, full reply, scope and saved-builder return at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});await observeAudio(page);
  await page.goto("cheat-sheets/questions/");
  const builder=page.locator("#question-builder");
  await builder.getByRole("combobox",{name:"Practice topic",exact:true}).selectOption("origin");
  await builder.getByRole("button",{name:"Informal · du",exact:true}).click();
  await builder.getByRole("button",{name:"W-question",exact:true}).click();
  await expect(builder.locator(".question-rail > div").first()).toHaveClass(/verb-token/);
  await expect(builder.locator(".question-builder-answer")).toContainText("Ja, ich komme aus dem Iran.");
  await builder.getByRole("button",{name:"Listen: Ja, ich komme aus dem Iran.",exact:true}).click();await playbackAdvanced(page);
  await builder.getByRole("button",{name:"Save to review: Kommen Sie aus dem Iran?",exact:true}).click();
  await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"Kommen Sie aus dem Iran?"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(builder.getByRole("combobox",{name:"Practice topic",exact:true})).toHaveValue("origin");
  await expect(builder.getByRole("button",{name:"Formal · Sie",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(builder.getByRole("button",{name:"Yes/no question",exact:true})).toHaveAttribute("aria-pressed","true");
  await builder.getByRole("button",{name:/^Remove from review:/}).click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await builder.screenshot({path:testInfo.outputPath(`question-builder-${width}.png`)});
  const scope=page.locator(".study-scope");await scope.locator("summary").click();await scope.getByRole("button",{name:"One lesson",exact:true}).click();await scope.getByRole("combobox",{name:"Selected lesson"}).selectOption("12");await scope.getByRole("combobox",{name:"Material source"}).selectOption("course");await scope.locator("summary").click();
  await page.locator(".question-location").getByRole("button").filter({hasText:"Wohin?"}).click();
  await expect(page.locator("#question-word")).toContainText("Wohin gehst du?");
  await expect(page.locator("#question-word .study-scope-notice")).toHaveCount(0);
  await expect(page.locator("#question-practice")).toContainText("Question 1 /");
  await scope.locator("summary").click();await scope.getByRole("combobox",{name:"Material source"}).selectOption("teacher-extra");await scope.locator("summary").click();
  await expect(page.getByRole("heading",{name:"No matching practice items",exact:true})).toBeVisible();
  await expect(page.locator("#question-word .study-scope-notice")).toContainText("outside your study selection");
});

test("saved sentence patterns and replies restore their exact teaching context",async({page})=>{
  await page.goto("cheat-sheets/verbs/#pattern-yes-no");
  await expect(page.getByRole("button",{name:"Yes/no question",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.goto("cheat-sheets/verbs/#pattern-negative");
  await expect(page.locator("#pattern-negative")).toBeVisible();
  await expect(page.locator("#pattern-negative")).toContainText("Ich arbeite im Moment nicht.");
  await page.goto("cheat-sheets/questions/#question-builder-answer-origin-true-true");
  const builder=page.locator("#question-builder");
  await expect(builder.getByRole("combobox",{name:"Practice topic",exact:true})).toHaveValue("origin");
  await expect(builder.getByRole("button",{name:"Formal · Sie",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(builder.locator(".question-builder-answer")).toContainText("Ja, ich komme aus dem Iran.");
  await page.goto("cheat-sheets/questions/#question-reply-true-false");
  const reply=page.locator("#question-replies");
  await expect(reply.getByRole("button",{name:"Negative question · nicht",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(reply.getByRole("button",{name:"Fact: I am not from Iran",exact:true})).toHaveAttribute("aria-pressed","false");
  await expect(reply.locator(".question-reply")).toContainText("Nein, ich komme nicht aus dem Iran.");
});

for(const sheet of ["verbs","questions"])test(`${sheet} prints a concise complete pattern summary`,async({page},testInfo)=>{
  await page.goto(`cheat-sheets/${sheet}/`);
  const summary=page.locator(".sheet-print-summary");await expect(summary).toBeHidden();
  await page.emulateMedia({media:"print"});await expect(summary).toBeVisible();
  if(sheet==="questions")await expect(summary.locator(".print-question-map > div")).toHaveCount(20);
  else await expect(summary).toContainText("Reflexive model");
  await page.evaluate(()=>document.fonts.ready);
  for(const format of ["A4","Letter"] as const){const path=testInfo.outputPath(`${sheet}-${format}.pdf`);await page.pdf({path,format,printBackground:true,margin:{top:"12mm",bottom:"12mm",left:"12mm",right:"12mm"}});await testInfo.attach(`${sheet}-${format}`,{path,contentType:"application/pdf"});}
});
