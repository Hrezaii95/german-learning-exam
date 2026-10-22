import {describe,expect,it} from "vitest";
import {studyConcepts,type StudyConcept} from "../../apps/web/lib/study/scope";
import type {SheetGrouping} from "../../apps/web/lib/study/sheet-grouping";
import type {SheetSort,SheetSortDirection} from "../../apps/web/lib/study/sheet-sorting";
import {sheetLinks} from "../../apps/web/lib/study/sheet-topics";
import {readSheetBrowse,sheetBrowseQuery,sheetNavigationContext} from "../../apps/web/lib/study/sheet-browse";
import {appendNavigationContext,isSafeNavigationPath,serializeNavigationContext,parseNavigationContextParam,resolveBackHref,type NavigationContext} from "../../apps/web/lib/content/navigation-context";

describe("safe sheet return navigation",()=>{
  it("restores every word sorting choice and direction independently of grouping on all infographic routes",()=>{
    const sorts:SheetSort[]=["german","meaning","lesson","source","original"];
    const directions:SheetSortDirection[]=["asc","desc"];
    const returnPaths=["/cheat-sheets/plurals",...studyConcepts.map(subject=>`/cheat-sheets/subjects/${subject.id}`)];
    for(const returnPath of returnPaths)for(const sort of sorts)for(const direction of directions){
      const browse={query:"Bücher",category:"all",saved:false,page:1,view:"plurals" as const,gender:false,subjects:true,lessons:true,groupOrder:["subject","lesson","plural","gender"] as SheetGrouping[],sort,direction,tags:["objects","home"] as StudyConcept[]};
      expect(readSheetBrowse(new URLSearchParams(sheetBrowseQuery(browse)))).toEqual(browse);
      const card=new URL(appendNavigationContext("/vocabulary/w466",sheetNavigationContext(returnPath,browse,"W466-0")),"https://local.test");
      const context=parseNavigationContextParam(card.searchParams.get("nav"));
      expect(context?.sheetSort).toBe(sort);
      expect(context?.sheetDirection).toBe(direction);
      const back=new URL(resolveBackHref(context),"https://local.test");
      expect(back.pathname).toBe(returnPath);
      expect(back.hash).toBe("#sheet-card-W466-0");
      expect(readSheetBrowse(back.searchParams)).toEqual(browse);
    }
    for(const browse of [
      {query:"",category:"all",saved:false,page:1,sort:"meaning" as const},
      {query:"",category:"all",saved:false,page:1,direction:"desc" as const},
    ]){
      const context=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/plurals",browse)));
      expect(readSheetBrowse(new URL(resolveBackHref(context),"https://local.test").searchParams)).toEqual(browse);
    }
  });
  it("ignores malformed sort and direction values and preserves absent defaults",()=>{
    for(const sort of ["","German","alphabetical","lessons","asc","null"," german","german,meaning"]){
      expect(readSheetBrowse(new URLSearchParams({sort}))).not.toHaveProperty("sort");
    }
    for(const direction of ["","ascending","descending","ASC","true","1","null"," asc","asc,desc"]){
      expect(readSheetBrowse(new URLSearchParams({direction}))).not.toHaveProperty("direction");
    }
    for(const field of ["sheetSort","sheetDirection"])for(const value of [null,0,true,[],{},"unknown"]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",[field]:value}));
      expect(context).not.toHaveProperty(field);
      expect(resolveBackHref(context)).not.toMatch(/(?:sort|direction)=/);
    }
    const legacy=readSheetBrowse(new URLSearchParams({view:"plurals"}));
    expect(legacy).not.toHaveProperty("sort");
    expect(legacy).not.toHaveProperty("direction");
    expect(sheetBrowseQuery(legacy)).toBe("?view=plurals");
  });
  it("restricts word-sort navigation state and its larger payload allowance to valid infographic hubs",()=>{
    for(const payload of [
      {entryContext:"hub",returnPath:"/vocabulary",sheetSort:"german",sheetDirection:"asc"},
      {entryContext:"hub",returnPath:"/cheat-sheets/subjects",sheetSort:"german",sheetDirection:"asc"},
      {entryContext:"hub",returnPath:"/cheat-sheets/subjects/fake",sheetSort:"german",sheetDirection:"asc"},
      {entryContext:"search",returnPath:"/cheat-sheets/plurals",sheetSort:"german",sheetDirection:"asc"},
      {entryContext:"lesson",returnPath:"/cheat-sheets/plurals",sheetSort:"german",sheetDirection:"asc"},
    ]){
      const context=parseNavigationContextParam(JSON.stringify(payload));
      expect(context).not.toHaveProperty("sheetSort");
      expect(context).not.toHaveProperty("sheetDirection");
      expect(resolveBackHref(context)).not.toMatch(/(?:sort|direction)=/);
      expect(parseNavigationContextParam(JSON.stringify({...payload,q:"x".repeat(600)}))).toBeNull();
    }
    for(const payload of [
      {entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetSort:"wrong",sheetDirection:"wrong"},
      {entryContext:"hub",returnPath:"/cheat-sheets/plurals",hubId:"vocabulary",sheetSort:"german"},
    ])expect(parseNavigationContextParam(JSON.stringify({...payload,q:"x".repeat(600)}))).toBeNull();
    for(const field of [{sheetSort:"original"},{sheetDirection:"desc"}]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",...field,q:"x".repeat(600)}));
      expect(context).toMatchObject(field);
      expect(parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",...field,q:"x".repeat(1100)}))).toBeNull();
    }
  });
  it("restores lesson and subject grouping and every priority order through URL and full-card Back navigation",()=>{
    const permutations=(values:SheetGrouping[]):SheetGrouping[][]=>values.length===0?[[]]:values.flatMap((value,index)=>permutations(values.filter((_,other)=>other!==index)).map(rest=>[value,...rest]));
    const orders=permutations(["lesson","subject","gender","plural"]);
    expect(orders).toHaveLength(24);
    const returnPaths=["/cheat-sheets/plurals",...studyConcepts.map(subject=>`/cheat-sheets/subjects/${subject.id}`)];
    for(const returnPath of returnPaths)for(const groupOrder of orders)for(const subjects of [false,true])for(const lessons of [false,true])for(const gender of [false,true])for(const view of ["illustrated","plurals"] as const){
      const browse={query:"Bücher",category:"all",saved:false,page:1,view,gender,subjects,lessons,groupOrder,tags:["objects","home"] as StudyConcept[]};
      expect(readSheetBrowse(new URLSearchParams(sheetBrowseQuery(browse)))).toEqual(browse);
      const card=new URL(appendNavigationContext("/vocabulary/w466",sheetNavigationContext(returnPath,browse,"W466-0")),"https://local.test");
      const context=parseNavigationContextParam(card.searchParams.get("nav"));
      expect(context?.sheetSubjects).toBe(subjects);
      expect(context?.sheetLessons).toBe(lessons);
      expect(context?.sheetGroupOrder).toEqual(groupOrder);
      const back=new URL(resolveBackHref(context),"https://local.test");
      expect(back.pathname).toBe(returnPath);
      expect(back.hash).toBe("#sheet-card-W466-0");
      expect(readSheetBrowse(back.searchParams)).toEqual(browse);
    }
  });
  it("upgrades legacy three-group priorities by prepending disabled lesson grouping",()=>{
    for(const legacyOrder of [["subject","gender","plural"],["subject","plural","gender"],["plural","subject","gender"],["plural","gender","subject"],["gender","plural","subject"],["gender","subject","plural"]]){
      const expected=["lesson",...legacyOrder];
      const browse=readSheetBrowse(new URLSearchParams({view:"plurals",subjects:"1",order:legacyOrder.join(",")}));
      expect(browse.groupOrder).toEqual(expected);
      expect(browse).not.toHaveProperty("lessons");
      const oldContext=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetView:"plurals",sheetSubjects:true,sheetGroupOrder:legacyOrder}));
      expect(oldContext?.sheetGroupOrder).toEqual(expected);
      expect(oldContext).not.toHaveProperty("sheetLessons");
      const back=new URL(resolveBackHref(oldContext),"https://local.test");
      expect(readSheetBrowse(back.searchParams)).toEqual(browse);
    }
  });
  it("rejects malformed lesson and subject toggles and incomplete, repeated or unknown grouping priorities",()=>{
    for(const subjects of ["","true","false","2","01","-1","null","undefined"]){
      expect(readSheetBrowse(new URLSearchParams({subjects}))).not.toHaveProperty("subjects");
      expect(readSheetBrowse(new URLSearchParams({lessons:subjects}))).not.toHaveProperty("lessons");
    }
    for(const order of ["","subject","subject,gender","subject,gender,gender","subject,gender,plural,subject","subject,gender,unknown","subject, gender,plural","Subject,gender,plural"]){
      expect(readSheetBrowse(new URLSearchParams({order}))).not.toHaveProperty("groupOrder");
    }
    for(const sheetSubjects of ["0","1","true",0,1,null,[],{}]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetSubjects}));
      expect(context).not.toHaveProperty("sheetSubjects");
      expect(resolveBackHref(context)).not.toContain("subjects=");
      const lessonContext=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetLessons:sheetSubjects}));
      expect(lessonContext).not.toHaveProperty("sheetLessons");
      expect(resolveBackHref(lessonContext)).not.toContain("lessons=");
    }
    for(const sheetGroupOrder of ["subject,gender,plural",null,{},[],["subject"],["subject","gender"],["subject","gender","gender"],["subject","gender","unknown"],["subject","gender","plural","subject"]]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetGroupOrder}));
      expect(context).not.toHaveProperty("sheetGroupOrder");
      expect(resolveBackHref(context)).not.toContain("order=");
    }
    expect(readSheetBrowse(new URLSearchParams())).not.toHaveProperty("subjects");
    expect(readSheetBrowse(new URLSearchParams())).not.toHaveProperty("lessons");
    expect(readSheetBrowse(new URLSearchParams())).not.toHaveProperty("groupOrder");
  });
  it("uses the larger bounded navigation budget only for validated grouping order on infographic routes",()=>{
    const order:SheetGrouping[]=["plural","subject","lesson","gender"];
    const browse={query:"a".repeat(120),category:"b".repeat(80),saved:true,page:500,view:"plurals" as const,gender:false,subjects:true,lessons:true,groupOrder:order};
    const context=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/subjects/colours-materials",browse,"W".repeat(120))));
    expect(context?.sheetGroupOrder).toEqual(order);
    const back=new URL(resolveBackHref(context),"https://local.test");
    expect(readSheetBrowse(back.searchParams)).toEqual(browse);
    for(const payload of [
      {entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetSubjects:true},
      {entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetGroupOrder:["subject","subject","gender"]},
      {entryContext:"hub",returnPath:"/vocabulary",sheetGroupOrder:order},
      {entryContext:"hub",returnPath:"/cheat-sheets/plurals",hubId:"vocabulary",sheetGroupOrder:order},
      {entryContext:"search",returnPath:"/cheat-sheets/plurals",sheetGroupOrder:order},
    ])expect(parseNavigationContextParam(JSON.stringify({...payload,q:"x".repeat(600)}))).toBeNull();
    expect(parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/plurals",sheetGroupOrder:order,q:"x".repeat(1100)}))).toBeNull();
  });
  it("keeps the legacy payload bound unless a valid infographic tag selection needs the extra budget",()=>{
    const longQuery="x".repeat(600);
    for(const payload of [
      {entryContext:"search",returnPath:"/search"},
      {entryContext:"hub",returnPath:"/vocabulary",sheetTags:[]},
      {entryContext:"hub",returnPath:"/cheat-sheets/subjects/home"},
      {entryContext:"hub",returnPath:"/cheat-sheets/subjects/home",sheetTags:["home","missing"]},
      {entryContext:"hub",returnPath:"/cheat-sheets/subjects/home",sheetTags:[],hubId:"vocabulary"},
      {entryContext:"lesson",returnPath:"/cheat-sheets/subjects/home",sheetTags:[]},
      {entryContext:"hub",returnPath:"/cheat-sheets/subjects/fake",sheetTags:[]},
    ])expect(parseNavigationContextParam(JSON.stringify({...payload,q:longQuery}))).toBeNull();
    const wideContext:NavigationContext={entryContext:"hub",returnPath:"/cheat-sheets/subjects/colours-materials",q:"a".repeat(200),category:"b".repeat(80),resultId:"W".repeat(120),page:500,onlySaved:true,sheetGender:false,sheetView:"plurals"};
    const legacySerialized=serializeNavigationContext(wideContext);
    expect(legacySerialized.length).toBeLessThanOrEqual(512);
    expect(JSON.parse(legacySerialized)).toEqual({entryContext:"hub",returnPath:"/hubs"});
    for(const sheetTags of [[],studyConcepts.map(subject=>subject.id)]){
      const serialized=serializeNavigationContext({...wideContext,sheetTags});
      expect(serialized.length).toBeGreaterThan(512);
      expect(serialized.length).toBeLessThanOrEqual(1024);
      expect(parseNavigationContextParam(serialized)?.sheetTags).toEqual(sheetTags);
      expect(parseNavigationContextParam(serialized)?.q).toBe(wideContext.q);
    }
  });
  it("restores explicit tag selections independently of the subject route, including an empty selection",()=>{
    const returnPaths=["/cheat-sheets/plurals",...studyConcepts.map(subject=>`/cheat-sheets/subjects/${subject.id}`)];
    const selections:StudyConcept[][]=[[],["home","objects"]];
    for(const returnPath of returnPaths)for(const tags of selections){
      const browse={query:"Bücher",category:"all",saved:false,page:1,view:"plurals" as const,gender:false,tags};
      const query=sheetBrowseQuery(browse);
      expect(new URLSearchParams(query).get("tags")).toBe(tags.join(","));
      expect(readSheetBrowse(new URLSearchParams(query))).toEqual(browse);
      const cardUrl=new URL(appendNavigationContext("/vocabulary/w466",sheetNavigationContext(returnPath,browse,"W466-0")),"https://local.test");
      const context=parseNavigationContextParam(cardUrl.searchParams.get("nav"));
      expect(context?.sheetTags).toEqual(tags);
      const back=new URL(resolveBackHref(context),"https://local.test");
      expect(back.pathname).toBe(returnPath);
      expect(back.searchParams.has("tags")).toBe(true);
      expect(readSheetBrowse(back.searchParams)).toEqual(browse);
      expect(back.hash).toBe("#sheet-card-W466-0");
    }
  });
  it("deduplicates valid tags in order and drops an entirely malformed tag field",()=>{
    expect(readSheetBrowse(new URLSearchParams({tags:"objects,home,objects,office,home"})).tags).toEqual(["objects","home","office"]);
    const duplicateContext=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/subjects/food",sheetTags:["objects","home","objects"]}));
    expect(duplicateContext?.sheetTags).toEqual(["objects","home"]);
    expect(resolveBackHref(duplicateContext)).toBe("/cheat-sheets/subjects/food?tags=objects%2Chome");
    for(const tags of ["missing","home,missing","home,","home,,objects",",","Home"," home","home objects","[]","null"]){
      expect(readSheetBrowse(new URLSearchParams({tags}))).not.toHaveProperty("tags");
    }
    for(const sheetTags of ["home",null,false,0,{},["home","missing"],["home",null],["home",1],[""]]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/subjects/home",sheetTags}));
      expect(context).not.toHaveProperty("sheetTags");
      expect(resolveBackHref(context)).not.toContain("tags=");
    }
    expect(readSheetBrowse(new URLSearchParams())).not.toHaveProperty("tags");
    expect(sheetBrowseQuery({query:"",category:"all",saved:false,page:1})).toBe("");
  });
  it("preserves all canonical tags together with bounded browse filters in full-card navigation",()=>{
    const browse={query:"a".repeat(120),category:"b".repeat(80),saved:true,page:500,view:"illustrated" as const,gender:false,subjects:true,lessons:true,groupOrder:["plural","lesson","subject","gender"] as SheetGrouping[],sort:"original" as const,direction:"desc" as const,tags:studyConcepts.map(subject=>subject.id)};
    const context=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/subjects/colours-materials",browse,"W466-0")));
    expect(context?.sheetTags).toEqual(browse.tags);
    const back=new URL(resolveBackHref(context),"https://local.test");
    expect(readSheetBrowse(back.searchParams)).toEqual(browse);
    expect(back.hash).toBe("#sheet-card-W466-0");
  });
  it("independently restores both grouping toggles after opening a full word card",()=>{
    const returnPaths=["/cheat-sheets/plurals",...studyConcepts.map(subject=>`/cheat-sheets/subjects/${subject.id}`)];
    for(const returnPath of returnPaths)for(const gender of [true,false])for(const view of ["illustrated","plurals"] as const){
      const browse={query:"Bücher",category:"neuter",saved:true,page:2,view,gender};
      const cardHref=appendNavigationContext("/vocabulary/w466",sheetNavigationContext(returnPath,browse,"W466-0"));
      const cardUrl=new URL(cardHref,"https://local.test");
      expect(cardUrl.pathname).toBe("/vocabulary/w466");
      const context=parseNavigationContextParam(cardUrl.searchParams.get("nav"));
      expect(context?.sheetGender).toBe(gender);
      expect(context?.sheetView).toBe(view);
      const back=new URL(resolveBackHref(context),"https://local.test");
      expect(back.pathname).toBe(returnPath);
      expect(back.searchParams.get("gender")).toBe(gender?"1":"0");
      expect(readSheetBrowse(back.searchParams)).toEqual(browse);
      expect(back.hash).toBe("#sheet-card-W466-0");
      expect(readSheetBrowse(new URLSearchParams(sheetBrowseQuery(browse)))).toEqual(browse);
    }
  });
  it("keeps legacy URLs unchanged and ignores malformed grouping values",()=>{
    const legacy={query:"Haus",category:"all",saved:false,page:1,view:"illustrated" as const};
    expect(sheetBrowseQuery(legacy)).toBe("?q=Haus&view=illustrated");
    expect(readSheetBrowse(new URLSearchParams(sheetBrowseQuery(legacy)))).toEqual(legacy);
    const oldContext=parseNavigationContextParam(serializeNavigationContext(sheetNavigationContext("/cheat-sheets/subjects/home",legacy,"W353-0")));
    expect(oldContext).not.toHaveProperty("sheetGender");
    expect(resolveBackHref(oldContext)).toBe("/cheat-sheets/subjects/home?q=Haus&view=illustrated#sheet-card-W353-0");
    for(const gender of ["","false","true","2","01","-1","null","undefined"]){
      expect(readSheetBrowse(new URLSearchParams({gender}))).not.toHaveProperty("gender");
    }
    for(const sheetGender of ["0","1","false","true",0,1,null,[],{}]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/subjects/home",sheetGender}));
      expect(context).not.toHaveProperty("sheetGender");
      expect(resolveBackHref(context)).not.toContain("gender=");
    }
  });
  it("does not carry sheet grouping state to unrelated or directory routes",()=>{
    for(const returnPath of ["/settings","/vocabulary","/cheat-sheets/home","/cheat-sheets/subjects","/cheat-sheets/subjects/fake","/cheat-sheets/plurals/extra"]){
      for(const sheetGender of [false,true]){
        const context=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath,sheetView:"plurals",sheetGender,sheetTags:[],sheetSubjects:true,sheetLessons:true,sheetGroupOrder:["plural","subject","lesson","gender"]}));
        expect(context).not.toHaveProperty("sheetGender");
        expect(context).not.toHaveProperty("sheetView");
        expect(context).not.toHaveProperty("sheetTags");
        expect(context).not.toHaveProperty("sheetSubjects");
        expect(context).not.toHaveProperty("sheetLessons");
        expect(context).not.toHaveProperty("sheetGroupOrder");
        expect(resolveBackHref(context)).not.toContain("gender=");
        expect(resolveBackHref(context)).not.toContain("tags=");
        expect(resolveBackHref(context)).not.toContain("subjects=");
        expect(resolveBackHref(context)).not.toContain("lessons=");
        expect(resolveBackHref(context)).not.toContain("order=");
      }
    }
    for(const entryContext of ["lesson","search","review"]){
      const context=parseNavigationContextParam(JSON.stringify({entryContext,returnPath:"/cheat-sheets/subjects/home",sheetGender:false,sheetTags:["objects"],sheetSubjects:true,sheetLessons:true,sheetGroupOrder:["plural","subject","lesson","gender"]}));
      expect(context).not.toHaveProperty("sheetGender");
      expect(context).not.toHaveProperty("sheetTags");
      expect(context).not.toHaveProperty("sheetSubjects");
      expect(context).not.toHaveProperty("sheetLessons");
      expect(context).not.toHaveProperty("sheetGroupOrder");
    }
    const redirectedHub=parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/subjects/home",hubId:"vocabulary",sheetView:"plurals",sheetGender:false,sheetTags:["objects"],sheetSubjects:true,sheetLessons:true,sheetGroupOrder:["plural","subject","lesson","gender"]}));
    expect(resolveBackHref(redirectedHub)).toBe("/vocabulary");
  });
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
