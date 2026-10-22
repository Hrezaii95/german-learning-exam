import {expect,test} from "@playwright/test";

for(const width of [320,390,768,1440]) {
  test(`optional professions share the People sheet and preserve card Back at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:1000});
    await page.goto("collections/professions/?q=Elektriker&view=illustrated");
    await expect(page).toHaveURL(/\/cheat-sheets\/subjects\/people\/?\?q=Elektriker&view=illustrated&source=teacher-extra$/);
    const search=page.getByRole("searchbox",{name:"Find a word or form",exact:true});
    await expect(search).toHaveValue("Elektriker");
    const entry=page.locator("[data-subject-entry]").filter({hasText:"der Elektriker"}).first();
    await expect(entry).toBeVisible();
    await entry.click();
    const dropdown=page.locator(".subject-word-dropdown");
    await expect(dropdown).toContainText("die Elektriker");
    await dropdown.getByRole("button",{name:/^Save to review:/}).click();
    await dropdown.getByRole("link",{name:"Full vocabulary card",exact:true}).click();
    await expect(page).toHaveURL(/\/vocabulary\/[^/?]+\/?\?nav=/);
    for(const text of ["der Elektriker","die Elektriker","die Elektrikerin","die Elektrikerinnen"]) await expect(page.locator("main")).toContainText(text);
    await expect(page.getByRole("button",{name:/^Remove from review:/})).toBeVisible();
    const back=page.getByRole("link",{name:/^← Back/}).first();
    await expect(back).toHaveAttribute("href",/\/cheat-sheets\/subjects\/people\/?\?.*source=teacher-extra/);
    await back.click();
    await expect(search).toHaveValue("Elektriker");
    expect(new URL(page.url()).searchParams.get("source")).toBe("teacher-extra");
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(`professions-people-${width}.png`),fullPage:true});
    await page.goto("saved/");
    await expect(page.locator(".study-saved-card")).toHaveCount(1);
    await expect(page.locator(".study-saved-card")).toContainText("Elektriker");
  });
}

test("legacy profession links preserve explicit source choices and exact fragments",async({page})=>{
  await page.goto("collections/professions/?q=Arzt%20oder+Lehrer&source=course#profession-list");
  await expect(page).toHaveURL(/\/cheat-sheets\/subjects\/people\/?\?q=Arzt%20oder\+Lehrer&source=course#profession-list$/);
  await page.goto("collections/professions/01/?q=Elektriker&pattern=same&alternatives=1&limit=48#word-forms");
  await expect(page).toHaveURL(/\/vocabulary\/w\d+\/?\?q=Elektriker&pattern=same&alternatives=1&limit=48&nav=.*#word-forms$/);
  await expect(page.locator("main")).toContainText("der Elektriker");
  await expect(page.locator("main")).toContainText("die Elektrikerinnen");
  const back=page.getByRole("link",{name:/^← Back/}).first();
  await expect(back).toHaveAttribute("href",/\/cheat-sheets\/subjects\/people\/?\?q=Elektriker&pattern=same&alternatives=1&limit=48&source=teacher-extra$/);
  await page.goto("collections/professions/unknown/");
  await expect(page.getByRole("heading",{name:/not found/i})).toBeVisible();
});
