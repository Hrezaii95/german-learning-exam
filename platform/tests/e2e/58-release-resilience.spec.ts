import {expect,test} from "@playwright/test";

test("library filters and global search update locally and preserve Back",async({page})=>{
 await page.goto("vocabulary/");
 await expect(page.locator("[data-word-family]")).toHaveCount(12);
 await page.evaluate(()=>{document.documentElement.dataset.releaseDocument="same";});
 await page.locator('main input[type="search"]').fill("Elektriker");
 await page.getByRole("button",{name:"Apply filters",exact:true}).click();
 await expect(page.locator("[data-word-family]")).toHaveCount(1);
 await expect(page.locator("html")).toHaveAttribute("data-release-document","same");
 await page.goBack();
 await expect(page.locator("[data-word-family]")).toHaveCount(12);
 await expect(page.locator('main input[type="search"]')).toHaveValue("");
 await page.goto("search/");
 await page.evaluate(()=>{document.documentElement.dataset.releaseDocument="same";});
 await page.getByRole("searchbox",{name:"Search learning content"}).fill("Stuhl");
 await page.getByRole("searchbox",{name:"Search learning content"}).press("Enter");
 await expect(page.locator(".search-learning-result").first()).toBeVisible();
 await expect(page.locator("html")).toHaveAttribute("data-release-document","same");
 await page.goBack();
 await expect(page.getByRole("searchbox",{name:"Search learning content"})).toHaveValue("");
});

test("empty recording search recovers without losing the library",async({page})=>{
 await page.goto("listening/");
 await expect(page.locator(".book-track")).toHaveCount(1);
 await page.getByLabel("Find a recording",{exact:true}).fill("zzzz-no-recording-zzzz");
 await expect(page.getByText("No recordings match. Change the study selection or search.",{exact:true})).toBeVisible();
 await expect(page.locator(".book-track")).toHaveCount(0);
 await page.getByLabel("Find a recording",{exact:true}).fill("");
 await expect(page.locator(".book-track")).toHaveCount(1);
 await expect(page.locator(".recording-browser>div>button")).toHaveCount(12);
});

test("learning views retain readable reflow when text is enlarged to 200 percent",async({page},info)=>{
 test.setTimeout(180000);
 await page.setViewportSize({width:390,height:844});
 for(const route of ["vocabulary/","lessons/12/","cheat-sheets/","cheat-sheets/home/","collections/professions/","book/?page=coursebook-30","listening/","settings/"]){
  await page.goto(route);
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.evaluate(async()=>{
   await document.fonts.ready;
   // Snapshot before changing ancestors, so inherited sizes are doubled once.
   const sizes=Array.from(document.querySelectorAll<HTMLElement>("body,body *")).filter(node=>node instanceof HTMLElement).map(node=>({node,size:parseFloat(getComputedStyle(node).fontSize),line:parseFloat(getComputedStyle(node).lineHeight)}));
   for(const {node,size,line} of sizes){node.style.fontSize=`${size*2}px`;if(Number.isFinite(line))node.style.lineHeight=`${line*2}px`;}
  });
  await page.screenshot({path:info.outputPath(`text-200-${route.split("/")[0]}${route.includes("home")?"-home":""}.png`)});
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,outside:Array.from(document.querySelectorAll('main *')).filter(node=>{const rect=node.getBoundingClientRect();return rect.width>0&&rect.right>innerWidth+1&&!node.closest('.book-page-scroll,svg');}).slice(0,12).map(node=>({tag:node.tagName,class:node.className,text:node.textContent?.slice(0,60),width:node.getBoundingClientRect().width}))}));
  console.log("200% text",route,JSON.stringify(layout));
  expect.soft(layout.overflow,route).toBeLessThanOrEqual(1);
  await expect.poll(()=>page.evaluate(()=>{
   const nav=document.querySelector('.mobile-navigation')!.getBoundingClientRect();
   const measured=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--measured-bottom-nav-height'));
   return Math.abs(measured-nav.height);
  })).toBeLessThanOrEqual(1);
  const labelsFit=await page.locator('.mobile-navigation > :is(a,button) > span').evaluateAll(labels=>labels.every(label=>label.getBoundingClientRect().width<=label.parentElement!.getBoundingClientRect().width+1));
  expect.soft(labelsFit,`${route} enlarged navigation labels fit`).toBe(true);
  await page.locator('main').evaluate(node=>node.scrollIntoView({block:'end',behavior:'instant'}));
  const bottomClearance=await page.evaluate(()=>{
   const controls=Array.from(document.querySelectorAll('main a,main button,main select,main input,main summary')).filter(node=>node.checkVisibility()).map(node=>node.getBoundingClientRect()).filter(rect=>rect.width&&rect.height);
   return document.querySelector('.mobile-navigation')!.getBoundingClientRect().top-(controls.at(-1)?.bottom??0);
  });
  expect.soft(bottomClearance,`${route} final control clears the navigation`).toBeGreaterThanOrEqual(0);
 }
});

test.describe("real offline recovery",()=>{
 test.use({serviceWorkers:"allow"});
 test("played audio and saved progress survive offline reload; unopened pages are honest",async({page,context},info)=>{
  test.setTimeout(180000);
  await page.goto("book/?page=coursebook-30&track=coursebook-l4-ex3-c8a4e473");
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:90000});
  await page.reload();
  await page.getByRole("combobox",{name:"Reading view",exact:true}).selectOption("read");
  const line=page.locator(".book-readable-lines .book-line").first();
  await line.getByRole("button",{name:/^Save to review:/}).click();
  const track=page.locator(".book-track"),audio=track.locator("audio");
  const src=await audio.getAttribute("src");
  await track.getByRole("button",{name:"Play from start",exact:true}).click();
  await expect.poll(()=>audio.evaluate((node:HTMLAudioElement)=>node.currentTime)).toBeGreaterThan(1);
  await audio.evaluate((node:HTMLAudioElement)=>node.pause());
  // Inspect the worker's real cache after ordinary playback, without seeding it.
  await expect.poll(()=>page.evaluate(async clip=>{
   for(const name of await caches.keys())if(name.startsWith("german-learning-os-")){
    const hit=await (await caches.open(name)).match(new URL(clip!,location.href).href);
    if(hit?.status===200)return true;
   }
   return false;
  },src),{timeout:30000}).toBe(true);
  await context.setOffline(true);
  // Network interception alone does not change navigator.onLine in this Chromium.
  const cdp=await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await page.reload();
  await cdp.send("Network.overrideNetworkState",{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await info.attach("offline-state.json",{body:JSON.stringify(await page.evaluate(()=>({online:navigator.onLine,offlineUi:document.querySelector('.offline-runtime')?.outerHTML,worker:navigator.serviceWorker.controller?.scriptURL,view:document.querySelector('select[aria-label="Reading view"]')?.outerHTML}))),contentType:"application/json"});
  await expect(page.getByText("You are offline",{exact:true})).toBeVisible();
  await expect(page.getByRole("combobox",{name:"Reading view",exact:true})).toHaveValue("read");
  await expect(page.locator(".book-readable-lines .book-line").first().getByRole("button",{name:/^Remove from review:/})).toBeVisible();
  await page.locator(".book-track").getByRole("button",{name:"Play from start",exact:true}).click();
  await expect.poll(()=>page.locator(".book-track audio").evaluate((node:HTMLAudioElement)=>node.currentTime)).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath("offline-book.png")});
  const unplayed=await page.getByRole("combobox",{name:"Page recording",exact:true}).locator("option").evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value).find(value=>value!=="coursebook-l4-ex3-c8a4e473"));
  expect(unplayed).toBeTruthy();
  await page.getByRole("combobox",{name:"Page recording",exact:true}).selectOption(unplayed!);
  await page.locator(".book-track").getByRole("button",{name:"Play from start",exact:true}).click();
  await expect(page.locator(".book-track").getByRole("alert")).toContainText("Recording could not play.");
  await expect(page.getByText("That sound is not saved on this device yet.",{exact:false})).toBeVisible();
  await page.goto("not-previously-opened-release-check/");
  await expect(page.getByRole("heading",{name:"This page is not saved on your device",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Go to your dashboard",exact:true})).toBeVisible();
  await context.setOffline(false);
  await cdp.send("Network.overrideNetworkState",{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await page.goto("book/?page=coursebook-30");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByText("You are offline",{exact:true})).toHaveCount(0);
 });
});
