import {expect,test} from "@playwright/test";
import {printLiveSheet} from "./helpers/print-live-sheet";

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{const NativeAudio=window.Audio;(window as unknown as {clips:HTMLAudioElement[]}).clips=[];window.Audio=class extends NativeAudio{constructor(src?:string){super(src);(window as unknown as {clips:HTMLAudioElement[]}).clips.push(this);}};});
});

test("book prints the current original page without shell, reading controls or audio players",async({page},info)=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("book/?page=coursebook-30");
  const workspace=page.locator(".book-workspace");
  const account=page.locator(".study-toolbar .shell-account");
  await expect(account.getByRole("link",{name:"Sign in",exact:true})).toBeVisible();
  await expect(account.getByText("Learning on this device",{exact:true})).toBeVisible();
  const view=workspace.getByRole("combobox",{name:"Reading view",exact:true});
  const zoom=workspace.getByRole("combobox",{name:"Page zoom",exact:true});
  await view.selectOption("page");
  await zoom.selectOption("150");
  await workspace.getByRole("button",{name:/Contents & search/}).click();
  await expect(workspace.locator(".book-contents")).toBeVisible();
  await expect(workspace.locator(".book-original-audio")).toBeVisible();
  await expect(workspace.locator("audio").first()).toBeVisible();
  await expect(workspace.getByRole("combobox",{name:"Go to page",exact:true})).toHaveValue("coursebook-30");
  const paper=workspace.locator(".book-paper");
  const image=paper.locator(":scope > img");
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((element:HTMLImageElement)=>element.complete&&element.naturalWidth>0)).toBe(true);
  const source=await image.getAttribute("src");
  expect(source).toBeTruthy();
  const pdfs=await printLiveSheet(page,info,"book-coursebook-30",async()=>{
    await expect(workspace.locator(".book-header h1")).toBeVisible();
    await expect(workspace.locator(".book-original")).toBeVisible();
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src",source!);
    await expect(page.locator(".study-toolbar .study-scope > summary")).toBeVisible();
    for(const transient of await page.locator(".study-toolbar > :not(.study-scope)").all())await expect(transient).toBeHidden();
    await expect(workspace.locator(".book-page-caption")).toBeVisible();
    await expect(workspace.locator(".book-credit")).toBeVisible();
    await expect(page.locator(".shell-credit")).toBeVisible();
    const flow=await image.evaluate((element:HTMLImageElement)=>{
      const workspace=element.closest(".book-workspace")!;
      const image=element.getBoundingClientRect(),scroll=workspace.querySelector(".book-page-scroll")!.getBoundingClientRect();
      const caption=workspace.querySelector(".book-page-caption")!.getBoundingClientRect(),bookCredit=workspace.querySelector(".book-credit")!.getBoundingClientRect(),credit=document.querySelector(".shell-credit")!.getBoundingClientRect();
      return {width:image.width,height:image.height,aspectError:Math.abs(image.width/image.height-element.naturalWidth/element.naturalHeight),imageBeyondScroll:image.bottom-scroll.bottom,imageCaptionGap:caption.top-image.bottom,captionBookCreditGap:bookCredit.top-caption.bottom,creditGap:credit.top-bookCredit.bottom};
    });
    expect(flow.width).toBeGreaterThan(0);expect(flow.height).toBeGreaterThan(0);
    expect(flow.aspectError).toBeLessThan(0.001);
    expect(flow.imageBeyondScroll).toBeLessThanOrEqual(1);
    expect(flow.imageCaptionGap).toBeGreaterThanOrEqual(-1);
    expect(flow.captionBookCreditGap).toBeGreaterThanOrEqual(-1);
    expect(flow.creditGap).toBeGreaterThanOrEqual(-1);
    await expect.poll(()=>paper.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    for(const selector of [".shell-rail",".shell-topnav",".shell-bottomnav",".study-dictionary-launch"]){
      await expect(page.locator(selector)).toBeHidden();
    }
    for(const selector of [".book-contents",".book-source-picker",".book-reading-tools",".book-page-toolbar",".book-original-audio"]){
      await expect(workspace.locator(selector)).toBeHidden();
    }
    // German lookup buttons carry the readable text and must remain printable.
    const controls=workspace.locator("button:not(.study-word),input,select,textarea,audio");
    expect(await controls.count()).toBeGreaterThan(0);
    for(const control of await controls.all())await expect(control).toBeHidden();
  });
  expect(pdfs.map(pdf=>pdf.format)).toEqual(["A4","Letter"]);
  for(const pdf of pdfs)expect((pdf.bytes.toString("latin1").match(/\/Type\s*\/Page\b/g)??[]).length,`${pdf.format} keeps the current original page and credits on one sheet`).toBe(1);
  await expect(view).toHaveValue("page");
  await expect(zoom).toHaveValue("150");
  await expect(workspace.getByRole("combobox",{name:"Go to page",exact:true})).toHaveValue("coursebook-30");
  await expect(workspace.locator(".book-contents")).toBeVisible();
  await expect(workspace.locator("audio").first()).toBeVisible();
  await expect(image).toHaveAttribute("src",source!);
  await expect(account.getByRole("link",{name:"Sign in",exact:true})).toBeVisible();
  await expect(account.getByText("Learning on this device",{exact:true})).toBeVisible();
});

for(const width of [320,1440])test(`book to transcript, meaning, review and exact return at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});
 await page.goto("book/?page=coursebook-30");
 await page.getByRole("combobox",{name:"Page zoom",exact:true}).selectOption("150");
 await page.getByRole("combobox",{name:"Reading view",exact:true}).selectOption("read");
 await page.reload();
 await expect(page.getByRole("combobox",{name:"Reading view",exact:true})).toHaveValue("read");
 await page.getByRole("combobox",{name:"Reading view",exact:true}).selectOption("page");
 await expect(page.getByRole("combobox",{name:"Page zoom",exact:true})).toHaveValue("150");
 await page.getByRole("combobox",{name:"Page zoom",exact:true}).selectOption("0");
 if(width===320)expect((await page.locator(".book-paper").boundingBox())!.y).toBeLessThan(600);
 await page.screenshot({path:info.outputPath(`reader-first-screen-${width}.png`)});
 await expect(page.locator(".book-track")).toHaveCount(1);
 await page.getByRole("combobox",{name:"Page recording",exact:true}).selectOption("coursebook-l4-ex3-c8a4e473");
 await page.getByRole("link",{name:"Open focused listening",exact:true}).click();
 await expect(page.locator(".book-track")).toHaveAttribute("data-recording-id","coursebook-l4-ex3-c8a4e473");
 await expect(page.locator(".recording-browser>div>button")).toHaveCount(12);
 const track=page.locator(".book-track"),original=track.locator("audio");
 await track.getByRole("button",{name:"Play from start",exact:true}).click();
 await expect.poll(()=>original.evaluate((audio:HTMLAudioElement)=>audio.currentTime)).toBeGreaterThan(0);
 await original.evaluate((audio:HTMLAudioElement)=>{audio.currentTime=6;audio.pause();});
 await expect(track.getByRole("button",{name:/Resume at 0:0[6-9]/})).toBeVisible();
 await track.getByRole("button",{name:"Repeat recording",exact:true}).click();
 await expect.poll(()=>original.evaluate((audio:HTMLAudioElement)=>audio.loop)).toBe(true);
 await track.locator("summary").click();
 const line=track.locator(".listening-transcript-lines>p").nth(1);
 const phrase=await line.locator(".study-german").getAttribute("aria-label");
 await line.locator(".study-german").evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);});
 await page.getByRole("button",{name:"Meaning of selection",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Quick dictionary"}).locator("input")).toHaveValue(phrase!);
 await page.keyboard.press("Escape");
 await line.getByRole("button",{name:/^Listen:/}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1)?.currentTime??0)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {clips:HTMLAudioElement[]}).clips.at(-1)?.src??"")).toContain("/book/transcript-speech/");
 await expect.poll(()=>original.evaluate((audio:HTMLAudioElement)=>audio.paused)).toBe(true);
 await line.getByRole("button",{name:/^Save to review:/}).click();
 await page.goto("saved/");
 await page.getByRole("button",{name:"Review 1 items",exact:true}).click();
 await page.getByRole("button",{name:"Reveal meaning",exact:true}).click();
 await page.getByRole("button",{name:"Remembered",exact:true}).click();
 await page.getByRole("button",{name:"Back to my collection",exact:true}).click();
 await page.getByRole("link",{name:"Open in context",exact:true}).click();
 await expect(page).toHaveURL(/page=coursebook-30&track=coursebook-l4-ex3-c8a4e473&transcriptLine=1/);
 await page.reload();
 await expect(page.locator('.listening-transcript-lines>p[data-active="true"]')).toContainText(phrase!);
 await expect(page.locator(".book-track")).toHaveCount(1);
 await expect(page.getByRole("combobox",{name:"Page zoom",exact:true})).toHaveValue("0");
 await page.locator("#book-listening").screenshot({path:info.outputPath(`reader-transcript-${width}.png`)});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test("book line saves preserve source selection and answers stay deliberate",async({page})=>{
 await page.goto("book/?page=coursebook-30");
 await expect(page.locator(".book-answer-list")).toHaveCount(0);
 await page.getByRole("combobox",{name:"Reading view",exact:true}).selectOption("read");
 const line=page.locator(".book-readable-lines .book-line").first();
 const id=await line.getAttribute("data-line-id");
 await line.getByRole("button",{name:/^Save to review:/}).click();
 await page.goto("saved/");
 await page.getByRole("link",{name:"Open in context",exact:true}).click();
 await expect(page).toHaveURL(new RegExp(`line=${encodeURIComponent(id!)}`));
 await expect(page.locator(".book-selected-line .book-line")).toHaveAttribute("data-line-id",id!);
 await expect(page.locator(".book-selected-line")).toBeInViewport();
 await expect(page.locator(".book-answer-list")).toHaveCount(0);
 await page.getByRole("button",{name:/^Show answers/}).click();
 await expect(page.locator(".book-answer-list")).toBeVisible();
 await expect(page.locator(".book-answer-list")).toContainText(/Official solution|Official sample response|From the publisher/);
 await page.getByRole("button",{name:"☷ Contents & search",exact:true}).click();
 await page.getByRole("textbox",{name:"Find text in the book",exact:true}).fill("Stuhl");
 const result=page.locator(".book-search-results button").first();
 const resultText=await result.locator("span").innerText();
 await result.click();
 await expect(page.locator(".book-selected-line .study-german")).toHaveAttribute("aria-label",resultText);
 await expect(page.locator(".book-selected-line")).toBeInViewport();
 await page.reload();
 await expect(page.locator(".book-selected-line .study-german")).toHaveAttribute("aria-label",resultText);
});

async function assertBookToolbar(page: import("@playwright/test").Page) {
 await page.goto("book/?page=coursebook-30");
 const toolbar=page.locator(".study-toolbar");
 await expect(toolbar.locator(".study-scope > summary")).toBeVisible();
 const account=toolbar.locator(".shell-account");
 const signIn=account.getByRole("link",{name:"Sign in",exact:true});
 await expect(signIn).toBeVisible();
 await expect(account.getByText("Learning on this device",{exact:true})).toBeVisible();
 const target=await signIn.boundingBox();
 expect(target).not.toBeNull();
 expect(target!.height).toBeGreaterThanOrEqual(44);
 expect(target!.width).toBeGreaterThanOrEqual(44);
 const geometry=await toolbar.evaluate(element=>{
  const toolbar=element.getBoundingClientRect();
  const scope=element.querySelector(".study-scope")!.getBoundingClientRect();
  const account=element.querySelector(".shell-account")!.getBoundingClientRect();
  return {overflow:element.scrollWidth-element.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,scopeBottom:scope.bottom,accountTop:account.top,left:toolbar.left,right:toolbar.right,width:innerWidth};
 });
 expect(geometry.overflow).toBeLessThanOrEqual(1);
 expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
 expect(geometry.left).toBeGreaterThanOrEqual(0);
 expect(geometry.right).toBeLessThanOrEqual(geometry.width+1);
 // The mobile grid reserves a complete row for account status, below selection.
 if((page.viewportSize()?.width??0)<=760)expect(geometry.accountTop).toBeGreaterThanOrEqual(geometry.scopeBottom);
}

for(const width of [320,390,768,1366])test(`book toolbar keeps account content and touch targets at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await assertBookToolbar(page);
});

test.describe("Book toolbar at 200% desktop-equivalent reflow",()=>{
 // 1366 physical pixels at 200% gives a 683px CSS viewport.
 test.use({viewport:{width:683,height:500},deviceScaleFactor:2});
 test("account and selection remain readable without horizontal scrolling",async({page})=>{
  await assertBookToolbar(page);
 });
});
