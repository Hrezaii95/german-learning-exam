// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,beforeAll,describe,expect,it} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {ObjectVocabularyOverview} from "../../apps/web/components/study/ObjectVocabularyOverview";
import {StudyScopeProvider} from "../../apps/web/components/study/StudyScope";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {defaultStudyScope,STUDY_SCOPE_KEY} from "../../apps/web/lib/study/scope";

const cards=loadWordCards().cards.filter(card=>card.studyTags?.lessons.includes(5));
beforeAll(()=>{
  // jsdom does not implement the native dialog lifecycle or scrolling.
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");this.dispatchEvent(new Event("close"));}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();localStorage.clear();});

describe("everyday objects overview interaction",()=>{
  it("moves the same vocabulary into the expanded overview and lets a learner explore an exact plural",()=>{
    render(createElement(ObjectVocabularyOverview,{cards}));
    expect(document.querySelectorAll("[data-object-vocabulary]")).toHaveLength(28);
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog",{name:"28 everyday words, sorted by article"});
    expect(document.querySelectorAll("[data-object-vocabulary]")).toHaveLength(28);
    fireEvent.click(within(dialog).getByRole("button",{name:"der Schlüssel die Schlüssel"}));
    const detail=dialog.querySelector("#object-overview-focus")!;
    expect(detail.textContent).toContain("der Schlüssel");
    expect(detail.textContent).toContain("die Schlüssel");
    const link=within(detail as HTMLElement).getByRole("link",{name:"Full vocabulary card →"});
    expect(link.getAttribute("href")).toContain(cards.find(card=>card.rows.some(row=>row.singular.text==="der Schlüssel"))!.path);
    fireEvent.click(within(dialog).getByRole("button",{name:"Close overview"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelectorAll("[data-object-vocabulary]")).toHaveLength(28);
  });
  it("shows an honest empty state when the shared study selection has no lessons",()=>{
    localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify({...defaultStudyScope(),mode:"multiple",lessons:[]}));
    render(createElement(StudyScopeProvider,null,createElement(ObjectVocabularyOverview,{cards})));
    expect(document.querySelectorAll("[data-object-vocabulary]")).toHaveLength(0);
    expect(screen.getByText(/No objects match your study selection/)).toBeTruthy();
  });
});
