import {describe,expect,it} from "vitest";
import {studyConcepts} from "../../apps/web/lib/study/scope";
import {sheetLinks} from "../../apps/web/lib/study/sheet-topics";
import {readSheetBrowse,sheetBrowseQuery,sheetNavigationContext} from "../../apps/web/lib/study/sheet-browse";
import {isSafeNavigationPath,serializeNavigationContext,parseNavigationContextParam,resolveBackHref} from "../../apps/web/lib/content/navigation-context";

describe("safe sheet return navigation",()=>{
  it("restores the plural grid with its search, gender filter and exact row",()=>{
    const browse={query:"Bücher",category:"neuter",saved:false,page:1,view:"plurals" as const};
    expect(readSheetBrowse(new URLSearchParams(sheetBrowseQuery(browse)))).toEqual(browse);
    const context=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/subjects/objects",browse,"W466-0")));
    expect(resolveBackHref(context)).toBe("/cheat-sheets/subjects/objects?q=B%C3%BCcher&category=neuter&view=plurals#sheet-card-W466-0");
    const allNouns=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/plurals",browse,"W466-0")));
    expect(resolveBackHref(allNouns)).toBe("/cheat-sheets/plurals?q=B%C3%BCcher&category=neuter&view=plurals#sheet-card-W466-0");
    expect(readSheetBrowse(new URLSearchParams({view:"unknown"}))).toEqual({query:"",category:"all",saved:false,page:1});
    for(const returnPath of ["/settings","/vocabulary","/cheat-sheets/home","/cheat-sheets/subjects"]){
      const unsafe=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath,sheetView:"plurals"}));
      expect(resolveBackHref(unsafe)).not.toContain("view=plurals");
    }
  });
  it("allows published sheets and rejects unrecognized or hostile return paths",()=>{
    for(const sheet of sheetLinks)expect(isSafeNavigationPath(sheet.href)).toBe(true);
    for(const path of ["/cheat-sheets/fake","/cheat-sheets/../settings","//evil.example","/cheat-sheets/%2e%2e/settings","/cheat-sheets/home#anything","/cheat-sheets/home?q=x"])expect(isSafeNavigationPath(path)).toBe(false);
  });
  it("allows every canonical subject infographic and preserves exact row return context",()=>{
    expect(isSafeNavigationPath("/cheat-sheets/subjects")).toBe(true);
    for(const subject of studyConcepts){
      const path=`/cheat-sheets/subjects/${subject.id}`;
      expect(isSafeNavigationPath(path),path).toBe(true);
      const context=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext(path,{query:"Ketchup",category:"all",saved:false,page:1},"l9-ketchup:1")));
      expect(resolveBackHref(context)).toBe(`${path}?q=Ketchup#sheet-card-l9-ketchup%3A1`);
    }
    for(const path of ["/cheat-sheets/subjects/fake","/cheat-sheets/subjects/food/extra","/cheat-sheets/subjects/%2e%2e","/cheat-sheets/subjects/food?q=x"])
      expect(isSafeNavigationPath(path),path).toBe(false);
  });
  it("restores search, saved filter, category, loaded page and exact card",()=>{
    const browse={query:"teacher",category:"Profession",saved:true,page:3};
    expect(readSheetBrowse(new URLSearchParams(sheetBrowseQuery(browse)))).toEqual(browse);
    const context=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/people",browse,"W230")));
    expect(context?.onlySaved).toBe(true);
    const url=new URL(resolveBackHref(context),"https://local.test");
    expect(url.pathname).toBe("/cheat-sheets/people");
    expect(readSheetBrowse(url.searchParams)).toEqual(browse);
    expect(url.hash).toBe("#sheet-card-W230");
  });
  it("restores country, home and viewpoint anchors without needing a query",()=>{
    for(const [path,id] of [["/cheat-sheets","country-GB-ENG"],["/cheat-sheets/home","home-stuhl"],["/cheat-sheets/people","family-martin-mia"]]){
      const ctx=parseNavigationContextParam(serializeNavigationContext({entryContext:"hub",returnPath:path!,resultId:id!}));
      expect(resolveBackHref(ctx)).toBe(`${path}#${id}`);
    }
  });
  it("bounds browsing inputs and never accepts fragments embedded in result identifiers",()=>{
    const invalid=readSheetBrowse(new URLSearchParams({q:"a".repeat(200),category:"b".repeat(100),saved:"true",page:"Infinity"}));
    expect(invalid.query.length).toBe(120);expect(invalid.category.length).toBe(80);expect(invalid.saved).toBe(false);expect(invalid.page).toBe(1);
    for(const id of ["../bad","home-stuhl#evil","<script>","x".repeat(121)]){
      const ctx=parseNavigationContextParam(serializeNavigationContext({entryContext:"hub",returnPath:"/cheat-sheets/home",resultId:id}));
      expect(resolveBackHref(ctx)).toBe("/cheat-sheets/home");
    }
  });
});
