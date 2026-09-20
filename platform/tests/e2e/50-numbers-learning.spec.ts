import {expect,test} from "@playwright/test";

for(const width of [320,1440])test(`number reading, listening and saved values at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(()=>{const NativeAudio=window.Audio;(window as unknown as {clips:HTMLAudioElement[]}).clips=[];window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {clips:HTMLAudioElement[]}).clips.push(this);}};});
  await page.goto("cheat-sheets/numbers/");
  const builder=page.locator("#number-builder"),input=builder.getByRole("textbox",{name:"Type a whole number from 0 to 1,000,000"});
  await input.fill("1452");
  await expect(builder.locator(".number-reading-order strong")).toHaveText(["eintausend","vierhundert","zwei","und","fünfzig"]);
  await builder.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"eintausendvierhundertzweiundfünfzig"}).getByRole("link",{name:"Open in context →",exact:true}).click();
  await expect(input).toHaveValue("1452");await page.reload();await expect(input).toHaveValue("1452");
  await builder.getByRole("button",{name:/^Remove from review:/}).click();
  await input.fill("1000001");await expect(builder.getByRole("alert")).toBeVisible();
  await input.fill("452");await expect(builder.locator(".number-reading-order strong")).toHaveText(["vierhundert","zwei","und","fünfzig"]);
  await builder.screenshot({path:testInfo.outputPath(`number-builder-${width}.png`)});
  const listen=page.locator("#number-listening");
  await expect(listen.getByRole("button",{name:"Listen: practice number",exact:true})).toBeVisible();
  await expect(listen).not.toContainText("einundzwanzig");
  await listen.getByRole("button",{name:"Listen: practice number",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>{const clip=(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1);return !!clip&&clip.currentTime>0&&clip.src.includes("/audio/");})).toBe(true);
  await listen.getByRole("textbox",{name:"What number did you hear?"}).fill("21");await listen.getByRole("button",{name:"Check number",exact:true}).click();
  await expect(listen.getByRole("heading",{name:"Exactly.",exact:true})).toBeVisible();await expect(listen).toContainText("einundzwanzig");
  await listen.getByRole("button",{name:"Next number →",exact:true}).click();await expect(listen).toContainText("Recording 2 / 8");
  await listen.getByRole("textbox",{name:"What number did you hear?"}).fill("99");await listen.getByRole("button",{name:"Check number",exact:true}).click();await expect(listen).toContainText("zwölf");
  await listen.getByRole("combobox",{name:"Listening range"}).selectOption("teens");await expect(listen).toContainText("Recording 1 / 7");
  await expect(listen.getByRole("textbox",{name:"What number did you hear?"})).toHaveValue("");
  const price=page.locator("#number-price");await price.getByRole("textbox",{name:"Price in euros",exact:true}).fill("1,01");await expect(price.locator(".number-price-tag")).toContainText("ein Euro ein Cent");
  await price.getByRole("button",{name:/^Save to review:/}).click();await page.goto("saved/");await page.locator(".study-saved-card").filter({hasText:"ein Euro ein Cent"}).getByRole("link",{name:"Open in context →",exact:true}).click();await expect(price.getByRole("textbox",{name:"Price in euros",exact:true})).toHaveValue("1,01");await price.getByRole("button",{name:/^Remove from review:/}).click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await price.screenshot({path:testInfo.outputPath(`number-price-${width}.png`)});
});

test("number filters control listening, recall and empty selections together",async({page})=>{
  await page.goto("cheat-sheets/numbers/");
  await page.getByRole("textbox",{name:"Find a card",exact:true}).fill("twenty-one");
  await expect(page.locator("#number-listening")).toContainText("Recording 1 / 1");
  await expect(page.locator("#sheet-practice")).toContainText("Question 1 / 1");
  await expect(page.locator("#sheet-practice")).toContainText("Write 21 in German.");
  await page.getByRole("button",{name:"Show saved cards",exact:true}).click();
  await expect(page.locator("#number-listening")).toContainText("No numbers in this range match");
  await expect(page.getByRole("heading",{name:"No matching practice items",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Showing saved cards",exact:true}).click();
  await page.getByRole("textbox",{name:"Find a card",exact:true}).fill("Million");
  await expect(page.locator("#sheet-card-l4-million .collection-word")).toContainText("die Million");
  await expect(page.locator("#sheet-practice")).toContainText("___ Million");
  await page.locator("#sheet-practice").getByRole("button",{name:"die",exact:true}).click();
  await expect(page.locator("#sheet-practice")).toContainText("Exactly.");
  await page.getByRole("textbox",{name:"Find a card",exact:true}).fill("");
  const scope=page.locator(".study-scope");await scope.locator("summary").click();await scope.getByRole("combobox",{name:"Material source"}).selectOption("teacher-extra");await scope.locator("summary").click();
  await expect(page.locator("#number-builder .study-scope-notice")).toContainText("outside your study selection");await expect(page.locator("#number-listening")).toContainText("No numbers in this range match");
});

test("numbers prints common patterns without changing the chosen example",async({page},testInfo)=>{
  await page.goto("cheat-sheets/numbers/#number-452");const input=page.getByRole("textbox",{name:"Type a whole number from 0 to 1,000,000"});await expect(input).toHaveValue("452");
  const summary=page.locator(".sheet-print-summary");await expect(summary).toBeHidden();await page.emulateMedia({media:"print"});await expect(summary).toBeVisible();await expect(summary).toContainText("vierhundertzweiundfünfzig");await expect(summary).toContainText("eine Million");await page.evaluate(()=>document.fonts.ready);
  for(const format of ["A4","Letter"] as const){const path=testInfo.outputPath(`numbers-${format}.pdf`);await page.pdf({path,format,printBackground:true,margin:{top:"12mm",bottom:"12mm",left:"12mm",right:"12mm"}});await testInfo.attach(`numbers-${format}`,{path,contentType:"application/pdf"});}
  await page.emulateMedia({media:"screen"});await expect(input).toHaveValue("452");
});
