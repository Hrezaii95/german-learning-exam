import {expect,test,type Locator,type Page} from "@playwright/test";
import {STUDY_SCOPE_KEY} from "../../apps/web/lib/study/scope";
import {A1_PLAY_ITEMS} from "../../apps/web/lib/study/play-catalogue.generated";

function scopeFromHref(href:string){
  const url=new URL(href,"https://example.test");
  expect(url.pathname.replace(/\/$/,"").endsWith("/play/run")).toBe(true);
  expect(url.searchParams.get("pack")).toBe("de-a1-momente");
  return JSON.parse(Buffer.from(url.searchParams.get("scope")!,"base64url").toString("utf8")) as {lessons?:number[];tags?:string[];sources?:string[];items?:string[]};
}

test("local sheet filters and the open dropdown keep exact row scopes",async({page})=>{
  await page.goto("cheat-sheets/subjects/people/?lesson=2,4&source=teacher-extra&q=Ingenieur&saved=1&nav=legacy-return-only");
  const entries=page.locator("[data-subject-entry]");
  await expect(entries.first()).toBeVisible();
  const ids=await entries.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-subject-entry")));
  const play=page.getByRole("link",{name:"Play this sheet",exact:true});
  const href=await play.getAttribute("href");
  const scope=scopeFromHref(href!);
  expect(scope.lessons).toEqual([2,4]);expect(scope.sources).toEqual(["teacher-extra"]);expect(scope.tags).toEqual(["people"]);
  expect(new Set(scope.items)).toEqual(new Set(ids));
  const currentBase=new URL(page.url()).pathname.split("/cheat-sheets/")[0];
  expect(new URL(href!,page.url()).pathname.replace(/\/$/,"")).toBe(`${currentBase}/play/run`);
  await entries.first().click();
  const word=page.locator(".subject-word-dropdown").getByRole("link",{name:"Practise this word",exact:true});
  expect(scopeFromHref((await word.getAttribute("href"))!).items).toEqual([ids[0]]);
  await page.emulateMedia({media:"print"});
  await expect(play).toBeHidden();await expect(word).toBeHidden();
  await page.emulateMedia({media:"screen"});
  await page.getByRole("searchbox",{name:"Find a word or form",exact:true}).fill("no-such-vocabulary-zzzz");
  await expect(page.getByRole("button",{name:"Play this sheet",exact:true})).toBeDisabled();
});

test("an explicit family ignores unrelated global and Back filters and preserves pending-pack opt-in",async({page})=>{
  await page.addInitScript(({key})=>localStorage.setItem(key,JSON.stringify({mode:"one",lessons:[9],concepts:["food"],source:"study-extra"})),{key:STUDY_SCOPE_KEY});
  await page.goto("vocabulary/w126/?lesson=9&q=food&nav=legacy-return-only");
  const word=page.getByRole("link",{name:"Practise this word",exact:true});
  await expect(word).toBeVisible();
  const scope=scopeFromHref((await word.getAttribute("href"))!);
  expect(scope.items).toEqual(A1_PLAY_ITEMS.filter(item=>item.cardId==="W126").map(item=>item.id));
  expect(scope.lessons).toBeUndefined();expect(scope.sources).toBeUndefined();
  await page.emulateMedia({media:"print"});
  await expect(word).toBeHidden();
  await page.emulateMedia({media:"screen"});
  await word.click();
  await expect(page.getByRole("heading",{name:"Choose a content pack",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Open content packs",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Your practice preview",exact:true})).toHaveCount(0);
});

test("collection search/category/saved filters keep the chosen family and disable an empty saved set",async({page})=>{
  await page.goto("cheat-sheets/people/");
  await page.getByRole("textbox",{name:"Find a card",exact:true}).fill("engineer");
  await page.getByRole("combobox",{name:"Category",exact:true}).selectOption("Profession");
  const card=page.locator('[data-sheet-card="W126"]');
  await expect(card).toBeVisible();
  await card.getByRole("button",{name:/^Save to review:/}).click();
  await page.getByRole("button",{name:"Show saved cards",exact:true}).click();
  const scope=scopeFromHref((await page.getByRole("link",{name:"Play this sheet",exact:true}).getAttribute("href"))!);
  expect(scope.items).toEqual(A1_PLAY_ITEMS.filter(item=>item.cardId==="W126").map(item=>item.id));
  await card.getByRole("button",{name:/^Remove from review:/}).click();
  await expect(page.getByRole("button",{name:"Play this sheet",exact:true})).toBeDisabled();
});

test("country query narrowing uses real card paths and no empty saved fallback",async({page})=>{
  await page.goto("cheat-sheets/countries/");
  await page.getByRole("textbox",{name:"Find a country or language",exact:true}).fill("Deutschland");
  const row=page.locator("#country-DE");await expect(row).toBeVisible();
  await row.locator("summary").click();
  const cardHref=(await row.getByRole("link",{name:"Open vocabulary card",exact:true}).getAttribute("href"))!;
  const canonicalPath=new URL(cardHref,page.url()).pathname.replace(new URL(page.url()).pathname.split("/cheat-sheets/")[0],"").replace(/\/$/,"");
  const scope=scopeFromHref((await page.getByRole("link",{name:"Play this sheet",exact:true}).getAttribute("href"))!);
  expect(scope.items).toEqual(A1_PLAY_ITEMS.filter(item=>item.cardPath===canonicalPath).map(item=>item.id));
  await page.getByRole("button",{name:"Saved for review",exact:true}).click();
  await expect(page.getByRole("button",{name:"Play this sheet",exact:true})).toBeDisabled();
});


test("an explicitly enabled pending A1 pack accepts the original word link and renders a real task",async({page})=>{
  await page.goto("vocabulary/w126/");
  const action=page.getByRole("link",{name:"Practise this word",exact:true});
  await expect(action).toBeVisible();
  const originalHref=(await action.getAttribute("href"))!;
  const originalUrl=new URL(originalHref,page.url());
  const originalScope=scopeFromHref(originalHref);
  expect(originalScope.items).toEqual(A1_PLAY_ITEMS.filter(item=>item.cardId==="W126").map(item=>item.id));

  // Use the public opt-in control; never seed enabled packs or bypass review policy.
  await page.goto("play/packs/");
  const enable=page.getByRole("checkbox",{name:"Enable Momente A1",exact:true});
  await expect(enable).not.toBeChecked();
  await expect(page.locator(".ww-pack-list > li").filter({has:enable})).toContainText("Pending German review");
  await enable.check();
  await expect(enable).toBeChecked();
  await page.reload();
  await expect(enable).toBeChecked();

  // Follow the actual filtered sheet action before the explicit full-word action.
  await page.goto("cheat-sheets/subjects/people/?lesson=2,4&source=teacher-extra&q=Ingenieur");
  const entries=page.locator("[data-subject-entry]");
  await expect(entries.first()).toBeVisible();
  const sheetAction=page.getByRole("link",{name:"Play this sheet",exact:true});
  await expect(sheetAction).toBeVisible();
  const visibleIds=await entries.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-subject-entry")));
  const sheetHref=(await sheetAction.getAttribute("href"))!;
  const sheetUrl=new URL(sheetHref,page.url());
  const sheetScope=scopeFromHref(sheetHref);
  expect(sheetScope.lessons).toEqual([2,4]);
  expect(sheetScope.tags).toEqual(["people"]);
  expect(sheetScope.sources).toEqual(["teacher-extra"]);
  expect(new Set(sheetScope.items)).toEqual(new Set(visibleIds));
  await sheetAction.click();
  await expect(page.getByRole("heading",{name:"Your practice preview",exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get("scope")).toBe(sheetUrl.searchParams.get("scope"));
  expect(new URL(page.url()).searchParams.get("pack")).toBe(sheetUrl.searchParams.get("pack"));
  expect(scopeFromHref(page.url())).toEqual(sheetScope);
  await expect(page.locator(".ww-panel > p").filter({hasText:/^\d+ eligible tasks?/})).toHaveText(/^[1-9]\d* eligible tasks? · about /);
  await expect(page.getByRole("button",{name:"Start Daily Run",exact:true})).toBeEnabled();

  await page.goto("vocabulary/w126/");
  await expect(action).toHaveAttribute("href",originalHref);
  await action.click();
  await expect(page.getByRole("heading",{name:"Your practice preview",exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get("scope")).toBe(originalUrl.searchParams.get("scope"));
  expect(new URL(page.url()).searchParams.get("pack")).toBe(originalUrl.searchParams.get("pack"));
  expect(scopeFromHref(page.url())).toEqual(originalScope);
  await expect(page.getByRole("heading",{name:"Choose a content pack",exact:true})).toHaveCount(0);
  await expect(page.getByText("Explicitly enabled test content · pending German review.",{exact:true})).toBeVisible();
  await expect(page.locator(".ww-panel > p").filter({hasText:/^\d+ eligible tasks?/})).toHaveText(/^[1-9]\d* eligible tasks? · about /);
  const start=page.getByRole("button",{name:"Start Daily Run",exact:true});
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole("progressbar",{name:"Practice progress",exact:true})).toBeVisible();
  const task=page.locator(".ww-page > section:has(> h2)");
  await expect(task).toHaveCount(1);
  await expect(task.getByRole("heading",{level:2})).toBeVisible();
  expect(await task.locator("button:enabled,input:enabled,select:enabled,textarea:enabled").count()).toBeGreaterThan(0);
  await expect(page.getByText("This task is unavailable with the current source content.",{exact:true})).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("scope")).toBe(originalUrl.searchParams.get("scope"));
  expect(new URL(page.url()).searchParams.get("pack")).toBe("de-a1-momente");
});

async function expectUsableAction(page:Page,action:Locator){
  await expect(action).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  const geometry=await action.evaluate(element=>{
    const box=element.getBoundingClientRect();
    const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    const hint=element.closest(".sheet-play-action")?.querySelector("small")?.getBoundingClientRect();
    return {width:box.width,height:box.height,left:box.left,right:box.right,bottom:box.bottom,viewport:innerWidth,
      clipped:element.scrollWidth-element.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,
      centerUnobscured:!!hit&&(hit===element||element.contains(hit)),hintTop:hint?.top};
  });
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport+1);
  expect(geometry.clipped).toBeLessThanOrEqual(1);
  expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
  expect(geometry.centerUnobscured).toBe(true);
  if(geometry.hintTop!==undefined)expect(geometry.hintTop).toBeGreaterThanOrEqual(geometry.bottom+4);
}

for(const width of [320,390,1366])test(`new sheet, dropdown and word actions fit and hide for print at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  // Start on the full card so retained subject-route CSS cannot mask its layout.
  await page.goto("vocabulary/w126/");
  const card=page.getByRole("link",{name:"Practise this word",exact:true});
  await expectUsableAction(page,card);
  await page.screenshot({path:info.outputPath(`word-action-${width}.png`)});
  await page.emulateMedia({media:"print"});
  await expect(card).toBeHidden();
  await page.emulateMedia({media:"screen"});
  await expect(card).toBeVisible();
  await page.goto("cheat-sheets/subjects/people/?lesson=2,4&source=teacher-extra&q=Ingenieur");
  const sheet=page.getByRole("link",{name:"Play this sheet",exact:true});
  await expectUsableAction(page,sheet);
  await page.screenshot({path:info.outputPath(`sheet-action-${width}.png`)});
  const group=page.locator(".sheet-play-action");
  await expect(group.locator("small")).toContainText("Enable a content pack in Play before starting.");
  const entries=page.locator("[data-subject-entry]");
  await expect(entries.first()).toBeVisible();
  await entries.first().click();
  const dropdown=page.locator(".subject-word-dropdown").getByRole("link",{name:"Practise this word",exact:true});
  await expectUsableAction(page,dropdown);
  await page.screenshot({path:info.outputPath(`dropdown-action-${width}.png`)});
  await page.emulateMedia({media:"print"});
  await expect(sheet).toBeHidden();
  await expect(dropdown).toBeHidden();
  await page.emulateMedia({media:"screen"});
  await expect(dropdown).toBeVisible();

});
