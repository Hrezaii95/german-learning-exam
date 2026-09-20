import {expect,test} from "@playwright/test";

test("all twelve lessons expose Learn, Listen, Practise and source books",async({page})=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width:390,height:844});
  for(let lesson=1;lesson<=12;lesson++) {
    await page.goto(`lessons/${String(lesson).padStart(2,"0")}/`);
    const path=page.getByRole("region",{name:`Lesson ${lesson} learning path`});
    await expect(path).toBeVisible();
    await expect(path.getByText("1 · Learn",{exact:true})).toBeVisible();
    await expect(path.getByRole("link",{name:"2 · Listen"})).toHaveAttribute("href",new RegExp(`/listening/?\\?lesson=${lesson}$`));
    await expect(path.getByText("3 · Practise",{exact:true})).toBeVisible();
    await expect(path.getByRole("link",{name:"Coursebook",exact:true})).toHaveAttribute("href",/book\/?\?page=coursebook-/);
    await expect(path.getByRole("link",{name:"Workbook",exact:true})).toHaveAttribute("href",/book\/?\?page=workbook-/);
    await expect(path).toContainText("Your checkpoint:");
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

for(const width of [320,1440])test(`compact libraries and search keep context at ${width}px`,async({page},testInfo)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width,height:1000});
  await page.goto("vocabulary/?page=2");
  await expect(page.locator("[data-word-family]")).toHaveCount(12);
  await expect(page.getByRole("navigation",{name:"Vocabulary results pages"})).toContainText("Showing 13–24");
  await page.getByRole("link",{name:"Study this word family"}).first().click();
  await page.getByRole("link",{name:/Back/}).first().click();
  await expect(page).toHaveURL(/vocabulary\/?\?page=2$/);
  await expect(page.locator("[data-word-family]")).toHaveCount(12);
  await page.goto("verbs/?lesson=12");
  await expect(page.locator("[data-course-pattern]").first()).toBeVisible();
  await expect(page.locator(".verb-person-grid")).toHaveCount(0);
  await page.locator("[data-course-pattern] summary").first().click();
  await expect(page.locator(".verb-person-grid").first()).toBeVisible();
  await page.screenshot({path:testInfo.outputPath(`verb-library-${width}.png`),fullPage:true});
  await page.screenshot({path:testInfo.outputPath(`verb-library-viewport-${width}.png`)});
  await page.goto("search/?q=gefahren");
  const result=page.locator(".search-learning-result").filter({has:page.locator('a[href*="/lessons/12/?"]')}).first();
  await expect(result).toBeVisible();
  await result.getByRole("link").first().click();
  await expect(page.getByRole("region",{name:"Lesson 12 learning path"})).toBeVisible();
  await page.getByRole("link",{name:"← Back to my results"}).click();
  await expect(page.getByRole("searchbox",{name:"Search learning content"})).toHaveValue("gefahren");
  await expect(page).toHaveURL(/search\/?\?q=gefahren#search-result-/);
  await page.screenshot({path:testInfo.outputPath(`search-results-${width}.png`),fullPage:true});
  await page.screenshot({path:testInfo.outputPath(`search-results-viewport-${width}.png`)});
  await page.goto("concepts/?lesson=12");
  await expect(page.getByRole("heading",{name:"From a rule to a sentence"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Connected learning paths"})).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:testInfo.outputPath(`grammar-connections-${width}.png`),fullPage:true});
  await page.screenshot({path:testInfo.outputPath(`grammar-connections-viewport-${width}.png`)});
});

test("lesson words stay bounded and checked practice resumes",async({page},testInfo)=>{
  await page.goto("lessons/12/#words");
  await expect(page.getByRole("button",{name:"Words",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.locator("[data-word-family]")).toHaveCount(12);
  await page.getByRole("button",{name:"Show more words"}).click();
  await expect(page.locator("[data-word-family]")).toHaveCount(24);
  await page.getByRole("button",{name:"3 · Practise",exact:true}).click();
  const quiz=page.locator(".study-recall");
  await expect(quiz).toContainText("Checked lesson practice");
  await quiz.locator("button[aria-pressed]").first().click();
  await expect(quiz.getByRole("status")).toBeVisible();
  await quiz.getByRole("button",{name:"Next question →"}).click();
  await page.reload();
  await expect(quiz).toContainText("Question 2 /");
  await page.screenshot({path:testInfo.outputPath("lesson-checkpoint.png"),fullPage:true});
});
