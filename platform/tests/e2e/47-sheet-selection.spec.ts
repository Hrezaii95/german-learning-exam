import {printLiveSheet} from "./helpers/print-live-sheet";
import {expect,test} from "@playwright/test";

for(const width of [320,1440])test(`country and home word cards return to the selected item at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto("cheat-sheets/countries/");
  await page.getByRole("textbox",{name:"Find a country or language",exact:true}).fill("Deutschland");
  const country=page.locator("#country-DE");
  await country.locator("summary").click();
  await country.getByRole("link",{name:"Open vocabulary card",exact:true}).click();
  await page.getByRole("link",{name:/Back/}).first().click();
  await expect(page.getByRole("combobox",{name:"Choose a country",exact:true})).toHaveValue("DE");
  await expect(page).toHaveURL(/cheat-sheets\/countries\/?#country-DE$/);
  await page.goto("cheat-sheets/home/#home-bett");
  await expect(page.locator("#home-bett")).toBeAttached();
  await page.getByRole("link",{name:"Open home subject sheet",exact:true}).click();
  await expect(page).toHaveURL(/subjects\/home\/?\?lesson=1%2C2%2C3%2C4/);
  const search=page.getByRole("searchbox",{name:"Find a word or form",exact:true});
  await search.fill("Bett");
  await page.locator("[data-subject-entry]").filter({hasText:"das Bett"}).first().click();
  await page.locator(".subject-word-dropdown").getByRole("link",{name:"Full vocabulary card",exact:true}).click();
  await page.getByRole("link",{name:/Back/}).first().click();
  await expect(search).toHaveValue("Bett");
  await expect.poll(()=>page.evaluate(()=>new URLSearchParams(location.search).get("lesson"))).toBe("1,2,3,4");
});

for(const width of [320,1440]) test(`country and home recall follow selection, search and saved filters at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto("cheat-sheets/countries/");
  const scope=page.locator(".study-scope");
  await scope.locator("summary").click();
  await scope.getByRole("button",{name:"One lesson",exact:true}).click();
  await scope.getByRole("combobox",{name:"Selected lesson"}).selectOption("12");
  await scope.getByRole("combobox",{name:"Material source"}).selectOption("course");
  await scope.locator("summary").click();
  await page.getByRole("textbox",{name:"Find a country or language"}).fill("Deutschland");
  await expect(page.locator(".country-row")).toHaveCount(1);
  const countryQuiz=page.locator(".country-quiz");
  await expect(countryQuiz).toContainText("Question 1 / 1");
  await countryQuiz.getByRole("button",{name:"aus Deutschland",exact:true}).click();
  await expect(countryQuiz).toContainText("Exactly.");
  await expect(countryQuiz.getByRole("button",{name:"Listen: Ich komme aus Deutschland.",exact:true})).toBeVisible();
  await page.locator(".country-row").getByRole("button",{name:/^Save to review:/}).click();
  await page.goto("saved/");
  await expect(page.locator(".study-saved-card")).toHaveCount(1);
  await expect(page.locator(".study-saved-card")).toContainText("Ich komme aus Deutschland.");
  await page.reload();
  await expect(page.locator(".study-saved-card")).toHaveCount(1);
  await page.goto("cheat-sheets/countries/");
  await page.getByRole("button",{name:"Saved for review",exact:true}).click();
  await expect(page.locator(".country-row")).toHaveCount(1);
  await expect(page.locator(".country-quiz")).toContainText("Deutschland");
  await page.locator(".country-row").getByRole("button",{name:/^Remove from review:/}).click();
  await expect(page.getByRole("heading",{name:"No matching practice items"})).toBeVisible();
  await page.goto("cheat-sheets/home/");
  await expect(page.locator(".home-word-card")).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"No matching practice items"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Open home subject sheet",exact:true})).toHaveAttribute("href",/lesson=1%2C2%2C3%2C4/);
  await scope.locator("summary").click();
  await scope.getByRole("combobox",{name:"Selected lesson"}).selectOption("4");
  await scope.locator("summary").click();
  await expect(page.locator(".home-quiz")).toContainText("Question 1 /");
  await page.locator(".home-quiz").getByRole("button",{name:"der",exact:true}).click();
  await expect(page.locator(".home-quiz")).toContainText("Exactly.");
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test("vocabulary prints only the current local filter and retains it afterward",async({page},info)=>{
  await page.goto("cheat-sheets/vocabulary/?q=B%C3%BCcher&tags=");
  const search=page.getByRole("searchbox",{name:"Find a word or form",exact:true});
  await expect(search).toHaveValue("Bücher");
  const entries=page.locator("[data-subject-entry]");
  await expect(entries.first()).toBeVisible();
  const ids=await entries.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-subject-entry")));
  expect(ids.length).toBeGreaterThan(0);
  await printLiveSheet(page,info,"vocabulary-filtered",async()=>{
    await expect(entries.first()).toBeVisible();
    expect(await entries.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-subject-entry")))).toEqual(ids);
    await expect(page.locator(".study-print-selection")).toContainText("Bücher");
    await expect(page.locator(".subject-sheet-filters")).toBeHidden();
  });
  await expect(search).toHaveValue("Bücher");
  expect(await entries.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-subject-entry")))).toEqual(ids);
  expect(new URL(page.url()).searchParams.get("q")).toBe("Bücher");
});

test("canonical cheat-sheet directory prints its content tiles while hiding shell navigation",async({page},info)=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("cheat-sheets/");
  const directory=page.locator(".cheat-sheet-directory");
  const subjects=directory.locator("[data-subject-tile]");
  const workshops=directory.locator("[data-workshop-tile]");
  const catalogue=directory.locator('[data-catalogue-tile="vocabulary"]');
  await expect(directory).toBeVisible();
  await expect(subjects).toHaveCount(21);
  await expect(workshops).toHaveCount(15);
  await expect(catalogue).toHaveAttribute("href",/\/cheat-sheets\/vocabulary\/?$/);
  const destinations=await directory.locator(".subject-directory-tile").evaluateAll(tiles=>tiles.map(tile=>tile.getAttribute("href")));
  await printLiveSheet(page,info,"cheat-sheet-directory",async()=>{
    await expect(directory.getByRole("heading",{name:"Cheat sheets",exact:true})).toBeVisible();
    await expect(directory.getByRole("navigation",{name:"Subject vocabulary overviews",exact:true})).toBeVisible();
    await expect(directory.getByRole("navigation",{name:"Topic workshop sheets",exact:true})).toBeVisible();
    await expect(catalogue).toBeVisible();
    for(const tile of [...await subjects.all(),...await workshops.all()]){
      await expect(tile).toBeVisible();
      await expect(tile.locator("h2")).not.toBeEmpty();
    }
    for(const selector of [".shell-rail",".shell-topnav",".shell-bottomnav",".study-dictionary-launch"]){
      await expect(page.locator(selector)).toBeHidden();
    }
    expect(await directory.locator(".subject-directory-tile").evaluateAll(tiles=>tiles.map(tile=>tile.getAttribute("href")))).toEqual(destinations);
  });
  await expect(subjects).toHaveCount(21);
  await expect(workshops).toHaveCount(15);
});
