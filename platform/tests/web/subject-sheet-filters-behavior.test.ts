// @vitest-environment jsdom
import {createElement,Fragment} from "react";
import {afterEach,describe,expect,it} from "vitest";
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
    fireEvent.click(screen.getByRole("button",{name:"Reset lesson & tag filters"}));
    expect(scopeValue()).toEqual({...defaultStudyScope(),source:"teacher-extra"});
    expect(screen.getByLabelText("Matching entries").textContent).toBe("extra-5,shared-5-6");
  });

  it("shows a saved empty selection honestly and can reset it without discarding the source",()=>{
    mount({...defaultStudyScope(),mode:"multiple",lessons:[],source:"course"});
    expect(screen.getByText(/No lessons are included in your saved selection/)).toBeTruthy();
    expect(screen.getByLabelText("Matching entries").textContent).toBe("");
    fireEvent.click(screen.getByRole("button",{name:"Reset lesson & tag filters"}));
    expect(scopeValue()).toEqual({...defaultStudyScope(),source:"course"});
    expect(screen.getByLabelText("Matching entries").textContent).toBe("home-4,object-5,shared-5-6");
  });

  it("stays synchronized when the global study selection changes in another tab",()=>{
    mount();
    const changed={...defaultStudyScope(),mode:"one" as const,lessons:[4],concepts:["home" as const]};
    fireEvent(window,new StorageEvent("storage",{key:STUDY_SCOPE_KEY,newValue:JSON.stringify(changed)}));
    expect(box("Lesson 4").checked).toBe(true);
    expect(box("Home & furniture").checked).toBe(true);
    expect(screen.getByLabelText("Matching entries").textContent).toBe("home-4");
  });
});
