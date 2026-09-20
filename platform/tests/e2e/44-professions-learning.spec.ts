import {expect,test} from "@playwright/test";

for(const width of [320,390,768,1440]) {
  test(`professions connect patterns, pronunciation, saving and recall at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:1000});
    await page.goto("collections/professions/");
    await expect(page.locator("[data-word-family]")).toHaveCount(6);
    await expect(page.locator("#profession-patterns img")).toHaveCount(4);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(`professions-overview-${width}.png`),fullPage:true});
    await page.getByRole("button",{name:"Show 6 more professions",exact:true}).click();
    await expect(page.locator("[data-word-family]")).toHaveCount(12);
    await page.getByRole("button",{name:/^Add -e:/}).click();
    await expect(page.getByRole("combobox",{name:"Masculine plural pattern"})).toHaveValue("e");
    await expect(page.locator("[data-word-family]").filter({hasText:"Elektriker"})).toHaveCount(0);
    await page.getByRole("button",{name:"Clear collection filters"}).click();
    const search=page.getByRole("searchbox",{name:"Search English or German"});
    await search.fill("Elektriker");
    await expect(page.locator("[data-word-family]")).toHaveCount(1);
    const preview=page.locator("[data-word-family]");
    for(const text of ["der Elektriker","die Elektriker","die Elektrikerin","die Elektrikerinnen"]) {
      await preview.getByRole("button",{name:`Listen — ${text} pronunciation`,exact:true}).click();
      await expect.poll(()=>preview.locator("audio").evaluateAll((items,text)=>items.some(item=>item.getAttribute("aria-label")?.startsWith(`${text},`) && (item as HTMLAudioElement).currentTime>0),text)).toBe(true);
    }
    await preview.getByRole("button",{name:/^Save to review:/}).click();
    await preview.getByRole("link",{name:"Study this word family",exact:true}).click();
    await expect(page).toHaveURL(/\/01\/?\?q=Elektriker$/);
    await expect(page.getByRole("button",{name:/^Remove from review:/})).toBeVisible();
    await page.getByRole("link",{name:"← Professions",exact:true}).click();
    await expect(search).toHaveValue("Elektriker");
    await expect(page.locator("[data-word-family]")).toHaveCount(1);
    const practice=page.locator("#profession-practice");
    await practice.locator("summary").click();
    await practice.getByRole("button",{name:/say the forms, then tap to reveal/}).click();
    await expect(practice).toContainText("die Elektrikerinnen");
    await practice.getByRole("button",{name:"Mark reviewed",exact:true}).click();
    await page.reload();
    await expect(search).toHaveValue("Elektriker");
    await practice.locator("summary").click();
    await expect(practice).toContainText("1 marked reviewed");
    await page.screenshot({path:testInfo.outputPath(`professions-focused-${width}.png`),fullPage:true});
    await page.getByRole("button",{name:/^Remove from review:/}).click();
    await page.goto("saved/");
    await expect(page.locator(".study-saved-card")).toHaveCount(0);
  });
}

test("the bounded collection keeps every profession and alternative reachable",async({page})=>{
  await page.goto("collections/professions/");
  for(let count=12;count<=48;count+=6) {
    await page.getByRole("button",{name:"Show 6 more professions",exact:true}).click();
    await expect(page.locator("[data-word-family]")).toHaveCount(count);
  }
  await expect(page.getByRole("button",{name:"Show 6 more professions",exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-word-family]")).toHaveCount(48);
  await page.getByRole("checkbox",{name:"Show jobs with alternative words"}).check();
  await expect(page.locator("[data-word-family]")).toHaveCount(3);
  await page.getByRole("searchbox",{name:"Search English or German"}).fill("Installateur");
  await expect(page.locator("[data-word-family]")).toHaveCount(1);
  await expect(page.locator("[data-word-family]")).toContainText("der Klempner");
  await expect(page.locator("[data-word-family]")).toContainText("die Installateurinnen");
  await page.getByRole("searchbox",{name:"Search English or German"}).fill("no-such-job");
  await expect(page.getByRole("heading",{name:"No matching profession"})).toBeVisible();
});
