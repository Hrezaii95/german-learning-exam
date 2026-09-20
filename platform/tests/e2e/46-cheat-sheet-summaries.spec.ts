import { expect, test } from "@playwright/test";

for (const width of [320, 1440]) {
  for (const sheet of ["countries", "home"]) {
    test(`${sheet} prints its complete summary without changing recall or filters at ${width}px`, async ({page}, testInfo) => {
      await page.setViewportSize({width,height:1000});
      await page.goto(sheet === "countries" ? "cheat-sheets/" : "cheat-sheets/home/");
      const summary = page.locator(".sheet-print-summary");
      await expect(summary).toBeHidden();
      const input = page.getByRole("textbox", {name: sheet === "countries" ? "Find a country or language" : "Find a word"});
      const index = page.locator(sheet === "countries" ? "#country-index" : "#home-index");
      await input.fill(sheet === "countries" ? "Iran" : "Stuhl");
      await index.getByRole("button", {name:"Hide answers & recall"}).click();
      await expect(index.locator("article")).toHaveCount(1);
      await expect(index.getByRole("button", {name:/^Reveal/})).toBeVisible();
      await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printRequested="true"; }; });
      await page.getByRole("button", {name:"Print cheat sheet",exact:true}).click();
      await expect(page.locator("html")).toHaveAttribute("data-print-requested","true");
      await expect(input).toHaveValue(sheet === "countries" ? "Iran" : "Stuhl");
      await expect(index.getByRole("button", {name:"Show all answers"})).toHaveAttribute("aria-pressed","true");
      await page.emulateMedia({media:"print"});
      await expect(summary).toBeVisible();
      await expect(index).toBeHidden();
      if (sheet === "countries") {
        await expect(summary.locator(".print-country-table tbody tr")).toHaveCount(41);
        await expect(summary.locator(".print-country-flags img")).toHaveCount(41);
        await expect(summary).toContainText("aus den Niederlanden");
        await expect(summary).toContainText("aus Iran");
        await expect.poll(() => summary.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      } else {
        await expect(summary.locator("[data-print-home-word]")).toHaveCount(30);
        await expect(summary).toContainText("die Stühle");
        await expect(summary).toContainText("Plural only · sind");
      }
      if (width === 1440) {
        await page.evaluate(() => document.fonts.ready);
        for (const format of ["A4", "Letter"] as const) {
          const path=testInfo.outputPath(`${sheet}-${format}.pdf`);
          await page.pdf({path,format,printBackground:true,margin:{top:"12mm",bottom:"12mm",left:"12mm",right:"12mm"}});
          await testInfo.attach(`${sheet}-${format}`,{path,contentType:"application/pdf"});
        }
      }
      await page.emulateMedia({media:"screen"});
      await expect(input).toHaveValue(sheet === "countries" ? "Iran" : "Stuhl");
      await expect(index.getByRole("button", {name:/^Reveal/})).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
}

test("home overview keeps one set of objects and returns focus after Escape and selection", async ({page}) => {
  await page.goto("cheat-sheets/home/");
  const overview=page.locator(".sheet-overview");
  const launch=overview.getByRole("button",{name:"Expand overview"});
  await expect(overview.locator(".home-memory-lanes button")).toHaveCount(30);
  await launch.click();
  const dialog=page.getByRole("dialog",{name:"All 30 words, sorted by article"});
  await expect(dialog).toBeVisible();
  await expect(overview.locator(".home-memory-lanes button")).toHaveCount(30);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launch).toBeFocused();
  await launch.click();
  await dialog.getByRole("button",{name:/das Bett/}).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("combobox",{name:"Explore a word"})).toHaveValue("bett");
  await expect(overview.locator(".home-memory-lanes button")).toHaveCount(30);
  await launch.click();
  await dialog.getByRole("button",{name:"Close overview"}).click();
  await expect(launch).toBeFocused();
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
    await page.locator(".home-focus").getByRole("button",{name:"Listen: der Stuhl",exact:true}).click();
    await expect.poll(() => page.evaluate(() => {
      const audio=(window as unknown as {observedAudio:HTMLAudioElement[]}).observedAudio.at(-1);
      return audio?{rate:audio.playbackRate,advanced:audio.currentTime>0}:null;
    })).toEqual({rate,advanced:true});
    const stop=page.locator(".home-focus").getByRole("button",{name:"Stop: der Stuhl",exact:true});
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
