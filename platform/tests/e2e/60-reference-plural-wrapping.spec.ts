import {expect,test,type Locator} from "@playwright/test";

async function expectAttachedEnding(result:Locator){
  const layout=await result.evaluate(element=>{
    const ending=element.querySelector(".subject-plural-ending");
    if(!ending?.firstChild)throw new Error("Expected a highlighted plural ending");
    let previous=ending.previousSibling;
    while(previous&&!(previous.nodeType===Node.TEXT_NODE&&previous.textContent?.trim()))previous=previous.previousSibling;
    if(!previous)throw new Error("Expected a stem character before the ending");
    const stem=previous as Text;
    const range=document.createRange();
    range.setStart(stem,stem.length-1);
    range.setEnd(stem,stem.length);
    const stemRect=range.getBoundingClientRect();
    range.setStart(ending.firstChild,0);
    range.setEnd(ending.firstChild,1);
    const endingRect=range.getBoundingClientRect();
    const entry=element.closest("button")!;
    const entryRect=entry.getBoundingClientRect();
    return {
      text:element.textContent,
      ending:ending.textContent,
      stemCharacter:stem.data.at(-1),
      endingCharacter:ending.firstChild.textContent?.[0],
      lineDistance:Math.abs(stemRect.top-endingRect.top),
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      entryOverflow:entry.scrollWidth-entry.clientWidth,
      endingOutsideEntry:endingRect.right>entryRect.right+1||endingRect.left<entryRect.left-1,
    };
  });
  // Natural hyphenation within a long stem is allowed. The taught ending must
  // begin on the same line as the stem's last character, without clipping.
  expect(layout.lineDistance,JSON.stringify(layout)).toBeLessThanOrEqual(2);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(layout.entryOverflow).toBeLessThanOrEqual(1);
  expect(layout.endingOutsideEntry).toBe(false);
  return layout;
}

for(const width of [320,1366])for(const gender of [true,false]){
  test(`plural endings stay with their stems in ${gender?"gender matrix":"pattern cards"} at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:1000});
    for(const [query,plural] of [["Familienmitglied","die Familienmitglieder"],["Automechaniker","die Automechanikerinnen"]] as const){
      await page.goto(`cheat-sheets/subjects/people/?q=${query}&view=plurals&tags=people&gender=${gender?1:0}`);
      await expect(page.getByRole("searchbox",{name:"Find a word or form"})).toHaveValue(query);
      const result=page.locator(".subject-plural-result > span:last-child").filter({hasText:plural}).first();
      await expect(result).toHaveText(plural);
      await result.scrollIntoViewIfNeeded();
      await page.evaluate(async()=>{await document.fonts.ready;});
      const layout=await expectAttachedEnding(result);
      if(query==="Familienmitglied"){
        expect(layout.ending).toBe("er");
        expect(layout.stemCharacter).toBe("d");
        expect(layout.endingCharacter).toBe("e");
        await testInfo.attach("plural-word-layout",{body:await page.locator(".subject-plural-view").screenshot(),contentType:"image/png"});
      }
    }
  });
}
