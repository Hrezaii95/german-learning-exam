/** @vitest-environment jsdom */
import { createElement,type ReactNode,type ComponentType } from "react";
import { afterEach,beforeAll,describe,it,expect,vi } from "vitest";
import { cleanup,fireEvent,render,screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GeneratedTask,GradeResult,TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
type MechanicProps={task:GeneratedTask;onAnswer:(answer:TaskAnswer)=>void;result?:GradeResult|null;disabled?:boolean};
const sortPath="../../apps/web/components/wortwerk/mechanics/Sort.js";
const { Sort } = await import(sortPath) as { Sort:ComponentType<MechanicProps> };
const buildPath="../../apps/web/components/wortwerk/mechanics/Build.js";
const { Build } = await import(buildPath) as { Build:ComponentType<MechanicProps> };
const orderPath="../../apps/web/components/wortwerk/mechanics/Order.js";
const { Order } = await import(orderPath) as { Order:ComponentType<MechanicProps> };
const gapPath="../../apps/web/components/wortwerk/mechanics/Gap.js";
const { Gap } = await import(gapPath) as { Gap:ComponentType<MechanicProps> };
const listenPath="../../apps/web/components/wortwerk/mechanics/Listen.js";
const { Listen } = await import(listenPath) as { Listen:ComponentType<MechanicProps> };
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:ReactNode})=>createElement("a",{href},children)}));
const correct:GradeResult={outcome:"correct",correct:true,hinted:false,normalizedAnswer:"answer"};
function task(overrides:Partial<GeneratedTask>={}):GeneratedTask{return {
 id:"task",templateId:"drill.gap",itemId:"item",packId:"pack",skill:"grammar",mechanic:"gap",dimension:"form",format:"recall",testedDimensions:["form"],revealFields:["Secret answer"],
 question:{instruction:"Complete the task",text:"Neutral prompt",options:[],input:"text",lang:"xx",helperKeys:["ø"]},solution:{accepted:["Secret answer"]},feedback:{answer:"Secret answer",summary:"Feedback only",toneToken:"--tone-fem",forms:["Hidden form"],audio:{src:"/audio/reveal.mp3",review:"preview",text:"Source caption"}},...overrides};}
function sequence(mechanic:"build"|"order"):GeneratedTask{return task({mechanic,question:{instruction:"Arrange tiles",text:"Cue",options:[],input:"sequence",lang:"xx",helperKeys:[],tokens:[{id:"t1",text:"one"},{id:"t2",text:"two"}]},solution:{order:["t2","t1"],accepted:["two one"]}});}
beforeAll(()=>{
 vi.spyOn(HTMLMediaElement.prototype,"play").mockImplementation(function(this:HTMLMediaElement){return Promise.resolve();});
 vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("grammar mechanics",()=>{
 it("keeps every answer detail out of Gap's question DOM and reveals only after result",()=>{
  const {container,rerender}=render(createElement(Gap,{task:task(),onAnswer:vi.fn()}));
  expect(container.innerHTML).not.toMatch(/Secret answer|Hidden form|Source caption|tone-fem|Feedback only|reveal.mp3/u);
  expect(container.querySelectorAll("input")).toHaveLength(1);
  rerender(createElement(Gap,{task:task(),onAnswer:vi.fn(),result:correct}));
  expect(screen.getByText("Secret answer")).toBeTruthy();
  expect(screen.getByText("Hidden form")).toBeTruthy();
  expect(screen.getByText("Source caption")).toBeTruthy();
  expect(screen.getByRole("heading",{name:"Correct"})).toBe(document.activeElement);
 });
 it("submits one typed answer using only keyboard, with accent helpers",async()=>{
  const submit=vi.fn();const user=userEvent.setup();render(createElement(Gap,{task:task(),onAnswer:submit}));
  expect(screen.getByRole("textbox")).toBe(document.activeElement);
  await user.type(screen.getByRole("textbox"),"answer");
  await user.keyboard("{Enter}{Enter}");
  expect(submit).toHaveBeenCalledTimes(1);expect(submit).toHaveBeenCalledWith("answer");
 });
 it("classifies by tap or native drag through the same single-submit path",()=>{
  const submit=vi.fn();const item=task({mechanic:"sort",question:{instruction:"Choose a group",text:"Neutral prompt",input:"choice",lang:"xx",helperKeys:[],options:[{id:"o1",text:"One"},{id:"o2",text:"Two"}]}});
  const {rerender}=render(createElement(Sort,{task:item,onAnswer:submit}));
  const target=screen.getByRole("button",{name:"Two"});
  fireEvent.drop(target,{dataTransfer:{getData:()=>item.id}});fireEvent.click(target);
  expect(submit).toHaveBeenCalledTimes(1);expect(submit).toHaveBeenCalledWith("o2");
  rerender(createElement(Sort,{task:{...item,id:"next"},onAnswer:submit}));
  fireEvent.click(screen.getByRole("button",{name:"One"}));
  expect(submit).toHaveBeenCalledTimes(2);expect(submit).toHaveBeenLastCalledWith("o1");
 });
 for(const [name,Mechanic] of [["Build",Build],["Order",Order]] as const)it(`${name} supports keyboard tile placement, editing, and one submission`,async()=>{
  const submit=vi.fn();const user=userEvent.setup();render(createElement(Mechanic,{task:sequence(name==="Build"?"build":"order"),onAnswer:submit}));
  const one=screen.getByRole("button",{name:/one · tile 1/u});one.focus();await user.keyboard("{Enter}");
  const two=screen.getByRole("button",{name:/two · tile 2/u});two.focus();await user.keyboard("{Enter}");
  fireEvent.click(screen.getByRole("button",{name:"Move tile 2 earlier"}));
  fireEvent.click(screen.getByRole("button",{name:"Check answer"}));
  fireEvent.click(screen.getByRole("button",{name:"Check answer"}));
  expect(submit).toHaveBeenCalledTimes(1);expect(submit).toHaveBeenCalledWith(["t2","t1"]);
 });
 it("accepts tile drag with a tap alternative and no highlighted slot",()=>{
  const submit=vi.fn();const item=sequence("order");const {container}=render(createElement(Order,{task:item,onAnswer:submit}));
  fireEvent.drop(screen.getByRole("button",{name:"Place next tile"}),{dataTransfer:{getData:()=>`${item.id}|t2`}});
  fireEvent.click(screen.getByRole("button",{name:/one · tile 1/u}));
  fireEvent.click(screen.getByRole("button",{name:"Check answer"}));
  expect(submit).toHaveBeenCalledWith(["t2","t1"]);
  expect(container.innerHTML).not.toMatch(/highlight|chip|tone-fem|correct-slot/u);
 });
 it("never starts listening audio before a gesture, offers source speeds and hides captions",()=>{
  const item=task({mechanic:"listen",question:{instruction:"Listen and type",options:[],input:"text",lang:"xx",helperKeys:[],audio:{src:"/audio/question.mp3",review:"preview",text:"Question secret"},audioRates:[0.8,1,1.2]}});
  const {container}=render(createElement(Listen,{task:item,onAnswer:vi.fn()}));
  expect(container.innerHTML).not.toContain("Question secret");
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"1.2×"}));
  fireEvent.click(screen.getByRole("button",{name:"Play audio"}));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  expect(container.querySelector("audio")?.playbackRate).toBe(1.2);
 });
 it("keeps feedback hidden under disabled state and every interactive target at least44px",()=>{
  const submit=vi.fn();render(createElement(Gap,{task:task(),onAnswer:submit,disabled:true}));
  expect(screen.queryByText("Secret answer")).toBeNull();
  for(const button of screen.getAllByRole("button"))expect(button.style.minHeight).toBe("44px");
  fireEvent.click(screen.getByRole("button",{name:"Check answer"}));expect(submit).not.toHaveBeenCalled();
 });
});
