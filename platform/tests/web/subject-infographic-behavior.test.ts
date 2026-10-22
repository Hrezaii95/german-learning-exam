// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within,waitFor} from "@testing-library/react";
import {SubjectDirectory,SubjectInfographic} from "../../apps/web/components/study/SubjectInfographic";
import {CheatSheetFrame} from "../../apps/web/components/study/CheatSheetFrame";
import {sheetDestinations} from "../../apps/web/lib/study/sheet-navigation";
import {initialSheetBrowse} from "../../apps/web/lib/study/sheet-browse";
import {StudyProvider} from "../../apps/web/components/study/StudyProvider";
import {StudyScopeProvider,StudyTagList} from "../../apps/web/components/study/StudyScope";
import {loadSubjectSheets,loadSubjectVocabulary} from "../../apps/web/lib/study/subject-sheets.server";
import {defaultStudyScope,matchesStudyScope,STUDY_SCOPE_KEY,studyConcepts} from "../../apps/web/lib/study/scope";
import {STUDY_KEY} from "../../apps/web/lib/study/storage";
import {parseNavigationContextParam,resolveBackHref} from "../../apps/web/lib/content/navigation-context";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";

const sheets=loadSubjectSheets();
const catalogue=loadSubjectVocabulary();
const canonicalCards=new Set(loadWordCards().cards.map(card=>card.id));
const food=sheets.find(sheet=>sheet.id==="food")!;
const directory=sheets.map(sheet=>({id:sheet.id,label:sheet.label,count:sheet.items.length,families:new Set(sheet.items.map(item=>item.cardId)).size}));
const entries=()=>document.querySelectorAll<HTMLButtonElement>("[data-subject-entry]");
const groupingSwitch=(name:"gender"|"plural pattern")=>screen.getByRole("switch",{name:`Group by ${name}`});
const visibleIds=()=>new Set(Array.from(entries(),entry=>entry.getAttribute("data-subject-entry")));
const subjectTags=()=>screen.getByText("Subject tags",{exact:true}).closest("details")!;
const chooseSubjectTags=(ids:string[])=>{
  const panel=subjectTags();
  if(!panel.open)fireEvent.click(panel.querySelector("summary")!);
  for(const subject of studyConcepts){
    const checkbox=within(panel).getByRole("checkbox",{name:subject.label}) as HTMLInputElement;
    if(checkbox.checked!==ids.includes(subject.id))fireEvent.click(checkbox);
  }
};

beforeAll(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");this.dispatchEvent(new Event("close"));}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLElement.prototype,"showPopover",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLElement.prototype,"hidePopover",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();window.history.replaceState(null,"","/");});

describe("subject infographic browsing",()=>{
  it("combines local lesson and source scope through the named chooser and full-card Back without replacing saved scope",()=>{
    const people=sheets.find(sheet=>sheet.id==="people")!;
    const shared={...defaultStudyScope(),mode:"one",lessons:[1],concepts:["food"],source:"course"};
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify(shared));
    window.history.replaceState(null,"","/cheat-sheets/subjects/people?lesson=2,4&source=teacher-extra&view=plurals&gender=0");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:people,allItems:catalogue})));
    const expected=catalogue.filter(item=>matchesStudyScope(item.studyTags,{...defaultStudyScope(),mode:"multiple",lessons:[2,4],concepts:["people"],source:"teacher-extra"}));
    expect(expected.length).toBeGreaterThan(0);
    expect(visibleIds()).toEqual(new Set(expected.map(item=>item.id)));
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(shared);
    const chooser=document.querySelector(".sheet-switcher") as HTMLDetailsElement;
    fireEvent.click(chooser.querySelector("summary")!);
    const navigation=within(chooser).getByRole("navigation",{name:"Choose a study sheet"});
    expect(within(navigation).getAllByRole("link")).toHaveLength(37);
    for(const path of ["/cheat-sheets/vocabulary","/cheat-sheets/subjects/home"]){
      const link=navigation.querySelector(`a[href^="${path}?"]`)!;
      const target=new URL(link.getAttribute("href")!,"https://example.test");
      expect(target.searchParams.get("lesson")).toBe("2,4");
      expect(target.searchParams.get("source")).toBe("teacher-extra");
      expect(target.searchParams.get("view")).toBe("plurals");
    }
    expect(navigation.querySelector('a[href="/cheat-sheets/countries"]')).toBeTruthy();
    const entry=entries()[0]!;
    fireEvent.click(entry);
    const detail=screen.getByRole("article",{name:/^Vocabulary card:/});
    const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    expect(context?.sheetLessonFilter).toEqual([2,4]);
    expect(context?.sheetSource).toBe("teacher-extra");
    const back=new URL(resolveBackHref(context),"https://example.test");
    expect(back.pathname).toBe("/cheat-sheets/subjects/people");
    expect(back.searchParams.get("lesson")).toBe("2,4");
    expect(back.searchParams.get("source")).toBe("teacher-extra");
    expect(back.hash).toBe(`#sheet-card-${entry.dataset.subjectEntry}`);
  });
  it("clears local lesson and source scope independently and omits both fields on reset",()=>{
    const people=sheets.find(sheet=>sheet.id==="people")!;
    window.history.replaceState(null,"","/cheat-sheets/subjects/people?lesson=2,4&source=teacher-extra");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:people,allItems:catalogue})));
    const source=screen.getByRole("combobox",{name:"Filter vocabulary by source"});
    fireEvent.change(source,{target:{value:"all"}});
    expect(new URLSearchParams(window.location.search).get("lesson")).toBe("2,4");
    expect(new URLSearchParams(window.location.search).has("source")).toBe(false);
    fireEvent.change(source,{target:{value:"teacher-extra"}});
    const lessons=screen.getByText("Lessons",{exact:true}).closest("details")!;
    fireEvent.click(lessons.querySelector("summary")!);
    fireEvent.click(within(lessons).getByRole("checkbox",{name:"Lesson 2"}));
    fireEvent.click(within(lessons).getByRole("checkbox",{name:"Lesson 4"}));
    expect(new URLSearchParams(window.location.search).has("lesson")).toBe(false);
    expect(new URLSearchParams(window.location.search).get("source")).toBe("teacher-extra");
    window.history.replaceState(null,"","/cheat-sheets/subjects/people?lesson=2,4&source=teacher-extra");
    fireEvent(window,new PopStateEvent("popstate"));
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    const query=new URLSearchParams(window.location.search);
    expect(query.has("lesson")).toBe(false);
    expect(query.has("source")).toBe(false);
    expect(visibleIds()).toEqual(new Set(catalogue.map(item=>item.id)));
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(defaultStudyScope());
  });
  it("restores a local profession source without changing the shared selection and preserves it through Back and the chooser",()=>{
    const people=sheets.find(sheet=>sheet.id==="people")!;
    const shared={...defaultStudyScope(),concepts:["food"],source:"course"};
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify(shared));
    window.history.replaceState(null,"","/cheat-sheets/subjects/people?source=teacher-extra");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:people,allItems:catalogue})));
    const expected=catalogue.filter(item=>matchesStudyScope(item.studyTags,{...defaultStudyScope(),concepts:["people"],source:"teacher-extra"}));
    expect(expected.length).toBeGreaterThan(0);
    expect(visibleIds()).toEqual(new Set(expected.map(item=>item.id)));
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(shared);
    expect((screen.getByRole("combobox",{name:"Filter vocabulary by source"}) as HTMLSelectElement).value).toBe("teacher-extra");
    const chooser=document.querySelector(".subject-switcher") as HTMLDetailsElement;
    fireEvent.click(chooser.querySelector("summary")!);
    expect(new URL(chooser.querySelector('a[href^="/cheat-sheets/subjects/home?"]')!.getAttribute("href")!,"https://example.test").searchParams.get("source")).toBe("teacher-extra");
    fireEvent.click(entries()[0]!);
    const href=within(screen.getByRole("article",{name:/^Vocabulary card:/})).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    const back=new URL(resolveBackHref(context),"https://example.test");
    expect(back.pathname).toBe("/cheat-sheets/subjects/people");
    expect(back.searchParams.get("source")).toBe("teacher-extra");
    expect(back.hash).toBe(`#sheet-card-${entries()[0]!.getAttribute("data-subject-entry")}`);
  });
  it("drops a local source filter when choosing all sources or resetting the study selection",()=>{
    const people=sheets.find(sheet=>sheet.id==="people")!;
    window.history.replaceState(null,"","/cheat-sheets/subjects/people?source=teacher-extra");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:people,allItems:catalogue})));
    const source=screen.getByRole("combobox",{name:"Filter vocabulary by source"});
    fireEvent.change(source,{target:{value:"all"}});
    expect(new URLSearchParams(window.location.search).has("source")).toBe(false);
    expect(visibleIds()).toEqual(new Set(people.items.map(item=>item.id)));
    fireEvent.change(source,{target:{value:"teacher-extra"}});
    expect(new URLSearchParams(window.location.search).get("source")).toBe("teacher-extra");
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    expect(new URLSearchParams(window.location.search).has("source")).toBe(false);
    expect(visibleIds()).toEqual(new Set(catalogue.map(item=>item.id)));
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(defaultStudyScope());
  });
  it.each([["nur","W351"],["mal","W358"]])("restores the old expressions filter for merged %s",(word,cardId)=>{
    const conversation=sheets.find(sheet=>sheet.id==="conversation")!;
    const oldHref=`/cheat-sheets/subjects/conversation?category=expressions&q=${word}#sheet-card-l4-${word}-0`;
    window.history.replaceState(null,"",oldHref);
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:conversation,allItems:catalogue})));
    expect(visibleIds()).toEqual(new Set([`${cardId}-0`]));
    expect(document.querySelector(`[data-subject-entry="${cardId}-0"]`)?.getAttribute("aria-expanded")).toBe("true");
    expect(window.location.pathname+window.location.search+window.location.hash).toBe(oldHref);
  });
  it.each([false,true])("restores a legacy Lesson 4 row fragment with plural view=%s",async(allNouns)=>{
    const home=sheets.find(sheet=>sheet.id==="home")!;
    const path=allNouns?"/cheat-sheets/plurals":"/cheat-sheets/subjects/home";
    const query=`?q=Bild${allNouns?"&view=plurals&tags=home":""}`;
    window.history.replaceState(null,"",`${path}${query}#sheet-card-l4-bild-0`);
    const scroll=vi.spyOn(HTMLElement.prototype,"scrollIntoView");
    try{
      render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:home,allNouns,allItems:catalogue})));
      expect(visibleIds()).toEqual(new Set(["W464-0"]));
      const detail=screen.getByRole("article",{name:"Vocabulary card: das Bild"});
      const canonical=document.getElementById("sheet-card-W464-0");
      await waitFor(()=>expect(scroll.mock.contexts).toContain(canonical));
      const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
      const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
      expect(resolveBackHref(context)).toBe(`${allNouns?"/cheat-sheets/vocabulary":path}${query}#sheet-card-W464-0`);
      expect(window.location.hash).toBe("#sheet-card-l4-bild-0");
    }finally{scroll.mockRestore();}
  });
  it("resets an explicit lesson filter together with the shared study selection",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"one",lessons:[1],concepts:["food"]}));
    window.history.replaceState(null,"","/cheat-sheets/subjects/objects?lesson=5");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:objects,allItems:catalogue})));
    expect(visibleIds()).toEqual(new Set(objects.items.filter(item=>item.studyTags.lessons.includes(5)).map(item=>item.id)));
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    expect(visibleIds()).toEqual(new Set(catalogue.map(item=>item.id)));
    expect(entries()).toHaveLength(catalogue.length);
    expect(new URLSearchParams(window.location.search).has("lesson")).toBe(false);
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(defaultStudyScope());
  });
  it("opens topic lesson links independently of saved lessons and preserves the filter through full-card Back",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"one",lessons:[1],concepts:["food"]}));
    window.history.replaceState(null,"","/cheat-sheets/subjects/objects?lesson=5");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:objects,allItems:catalogue})));
    const expected=objects.items.filter(item=>item.studyTags.lessons.includes(5));
    expect(expected.length).toBeGreaterThan(0);
    expect(visibleIds()).toEqual(new Set(expected.map(item=>item.id)));
    const entry=entries()[0]!;
    fireEvent.click(entry);
    const detail=screen.getByRole("article",{name:`Vocabulary card: ${expected.find(item=>item.id===entry.dataset.subjectEntry)!.de}`});
    const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    expect(new URL(resolveBackHref(context),"https://example.test").searchParams.get("lesson")).toBe("5");
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!).lessons).toEqual([1]);
    const switcher=screen.getByRole("navigation",{name:"Choose a study sheet"});
    expect(within(switcher).getAllByRole("link")).toHaveLength(37);
    const subjects=within(switcher).getByRole("region",{name:"Vocabulary by subject"});
    expect(within(subjects).getByRole("link",{name:/^Home & furniture/}).getAttribute("href")).toContain("lesson=5");
    expect(within(switcher).getByRole("link",{name:/^All vocabularyCatalogue$/}).getAttribute("href")).toContain("/cheat-sheets/vocabulary?");
    expect(within(switcher).getByRole("link",{name:/^All vocabularyCatalogue$/}).getAttribute("href")).toContain("lesson=5");
    const lessons=screen.getByText("Lessons",{exact:true}).closest("details")!;
    fireEvent.click(lessons.querySelector("summary")!);
    fireEvent.click(within(lessons).getByRole("checkbox",{name:"Lesson 5"}));
    expect(visibleIds()).toEqual(new Set(objects.items.map(item=>item.id)));
    expect([...lessons.querySelectorAll<HTMLInputElement>("input")].every(input=>!input.checked)).toBe(true);
    expect(new URLSearchParams(window.location.search).has("lesson")).toBe(false);
  });
  it("starts with the route subject and switches to every selected tag across the full catalogue",()=>{
    const home=sheets.find(sheet=>sheet.id==="home")!;
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:home,allItems:catalogue})));
    expect(visibleIds()).toEqual(new Set(home.items.map(item=>item.id)));
    chooseSubjectTags(["objects"]);
    expect(objects.items.filter(item=>canonicalCards.has(item.cardId))).toHaveLength(49);
    expect(visibleIds()).toEqual(new Set(objects.items.map(item=>item.id)));
    expect(screen.getByRole("heading",{level:1,name:"Everyday objects"})).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!).concepts).toEqual(["objects"]);
    expect(new URLSearchParams(window.location.search).get("tags")).toBe("objects");
    chooseSubjectTags(["objects","food"]);
    const union=catalogue.filter(item=>item.studyTags.concepts.some(concept=>concept==="objects"||concept==="food"));
    expect(visibleIds()).toEqual(new Set(union.map(item=>item.id)));
    expect(entries()).toHaveLength(union.length);
    expect(screen.getByRole("heading",{level:1,name:"Selected vocabulary"})).toBeTruthy();
    chooseSubjectTags([]);
    expect(visibleIds()).toEqual(new Set(catalogue.map(item=>item.id)));
    expect(entries()).toHaveLength(catalogue.length);
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!).concepts).toEqual([]);
    expect(new URLSearchParams(window.location.search).get("tags")).toBe("");
  });

  it("restores explicit tag, search and grouping state instead of the route tag or saved global tags",()=>{
    const home=sheets.find(sheet=>sheet.id==="home")!;
    const handy=catalogue.find(item=>item.de==="das Handy")!;
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),concepts:["food"]}));
    window.history.replaceState(null,"",`/cheat-sheets/subjects/home?q=Handy&view=plurals&gender=0&tags=objects#sheet-card-${handy.id}`);
    const content=()=>createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:home,allItems:catalogue}));
    render(content());
    expect(visibleIds()).toEqual(new Set([handy.id]));
    expect(screen.getByRole("heading",{level:1,name:"Everyday objects"})).toBeTruthy();
    expect((screen.getByRole("searchbox",{name:"Find a word or form"}) as HTMLInputElement).value).toBe("Handy");
    expect(groupingSwitch("gender").getAttribute("aria-checked")).toBe("false");
    expect(groupingSwitch("plural pattern").getAttribute("aria-checked")).toBe("true");
    const detail=screen.getByRole("article",{name:"Vocabulary card: das Handy"});
    const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    const back=resolveBackHref(context);
    const restored=new URL(back,"https://example.test");
    expect(restored.pathname).toBe("/cheat-sheets/subjects/home");
    expect(Object.fromEntries(restored.searchParams)).toEqual({q:"Handy",view:"plurals",gender:"0",tags:"objects"});
    expect(restored.hash).toBe(`#sheet-card-${handy.id}`);
    cleanup();
    window.history.replaceState(null,"",back);
    render(content());
    expect(visibleIds()).toEqual(new Set([handy.id]));
    const panel=subjectTags();
    fireEvent.click(panel.querySelector("summary")!);
    expect((within(panel).getByRole("checkbox",{name:"Everyday objects"}) as HTMLInputElement).checked).toBe(true);
    expect((within(panel).getByRole("checkbox",{name:"Food, preferences & ordering"}) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole("article",{name:"Vocabulary card: das Handy"})).toBeTruthy();
  });

  it("treats an explicit empty tag query as all vocabulary despite the route and saved tag",()=>{
    const home=sheets.find(sheet=>sheet.id==="home")!;
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),concepts:["food"]}));
    window.history.replaceState(null,"","/cheat-sheets/subjects/home?tags=");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:home,allItems:catalogue})));
    expect(visibleIds()).toEqual(new Set(catalogue.map(item=>item.id)));
    expect(entries()).toHaveLength(catalogue.length);
  });

  it("clears a stale gender group when switching to a different subject",()=>{
    const home=sheets.find(sheet=>sheet.id==="home")!;
    window.history.replaceState(null,"","/cheat-sheets/subjects/home?category=neuter");
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:home,allItems:catalogue})));
    expect(visibleIds()).toEqual(new Set(home.items.filter(item=>item.tone==="neuter").map(item=>item.id)));
    chooseSubjectTags(["verbs"]);
    const verbs=catalogue.filter(item=>item.studyTags.concepts.includes("verbs"));
    expect(visibleIds()).toEqual(new Set(verbs.map(item=>item.id)));
    expect(entries()).toHaveLength(verbs.length);
    expect(new URLSearchParams(window.location.search).has("category")).toBe(false);
  });

  it("retains the whole catalogue, including article-free vocabulary, across all-nouns grouping switches",()=>{
    const plain=catalogue.find(item=>item.tone==="plain"&&item.category==="Verb")!;
    const language=catalogue.find(item=>item.id.startsWith("language-"))!;
    expect(plain).toBeTruthy();
    expect(language).toBeTruthy();
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{allNouns:true,sheet:{id:"objects",label:"All vocabulary",items:catalogue},allItems:catalogue})));
    const expected=new Set(catalogue.map(item=>item.id));
    expect(visibleIds()).toEqual(expected);
    expect(entries()).toHaveLength(catalogue.length);
    expect(Array.from(entries()).find(entry=>entry.getAttribute("data-subject-entry")===plain.id)?.querySelector(".subject-entry-meaning")?.textContent).toBe(plain.meaning);
    expect(Array.from(entries()).find(entry=>entry.getAttribute("data-subject-entry")===language.id)?.textContent).toContain(language.de);
    fireEvent.click(groupingSwitch("plural pattern"));
    expect(visibleIds()).toEqual(expected);
    expect(entries()).toHaveLength(catalogue.length);
    fireEvent.click(groupingSwitch("gender"));
    expect(visibleIds()).toEqual(expected);
    expect(entries()).toHaveLength(catalogue.length);
    expect(document.querySelector('.subject-vocabulary-flat [data-subject-entry="'+plain.id+'"]')).toBeTruthy();
  });

  it("keeps icons and meanings visible and opens one local card with both pronunciation clips",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    const bookItem=objects.items.find(item=>item.de==="das Buch")!;
    const keyItem=objects.items.find(item=>item.de==="der Schlüssel")!;
    const played:string[]=[];
    vi.stubGlobal("Audio",class{
      src:string;playbackRate=1;preservesPitch=true;onpause:(()=>void)|null=null;
      constructor(src:string){this.src=src;}
      play(){played.push(this.src);return Promise.resolve();}
      pause(){this.onpause?.();}
    });
    render(createElement(SubjectInfographic,{allNouns:true,sheet:{...objects,items:[bookItem,keyItem]}}));
    expect(screen.queryByRole("article",{name:/^Vocabulary card:/})).toBeNull();
    const book=screen.getByRole("button",{name:"das Buch · → die Bücher"});
    expect(book.querySelector('[data-subject-visual="object:book"]')).toBeTruthy();
    expect(book.querySelector(".subject-plural-meaning")?.textContent).toBe("book");
    expect(document.querySelector(".subject-plural-pattern-schema svg")).toBeTruthy();
    fireEvent.click(book);
    const card=screen.getByRole("article",{name:"Vocabulary card: das Buch"});
    expect(card.previousElementSibling).toBe(book);
    expect(book.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(within(card).getByRole("button",{name:"Listen: das Buch"}));
    fireEvent.click(within(card).getByRole("button",{name:"Listen: die Bücher"}));
    expect(played).toEqual([bookItem.audio,bookItem.plurals[0]!.audio]);
    expect(within(card).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")).toContain(bookItem.href);
    const key=screen.getByRole("button",{name:"der Schlüssel · → die Schlüssel"});
    fireEvent.click(key);
    expect(screen.queryByRole("article",{name:"Vocabulary card: das Buch"})).toBeNull();
    expect(screen.getAllByRole("article",{name:/^Vocabulary card:/})).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("article",{name:"Vocabulary card: der Schlüssel"}),{key:"Escape"});
    expect(screen.queryByRole("article",{name:/^Vocabulary card:/})).toBeNull();
    expect(document.activeElement).toBe(key);
    fireEvent.click(key);
    fireEvent.keyDown(key,{key:"Escape"});
    expect(screen.queryByRole("article",{name:/^Vocabulary card:/})).toBeNull();
    expect(document.activeElement).toBe(key);
  });

  it("groups the same illustrated words in all four gender and plural combinations without losing their meanings or colours",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    const items=[
      objects.items.find(item=>item.de==="das Buch")!,
      objects.items.find(item=>item.de==="der Schlüssel")!,
      objects.items.find(item=>item.tone==="female")!,
    ];
    const expectedIds=new Set(items.map(item=>item.id));
    render(createElement(SubjectInfographic,{allNouns:true,sheet:{...objects,items}}));
    const checkEntries=(gender:boolean,plural:boolean)=>{
      expect(groupingSwitch("gender").getAttribute("aria-checked")).toBe(String(gender));
      expect(groupingSwitch("plural pattern").getAttribute("aria-checked")).toBe(String(plural));
      expect(new Set(Array.from(entries(),entry=>entry.getAttribute("data-subject-entry")))).toEqual(expectedIds);
      for(const item of items){
        const entry=Array.from(entries()).find(entry=>entry.getAttribute("data-subject-entry")===item.id)!;
        expect(entry.querySelector(".subject-vocabulary-visual")).toBeTruthy();
        expect(entry.querySelector(".subject-entry-meaning, .subject-plural-meaning")?.textContent).toBe(item.meaning);
        if(!gender)expect(entry.classList.contains(`subject-tone-${item.tone}`)||entry.parentElement?.classList.contains(`subject-tone-${item.tone}`)).toBe(true);
      }
      expect(screen.queryByRole("table")!==null).toBe(gender&&plural);
      expect(document.querySelector('[aria-label="Nouns grouped by article"]')!==null).toBe(gender&&!plural);
      if(plural)expect(document.querySelector('[data-plural-pattern="umlaut-er"]')).toBeTruthy();
      else expect(document.querySelector("[data-plural-pattern]")).toBeNull();
    };
    checkEntries(true,true);
    fireEvent.click(groupingSwitch("gender"));
    checkEntries(false,true);
    fireEvent.click(groupingSwitch("plural pattern"));
    checkEntries(false,false);
    fireEvent.click(groupingSwitch("gender"));
    checkEntries(true,false);
    fireEvent.click(groupingSwitch("plural pattern"));
    checkEntries(true,true);
  });

  it("keeps an opened card while changing either grouping and restores both toggles in the full-card return link",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    const book=objects.items.find(item=>item.de==="das Buch")!;
    const key=objects.items.find(item=>item.de==="der Schlüssel")!;
    render(createElement(SubjectInfographic,{allNouns:true,sheet:{...objects,items:[book,key]}}));
    fireEvent.click(screen.getByRole("button",{name:"das Buch · → die Bücher"}));
    fireEvent.click(groupingSwitch("gender"));
    const expectedBack=`/cheat-sheets/vocabulary?view=plurals&gender=0#sheet-card-${book.id}`;
    const href=within(screen.getByRole("article",{name:"Vocabulary card: das Buch"})).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    expect(resolveBackHref(parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav")))).toBe(expectedBack);
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog");
    expect(within(dialog).getByRole("switch",{name:"Group by gender"}).getAttribute("aria-checked")).toBe("false");
    expect(within(dialog).getByRole("article",{name:"Vocabulary card: das Buch"})).toBeTruthy();
    fireEvent.click(groupingSwitch("plural pattern"));
    expect(screen.getAllByRole("article",{name:/^Vocabulary card:/})).toHaveLength(1);
    expect(screen.getByRole("article",{name:"Vocabulary card: das Buch"})).toBeTruthy();
    fireEvent.click(groupingSwitch("gender"));
    expect(screen.getByRole("article",{name:"Vocabulary card: das Buch"})).toBeTruthy();
    fireEvent.click(groupingSwitch("plural pattern"));
    expect(screen.getByRole("article",{name:"Vocabulary card: das Buch"})).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button",{name:"Close overview"}));
    expect(screen.getAllByRole("article",{name:/^Vocabulary card:/})).toHaveLength(1);
    cleanup();
    window.history.replaceState(null,"",expectedBack);
    render(createElement(SubjectInfographic,{allNouns:true,sheet:{...objects,items:[book,key]}}));
    expect(groupingSwitch("gender").getAttribute("aria-checked")).toBe("false");
    expect(groupingSwitch("plural pattern").getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("article",{name:"Vocabulary card: das Buch"})).toBeTruthy();
  });

  it("filters the illustrated plural grid by lesson and tag even inside the expanded overview",()=>{
    const items=[...new Map(sheets.flatMap(sheet=>sheet.items).filter(item=>item.tone!=="plain").map(item=>[item.id,item])).values()];
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{allNouns:true,sheet:{id:"objects",label:"Gender × plural patterns",items}})));
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog",{name:"Gender × plural patterns"});
    const lessons=within(dialog).getByText("Lessons",{exact:true}).closest("details")!;
    fireEvent.click(lessons.querySelector("summary")!);
    fireEvent.click(within(lessons).getByRole("checkbox",{name:"Lesson 5"}));
    const tags=within(dialog).getByText("Subject tags",{exact:true}).closest("details")!;
    fireEvent.click(tags.querySelector("summary")!);
    fireEvent.click(within(tags).getByRole("checkbox",{name:"Everyday objects"}));
    const expected=items.filter(item=>item.studyTags.lessons.includes(5)&&item.studyTags.concepts.includes("objects"));
    expect(entries()).toHaveLength(expected.length);
    expect(new Set(Array.from(entries(),entry=>entry.getAttribute("data-subject-entry")))).toEqual(new Set(expected.map(item=>item.id)));
    for(const entry of entries())expect(entry.querySelector(".subject-vocabulary-visual")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!).concepts).toEqual(["objects"]);
  });
  it("switches to a gender by plural pattern grid with exact ending and umlaut highlights",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    render(createElement(SubjectInfographic,{sheet:objects}));
    fireEvent.click(screen.getByRole("switch",{name:"Group by plural pattern"}));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader",{name:/der.*Masculine singular/})).toBeTruthy();
    const book=screen.getByRole("button",{name:"das Buch · → die Bücher"});
    expect(book.closest("tr")?.getAttribute("data-plural-pattern")).toBe("umlaut-er");
    expect(book.querySelector(".subject-plural-umlaut")?.textContent).toBe("ü");
    expect(book.querySelector(".subject-plural-ending")?.textContent).toBe("er");
    const key=screen.getByRole("button",{name:"der Schlüssel · → die Schlüssel"});
    expect(key.closest("tr")?.getAttribute("data-plural-pattern")).toBe("unchanged");
    expect(key.querySelector("mark")).toBeNull();
    fireEvent.click(book);
    expect(screen.getByRole("article",{name:/^Vocabulary card:/}).textContent).toContain("die Bücher");
    expect(new URLSearchParams(window.location.search).get("view")).toBe("plurals");
  });

  it("restores the plural view and exact word through expansion and full-card return context",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    const book=objects.items.find(item=>item.de==="das Buch")!;
    window.history.replaceState(null,"",`/cheat-sheets/subjects/objects?q=Buecher&view=plurals#sheet-card-${book.id}`);
    render(createElement(SubjectInfographic,{sheet:objects}));
    expect(entries()).toHaveLength(1);
    expect(screen.getByRole("switch",{name:"Group by plural pattern"}).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog",{name:"Gender × plural patterns"});
    expect(entries()).toHaveLength(1);
    expect(document.querySelectorAll(`[id="sheet-card-${book.id}"]`)).toHaveLength(1);
    const detail=within(dialog).getByRole("article",{name:/^Vocabulary card:/});
    const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    expect(resolveBackHref(context)).toBe(`/cheat-sheets/subjects/objects?q=Buecher&view=plurals#sheet-card-${book.id}`);
    fireEvent.click(within(dialog).getByRole("button",{name:"Close overview"}));
    fireEvent.click(screen.getByRole("switch",{name:"Group by plural pattern"}));
    expect(screen.queryByRole("table")).toBeNull();
    expect(entries()).toHaveLength(1);
  });

  it("defaults the all-nouns reference to plural patterns while retaining each variant and missing form honestly",()=>{
    const all=[...new Map(sheets.flatMap(sheet=>sheet.items).map(item=>[item.id,item])).values()];
    const items=all.filter(item=>["das Taxi","die Eltern","der Regen","der Ketchup","das Ketchup"].includes(item.de));
    render(createElement(SubjectInfographic,{allNouns:true,sheet:{id:"objects",label:"Gender × plural patterns",items}}));
    expect(screen.getByRole("table")).toBeTruthy();
    const taxis=screen.getByRole("button",{name:/^das Taxi · → die Taxis/});
    const taxen=screen.getByRole("button",{name:/^das Taxi · → die Taxen/});
    expect(taxis.closest("tr")?.getAttribute("data-plural-pattern")).toBe("s");
    expect(taxen.closest("tr")?.getAttribute("data-plural-pattern")).toBe("other");
    expect(taxis.id).toBeTruthy();
    expect(taxen.id).toBe("");
    for(const entry of entries()){expect(entry.querySelector(".subject-vocabulary-visual")).toBeTruthy();expect(entry.querySelector(".subject-plural-meaning")?.textContent).toBeTruthy();}
    expect(document.querySelector(".subject-plural-missing")?.textContent).toContain("der Regen");
    expect(document.querySelector(".subject-plural-existing")?.textContent).toContain("die Eltern");
    const ketchup=screen.getByRole("button",{name:/^das Ketchup · No plural taught here/});
    fireEvent.click(ketchup);
    const href=within(screen.getByRole("article",{name:/^Vocabulary card:/})).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    expect(resolveBackHref(parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav")))).toBe("/cheat-sheets/vocabulary?view=plurals#sheet-card-l9-ketchup-1");
  });

  it("explains a noun-free subject and keeps its real non-noun vocabulary available",()=>{
    render(createElement(SubjectInfographic,{sheet:sheets.find(sheet=>sheet.id==="verbs")!}));
    fireEvent.click(screen.getByRole("switch",{name:"Group by plural pattern"}));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/This selection has no singular nouns/)).toBeTruthy();
    expect(screen.getByRole("link",{name:"Open the full vocabulary cheat sheet →"}).getAttribute("href")).toBe("/cheat-sheets/vocabulary?tags=");
    expect(entries().length).toBeGreaterThan(100);
  });
  it("keeps all subjects discoverable and links every subject tag to its exact infographic",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"multiple",lessons:[]}));
    render(createElement(StudyScopeProvider,null,createElement(SubjectDirectory,{subjects:directory})));
    expect(document.querySelectorAll("[data-subject-tile]")).toHaveLength(studyConcepts.length);
    fireEvent.change(screen.getByRole("searchbox",{name:"Find a subject"}),{target:{value:"food"}});
    expect(document.querySelectorAll("[data-subject-tile]")).toHaveLength(1);
    expect(screen.getByRole("link",{name:/Food, preferences & ordering/}).getAttribute("href")).toBe("/cheat-sheets/subjects/food");
    cleanup();
    render(createElement(StudyTagList,{tags:{lessons:[1],concepts:studyConcepts.map(subject=>subject.id),source:"course"}}));
    for(const subject of studyConcepts)expect(screen.getByRole("link",{name:subject.label}).getAttribute("href")).toBe(`/cheat-sheets/subjects/${subject.id}`);
  });

  it("expands the same entries once and preserves both real articles on a shared card",()=>{
    render(createElement(StudyProvider,{dictionary:[],children:createElement(SubjectInfographic,{sheet:food})}));
    fireEvent.change(screen.getByRole("searchbox",{name:"Find a word or form"}),{target:{value:"Ketchup"}});
    expect(entries()).toHaveLength(2);
    const male=Array.from(entries()).find(entry=>entry.querySelector("strong")?.textContent==="der Ketchup")!;
    const neuter=Array.from(entries()).find(entry=>entry.querySelector("strong")?.textContent==="das Ketchup")!;
    expect(male.closest("section")?.className).toContain("subject-tone-male");
    expect(neuter.closest("section")?.className).toContain("subject-tone-neuter");
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog",{name:"2 vocabulary entries"});
    expect(entries()).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole("button",{name:"das Ketchup"}));
    const detail=screen.getByRole("article",{name:/^Vocabulary card:/});
    expect(detail.textContent).toContain("Both articles are accepted");
    fireEvent.click(within(detail).getByRole("button",{name:/Save to review:/}));
    const saved=JSON.parse(localStorage.getItem(STUDY_KEY)!);
    expect(Object.keys(saved.saved)).toEqual(["card-l9-ketchup"]);
    const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const nav=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    expect(resolveBackHref(nav)).toBe("/cheat-sheets/subjects/food?q=Ketchup#sheet-card-l9-ketchup-1");
    fireEvent.click(within(dialog).getByRole("button",{name:"Close overview"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(entries()).toHaveLength(2);
  });

  it("finds an umlaut plural with its transliteration and keeps source audio on the selected word",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    const book=objects.items.find(item=>item.de==="das Buch")!;
    render(createElement(SubjectInfographic,{sheet:objects}));
    fireEvent.change(screen.getByRole("searchbox",{name:"Find a word or form"}),{target:{value:"Buecher"}});
    expect(entries()).toHaveLength(1);
    expect(entries()[0]?.textContent).toContain("die Bücher");
    fireEvent.click(entries()[0]!);
    const detail=screen.getByRole("article",{name:/^Vocabulary card:/});
    expect(detail.querySelector('button[aria-label="Listen: das Buch"]')).toBeTruthy();
    expect(book.audio).toBeTruthy();
    expect(within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")).toContain(book.href);
  });

  it("finds the same nouns with German umlauts, their transliterations or base vowels",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    render(createElement(SubjectInfographic,{sheet:objects}));
    const search=screen.getByRole("searchbox",{name:"Find a word or form"});
    for(const queries of [["Bücher","Buecher","Bucher"],["Schlüssel","Schluessel","Schlussel"]]){
      fireEvent.change(search,{target:{value:queries[0]}});
      const expected=visibleIds();
      expect(expected.size).toBeGreaterThan(0);
      for(const query of queries.slice(1)){
        fireEvent.change(search,{target:{value:query}});
        expect(visibleIds()).toEqual(expected);
      }
    }
  });

  it("restores the exact row and filters when returning from a full card",()=>{
    window.history.replaceState(null,"","/cheat-sheets/subjects/food?q=Ketchup&category=neuter#sheet-card-l9-ketchup-1");
    render(createElement(SubjectInfographic,{sheet:food}));
    expect(entries()).toHaveLength(1);
    expect(entries()[0]?.getAttribute("data-subject-entry")).toBe("l9-ketchup-1");
    expect(entries()[0]?.getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("searchbox",{name:"Find a word or form"}) as HTMLInputElement).value).toBe("Ketchup");
    expect(screen.getByRole("button",{name:/^Neuter /}).getAttribute("aria-pressed")).toBe("true");
  });

  it("groups verbs without articles and can recover from an empty global selection",()=>{
    const verbs=sheets.find(sheet=>sheet.id==="verbs")!;
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"multiple",lessons:[]}));
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:verbs})));
    expect(entries()).toHaveLength(0);
    expect(screen.getByRole("heading",{name:"No matching vocabulary"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Reset study selection"}));
    expect(entries()).toHaveLength(verbs.items.length);
    expect(document.querySelector('[aria-label="Nouns grouped by article"]')).toBeNull();
    expect(screen.getByRole("heading",{name:/Verbs & actions/})).toBeTruthy();
  });
});

describe("shared sheet frame and directory",()=>{
  it("finds every named vocabulary and workshop destination without numbering",()=>{
    render(createElement(CheatSheetFrame,{current:"countries",eyebrow:"Your language passport",title:"Countries",lead:"Country examples",children:createElement("p",{id:"country-index"},"Existing country content")}));
    const chooser=document.querySelector(".sheet-switcher") as HTMLDetailsElement;
    fireEvent.click(chooser.querySelector("summary")!);
    const navigation=within(chooser).getByRole("navigation",{name:"Choose a study sheet"});
    const links=within(navigation).getAllByRole("link");
    expect(links).toHaveLength(37);
    expect(new Set(links.map(link=>link.getAttribute("href"))).size).toBe(37);
    expect(sheetDestinations.filter(destination=>destination.kind==="subject")).toHaveLength(studyConcepts.length);
    expect(chooser.textContent).not.toContain("01 / 15");
    fireEvent.change(within(chooser).getByRole("searchbox",{name:"Find a study sheet"}),{target:{value:"furniture"}});
    expect(within(navigation).getAllByRole("link")).toHaveLength(2);
    const workshop=navigation.querySelector('section[aria-label="Topic workshops"]')!;
    expect(within(workshop as HTMLElement).getByRole("link").getAttribute("href")).toBe("/cheat-sheets/home");
    fireEvent.change(within(chooser).getByRole("searchbox"),{target:{value:"no-such-study-area"}});
    expect(within(navigation).queryAllByRole("link")).toHaveLength(0);
    expect(within(chooser).getByText(/No matching study sheet/)).toBeTruthy();
    fireEvent.keyDown(chooser,{key:"Escape"});
    expect(chooser.open).toBe(false);
    expect(document.activeElement).toBe(chooser.querySelector("summary"));
  });

  it("retains vocabulary layout choices when moving between named subject sheets",()=>{
    render(createElement(CheatSheetFrame,{current:"vocabulary",eyebrow:"Vocabulary",title:"All vocabulary",lead:"All words",browse:{...initialSheetBrowse,view:"plurals",gender:false,subjects:true,lessons:true,sort:"meaning",direction:"desc",groupOrder:["subject","lesson","gender","plural"]},children:createElement("p",null,"Words")}));
    const chooser=document.querySelector(".sheet-switcher") as HTMLDetailsElement;
    fireEvent.click(chooser.querySelector("summary")!);
    const subject=chooser.querySelector('a[href^="/cheat-sheets/subjects/home?"]')!;
    const target=new URL(subject.getAttribute("href")!,"https://example.test");
    expect(Object.fromEntries(target.searchParams)).toMatchObject({view:"plurals",gender:"0",subjects:"1",lessons:"1",sort:"meaning",direction:"desc",order:"subject,lesson,gender,plural"});
    expect(chooser.querySelector('a[href="/cheat-sheets/home"]')).toBeTruthy();
  });

  it("keeps the existing content and requests printing from the common action row",()=>{
    const print=vi.spyOn(window,"print").mockImplementation(()=>{});
    render(createElement(CheatSheetFrame,{current:"home",eyebrow:"Home",title:"A home for every word",lead:"Explore the room",className:"home-sheet",children:createElement("section",{id:"home-index"},"Existing word list")}));
    expect(screen.getAllByRole("heading",{level:1})).toHaveLength(1);
    expect(document.querySelector(".home-sheet #home-index")?.textContent).toBe("Existing word list");
    fireEvent.click(screen.getByRole("button",{name:"Print / save as PDF"}));
    expect(print).toHaveBeenCalledOnce();
  });

  it("offers the full catalogue, every subject and every workshop from the directory",()=>{
    const subjects=studyConcepts.map(subject=>({...subject,count:4,families:3}));
    render(createElement(SubjectDirectory,{subjects,workshops:true}));
    expect(document.querySelectorAll("[data-catalogue-tile]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-subject-tile]")).toHaveLength(21);
    expect(document.querySelectorAll("[data-workshop-tile]")).toHaveLength(15);
    expect(document.querySelector("#subjects")).toBeTruthy();
    expect(document.querySelector('[data-workshop-tile="countries"]')?.getAttribute("href")).toBe("/cheat-sheets/countries");
    expect(document.querySelector('[data-catalogue-tile]')?.getAttribute("href")).toBe("/cheat-sheets/vocabulary");
    fireEvent.change(screen.getByRole("searchbox",{name:"Find a study sheet"}),{target:{value:"furniture"}});
    expect(document.querySelectorAll("[data-subject-tile]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-workshop-tile]")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox"),{target:{value:"no-such-study-area"}});
    fireEvent.click(screen.getByRole("button",{name:"Clear search"}));
    expect(document.querySelectorAll("[data-subject-tile]")).toHaveLength(21);
  });
});
