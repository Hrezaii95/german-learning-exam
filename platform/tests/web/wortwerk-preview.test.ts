/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement,type ComponentType,type ReactNode } from "react";
import { act,cleanup,fireEvent,render,screen,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach,beforeEach,describe,it,expect,vi } from "vitest";
import type { ContentPack,DifficultyProfile,LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask,GradeResult,TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server.js";
import { wortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import language from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";
const state=vi.hoisted(()=>({content:null as unknown,task:null as unknown}));
vi.mock("../../apps/web/components/wortwerk/PlayProvider",()=>({usePlayContent:()=>state.content}));
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:ReactNode})=>createElement("a",{href},children)}));
type RendererProps={task:GeneratedTask;onAnswer:(answer:TaskAnswer)=>void;result?:GradeResult|null;onLearn?:(word:string)=>void};
vi.mock("../../apps/web/components/wortwerk/TaskRenderer",async importOriginal=>{
  const actual=await importOriginal<{TaskRenderer:ComponentType<RendererProps>}>();
  return {TaskRenderer:(props:RendererProps)=>{
    state.task=props.task;
    // Exercise the renderer's deck hook, including its default persistence path.
    const learn=()=>props.onLearn?props.onLearn("preview-only"):wortwerkStore.appendEvent("deck.add",{word:"preview-only"});
    return createElement("div",null,createElement(actual.TaskRenderer,props),createElement("button",{type:"button",onClick:learn},"Try preview learn action"));
  }};
});
const previewPath="../../apps/web/components/wortwerk/TaskPreview.tsx";
const routePath="../../apps/web/app/play/preview/page.tsx";
const {TaskPreview}=await import(previewPath) as {TaskPreview:ComponentType};
const {default:PreviewPage}=await import(routePath) as {default:()=>ReactNode};
const pack={...fixture,items:fixtureItems} as unknown as ContentPack;
const content:WortwerkContent={packs:[{pack,fixture:true,language:language as LanguageProfile,difficulty:difficulty as DifficultyProfile,resources:{}}]};
beforeEach(()=>{
  state.content=content;state.task=null;
  vi.spyOn(wortwerkStore,"appendEvent");vi.spyOn(wortwerkStore,"setDoc");
  vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>undefined);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllEnvs();});
async function openGender(){
  const summary=screen.getAllByText(/^corners\.gender ·/u)[0]!;
  const details=summary.closest("details")!;
  act(()=>{details.open=true;fireEvent(details,new Event("toggle",{bubbles:true}));});
  await screen.findByRole("group",{name:"Answer choices"});
}
describe("isolated task authoring preview",()=>{
  it("renders and grades real task controls, resets an attempt, and never writes progress or deck events",async()=>{
    const user=userEvent.setup();render(createElement(TaskPreview));await openGender();
    const task=state.task as GeneratedTask;
    const index=task.question.options.findIndex(option=>task.solution.optionIds?.includes(option.id));
    await user.click(within(screen.getByRole("group",{name:"Answer choices"})).getAllByRole("button")[index]!);
    expect(screen.getByRole("heading",{name:"Correct"})).not.toBeNull();
    await user.click(screen.getByRole("button",{name:"Try preview learn action"}));
    await user.click(screen.getByRole("button",{name:"Reset preview"}));
    expect(screen.queryByRole("heading",{name:"Correct"})).toBeNull();
    expect(screen.getByRole("group",{name:"Answer choices"})).not.toBeNull();
    expect((state.task as GeneratedTask).id).not.toBe(task.id);
    expect(wortwerkStore.appendEvent).not.toHaveBeenCalled();expect(wortwerkStore.setDoc).not.toHaveBeenCalled();
  });
  it("includes all generated tasks through bounded pages and resets the list when switching packs",async()=>{
    const user=userEvent.setup();
    const alternate={...content.packs[0]!,pack:{...pack,id:"alternate-fixture",title:"Alternate pack",items:pack.items.slice(0,1)}};
    state.content={packs:[...content.packs,alternate]};
    const view=render(createElement(TaskPreview));
    expect(view.container.querySelectorAll("details").length).toBeLessThanOrEqual(100);
    const next=screen.getByRole("button",{name:"Next tasks"});
    await user.click(next);expect(screen.getByText(/^Tasks 101–/u)).not.toBeNull();
    await user.selectOptions(screen.getByRole("combobox",{name:"Content pack"}),alternate.pack.id);
    expect(screen.getByText(/^Tasks 1–/u)).not.toBeNull();
    expect(screen.queryByRole("heading",{name:"Correct"})).toBeNull();
    expect(view.container.querySelectorAll("details").length).toBeLessThanOrEqual(100);
    expect(wortwerkStore.appendEvent).not.toHaveBeenCalled();
  });
  it("handles missing packs and content without a runnable template",()=>{
    state.content=null;const view=render(createElement(TaskPreview));
    expect(screen.getByText("No content packs installed.")).not.toBeNull();
    state.content={packs:[{...content.packs[0]!,pack:{...pack,items:[]}}]};view.rerender(createElement(TaskPreview));
    expect(screen.getByText("This pack has no tasks supported by the installed templates.")).not.toBeNull();
  });
  it("returns Next's not-found response unless the build explicitly opts in",()=>{
    for(const value of [undefined,"","0","true"]){
      if(value===undefined)vi.stubEnv("WORTWERK_PREVIEW",undefined);else vi.stubEnv("WORTWERK_PREVIEW",value);
      expect(()=>PreviewPage()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    }
    vi.stubEnv("WORTWERK_PREVIEW","1");render(PreviewPage());
    expect(screen.getByRole("heading",{name:"Task preview"})).not.toBeNull();
    expect(wortwerkStore.appendEvent).not.toHaveBeenCalled();
  });
});
