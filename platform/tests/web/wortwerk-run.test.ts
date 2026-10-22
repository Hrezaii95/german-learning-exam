/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType, type ReactNode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask } from "../../packages/wortwerk/src/tasks.js";
import type { WortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import language from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import { parseWortwerkEvidence, deriveWortwerkState } from "../../apps/web/lib/wortwerk/learning-state.js";
import { encodeScope } from "../../apps/web/lib/wortwerk/links.js";
import { clearOverlayPacks, registerOverlayPacks } from "../../packages/wortwerk/src/registry.js";

const testState = vi.hoisted(() => ({ query: "", store: undefined as unknown, latestTask: null as unknown, forceAudio: false }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(testState.query) }));
vi.mock("../../apps/web/lib/wortwerk/store.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/store.js")>();
  return { ...actual, wortwerkStore: new Proxy({}, { get: (_target, property) => Reflect.get(testState.store as object, property) }) };
});
vi.mock("../../apps/web/lib/wortwerk/runtime.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/runtime.js")>();
  return { ...actual, materializeTask: (...args: Parameters<typeof actual.materializeTask>) => {
    const task = actual.materializeTask(...args);
    if (task && testState.forceAudio) task.question.audio = { src: "/missing-test-clip.mp3", review: "preview" };
    testState.latestTask = task;
    return task;
  } };
});

const providerPath = "../../apps/web/components/wortwerk/PlayProvider.js";
const homePath = "../../apps/web/components/wortwerk/PlayHome.js";
const playerPath = "../../apps/web/components/wortwerk/RunPlayer.js";
const todayPath = "../../apps/web/components/wortwerk/TodayPanel.js";
const progressPath = "../../apps/web/components/wortwerk/ProgressSummary.js";
const { PlayProvider } = await import(providerPath) as { PlayProvider: ComponentType<{ content: WortwerkContent; children: ReactNode }> };
const { PlayHome, PlayPackSettings } = await import(homePath) as { PlayHome: ComponentType; PlayPackSettings: ComponentType };
const { RunPlayer } = await import(playerPath) as { RunPlayer: ComponentType };
const { TodayPanel } = await import(todayPath) as { TodayPanel: ComponentType };
const { ProgressSummary } = await import(progressPath) as { ProgressSummary: ComponentType };
const pack: ContentPack = { ...manifest, items: fixtureItems } as unknown as ContentPack;
const content: WortwerkContent = { packs: [{ pack, fixture: true, language: language as LanguageProfile, difficulty: difficulty as DifficultyProfile, resources: {} }] };
let store: WortwerkStore;

beforeEach(() => {
  const values = new Map<string, string>();
  store = createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } });
  testState.store = store;
  testState.query = "";
  testState.latestTask = null;
  testState.forceAudio = false;
  clearOverlayPacks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); clearOverlayPacks(); vi.restoreAllMocks(); });

function mount(component: ComponentType) {
  return render(createElement(PlayProvider, { content, children: createElement(component) }));
}
function enable() {
  store.setDoc("settings", { enabledPackIds: [pack.id] });
  store.setDoc("study.pack", pack.id);
}
async function answerCurrent(user: ReturnType<typeof userEvent.setup>, correct = true) {
  const task = testState.latestTask as GeneratedTask;
  if (!task) throw new Error("Expected materialized task");
  if (task.question.input === "choice") {
    const wanted = task.question.options.findIndex(option => task.solution.optionIds?.includes(option.id) === correct);
    const choices = within(screen.getByRole("group", { name: "Answer choices" })).getAllByRole("button");
    const target = choices[wanted];
    if (!target) throw new Error("Expected a valid choice");
    await user.click(target);
  } else {
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), correct ? task.solution.accepted?.[0] ?? "answer" : "intentionally incorrect");
    await user.click(screen.getByRole("button", { name: "Check answer" }));
  }
  const next = screen.getByRole("button", { name: /^(?:Next task|See results)$/u });
  await user.click(next);
  return task;
}

async function finish(user: ReturnType<typeof userEvent.setup>) {
  for (let count = 0; count < 25 && !screen.queryByRole("heading", { name: /^(?:Daily Run|Quick review|Finisher) complete$/u }); count++) await answerCurrent(user);
  expect(screen.getByRole("heading", { name: /^(?:Daily Run|Quick review|Finisher) complete$/u })).not.toBeNull();
}

describe("Wortwerk pack choice and panels", () => {
  it("accepts class extras when profiles exist before the course pack", () => {
    const profile = { ...difficulty, id: "registered-profile" } as DifficultyProfile;
    const overlay = { ...pack, id: "class-extra", title: "Class extra", difficulty: profile.id };
    render(createElement(PlayProvider, { content: { packs: [], languages: [language as LanguageProfile], difficulties: [profile] }, children: createElement(PlayPackSettings) }));
    act(() => registerOverlayPacks([overlay]));
    expect(screen.getByRole("checkbox", { name: "Enable Class extra" })).not.toBeNull();
  });
  it("keeps pending fixtures disabled until the learner explicitly enables one", async () => {
    const user = userEvent.setup();
    const view = mount(PlayPackSettings);
    const checkbox = screen.getByRole("checkbox", { name: /Fixture only/u }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(store.getDoc("settings")).toBeUndefined();
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(store.getDoc<{ enabledPackIds: string[] }>("settings")?.enabledPackIds).toEqual([pack.id]);
    view.rerender(createElement(PlayProvider, { content, children: createElement(PlayHome) }));
    expect(screen.getByRole("link", { name: "Preview Daily Run" })).not.toBeNull();
    expect(screen.getByText(/15 eligible tasks/u)).not.toBeNull();
  });

  it("updates same-tab class overlays without enabling pending extras automatically", () => {
    mount(PlayPackSettings);
    const overlay: ContentPack = { ...pack, id: "class-demo-extra", title: "Class practice", items: pack.items.map(item => ({ ...item, source: "teacher-extra" })) };
    act(() => registerOverlayPacks([overlay]));
    const checkbox = screen.getByRole("checkbox", { name: /Class practice/u }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("allows both dashboard panels to render without a PlayProvider", () => {
    render(createElement("div", null, createElement(TodayPanel), createElement(ProgressSummary)));
    expect(screen.getByRole("link", { name: "Open today's practice" })).not.toBeNull();
    expect(screen.getByText("Available after a week")).not.toBeNull();
  });
});

describe("Daily Run", () => {
  it("does not open a disabled fixture through a direct practice link", () => {
    testState.query = `pack=${pack.id}`;
    mount(RunPlayer);
    expect(screen.getByRole("heading", { name: "Choose a content pack" })).not.toBeNull();
    expect(store.getSnapshot().events).toHaveLength(0);
  });

  it("shows a helpful update message for future scope versions", () => {
    testState.query = `scope=${btoa(JSON.stringify({ v: 2 })).replace(/=+$/u, "")}`;
    mount(RunPlayer);
    expect(screen.getByRole("alert").textContent).toContain("Please update");
  });

  it("records five Quick review answers, keeps the streak, and leaves the full Run goal separate", async () => {
    const user = userEvent.setup();
    enable();
    testState.query = `mode=quick&pack=${pack.id}&scope=${encodeScope({v:1,skills:["meaning"]})}`;
    mount(RunPlayer);
    expect(screen.getByRole("heading", { name: "Your practice preview" })).not.toBeNull();
    expect(store.getSnapshot().events).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Start Quick review" }));
    expect(parseWortwerkEvidence(store.getSnapshot().events).sessions[0]?.completed).toBe(false);
    await finish(user);
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.answers).toHaveLength(5);
    expect(evidence.sessions[0]?.completed).toBe(true);
    const state = deriveWortwerkState(store.getSnapshot(), { now: new Date(), timeZone: "UTC" });
    expect(state.habit.streak).toBe(1);
    expect(state.habit.goalComplete).toBe(false);
  });

  it("returns a miss after other cards in a different format and records the corrected retrieval", async () => {
    const user = userEvent.setup();
    enable();
    testState.query = `pack=${pack.id}&scope=${encodeScope({ v: 1, skills:["meaning"], count: 8 })}`;
    mount(RunPlayer);
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    const missed = await answerCurrent(user, false);
    await finish(user);
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    const comebackIndex = evidence.answers.findIndex((answer, index) => index > 0 && answer.itemId === missed.itemId && answer.dimension === missed.dimension);
    expect(comebackIndex).toBeGreaterThanOrEqual(4);
    expect(comebackIndex).toBeLessThanOrEqual(7);
    expect(evidence.answers[comebackIndex]?.format).not.toBe(missed.format);
    expect(evidence.answers[comebackIndex]?.corrected).toBe(true);
    expect(evidence.answers).toHaveLength(9);
    expect(deriveWortwerkState(store.getSnapshot(), { now: new Date(), timeZone: "UTC" }).habit.goalComplete).toBe(true);
  });

  it("offers a finite optional finisher for a late miss", async () => {
    const user = userEvent.setup();
    enable();
    testState.query = `pack=${pack.id}&scope=${encodeScope({ v: 1, skills:["meaning"], count: 5 })}`;
    mount(RunPlayer);
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    for (let index = 0; index < 4; index++) await answerCurrent(user);
    await answerCurrent(user, false);
    const finisher = screen.getByRole("button", { name: "Fix these 1 words · optional" });
    const originalSession = parseWortwerkEvidence(store.getSnapshot().events).sessions[0];
    expect(originalSession?.completed).toBe(true);
    await user.click(finisher);
    await finish(user);
    expect(screen.queryByRole("button", { name: /Fix these/u })).toBeNull();
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.sessions).toHaveLength(2);
    expect(evidence.sessions[1]?.mode).toBe("free");
    expect(evidence.answers.at(-1)?.corrected).toBe(true);
  });

  it("emits assignment progress after the answer and after completion", async () => {
    const user = userEvent.setup();
    enable();
    testState.query = `pack=${pack.id}&assignment=homework-1&scope=${encodeScope({ v: 1, skills:["meaning"], count: 1 })}`;
    mount(RunPlayer);
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    await answerCurrent(user);
    const progress = store.getSnapshot().events.filter(event => event.type === "assignment.progress").map(event => event.payload as { answered: number; correct: number; completed: boolean; bySkill: Record<string, { answered: number; correct: number }> });
    expect(progress).toHaveLength(2);
    expect(progress.map(row => row.completed)).toEqual([false, true]);
    expect(progress.every(row => row.answered === 1 && row.correct === 1)).toBe(true);
    expect(Object.values(progress[1]!.bySkill).reduce((total, skill) => total + skill.answered, 0)).toBe(1);
  });

  it("keeps the streak after seven real answers and one audio skip while leaving the goal and assignment open", async () => {
    const user=userEvent.setup();enable();testState.forceAudio=true;
    testState.query=`pack=${pack.id}&assignment=skip-assignment&scope=${encodeScope({v:1,skills:["meaning"],count:8})}`;
    mount(RunPlayer);await user.click(screen.getByRole("button",{name:"Start Daily Run"}));
    for(let index=0;index<7;index++)await answerCurrent(user);
    await user.click(screen.getByRole("button",{name:"Audio won't play? Skip this task"}));
    expect(screen.getByRole("heading",{name:"Practice finished with skips"})).not.toBeNull();
    const evidence=parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.answers).toHaveLength(7);expect(evidence.sessions[0]).toMatchObject({answered:7,completed:false});
    expect(deriveWortwerkState(store.getSnapshot(),{now:new Date(),timeZone:"UTC"}).habit).toMatchObject({streak:1,goalRuns:0,goalComplete:false});
    const progress=store.getSnapshot().events.filter(event=>event.type==="assignment.progress").map(event=>event.payload as {answered:number;completed:boolean});
    expect(progress.at(-1)).toMatchObject({answered:7,completed:false});expect(progress.some(row=>row.completed)).toBe(false);
  });

  it("persists a meaningful streak after five answers even when the learner abandons the unfinished Run", async () => {
    const user=userEvent.setup();enable();
    testState.query=`pack=${pack.id}&scope=${encodeScope({v:1,skills:["meaning"],count:8})}`;
    const view=mount(RunPlayer);await user.click(screen.getByRole("button",{name:"Start Daily Run"}));
    for(let index=0;index<5;index++)await answerCurrent(user);
    expect(screen.queryByRole("heading",{name:"Daily Run complete"})).toBeNull();
    view.unmount();
    const evidence=parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.answers).toHaveLength(5);expect(evidence.sessions[0]).toMatchObject({answered:5,completed:false});
    const updates=store.getSnapshot().events.filter(event=>event.type==="session").map(event=>(event.payload as {answered:number}).answered);
    expect(updates).toEqual([0,1,2,3,4,5]);
    expect(deriveWortwerkState(store.getSnapshot(),{now:new Date(),timeZone:"UTC"}).habit).toMatchObject({streak:1,goalRuns:0,goalComplete:false});
  });

  it("skips a failed source clip without a grade or completed assignment claim", async () => {
    const user = userEvent.setup();
    enable();
    testState.forceAudio = true;
    testState.query = `pack=${pack.id}&assignment=homework-1&scope=${encodeScope({ v: 1, skills:["meaning"], count: 1 })}`;
    mount(RunPlayer);
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    await user.click(screen.getByRole("button", { name: "Audio won't play? Skip this task" }));
    expect(screen.getByRole("heading", { name: "Practice finished with skips" })).not.toBeNull();
    const events = store.getSnapshot().events;
    expect(parseWortwerkEvidence(events).sessions[0]?.completed).toBe(false);
    expect(events.filter(event => event.type === "answer")).toHaveLength(0);
    const assignment = events.find(event => event.type === "assignment.progress")?.payload as { answered: number; completed: boolean };
    expect(assignment.answered).toBe(0);
    expect(assignment.completed).toBe(false);
  });
});
