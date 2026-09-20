// @vitest-environment jsdom
import {createElement} from "react";
import {readFileSync} from "node:fs";
import {afterEach,beforeAll,describe,expect,it} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {studyUnits} from "../../apps/web/lib/study/course-lessons";
import {coursePatternEntries,coursePatternText} from "../../apps/web/lib/study/course-patterns";
import {loadWordCards,withWordCardHub,withWordCardSearch} from "../../apps/web/lib/content/word-cards";
import {parseHubSearchParams} from "../../apps/web/lib/content/hub-query";
import {buildHubNavigationContext,buildSearchNavigationContext,parseNavigationContextParam,serializeNavigationContext,resolveBackHref} from "../../apps/web/lib/content/navigation-context";
import type {LearnerHubProjection} from "../../apps/web/lib/content/hub-types";
import type {LearnerSearchProjection} from "../../apps/web/lib/content/search-types";
import {HubListView} from "../../apps/web/components/hubs/HubViews";
import {SearchView} from "../../apps/web/components/search/SearchViews";
import {CourseStudy} from "../../apps/web/components/study/CourseStudy";
import {LessonFour} from "../../apps/web/components/study/LessonFour";
import {CoursePractice} from "../../apps/web/components/study/CoursePractice";
import {StudyProvider} from "../../apps/web/components/study/StudyProvider";
import {StudyScopeProvider} from "../../apps/web/components/study/StudyScope";
import {STUDY_SCOPE_KEY,tagsForLesson} from "../../apps/web/lib/study/scope";
import {searchLearnerContent} from "../../apps/web/lib/content/search-query";

const hubs=JSON.parse(readFileSync("apps/web/generated/learner-hubs.json","utf8")) as LearnerHubProjection;
const search=withWordCardSearch(JSON.parse(readFileSync("apps/web/generated/learner-search.json","utf8")) as LearnerSearchProjection);
// jsdom has no native dialog/popover lifecycle; browser tests exercise those APIs.
beforeAll(()=>{
  Object.defineProperty(HTMLElement.prototype,"hidePopover",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();localStorage.clear();});

describe("bounded course libraries and return context",()=>{
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
    expect(resolveBackHref(restored,"hub")).toBe("/vocabulary?q=der&lesson=12&category=noun&page=3");
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
    expect(resolveBackHref(context,"hub")).toBe("/vocabulary?page=2");
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
    const href=screen.getByRole("link",{name:"Open the lesson checkpoint →"}).getAttribute("href")!;
    expect(href).toMatch(/^\/lessons\/12\?nav=.*#practice$/);
    expect(resolveBackHref(parseNavigationContextParam(new URL(href,"https://test.local").searchParams.get("nav")),"hub")).toBe("/concepts?lesson=12");
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
