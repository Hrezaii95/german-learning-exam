// @vitest-environment jsdom
import {createElement} from "react";
import {readFileSync} from "node:fs";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {studyUnits} from "../../apps/web/lib/study/course-lessons";
import {coursePatternEntries,coursePatternText} from "../../apps/web/lib/study/course-patterns";
import {loadWordCards,withWordCardHub,withWordCardSearch} from "../../apps/web/lib/content/word-cards";
import {loadDictionary} from "../../apps/web/lib/study/catalog";
import {parseHubSearchParams} from "../../apps/web/lib/content/hub-query";
import {buildHubNavigationContext,buildSearchNavigationContext,parseNavigationContextParam,serializeNavigationContext,resolveBackHref} from "../../apps/web/lib/content/navigation-context";
import type {LearnerHubProjection} from "../../apps/web/lib/content/hub-types";
import type {LearnerSearchProjection} from "../../apps/web/lib/content/search-types";
import {HubListView} from "../../apps/web/components/hubs/HubViews";
import {SearchView} from "../../apps/web/components/search/SearchViews";
import {CourseStudy} from "../../apps/web/components/study/CourseStudy";
import {LessonFour,NewChapterCards} from "../../apps/web/components/study/LessonFour";
import {CollectionCheatSheet} from "../../apps/web/components/study/CollectionCheatSheet";
import {CoursePractice} from "../../apps/web/components/study/CoursePractice";
import {DictionaryLauncher,StudyProvider} from "../../apps/web/components/study/StudyProvider";
import {WordFamilyCard} from "../../apps/web/components/word-cards/WordFamilyCard";
import {StudyScopeProvider} from "../../apps/web/components/study/StudyScope";
import {STUDY_SCOPE_KEY,tagsForLesson} from "../../apps/web/lib/study/scope";
import {searchLearnerContent} from "../../apps/web/lib/content/search-query";
import {sheetNavigationContext} from "../../apps/web/lib/study/sheet-browse";
import {emptyStudy,STUDY_KEY} from "../../apps/web/lib/study/storage";

const hubs=JSON.parse(readFileSync("apps/web/generated/learner-hubs.json","utf8")) as LearnerHubProjection;
const search=withWordCardSearch(JSON.parse(readFileSync("apps/web/generated/learner-search.json","utf8")) as LearnerSearchProjection);
// jsdom has no native dialog/popover lifecycle; browser tests exercise those APIs.
beforeAll(()=>{
  Object.defineProperty(HTMLElement.prototype,"hidePopover",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();localStorage.clear();});

describe("bounded course libraries and return context",()=>{
  it.each(["lesson","lookup","practice","full"] as const)("shares canonical and legacy Lesson 4 saves in the %s view",view=>{
    const card=loadWordCards().cards.find(card=>card.id==="W343")!;
    const dictionary=loadDictionary().filter(entry=>entry.id==="W343");
    for(const savedId of ["card-W343","card-l4-million"]){
      localStorage.setItem(STUDY_KEY,JSON.stringify({...emptyStudy(),saved:{[savedId]:{id:savedId,title:"die Million",meaning:"million",kind:"word",href:savedId==="card-W343"?"/vocabulary/w343":"/vocabulary/l4-million"}}}));
      const content=view==="lesson"?createElement(LessonFour,{speech:{}}):view==="lookup"?createElement(DictionaryLauncher):view==="practice"?createElement(CoursePractice):createElement(WordFamilyCard,{card});
      render(createElement(StudyProvider,{dictionary,children:content}));
      if(view==="lesson")fireEvent.change(screen.getByPlaceholderText("German or English…"),{target:{value:"Million"}});
      if(view==="lookup"){
        fireEvent.click(screen.getByRole("button",{name:"Open dictionary"}));
        fireEvent.change(screen.getByRole("textbox",{name:"German or English"}),{target:{value:"Million"}});
      }
      if(view==="practice")fireEvent.click(screen.getByRole("button",{name:"Reveal German"}));
      const save=document.querySelector<HTMLButtonElement>(view==="lesson"?".lesson-word .study-save":view==="lookup"?".study-dictionary-results .study-save":view==="practice"?".study-recall .study-save":".study-save")!;
      expect(save?.getAttribute("aria-label"),`${view}: ${savedId}`).toBe("Remove from review: die Million");
      fireEvent.click(save);
      expect(JSON.parse(localStorage.getItem(STUDY_KEY)!).saved).toEqual({});
      fireEvent.click(save);
      expect(Object.keys(JSON.parse(localStorage.getItem(STUDY_KEY)!).saved),`${view}: ${savedId}`).toEqual(["card-W343"]);
      cleanup();
    }
  });
  it.each([["l4-million",false],["W343",false],["l4-million",true],["W343",true]] as const)("returns to the merged collection card through %s with saved=%s",async(fragmentId,saved)=>{
    const previousHref=window.location.href;
    const scroll=vi.spyOn(HTMLElement.prototype,"scrollIntoView");
    try{
      const context=sheetNavigationContext("/cheat-sheets/numbers",{query:"Million",category:"all",saved,page:1},fragmentId);
      window.history.replaceState(null,"",resolveBackHref(context));
      const savedId=`card-${fragmentId}`;
      localStorage.setItem(STUDY_KEY,JSON.stringify({...emptyStudy(),saved:{[savedId]:{id:savedId,title:"die Million",meaning:"million",kind:"word",href:fragmentId==="W343"?"/vocabulary/w343":"/vocabulary/l4-million"}}}));
      render(createElement(StudyProvider,{dictionary:[],children:createElement(CollectionCheatSheet,{sheet:"numbers",cards:loadWordCards().cards.filter(card=>card.id==="W343"),speech:{}})}));
      const target=document.getElementById(`sheet-card-${fragmentId}`);
      expect(target).not.toBeNull();
      expect(target?.closest("[data-sheet-card]")?.id).toBe("sheet-card-W343");
      await waitFor(()=>expect(scroll.mock.contexts).toContain(target));
      const detail=screen.getByRole("link",{name:"Full card"}).getAttribute("href")!;
      const nextContext=parseNavigationContextParam(new URL(detail,"https://test.local").searchParams.get("nav"));
      expect(resolveBackHref(nextContext)).toBe(`/cheat-sheets/numbers?q=Million${saved?"&saved=1":""}#sheet-card-W343`);
      expect(window.location.hash).toBe(`#sheet-card-${fragmentId}`);
      const save=target!.closest("[data-sheet-card]")!.querySelector<HTMLButtonElement>(".study-save")!;
      expect(save.getAttribute("aria-label")).toBe("Remove from review: die Million");
      fireEvent.click(save);
      expect(JSON.parse(localStorage.getItem(STUDY_KEY)!).saved).toEqual({});
    }finally{
      scroll.mockRestore();
      window.history.replaceState(null,"",previousHref);
    }
  });
  it("links every chapter card to its two-digit lesson route",()=>{
    render(createElement(NewChapterCards));
    expect([...document.querySelectorAll(".study-chapter-cards a")].map(link=>link.getAttribute("href"))).toEqual([
      "/lessons/03","/lessons/04","/lessons/05","/lessons/06","/lessons/07",
      "/lessons/08","/lessons/09","/lessons/10","/lessons/11","/lessons/12",
    ]);
  });
  it("indexes every later grammar, verb and phrase with its actual lesson and useful meaning",()=>{
    expect(new Set(search.documents.map(doc=>doc.id)).size).toBe(search.documentCount);
    for(const section of ["grammar","verbs","phrases"])for(const entry of coursePatternEntries(studyUnits,section)) {
      const doc=search.documentsById[`course:${entry.key}`]!;
      expect(doc.lessonIds).toContain(`lesson:${String(entry.lesson).padStart(2,"0")}`);
      expect(doc.fields.find(field=>field.field==="meaning")?.displayText).toBeTruthy();
      expect(doc.studyTags?.lessons).toContain(entry.lesson);
      expect(doc.canonicalHref).toBe(`/lessons/${String(entry.lesson).padStart(2,"0")}`);
    }
    expect(coursePatternEntries(studyUnits,"vocabulary")).toEqual([]);
  });
  it("searches learner examples, not internal keys, without changing save identities",()=>{
    const entries=coursePatternEntries(studyUnits,"grammar");
    const target=entries.find(entry=>entry.lesson===12)!;
    expect(coursePatternEntries(studyUnits,"grammar",coursePatternText(target))).toContainEqual(target);
    expect(coursePatternEntries(studyUnits,"grammar",target.key)).toEqual([]);
  });
  it("preserves page, lesson, query and category through a detail visit; rejects malformed page values",()=>{
    const context=buildHubNavigationContext({hubId:"vocabulary",q:"der",lesson:"12",category:"noun",page:3});
    const restored=parseNavigationContextParam(serializeNavigationContext(context));
    expect(resolveBackHref(restored,"hub")).toBe("/cheat-sheets/vocabulary?q=der&lesson=12&category=noun&page=3");
    expect(resolveBackHref(buildSearchNavigationContext("heiß", "course:l12-phrase-0",2),"search")).toBe("/search?q=hei%C3%9F&page=2#search-result-course%3Al12-phrase-0");
    for(const page of ["-1","0","2.5","Infinity","9999","junk"])expect(parseHubSearchParams({page},[]).page).toBeUndefined();
  });
  it("bounds vocabulary and preserves page context on every result",()=>{
    const hub=withWordCardHub(hubs.hubsById.vocabulary);
    render(createElement(HubListView,{hub,searchParams:{page:"2"}}));
    expect(document.querySelectorAll("[data-word-family]")).toHaveLength(12);
    expect(screen.getByRole("status").textContent).toContain(`Showing 13–24 of ${hub.items.length}`);
    const detail=screen.getAllByRole("link",{name:"Study this word family"})[0]!;
    const context=parseNavigationContextParam(new URL(detail.getAttribute("href")!,"https://test.local").searchParams.get("nav"));
    expect(resolveBackHref(context,"hub")).toBe("/cheat-sheets/vocabulary?page=2");
  });
  it("shows later patterns as compact results with exact counts and reachable expansion",()=>{
    const entries=coursePatternEntries(studyUnits,"verbs").filter(entry=>entry.lesson===12);
    render(createElement(HubListView,{hub:hubs.hubsById.verbs,units:studyUnits,speech:{},searchParams:{lesson:"12"}}));
    expect(document.querySelectorAll("[data-course-pattern]")).toHaveLength(Math.min(12,entries.length));
    expect(screen.getByRole("status").textContent).toContain(`of ${entries.length}`);
    expect(document.querySelectorAll(".verb-person-grid")).toHaveLength(0);
    const details=document.querySelector("[data-course-pattern] details") as HTMLDetailsElement;
    details.open=true;
    fireEvent(details,new Event("toggle"));
    expect(document.querySelectorAll(".verb-person-grid").length).toBeGreaterThan(0);
  });
  it("offers Lesson 12 grammar relationships without an empty duplicate catalog",()=>{
    render(createElement(HubListView,{hub:hubs.hubsById.concepts,units:studyUnits,speech:{},searchParams:{lesson:"12"}}));
    expect(screen.getByRole("heading",{name:"From a rule to a sentence"})).toBeTruthy();
    expect(screen.queryByRole("heading",{name:"Connected learning paths"})).toBeNull();
    const href=screen.getByRole("link",{name:"Open the lesson checkpoint"}).getAttribute("href")!;
    expect(href).toMatch(/^\/lessons\/12\?nav=.*#practice$/);
    expect(resolveBackHref(parseNavigationContextParam(new URL(href,"https://test.local").searchParams.get("nav")),"hub")).toBe("/grammar?lesson=12");
  });
  it("search exposes later-lesson meaning and a returnable link to the correct section",()=>{
    const unit=studyUnits.find(unit=>unit.number===12)!;
    const phrase=unit.phrases[0]!;
    render(createElement(SearchView,{projection:search,searchParams:{q:phrase.de}}));
    const result=document.getElementById("search-result-course:l12-phrase-0")!;
    expect(result.textContent).toContain(phrase.en);
    expect(result.querySelector("a")?.getAttribute("href")).toMatch(/^\/lessons\/12\?nav=.*#phrases$/);
  });
  it("shows the matched German form instead of a concatenated index and identifies authored study aids",()=>{
    render(createElement(SearchView,{projection:search,searchParams:{q:"gefahren"}}));
    const result=document.getElementById("search-result-course:l12-verb-fahren")!;
    expect(result.querySelector(".search-match-context")?.textContent).toBe("Matched text: ist gefahren");
    expect(result.textContent).toContain("Lesson study aid");
  });
  it("offers consistent paths and progressively reveals every lesson word",()=>{
    const unit=studyUnits.find(unit=>unit.number===12)!;
    const cards=loadWordCards().cards.filter(card=>card.lessons.includes("12"));
    render(createElement(CourseStudy,{unit,cards,speech:{}}));
    expect(screen.getByRole("region",{name:"Lesson 12 learning path"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Words"}));
    expect(document.querySelectorAll("[data-word-family]")).toHaveLength(Math.min(cards.length,12));
    while(screen.queryByRole("button",{name:"Show more words"}))fireEvent.click(screen.getByRole("button",{name:"Show more words"}));
    expect(document.querySelectorAll("[data-word-family]")).toHaveLength(cards.length);
    cleanup();
    render(createElement(LessonFour,{speech:{}}));
    expect(screen.getByRole("region",{name:"Lesson 4 learning path"})).toBeTruthy();
    expect(document.querySelectorAll(".lesson-word")).toHaveLength(12);
    fireEvent.change(screen.getByPlaceholderText("German or English…"),{target:{value:"Lampe"}});
    expect(document.querySelectorAll(".lesson-word")).toHaveLength(1);
  });
  it("filters all search matches before paging instead of dropping later lessons after fifty hits",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({mode:"one",lessons:[12],concepts:[],source:"all"}));
    const expected=searchLearnerContent(search,"e",{limit:search.documentCount}).filter(hit=>search.documentsById[hit.id]?.studyTags?.lessons.includes(12));
    expect(expected.length).toBeGreaterThan(20);
    render(createElement(StudyScopeProvider,{children:createElement(SearchView,{projection:search,searchParams:{q:"e",page:"2"}})}));
    expect(screen.getByRole("heading",{name:`Results (${expected.length})`})).toBeTruthy();
    expect(document.querySelectorAll(".search-learning-result")).toHaveLength(Math.min(20,expected.length-20));
    for(const result of document.querySelectorAll(".search-learning-result"))expect(result.textContent).toContain("Lesson 12");
  });
  it("keeps revealed recall unscored and checks an article only once before completion",()=>{
    const dictionary=[{id:"lamp",de:"die Lampe",en:"lamp",forms:["Lampe"],example:"",translation:"",href:"/vocabulary/w001",audio:null,kind:"word" as const,studyTags:tagsForLesson(4)}];
    render(createElement(StudyProvider,{dictionary,children:createElement(CoursePractice)}));
    fireEvent.click(screen.getByRole("button",{name:"Reveal German"}));
    expect(screen.getByText("Answer revealed · compare with what you said")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"See my result"}));
    expect(screen.getByText(/This is recall practice, not a checked score/)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox",{name:"Practice mode"}),{target:{value:"article"}});
    fireEvent.click(screen.getByRole("button",{name:"der"}));
    expect(screen.getByText("The article is die.")).toBeTruthy();
    expect((screen.getByRole("button",{name:"die"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"See my result"}));
    expect(screen.getByText("0 of 1 answers correct.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Practise again"}));
    fireEvent.click(screen.getByRole("button",{name:"die"}));
    fireEvent.click(screen.getByRole("button",{name:"See my result"}));
    expect(screen.getByText("1 of 1 answers correct.")).toBeTruthy();
  });
});
