// @vitest-environment jsdom
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {afterEach,beforeAll,describe,expect,it} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {SubjectInfographic} from "../../apps/web/components/study/SubjectInfographic";
import {loadSubjectSheets} from "../../apps/web/lib/study/subject-sheets.server";
import {TopicVocabularyLink,TopicWordPractice} from "../../apps/web/components/study/TopicVocabularyLink";
import {StudyScopeProvider} from "../../apps/web/components/study/StudyScope";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {defaultStudyScope,STUDY_SCOPE_KEY} from "../../apps/web/lib/study/scope";
import {studyUnits} from "../../apps/web/lib/study/course-lessons";
import {HomeCheatSheet} from "../../apps/web/components/study/HomeCheatSheet";
import {ObjectCheatSheet} from "../../apps/web/components/study/ObjectCheatSheet";
import {OfficeCheatSheet} from "../../apps/web/components/study/OfficeCheatSheet";
import {HobbiesCheatSheet} from "../../apps/web/components/study/HobbiesCheatSheet";
import {TimeCheatSheet} from "../../apps/web/components/study/TimeCheatSheet";
import {FoodCheatSheet} from "../../apps/web/components/study/FoodCheatSheet";
import {TravelCheatSheet} from "../../apps/web/components/study/TravelCheatSheet";
import {PastCheatSheet} from "../../apps/web/components/study/PastCheatSheet";
import {JourneyCheatSheet} from "../../apps/web/components/study/JourneyCheatSheet";

const cards=loadWordCards().cards.filter(card=>card.studyTags?.lessons.includes(5));
const objectSheet=loadSubjectSheets().find(sheet=>sheet.id==="objects")!;
const entries=()=>document.querySelectorAll("[data-subject-entry]");
beforeAll(()=>{
  // jsdom does not implement the native dialog lifecycle or scrolling.
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");this.dispatchEvent(new Event("close"));}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState({},"","/");});

describe("everyday objects overview interaction",()=>{
  it("uses the shared illustrated catalogue in the expanded overview with the exact plural and full-card target",()=>{
    render(createElement(SubjectInfographic,{sheet:objectSheet}));
    const count=entries().length;
    expect(count).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog");
    expect(entries()).toHaveLength(count);
    const item=objectSheet.items.find(item=>item.de==="der Schlüssel")!;
    fireEvent.click(within(dialog).getByRole("button",{name:/^der Schlüssel/}));
    const detail=within(dialog).getByRole("article",{name:"Vocabulary card: der Schlüssel"});
    expect(detail.textContent).toContain("die Schlüssel");
    const link=within(detail).getByRole("link",{name:"Full vocabulary card"});
    expect(link.getAttribute("href")).toContain(item.href);
    fireEvent.click(within(dialog).getByRole("button",{name:"Close overview"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(entries()).toHaveLength(count);
  });
  it("shows the shared catalogue empty state when the study selection has no lessons",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"multiple",lessons:[]}));
    render(createElement(StudyScopeProvider,null,createElement(SubjectInfographic,{sheet:objectSheet})));
    expect(entries()).toHaveLength(0);
    expect(screen.getByRole("heading",{name:"No matching vocabulary"})).toBeTruthy();
  });
  it("opens a saved word from the subject sheet without replacing its workshop context",()=>{
    const card=cards.find(card=>card.rows[0]?.singular.text==="der Schlüssel")!;
    const aliased={...card,aliases:[...card.aliases,"/vocabulary/old-key"]};
    window.history.replaceState({},"","/cheat-sheets/objects?q=keep#sheet-card-old-key");
    render(createElement(TopicVocabularyLink,{id:"object-overview",subject:"objects",label:"Objects",lessons:[5],cards:[aliased]}));
    expect(document.getElementById("sheet-card-old-key")).toBeTruthy();
    expect(document.getElementById(`sheet-card-${card.id}`)).toBeTruthy();
    const link=screen.getByRole("link",{name:"Open der Schlüssel in objects vocabulary"});
    const target=new URL(link.getAttribute("href")!,window.location.origin);
    expect(target.pathname).toBe("/cheat-sheets/subjects/objects");
    expect(target.searchParams.get("lesson")).toBe("5");
    expect(target.searchParams.get("q")).toBe("der Schlüssel");
    expect(target.hash).toBe(`#sheet-card-${card.id}-0`);
    expect(window.location.search).toBe("?q=keep");
    expect(window.location.hash).toBe("#sheet-card-old-key");
  });
  it("keeps topic word practice responsive to an empty shared lesson selection",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"multiple",lessons:[]}));
    render(createElement(StudyScopeProvider,null,createElement(TopicWordPractice,{cards,speech:{}})));
    expect(screen.getByRole("heading",{name:"No matching practice items"})).toBeTruthy();
    expect(document.querySelectorAll("[data-sheet-card]")).toHaveLength(0);
  });
  it.each([
    {word:"stuhl",text:"der Stuhl",cardLinks:{stuhl:"/vocabulary/w466"} as Record<string,string>,saveIds:{stuhl:"card-W466"} as Record<string,string>,entry:"#sheet-card-W466-0",lessons:"1,2,3,4"},
    {word:"fenster",text:"das Fenster",cardLinks:{} as Record<string,string>,saveIds:{} as Record<string,string>,entry:"",lessons:"1,2,3,4"},
    {word:"haus",text:"das Haus",cardLinks:{haus:"/vocabulary/l5-haus"} as Record<string,string>,saveIds:{haus:"card-l5-haus"} as Record<string,string>,entry:"#sheet-card-l5-haus-0",lessons:"1,2,3,4,5"},
  ])("offers an exact home vocabulary link for a saved $word anchor",({word,text,cardLinks,saveIds,entry,lessons})=>{
    window.history.replaceState({},"",`/cheat-sheets/home?q=keep#home-${word}`);
    render(createElement(HomeCheatSheet,{speech:{},cardLinks,saveIds}));
    const link=screen.getByRole("link",{name:`Open ${text} in home vocabulary`});
    const target=new URL(link.getAttribute("href")!,window.location.origin);
    expect(target.pathname).toBe("/cheat-sheets/subjects/home");
    expect(target.searchParams.get("lesson")).toBe(lessons);
    expect(target.searchParams.get("q")).toBe(text);
    expect(target.hash).toBe(entry);
    expect(window.location.search).toBe("?q=keep");
    expect(window.location.hash).toBe(`#home-${word}`);
  });
  it("hands a whole-lesson word to a subject that actually contains it",()=>{
    const card=loadWordCards().cards.find(card=>card.studyTags?.lessons.includes(12)&&!card.studyTags.concepts.includes("seasons"))!;
    window.history.replaceState({},"",`/cheat-sheets/journeys?q=keep#sheet-card-${card.id}`);
    render(createElement(TopicVocabularyLink,{id:"journey-words",subject:"seasons",label:"Seasons",lessons:[12],cards:[card]}));
    const link=document.querySelector<HTMLAnchorElement>("[data-topic-word-handoff] a")!;
    const target=new URL(link.getAttribute("href")!,window.location.origin);
    expect(target.pathname).toBe(`/cheat-sheets/subjects/${card.studyTags!.concepts[0]}`);
    expect(target.searchParams.get("q")).toBe(card.rows[0]!.singular.text);
    expect(target.searchParams.get("lesson")).toBe("12");
    expect(target.hash).toBe(`#sheet-card-${card.id}-0`);
    expect(window.location.search).toBe("?q=keep");
    expect(window.location.hash).toBe(`#sheet-card-${card.id}`);
  });
});

const speech={};
const topicCards=(lesson:number)=>loadWordCards().cards.filter(card=>card.lessons.includes(String(lesson)));
const topics=[
  {subject:"objects",lesson:5,section:"object-words",builder:"object-lab",render:()=>createElement(ObjectCheatSheet,{cards:topicCards(5),speech,unit:studyUnits.find(unit=>unit.number===5)!})},
  {subject:"office",lesson:6,section:"office-words",builder:"office-lab",render:()=>createElement(OfficeCheatSheet,{cards:topicCards(6),speech,alphabet:[]})},
  {subject:"hobbies",lesson:7,section:"hobby-words",builder:"ability-lab",render:()=>createElement(HobbiesCheatSheet,{cards:topicCards(7),speech})},
  {subject:"time",lesson:8,section:"time-words",builder:"plan-lab",render:()=>createElement(TimeCheatSheet,{cards:topicCards(8),speech})},
  {subject:"food",lesson:9,section:"food-words",builder:"food-lab",render:()=>createElement(FoodCheatSheet,{cards:topicCards(9),speech})},
  {subject:"travel",lesson:10,section:"travel-words",builder:"travel-bracket",render:()=>createElement(TravelCheatSheet,{cards:topicCards(10),speech})},
  {subject:"past",lesson:11,section:"past-words",builder:"past-lab",render:()=>createElement(PastCheatSheet,{cards:topicCards(11),speech})},
  {subject:"seasons",lesson:12,section:"journey-words",builder:"journey-lab",render:()=>createElement(JourneyCheatSheet,{cards:topicCards(12),speech})},
];

describe("topic vocabulary handoff",()=>{
  it.each(topics)("$subject keeps its lesson and practice while linking to the catalogue",topic=>{
    const html=renderToStaticMarkup(topic.render());
    expect(html).toContain(`href="/cheat-sheets/subjects/${topic.subject}?lesson=${topic.lesson}"`);
    expect(html).toContain(`id="${topic.section}"`);
    expect(html).toContain(`id="${topic.builder}"`);
    expect(html).toContain('id="sheet-practice"');
    expect(html).not.toContain('data-sheet-card=');
    expect(html).not.toContain('data-object-vocabulary=');
    expect(html).not.toContain('aria-label="Find a card"');
  });

  it("keeps home grammar, recall and saved anchors without a second word explorer",()=>{
    const html=renderToStaticMarkup(createElement(HomeCheatSheet,{speech,cardLinks:{},saveIds:{}}));
    expect(html).toContain('href="/cheat-sheets/subjects/home?lesson=1%2C2%2C3%2C4"');
    for(const id of ["memory-room","home-index","home-stuhl","home-bett","home-patterns","home-describe","home-practice"])expect(html).toContain(`id="${id}"`);
    expect(html).toContain("Er ist schön.");
    expect(html).toContain("Question 1 /");
    expect(html).not.toContain('aria-label="Explore a word"');
    expect(html).not.toContain('class="home-word-card');
    expect(html).not.toContain('class="home-memory-lanes');
  });

  it("keeps food selection in the sentence builder and travel place comparisons",()=>{
    const food=renderToStaticMarkup(createElement(FoodCheatSheet,{cards,speech}));
    expect(food).toContain('aria-label="Food for these examples"');
    expect(food).toContain('id="selected-food"');
    expect(food).not.toContain('class="food-selected"');
    expect(food).not.toContain('class="food-board"');
    const travel=renderToStaticMarkup(createElement(TravelCheatSheet,{cards,speech}));
    expect(travel).toContain('class="travel-place-map"');
    expect(travel).not.toContain('class="travel-nouns"');
  });
});
