import {expect,test} from "@playwright/test";

for(const width of [320,1440])test(`dialogue roles, saved context and alphabet audio at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(()=>{const NativeAudio=window.Audio;(window as unknown as {clips:HTMLAudioElement[]}).clips=[];window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {clips:HTMLAudioElement[]}).clips.push(this);}};});
  await page.goto("cheat-sheets/conversation/");const flow=page.locator("#conversation-flow");
  await flow.getByRole("combobox",{name:"Conversation topic",exact:true}).selectOption("wellbeing");await flow.getByRole("button",{name:"Formal · Sie",exact:true}).click();
  await expect(flow.locator('[data-turn="ask"]')).toContainText("Wie geht’s Ihnen?");await expect(flow.locator('[data-turn="answer"]')).toContainText("Gut, danke. Und Ihnen?");
  await flow.getByRole("combobox",{name:"Your role",exact:true}).selectOption("ask");await flow.getByRole("button",{name:"Hide my line & practise",exact:true}).click();
  await expect(flow.locator('[data-turn="ask"]')).not.toContainText("Wie geht’s Ihnen?");await expect(flow.locator('[data-turn="answer"]')).toContainText("Gut, danke. Und Ihnen?");
  await flow.getByRole("button",{name:"Reveal my line",exact:true}).click();await expect(flow.locator('[data-turn="ask"]')).toContainText("Wie geht’s Ihnen?");
  await flow.getByRole("button",{name:/^Save to review:/}).click();await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"Wie geht’s Ihnen?"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(flow.getByRole("combobox",{name:"Conversation topic",exact:true})).toHaveValue("wellbeing");await expect(flow.getByRole("button",{name:"Formal · Sie",exact:true})).toHaveAttribute("aria-pressed","true");await expect(flow.getByRole("combobox",{name:"Your role",exact:true})).toHaveValue("ask");
  await expect(flow.locator('[data-turn="ask"]')).toContainText("Wie geht’s Ihnen?");await flow.getByRole("button",{name:/^Remove from review:/}).click();
  await flow.screenshot({path:testInfo.outputPath(`conversation-flow-${width}.png`)});
  const spelling=page.locator("#conversation-spelling");await spelling.getByRole("combobox",{name:"Choose a letter",exact:true}).selectOption("W");await expect(spelling.locator(".spelling-focus")).toContainText("we");
  await spelling.locator(".spelling-focus").getByRole("button",{name:"Listen: letter W",exact:true}).click();await expect.poll(()=>page.evaluate(()=>{const clip=(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1);return !!clip&&clip.currentTime>0&&clip.src.includes("/audio/");})).toBe(true);
  await spelling.getByRole("textbox",{name:"Name to spell",exact:true}).fill("Anna Groß");await expect(spelling.locator(".spelling-name-letters")).toHaveText("A · N · N · A · G · R · O · ß");
  await spelling.getByRole("textbox",{name:"Name to spell",exact:true}).fill("René");await expect(spelling.locator(".spelling-name")).toContainText("Check: é");await expect(spelling.getByRole("button",{name:"Listen: name spelling",exact:true})).toHaveCount(0);
  await spelling.getByRole("textbox",{name:"Name to spell",exact:true}).fill("Sara");await spelling.screenshot({path:testInfo.outputPath(`conversation-spelling-${width}.png`)});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test("name spelling requests German letter cues and survives missing speech support",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:class{constructor(public text:string){}lang="";rate=1;}});Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{cancel(){},getVoices(){return [];},speak(item:{text:string;lang:string;rate:number}){(window as unknown as {lastSpelling:unknown}).lastSpelling={text:item.text,lang:item.lang,rate:item.rate};}}});});
  await page.goto("cheat-sheets/conversation/");const spelling=page.locator("#conversation-spelling");await spelling.getByRole("textbox",{name:"Name to spell",exact:true}).fill("V W J ß");await spelling.getByRole("button",{name:"Listen: name spelling",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {lastSpelling:unknown}).lastSpelling)).toMatchObject({text:"vau, we, jot, Eszett",lang:"de-DE"});
  await spelling.getByRole("button",{name:"Stop: name spelling",exact:true}).click();
  await page.evaluate(()=>{Reflect.deleteProperty(window,"SpeechSynthesisUtterance");});await spelling.getByRole("button",{name:"Listen: name spelling",exact:true}).click();await expect(spelling).toContainText("Speech is unavailable in this browser.");
});

test("conversation card filters control recall and foundation scope is explicit",async({page})=>{
  await page.goto("cheat-sheets/conversation/");await page.getByRole("button",{name:"Show saved cards",exact:true}).click();await expect(page.getByRole("heading",{name:"No matching practice items",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Showing saved cards",exact:true}).click();const scope=page.locator(".study-scope");await scope.locator("summary").click();await scope.getByRole("button",{name:"One lesson",exact:true}).click();await scope.getByRole("combobox",{name:"Selected lesson"}).selectOption("12");await scope.locator("summary").click();
  await expect(page.locator("#conversation-flow .study-scope-notice")).toContainText("outside your study selection");await expect(page.locator("#conversation-flow")).toContainText("No foundation dialogues match");
  await expect(page.locator("#sheet-practice")).toContainText("Question 1 /");
});

test("conversation prints dialogue contrasts and all thirty letter cues",async({page},testInfo)=>{
  await page.goto("cheat-sheets/conversation/");const summary=page.locator(".sheet-print-summary");await expect(summary).toBeHidden();await page.emulateMedia({media:"print"});await expect(summary).toBeVisible();await expect(summary.locator(".conversation-print-pairs section")).toHaveCount(8);await expect(summary.locator(".conversation-print-alphabet > div")).toHaveCount(30);await page.evaluate(()=>document.fonts.ready);
  for(const format of ["A4","Letter"] as const){const path=testInfo.outputPath(`conversation-${format}.pdf`);await page.pdf({path,format,printBackground:true,margin:{top:"12mm",bottom:"12mm",left:"12mm",right:"12mm"}});await testInfo.attach(`conversation-${format}`,{path,contentType:"application/pdf"});}
});
