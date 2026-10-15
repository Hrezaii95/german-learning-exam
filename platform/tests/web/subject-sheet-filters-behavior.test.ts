// @vitest-environment jsdom
import {createElement,Fragment,useState} from "react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {SubjectSheetFilters} from "../../apps/web/components/study/SubjectSheetFilters";
import {StudyScopeProvider,useStudyScope} from "../../apps/web/components/study/StudyScope";
import {defaultStudyScope,STUDY_SCOPE_KEY,type StudyScope,type StudyTags} from "../../apps/web/lib/study/scope";
import type {SubjectVocabularyItem} from "../../apps/web/lib/study/subject-sheets";

function item(id:string,studyTags:StudyTags):SubjectVocabularyItem{
  return {id,cardId:id,de:id,meaning:id,category:"Noun",tone:"neuter",audio:null,plurals:[],href:`/vocabulary/${id}`,studyTags,savedItem:{id,title:id,meaning:id,kind:"word",href:`/vocabulary/${id}`},examples:[],patterns:[],note:""};
}
const items=[
  item("home-4",{lessons:[4],concepts:["home"],source:"course"}),
  item("object-5",{lessons:[5],concepts:["objects"],source:"course"}),
  item("extra-5",{lessons:[5],concepts:["objects","office"],source:"teacher-extra"}),
  item("shared-5-6",{lessons:[5,6],concepts:["objects"],source:"teacher-extra",sources:["course","teacher-extra"],sourceLessons:{course:[5],"teacher-extra":[6]}}),
];
function ScopeReadout(){
  const {scope,matches}=useStudyScope();
  return createElement(Fragment,null,
    createElement("output",{"data-testid":"scope"},JSON.stringify(scope)),
    createElement("output",{"aria-label":"Matching entries"},items.filter(value=>matches(value.studyTags)).map(value=>value.id).join(",")),
  );
}
function ControlledFilters({initialScope,onChange}:{initialScope:StudyScope;onChange:(scope:StudyScope)=>void}){
  const [scope,setScope]=useState(initialScope);
  return createElement(Fragment,null,
    createElement(SubjectSheetFilters,{items,scope,onChange:next=>{onChange(next);setScope(next);}}),
    createElement("output",{"data-testid":"effective-scope"},JSON.stringify(scope)),
    createElement(ScopeReadout),
  );
}
function mount(scope?:StudyScope){
  if(scope)localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify(scope));
  render(createElement(StudyScopeProvider,null,createElement(Fragment,null,createElement(SubjectSheetFilters,{items}),createElement(ScopeReadout))));
  for(const summary of document.querySelectorAll(".subject-sheet-filter > summary"))fireEvent.click(summary);
}
const scopeValue=():StudyScope=>JSON.parse(screen.getByTestId("scope").textContent!);
const box=(name:string)=>screen.getByRole("checkbox",{name}) as HTMLInputElement;
const count=(name:string)=>box(name).closest("label")?.querySelector(".subject-sheet-filter-count")?.textContent;

afterEach(()=>{cleanup();localStorage.clear();});

describe("direct cheat sheet lesson and subject filters",()=>{
  it("starts with all lessons, supports several choices, and restores all when the last is cleared",()=>{
    mount();
    expect(screen.getAllByRole("checkbox").every(input=>!(input as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByLabelText("Matching entries").textContent).toBe("home-4,object-5,extra-5,shared-5-6");
    fireEvent.click(box("Lesson 5"));
    expect(scopeValue()).toEqual({...defaultStudyScope(),mode:"multiple",lessons:[5]});
    expect(screen.getByLabelText("Matching entries").textContent).toBe("object-5,extra-5,shared-5-6");
    fireEvent.click(box("Lesson 4"));
    expect(scopeValue().lessons).toEqual([4,5]);
    fireEvent.click(box("Lesson 5"));
    expect(scopeValue().lessons).toEqual([4]);
    fireEvent.click(box("Lesson 4"));
    expect(scopeValue()).toEqual(defaultStudyScope());
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(defaultStudyScope());
  });

  it("reflects existing one and through lesson selections without losing their selected lessons",()=>{
    mount({...defaultStudyScope(),mode:"one",lessons:[5]});
    expect(box("Lesson 5").checked).toBe(true);
    expect(box("Lesson 4").checked).toBe(false);
    fireEvent.click(box("Lesson 6"));
    expect(scopeValue()).toEqual({...defaultStudyScope(),mode:"multiple",lessons:[5,6]});
    cleanup();
    mount({...defaultStudyScope(),mode:"through",lessons:[3]});
    for(const number of [1,2,3])expect(box(`Lesson ${number}`).checked).toBe(true);
    expect(box("Lesson 4").checked).toBe(false);
    fireEvent.click(box("Lesson 6"));
    expect(scopeValue()).toEqual({...defaultStudyScope(),mode:"multiple",lessons:[1,2,3,6]});
  });

  it("intersects lessons with tag choices, preserves source membership, and shows source-specific counts",()=>{
    mount({...defaultStudyScope(),mode:"one",lessons:[5],concepts:["objects"],source:"teacher-extra"});
    expect(screen.getByLabelText("Matching entries").textContent).toBe("extra-5");
    expect(count("Lesson 5")).toBe("1");
    expect(count("Lesson 6")).toBe("1");
    expect(count("Office & communication")).toBe("1");
    expect(count("Home & furniture")).toBe("0");
    fireEvent.click(box("Lesson 6"));
    expect(screen.getByLabelText("Matching entries").textContent).toBe("extra-5,shared-5-6");
    fireEvent.click(box("Office & communication"));
    fireEvent.click(box("Everyday objects"));
    expect(scopeValue().concepts).toEqual(["office"]);
    expect(screen.getByLabelText("Matching entries").textContent).toBe("extra-5");
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    expect(scopeValue()).toEqual(defaultStudyScope());
    expect(screen.getByLabelText("Matching entries").textContent).toBe("home-4,object-5,extra-5,shared-5-6");
  });

  it("shows a saved empty selection honestly and can clear every restrictive filter",()=>{
    mount({...defaultStudyScope(),mode:"multiple",lessons:[],source:"course"});
    expect(screen.getByText(/No lessons are included in your saved selection/)).toBeTruthy();
    expect(screen.getByLabelText("Matching entries").textContent).toBe("");
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    expect(scopeValue()).toEqual(defaultStudyScope());
    expect(screen.getByLabelText("Matching entries").textContent).toBe("home-4,object-5,extra-5,shared-5-6");
  });

  it("stays synchronized when the global study selection changes in another tab",()=>{
    mount();
    const changed={...defaultStudyScope(),mode:"one" as const,lessons:[4],concepts:["home" as const]};
    fireEvent(window,new StorageEvent("storage",{key:STUDY_SCOPE_KEY,newValue:JSON.stringify(changed)}));
    expect(box("Lesson 4").checked).toBe(true);
    expect(box("Home & furniture").checked).toBe(true);
    expect(screen.getByLabelText("Matching entries").textContent).toBe("home-4");
  });

  it("uses an explicit subject selection and the full catalogue independently of a stale shared selection",()=>{
    const stale={...defaultStudyScope(),mode:"one" as const,lessons:[4],concepts:["home" as const],source:"course" as const};
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify(stale));
    const onChange=vi.fn();
    render(createElement(StudyScopeProvider,null,createElement(ControlledFilters,{initialScope:{...defaultStudyScope(),concepts:["objects"]},onChange})));
    for(const summary of document.querySelectorAll(".subject-sheet-filter > summary"))fireEvent.click(summary);
    expect(box("Everyday objects").checked).toBe(true);
    expect(box("Home & furniture").checked).toBe(false);
    expect(box("Lesson 4").checked).toBe(false);
    expect(count("Lesson 5")).toBe("3");
    expect(count("Lesson 6")).toBe("1");
    expect(count("Home & furniture")).toBe("1");
    expect(screen.getByText("3 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    fireEvent.click(box("Home & furniture"));
    expect(onChange).toHaveBeenLastCalledWith({...defaultStudyScope(),concepts:["objects","home"]});
    expect(screen.getByText("4 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    fireEvent.click(box("Everyday objects"));
    expect(onChange).toHaveBeenLastCalledWith({...defaultStudyScope(),concepts:["home"]});
    expect(screen.getByText("1 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    fireEvent.click(box("Home & furniture"));
    expect(onChange).toHaveBeenLastCalledWith(defaultStudyScope());
    expect(screen.getByText("4 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    expect(scopeValue()).toEqual(stale);
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toEqual(stale);
  });

  it("routes controlled lesson changes and reset through the callback",()=>{
    const onChange=vi.fn();
    const initialScope={...defaultStudyScope(),mode:"one" as const,lessons:[5],concepts:["objects" as const],source:"teacher-extra" as const};
    render(createElement(StudyScopeProvider,null,createElement(ControlledFilters,{initialScope,onChange})));
    for(const summary of document.querySelectorAll(".subject-sheet-filter > summary"))fireEvent.click(summary);
    expect(count("Lesson 5")).toBe("1");
    expect(count("Lesson 6")).toBe("1");
    fireEvent.click(box("Lesson 6"));
    expect(onChange).toHaveBeenLastCalledWith({...initialScope,mode:"multiple",lessons:[5,6]});
    expect(screen.getByText("2 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Reset all filters"}));
    expect(onChange).toHaveBeenLastCalledWith(defaultStudyScope());
    expect(scopeValue()).toEqual(defaultStudyScope());
  });

  it("exposes a restrictive source-only selection and enables a reset that restores the whole catalogue",()=>{
    mount({...defaultStudyScope(),source:"teacher-extra"});
    const source=screen.getByRole("combobox",{name:"Filter vocabulary by source"}) as HTMLSelectElement;
    expect(source.value).toBe("teacher-extra");
    expect(screen.getByText("2 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    const reset=screen.getByRole("button",{name:"Reset all filters"}) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(source.value).toBe("all");
    expect(scopeValue()).toEqual(defaultStudyScope());
    expect(screen.getByText("4 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    expect(reset.disabled).toBe(true);
    fireEvent.change(source,{target:{value:"study-extra"}});
    expect(scopeValue().source).toBe("study-extra");
    expect(screen.getByText("0 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(scopeValue()).toEqual(defaultStudyScope());
  });

  it("uses the controlled source value and reports source edits through the callback",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),source:"course"}));
    const onChange=vi.fn();
    render(createElement(StudyScopeProvider,null,createElement(ControlledFilters,{initialScope:{...defaultStudyScope(),concepts:["objects"]},onChange})));
    const source=screen.getByRole("combobox",{name:"Filter vocabulary by source"}) as HTMLSelectElement;
    expect(source.value).toBe("all");
    fireEvent.change(source,{target:{value:"teacher-extra"}});
    expect(onChange).toHaveBeenLastCalledWith({...defaultStudyScope(),concepts:["objects"],source:"teacher-extra"});
    expect(source.value).toBe("teacher-extra");
    expect(screen.getByText("2 of 4 entries in the vocabulary catalogue.")).toBeTruthy();
    expect(scopeValue().source).toBe("course");
  });

  it("enables the parent reset for local search or group filters even when the effective scope includes everything",()=>{
    const onChange=vi.fn();
    const onReset=vi.fn();
    const scope=defaultStudyScope();
    const view=render(createElement(StudyScopeProvider,null,createElement(SubjectSheetFilters,{items,scope,onChange,onReset})));
    expect((screen.getByRole("button",{name:"Reset all filters"}) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(createElement(StudyScopeProvider,null,createElement(SubjectSheetFilters,{items,scope,onChange,onReset,hasLocalFilters:true})));
    const reset=screen.getByRole("button",{name:"Reset all filters"}) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
