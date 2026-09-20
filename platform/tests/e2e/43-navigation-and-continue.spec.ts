import {expect,test} from "@playwright/test";

for (const width of [320,768]) {
  test(`navigation stays compact and keyboard-safe at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:900});
    await page.goto("cheat-sheets/");
    await expect(page.getByRole("navigation",{name:"Mobile",exact:true})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    const heading=await page.locator("main h1").first().boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(0);
    expect(heading!.y).toBeLessThan(500);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link",{name:"Skip to main content"})).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.getByRole("link",{name:"Map & flag overview",exact:true}).click();
    await expect(page).toHaveURL(/#country-overview$/);
    const trigger=page.getByRole("button",{name:"Open navigation menu"});
    await trigger.click();
    const menu=page.getByRole("dialog",{name:"Where to next?"});
    await expect(menu).toBeVisible();
    await menu.getByRole("searchbox",{name:"Find a study area"}).fill("listening");
    await expect(menu.getByRole("link")).toHaveCount(1);
    await page.screenshot({path:testInfo.outputPath(`menu-${width}.png`)});
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(menu).not.toBeVisible();
    await trigger.click();
    await expect(menu.getByRole("searchbox")).toHaveValue("");
    await menu.getByRole("link",{name:/Listening/}).click();
    await expect(page).toHaveURL(/\/listening\/?$/);
    await expect(page.getByRole("heading",{name:"Listen. Read. Listen again."})).toBeVisible();
    await expect(page.getByRole("combobox",{name:"Audio speed"})).toBeEnabled();
    await page.goBack();
    await expect(page).toHaveURL(/cheat-sheets\/#country-overview$/);
    await expect(page.locator("#country-overview")).toBeInViewport();
    await trigger.click();
    await menu.getByRole("searchbox").fill("no-such-area");
    await expect(menu.getByRole("status")).toContainText("No study area matches");
  });
}

test("the compact sheet chooser searches all fifteen sheets and preserves return links",async({page},testInfo)=>{
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto("cheat-sheets/#country-overview");
    const chooser=page.locator(".sheet-chooser");
    await expect(chooser).not.toHaveAttribute("open");
    await chooser.locator("summary").click();
    await expect(chooser.getByRole("link")).toHaveCount(15);
    const search=chooser.getByRole("searchbox",{name:"Find a cheat sheet"});
    await search.fill("furniture");
    await expect(chooser.getByRole("link")).toHaveCount(1);
    await page.screenshot({path:testInfo.outputPath(`chooser-${width}.png`)});
    await chooser.getByRole("link",{name:/Home & furniture/}).click();
    await expect(page).toHaveURL(/\/cheat-sheets\/home\/?$/);
    await expect(page.locator(".sheet-chooser summary")).toContainText("Home & furniture");
    await page.goBack();
    await expect(page).toHaveURL(/#country-overview$/);
  }
});

test("Continue follows the last visited lesson and due review precedes the course map",async({page},testInfo)=>{
  await page.goto("lessons/12/");
  await page.getByRole("button",{name:"Practice",exact:true}).click();
  await page.locator(".study-recall button[aria-pressed]").first().click();
  await page.getByRole("button",{name:/Next question/}).click();
  await expect(page.locator(".study-recall")).toContainText("Question 2 / 10");
  await page.goto("collections/professions/01/");
  await page.getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("./");
  const next=page.getByRole("link",{name:"Continue learning",exact:true});
  await expect(next).toHaveAttribute("href",/\/lessons\/12\/?#practice$/);
  await expect(page.getByRole("link",{name:"Review due items"})).toBeVisible();
  await expect(page.locator(".studio-card--mission")).toContainText("1 ready to review");
  expect(await page.locator(".studio-board").evaluate(element=>Boolean(element.compareDocumentPosition(document.querySelector(".course-dashboard")!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  for(const width of [390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(`dashboard-${width}.png`),fullPage:true});
    await page.screenshot({path:testInfo.outputPath(`dashboard-top-${width}.png`)});
  }
  await next.click();
  await expect(page.locator(".study-recall")).toContainText("Question 2 / 10");
  await page.goto("lessons/04/");
  await page.getByRole("button",{name:/^Words\b/}).click();
  await page.goto("./");
  await expect(next).toHaveAttribute("href",/\/lessons\/04\/?#words$/);
  await page.getByRole("link",{name:"Review due items"}).click();
  await expect(page.getByRole("checkbox",{name:"Due only",exact:true})).toBeChecked();
  await expect(page.locator(".study-saved-card")).toHaveCount(1);
  await page.goto("review/");
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.getByRole("heading",{name:"Build mission"})).toBeVisible();
  await expect(page.locator(".study-saved-grid")).toHaveCount(0);
  await expect(page.getByRole("link",{name:/My saved collection & recall/})).toBeVisible();
  await page.goto("./");
  const scope=page.locator(".study-scope");
  await scope.locator("summary").click();
  await scope.getByRole("button",{name:"One lesson",exact:true}).click();
  await scope.getByRole("combobox",{name:"Selected lesson"}).selectOption("12");
  await expect(next).toHaveAttribute("href",/\/lessons\/12\/?#practice$/);
  await expect(page.locator("[data-dashboard-lesson]")).toHaveCount(1);
});
