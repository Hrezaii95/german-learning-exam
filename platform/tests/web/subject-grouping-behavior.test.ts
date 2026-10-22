// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {SubjectInfographic} from "../../apps/web/components/study/SubjectInfographic";
import {StudyScopeProvider} from "../../apps/web/components/study/StudyScope";
import {defaultStudyScope,STUDY_SCOPE_KEY} from "../../apps/web/lib/study/scope";
import {loadSubjectVocabulary} from "../../apps/web/lib/study/subject-sheets.server";
import type {SubjectVocabularyItem} from "../../apps/web/lib/study/subject-sheets";
import {parseNavigationContextParam,resolveBackHref} from "../../apps/web/lib/content/navigation-context";

const catalogue=loadSubjectVocabulary();
const book=catalogue.find(item=>item.de==="das Buch")!;
const taxi=catalogue.find(item=>item.de==="das Taxi")!;
const fixture=[book,taxi,...["der Schlüssel","die Lampe","der Regen","die Eltern","heißen"].map(de=>catalogue.find(item=>item.de===de)!)];
const dimensions=["lesson","subject","gender","plural"] as const;
const permutationsOf=(remaining:readonly string[]):string[][]=>remaining.length
  ?remaining.flatMap((dimension,index)=>permutationsOf(remaining.filter((_,position)=>position!==index)).map(tail=>[dimension,...tail]))
  :[[]];
const permutations=permutationsOf(dimensions);
const entries=()=>Array.from(document.querySelectorAll<HTMLButtonElement>("[data-subject-entry]"));
const entry=(id:string)=>entries().find(button=>button.dataset.subjectEntry===id)!;
const nestedDimensions=(node:HTMLElement)=>{
  const result:string[]=[];
  let parent=node.parentElement;
  while(parent){
    if(parent.hasAttribute("data-sheet-group"))result.push(parent.getAttribute("data-sheet-group")!);
    parent=parent.parentElement;
  }
  return result.reverse();
};
const renderSheet=(items:SubjectVocabularyItem[]=fixture)=>render(createElement(StudyScopeProvider,null,
  createElement(SubjectInfographic,{allNouns:true,sheet:{id:"objects",label:"All vocabulary",items},allItems:items})));
const assertConserved=(items:readonly SubjectVocabularyItem[])=>{
  expect(entries()).toHaveLength(items.length);
  expect(new Set(entries().map(button=>button.dataset.subjectEntry))).toEqual(new Set(items.map(item=>item.id)));
  for(const item of items){
    const button=entry(item.id);
    expect(button.querySelector(".subject-vocabulary-visual")).toBeTruthy();
    expect(button.querySelector(".subject-entry-meaning, .subject-plural-meaning")?.textContent).toBe(item.meaning);
    expect(button.classList.contains(`subject-tone-${item.tone}`)||button.parentElement?.classList.contains(`subject-tone-${item.tone}`)).toBe(true);
  }
};

beforeAll(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");this.dispatchEvent(new Event("close"));}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLElement.prototype,"showPopover",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLElement.prototype,"hidePopover",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();window.history.replaceState(null,"","/");});

describe("subject grouping and priority",()=>{
  it.each(permutations)("nests by %s → %s → %s → %s while retaining illustrated vocabulary",(...order)=>{
    window.history.replaceState(null,"",`/cheat-sheets/vocabulary?lessons=1&subjects=1&order=${order.join(",")}`);
    const {container}=renderSheet();
    expect(container.querySelector("[data-group-order]")?.getAttribute("data-group-order")).toBe(order.join(","));
    expect(nestedDimensions(entry(book.id))).toEqual(order);
    assertConserved(fixture);
    expect(entry(taxi.id).textContent).toContain("die Taxis");
    expect(entry(taxi.id).textContent).toContain("die Taxen");
    expect(document.querySelector(".subject-plural-pattern-schema svg")).toBeTruthy();
  });

  it("retains the complete catalogue once with lesson and subject grouping",()=>{
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&subjects=1&gender=0&view=illustrated&tags=");
    renderSheet(catalogue);
    expect(entries()).toHaveLength(catalogue.length);
    expect(new Set(entries().map(button=>button.dataset.subjectEntry))).toEqual(new Set(catalogue.map(item=>item.id)));
    expect(entry("W012-0").textContent).toContain("heißen");
    expect(entry(book.id).querySelector('[data-subject-visual="object:book"]')).toBeTruthy();
    expect(entry(book.id).classList.contains("subject-tone-neuter")).toBe(true);
  });

  it("retains words, illustrations and colours in every combination of the four switches",()=>{
    renderSheet();
    for(const lesson of [false,true])for(const subject of [false,true])for(const gender of [false,true])for(const plural of [false,true]){
      window.history.replaceState(null,"",`/cheat-sheets/vocabulary?lessons=${Number(lesson)}&subjects=${Number(subject)}&gender=${Number(gender)}&view=${plural?"plurals":"illustrated"}&order=lesson,subject,gender,plural`);
      fireEvent(window,new PopStateEvent("popstate"));
      assertConserved(fixture);
      expect(nestedDimensions(entry(book.id))).toEqual([
        ...(lesson?["lesson"]:[]),...(subject?["subject"]:[]),...(gender?["gender"]:[]),...(plural?["plural"]:[]),
      ]);
    }
  });

  it("puts an overlapping word under the first selected matching subject without duplicating it",()=>{
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&subjects=1&tags=objects,home");
    renderSheet();
    expect(entry(book.id).closest('[data-sheet-group="subject"]')?.getAttribute("data-group-key")).toBe("objects");
    expect(document.querySelectorAll(`[data-subject-entry="${book.id}"]`)).toHaveLength(1);
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?subjects=1&tags=home,objects");
    fireEvent(window,new PopStateEvent("popstate"));
    expect(entry(book.id).closest('[data-sheet-group="subject"]')?.getAttribute("data-group-key")).toBe("home");
    expect(document.querySelectorAll(`[data-subject-entry="${book.id}"]`)).toHaveLength(1);
  });

  it("restores an older three-group URL and upgrades its order when lesson grouping is enabled",()=>{
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?subjects=1&order=plural,subject,gender");
    renderSheet();
    expect(screen.getByRole("switch",{name:"Group by lesson"}).getAttribute("aria-checked")).toBe("false");
    expect(nestedDimensions(entry(book.id))).toEqual(["plural","subject","gender"]);
    fireEvent.click(screen.getByRole("switch",{name:"Group by lesson"}));
    expect(nestedDimensions(entry(book.id))).toEqual(["lesson","plural","subject","gender"]);
    expect(new URLSearchParams(window.location.search).get("order")).toBe("lesson,plural,subject,gender");
    assertConserved(fixture);
  });

  it("uses the selected lessons for shared words and keeps the same assignment after reload",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"multiple",lessons:[4,5]}));
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&gender=0&view=illustrated");
    const {container}=renderSheet();
    expect(container.querySelector("[data-lesson-grouping]")?.getAttribute("data-lesson-grouping")).toBe("on");
    expect(entry(book.id).closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")).toBe("lesson-5");
    const lamp=fixture.find(item=>item.de==="die Lampe")!;
    expect(entry(lamp.id).closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")).toBe("lesson-4");
    expect(entries()).toHaveLength(4);
    const lessons=screen.getByText("Lessons",{exact:true}).closest("details")!;
    fireEvent.click(lessons.querySelector("summary")!);
    fireEvent.click(within(lessons).getByRole("checkbox",{name:"Lesson 4"}));
    fireEvent.click(within(lessons).getByRole("checkbox",{name:"Lesson 1"}));
    expect(entry(book.id).closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")).toBe("lesson-1");
    const before=entries().map(button=>[button.dataset.subjectEntry,button.closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")]);
    cleanup();
    renderSheet();
    expect(entries().map(button=>[button.dataset.subjectEntry,button.closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")])).toEqual(before);
    expect(document.querySelectorAll(`[data-subject-entry="${book.id}"]`)).toHaveLength(1);
  });

  it("keeps lesson groups aligned with the active vocabulary source",()=>{
    const friseur=catalogue.find(item=>item.de==="der Friseur")!;
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&gender=0&view=illustrated");
    renderSheet([book,friseur]);
    const source=screen.getByRole("combobox",{name:"Filter vocabulary by source"});
    fireEvent.change(source,{target:{value:"teacher-extra"}});
    assertConserved([friseur]);
    expect(entry(friseur.id).closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")).toBe("lesson-2");
    fireEvent.change(source,{target:{value:"course"}});
    assertConserved([book,friseur]);
    expect(entry(book.id).closest('[data-sheet-group="lesson"]')?.getAttribute("data-group-key")).toBe("lesson-1");
  });

  it("moves active groups with accessible buttons and remembers their positions when toggled",()=>{
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&subjects=1");
    const {container}=renderSheet();
    const priority=screen.getByRole("group",{name:"Grouping priority"});
    const order=()=>within(priority).getAllByRole("listitem").map(item=>item.getAttribute("data-grouping-priority"));
    expect(within(priority).getByRole("list",{name:"Active grouping order"})).toBeTruthy();
    expect(order()).toEqual(dimensions);
    expect((within(priority).getByRole("button",{name:"Move Lesson earlier"}) as HTMLButtonElement).disabled).toBe(true);
    expect((within(priority).getByRole("button",{name:"Move Plural pattern later"}) as HTMLButtonElement).disabled).toBe(true);
    const earlier=within(priority).getByRole("button",{name:"Move Plural pattern earlier"});
    earlier.focus();
    fireEvent.click(earlier);
    expect(order()).toEqual(["lesson","subject","plural","gender"]);
    expect(nestedDimensions(entry(book.id))).toEqual(["lesson","subject","plural","gender"]);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Move Plural pattern earlier");
    fireEvent.click(screen.getByRole("switch",{name:"Group by subject tags"}));
    expect(order()).toEqual(["lesson","plural","gender"]);
    expect(container.querySelector("[data-subject-grouping]")?.getAttribute("data-subject-grouping")).toBe("off");
    fireEvent.click(screen.getByRole("switch",{name:"Group by subject tags"}));
    expect(order()).toEqual(["lesson","subject","plural","gender"]);
    fireEvent.click(screen.getByRole("switch",{name:"Group by lesson"}));
    expect(order()).toEqual(["subject","plural","gender"]);
    expect(container.querySelector("[data-lesson-grouping]")?.getAttribute("data-lesson-grouping")).toBe("off");
    fireEvent.click(screen.getByRole("switch",{name:"Group by lesson"}));
    expect(order()).toEqual(["lesson","subject","plural","gender"]);
    assertConserved(fixture);
    expect(new URLSearchParams(window.location.search).get("order")).toBe("lesson,subject,plural,gender");
  });

  it("keeps grouping priority through reset while clearing the search and subject filter",()=>{
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&subjects=1&order=plural,subject,lesson,gender&tags=objects&q=Buch");
    const {container}=renderSheet();
    expect(entries()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    assertConserved(fixture);
    expect(container.querySelector("[data-group-order]")?.getAttribute("data-group-order")).toBe("plural,subject,lesson,gender");
    expect(screen.getByRole("switch",{name:"Group by subject tags"}).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch",{name:"Group by lesson"}).getAttribute("aria-checked")).toBe("true");
    const params=new URLSearchParams(window.location.search);
    expect(params.get("tags")).toBe("");
    expect(params.has("q")).toBe(false);
    expect(params.get("order")).toBe("plural,subject,lesson,gender");
  });

  it("keeps the open word card, both pronunciations and return context after reordering in the expanded overview",()=>{
    const played:string[]=[];
    vi.stubGlobal("Audio",class{
      src:string;playbackRate=1;preservesPitch=true;onpause:(()=>void)|null=null;
      constructor(src:string){this.src=src;}
      play(){played.push(this.src);return Promise.resolve();}
      pause(){this.onpause?.();}
    });
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&subjects=1&tags=objects,home");
    renderSheet();
    fireEvent.click(entry(book.id));
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button",{name:"Move Gender earlier"}));
    fireEvent.change(within(dialog).getByRole("combobox",{name:"Sort words by"}),{target:{value:"meaning"}});
    fireEvent.change(within(dialog).getByRole("combobox",{name:"Sort direction"}),{target:{value:"desc"}});
    expect(nestedDimensions(entry(book.id))).toEqual(["lesson","gender","subject","plural"]);
    expect(screen.getAllByRole("article",{name:/^Vocabulary card:/})).toHaveLength(1);
    expect(document.querySelectorAll(`[id="sheet-card-${book.id}"]`)).toHaveLength(1);
    const card=screen.getByRole("article",{name:"Vocabulary card: das Buch"});
    fireEvent.click(within(card).getByRole("button",{name:"Listen: das Buch"}));
    fireEvent.click(within(card).getByRole("button",{name:"Listen: die Bücher"}));
    expect(played).toEqual([book.audio,book.plurals[0]!.audio]);
    const href=within(card).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    const back=resolveBackHref(context);
    const backUrl=new URL(back,"https://example.test");
    expect(backUrl.pathname).toBe("/cheat-sheets/vocabulary");
    expect(backUrl.searchParams.get("subjects")).toBe("1");
    expect(backUrl.searchParams.get("lessons")).toBe("1");
    expect(backUrl.searchParams.get("order")).toBe("lesson,gender,subject,plural");
    expect(backUrl.searchParams.get("sort")).toBe("meaning");
    expect(backUrl.searchParams.get("direction")).toBe("desc");
    expect(backUrl.searchParams.get("tags")).toBe("objects,home");
    expect(backUrl.hash).toBe(`#sheet-card-${book.id}`);
    cleanup();
    window.history.replaceState(null,"",back);
    renderSheet();
    expect(nestedDimensions(entry(book.id))).toEqual(["lesson","gender","subject","plural"]);
    expect(screen.getByRole("article",{name:"Vocabulary card: das Buch"})).toBeTruthy();
    expect((screen.getByRole("combobox",{name:"Sort words by"}) as HTMLSelectElement).value).toBe("meaning");
    expect((screen.getByRole("combobox",{name:"Sort direction"}) as HTMLSelectElement).value).toBe("desc");
  });

  it.each([
    ["legacy plural matrix",""],
    ["legacy gender lanes","?view=illustrated"],
    ["nested gender groups","?view=illustrated&order=lesson,subject,gender,plural"],
    ["ungrouped cards","?view=illustrated&gender=0"],
  ])("sorts the displayed words in the %s",(_label,query)=>{
    const job=catalogue.find(item=>item.de==="der Job")!;
    const laptop=catalogue.find(item=>item.de==="der Laptop")!;
    const papa=catalogue.find(item=>item.de==="der Papa")!;
    const opa=catalogue.find(item=>item.de==="der Opa")!;
    window.history.replaceState(null,"",`/cheat-sheets/vocabulary${query}`);
    renderSheet([papa,laptop,job,opa]);
    const ids=()=>entries().map(button=>button.dataset.subjectEntry);
    const sort=screen.getByRole("combobox",{name:"Sort words by"});
    const direction=screen.getByRole("combobox",{name:"Sort direction"});
    expect(ids()).toEqual([job.id,laptop.id,opa.id,papa.id]);
    fireEvent.change(sort,{target:{value:"meaning"}});
    expect(ids()).toEqual([papa.id,opa.id,job.id,laptop.id]);
    fireEvent.change(direction,{target:{value:"desc"}});
    expect(ids()).toEqual([laptop.id,job.id,opa.id,papa.id]);
    assertConserved([papa,laptop,job,opa]);
  });

  it("offers German, English, lesson, source and original-order sorting with both directions",()=>{
    const teacher=catalogue.find(item=>item.de==="der Elektriker")!;
    const extra=catalogue.find(item=>item.de==="die Decke")!;
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?view=illustrated&gender=0");
    renderSheet([teacher,extra,book]);
    const sort=screen.getByRole("combobox",{name:"Sort words by"});
    const direction=screen.getByRole("combobox",{name:"Sort direction"});
    const ids=()=>entries().map(button=>button.dataset.subjectEntry);
    expect(within(sort).getAllByRole("option").map(option=>option.textContent)).toEqual([
      "German alphabet","English meaning","Lesson","Source","Original vocabulary order",
    ]);
    expect(ids()).toEqual([book.id,extra.id,teacher.id]);
    fireEvent.change(sort,{target:{value:"meaning"}});
    expect(ids()).toEqual([extra.id,book.id,teacher.id]);
    fireEvent.change(sort,{target:{value:"lesson"}});
    expect(ids()).toEqual([book.id,teacher.id,extra.id]);
    fireEvent.change(sort,{target:{value:"source"}});
    expect(ids()).toEqual([book.id,teacher.id,extra.id]);
    fireEvent.change(direction,{target:{value:"desc"}});
    expect(ids()).toEqual([extra.id,teacher.id,book.id]);
    fireEvent.change(sort,{target:{value:"original"}});
    fireEvent.change(direction,{target:{value:"asc"}});
    expect(ids()).toEqual([teacher.id,extra.id,book.id]);
    fireEvent.change(direction,{target:{value:"desc"}});
    expect(ids()).toEqual([book.id,extra.id,teacher.id]);
    assertConserved([teacher,extra,book]);
  });

  it("shows an empty active order when all grouping switches are off without losing colours or words",()=>{
    window.history.replaceState(null,"","/cheat-sheets/vocabulary?lessons=1&subjects=1");
    renderSheet();
    for(const name of ["lesson","subject tags","gender","plural pattern"])fireEvent.click(screen.getByRole("switch",{name:`Group by ${name}`}));
    const priority=screen.getByRole("group",{name:"Grouping priority"});
    expect(within(priority).queryByRole("listitem")).toBeNull();
    assertConserved(fixture);
    for(const dimension of dimensions)expect(document.querySelector(`[data-sheet-group="${dimension}"]`)).toBeNull();
  });
});
