// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,beforeAll,describe,expect,it} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {SubjectDirectory,SubjectInfographic} from "../../apps/web/components/study/SubjectInfographic";
import {StudyProvider} from "../../apps/web/components/study/StudyProvider";
import {StudyScopeProvider,StudyTagList} from "../../apps/web/components/study/StudyScope";
import {loadSubjectSheets} from "../../apps/web/lib/study/subject-sheets.server";
import {defaultStudyScope,STUDY_SCOPE_KEY,studyConcepts} from "../../apps/web/lib/study/scope";
import {STUDY_KEY} from "../../apps/web/lib/study/storage";
import {parseNavigationContextParam,resolveBackHref} from "../../apps/web/lib/content/navigation-context";

const sheets=loadSubjectSheets();
const food=sheets.find(sheet=>sheet.id==="food")!;
const directory=sheets.map(sheet=>({id:sheet.id,label:sheet.label,count:sheet.items.length,families:new Set(sheet.items.map(item=>item.cardId)).size}));
const entries=()=>document.querySelectorAll<HTMLButtonElement>("[data-subject-entry]");

beforeAll(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");this.dispatchEvent(new Event("close"));}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLElement.prototype,"showPopover",{configurable:true,value:()=>{}});
  Object.defineProperty(HTMLElement.prototype,"hidePopover",{configurable:true,value:()=>{}});
});
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState(null,"","/");});

describe("subject infographic browsing",()=>{
  it("switches to a gender by plural pattern grid with exact ending and umlaut highlights",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    render(createElement(SubjectInfographic,{sheet:objects}));
    fireEvent.click(screen.getByRole("button",{name:"Gender × plural patterns"}));
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
    expect(screen.getByRole("article",{name:"Selected vocabulary"}).textContent).toContain("die Bücher");
    expect(new URLSearchParams(window.location.search).get("view")).toBe("plurals");
  });

  it("restores the plural view and exact word through expansion and full-card return context",()=>{
    const objects=sheets.find(sheet=>sheet.id==="objects")!;
    const book=objects.items.find(item=>item.de==="das Buch")!;
    window.history.replaceState(null,"",`/cheat-sheets/subjects/objects?q=Buecher&view=plurals#sheet-card-${book.id}`);
    render(createElement(SubjectInfographic,{sheet:objects}));
    expect(entries()).toHaveLength(1);
    expect(screen.getByRole("button",{name:"Gender × plural patterns"}).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog",{name:"Gender × plural patterns"});
    expect(entries()).toHaveLength(1);
    expect(document.querySelectorAll(`[id="sheet-card-${book.id}"]`)).toHaveLength(1);
    const detail=within(dialog).getByRole("article",{name:"Selected vocabulary"});
    const href=within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    const context=parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav"));
    expect(resolveBackHref(context)).toBe(`/cheat-sheets/subjects/objects?q=Buecher&view=plurals#sheet-card-${book.id}`);
    fireEvent.click(within(dialog).getByRole("button",{name:"Close overview"}));
    fireEvent.click(screen.getByRole("button",{name:"Illustrated view"}));
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
    expect(document.querySelector(".subject-plural-missing")?.textContent).toContain("der Regen");
    expect(document.querySelector(".subject-plural-existing")?.textContent).toContain("die Eltern");
    const ketchup=screen.getByRole("button",{name:/^das Ketchup · No plural taught here/});
    fireEvent.click(ketchup);
    const href=within(screen.getByRole("article",{name:"Selected vocabulary"})).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")!;
    expect(resolveBackHref(parseNavigationContextParam(new URL(href,"https://example.test").searchParams.get("nav")))).toBe("/cheat-sheets/plurals?view=plurals#sheet-card-l9-ketchup-1");
  });

  it("explains a noun-free subject and keeps its real non-noun vocabulary available",()=>{
    render(createElement(SubjectInfographic,{sheet:sheets.find(sheet=>sheet.id==="verbs")!}));
    fireEvent.click(screen.getByRole("button",{name:"Gender × plural patterns"}));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/This selection has no singular nouns/)).toBeTruthy();
    expect(screen.getByRole("link",{name:"Open plural patterns for all nouns →"}).getAttribute("href")).toBe("/cheat-sheets/plurals");
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
    const male=Array.from(entries()).find(entry=>entry.textContent?.includes("der Ketchup"))!;
    const neuter=Array.from(entries()).find(entry=>entry.textContent?.includes("das Ketchup"))!;
    expect(male.closest("section")?.className).toContain("subject-tone-male");
    expect(neuter.closest("section")?.className).toContain("subject-tone-neuter");
    fireEvent.click(screen.getByRole("button",{name:"Expand overview"}));
    const dialog=screen.getByRole("dialog",{name:"2 vocabulary entries"});
    expect(entries()).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole("button",{name:"das Ketchup"}));
    const detail=screen.getByRole("article",{name:"Selected vocabulary"});
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
    const detail=screen.getByRole("article",{name:"Selected vocabulary"});
    expect(detail.querySelector('button[aria-label="Listen: das Buch"]')).toBeTruthy();
    expect(book.audio).toBeTruthy();
    expect(within(detail).getByRole("link",{name:"Full vocabulary card →"}).getAttribute("href")).toContain(book.href);
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
