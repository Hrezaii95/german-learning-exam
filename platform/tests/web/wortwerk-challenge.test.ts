/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackText } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask } from "../../packages/wortwerk/src/tasks.js";
import type { WortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import language from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import { parseWortwerkEvidence, recordSession } from "../../apps/web/lib/wortwerk/learning-state.js";
import { boundedRunBonus, selectDailyPuzzle } from "../../packages/learning/src/wortwerk/challenges.js";
import { encodeScope } from "../../apps/web/lib/wortwerk/links.js";
import { clearOverlayPacks, registerOverlayPacks } from "../../packages/wortwerk/src/registry.js";

const testState = vi.hoisted(() => ({ query: "", store: undefined as unknown, latestTask: null as unknown, forceAudio: false, sessionIds: [] as string[] }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(testState.query) }));
vi.mock("../../apps/web/lib/wortwerk/store.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/store.js")>();
  return { ...actual, createUuidV7Factory: () => { const fallback = actual.createUuidV7Factory(); return () => testState.sessionIds.shift() ?? fallback(); }, wortwerkStore: new Proxy({}, { get: (_target, property) => Reflect.get(testState.store as object, property) }) };
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
const { RunPlayer } = await import(playerPath) as { RunPlayer: ComponentType<{ modeOverride?: "blitz" | "puzzle" }> };
const { TodayPanel } = await import(todayPath) as { TodayPanel: ComponentType };
const { ProgressSummary } = await import(progressPath) as { ProgressSummary: ComponentType };
const pack: ContentPack = { ...manifest, items: fixtureItems.filter(item => item.type === "lexeme") } as unknown as ContentPack;
const content: WortwerkContent = { packs: [{ pack, fixture: true, language: language as LanguageProfile, difficulty: difficulty as DifficultyProfile, resources: {} }] };
let store: WortwerkStore;

beforeEach(() => {
  const values = new Map<string, string>();
  store = createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } });
  testState.store = store;
  testState.query = "";
  testState.latestTask = null;
  testState.forceAudio = false;
  testState.sessionIds = [];
  clearOverlayPacks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); clearOverlayPacks(); vi.restoreAllMocks(); vi.useRealTimers(); });

function enable() {
  store.setDoc("settings", { enabledPackIds: [pack.id], timeZone: "UTC" });
  store.setDoc("study.pack", pack.id);
  store.setDoc("study.scope", { v: 1 });
}
function mountRun(modeOverride?: "blitz" | "puzzle", customContent = content) {
  return render(createElement(PlayProvider, { content: customContent, children: createElement(RunPlayer, modeOverride ? { modeOverride } : {}) }));
}
async function answerCurrent(user: ReturnType<typeof userEvent.setup>, correct = true, advance = true) {
  const task = testState.latestTask as GeneratedTask;
  if (!task) throw new Error("Expected materialized task");
  if (task.mechanic === "match") {
    const left = within(screen.getByRole("group", { name: "Left cards" })).getAllByRole("button");
    const order = [...task.solution.order!];
    if (!correct && order.length > 1) [order[0], order[1]] = [order[1]!, order[0]!];
    for (let index = 0; index < left.length; index++) {
      await user.click(left[index]!);
      const right = within(screen.getByRole("group", { name: "Right cards" })).getAllByRole("button");
      await user.click(right[task.question.options.findIndex(option => option.id === order[index])]!);
    }
    await user.click(screen.getByRole("button", { name: "Check pairs" }));
  } else if (task.question.input === "choice") {
    const wanted = task.question.options.findIndex(option => task.solution.optionIds?.includes(option.id) === correct);
    const group = screen.queryByRole("group", { name: "Answer choices" }) ?? screen.getByRole("group", { name: "Answer options" });
    const target = within(group).getAllByRole("button")[wanted];
    if (!target) throw new Error("Expected a valid choice");
    await user.click(target);
  } else {
    await user.type(screen.getByRole("textbox", { name: /^Your (?:answer|response)$/u }), correct ? task.solution.accepted?.[0] ?? "answer" : "intentionally incorrect");
    await user.click(screen.getByRole("button", { name: "Check answer" }));
  }
  const next = screen.queryByRole("button", { name: /^(?:Next task|See results)$/u });
  if (advance && next) await user.click(next);
  return task;
}

describe("Blitz and Boss reuse the practice loop", () => {
  it("keeps a single-item Blitz playable past two answers until time or strikes end it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T12:00:00.000Z"));
    const user = userEvent.setup(); enable();
    testState.query = `scope=${encodeScope({ v: 1, items: [pack.items[0]!.id], skills: ["gender"] })}`;
    mountRun("blitz");
    await user.click(screen.getByRole("button", { name: "Start Blitz" }));
    for (let index = 0; index < 3; index++) await answerCurrent(user);
    expect(screen.queryByRole("heading", { name: "Blitz complete" })).toBeNull();
    expect(screen.getByLabelText("Strikes: 0 of 3")).not.toBeNull();
    expect(parseWortwerkEvidence(store.getSnapshot().events).answers).toHaveLength(3);
    expect(parseWortwerkEvidence(store.getSnapshot().events).sessions[0]).toMatchObject({ mode: "blitz", completed: false });
  });

  it("ends Blitz at the actual deadline after a background pause and saves the valid attempt", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const started = new Date("2026-10-23T12:00:00Z");
    vi.setSystemTime(started);
    const user = userEvent.setup();
    enable();
    mountRun("blitz");
    await user.click(screen.getByRole("button", { name: "Start Blitz" }));
    expect(screen.getByRole("timer").textContent).toBe("60 seconds");
    await answerCurrent(user);
    act(() => { vi.setSystemTime(new Date(started.getTime() + 61_000)); fireEvent.focus(window); });
    expect(screen.getByRole("heading", { name: "Blitz complete" })).not.toBeNull();
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.answers).toHaveLength(1);
    expect(evidence.sessions[0]?.mode).toBe("blitz");
    expect(evidence.sessions[0]?.completed).toBe(true);
    expect(evidence.sessions[0]?.scopeKey).toBe(`${pack.id}:${encodeScope({ v: 1 })}`);
    const summary = store.getSnapshot().events.find(event => event.type === "challenge.completed")?.payload as { endReason: string };
    expect(summary.endReason).toBe("time");
  });

  it("rejects an answer submitted after the deadline even before a timer tick", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const user = userEvent.setup();
    enable();
    mountRun("blitz");
    await user.click(screen.getByRole("button", { name: "Start Blitz" }));
    vi.setSystemTime(new Date("2026-10-23T12:01:01Z"));
    await answerCurrent(user, true, false);
    expect(screen.getByRole("heading", { name: "Blitz complete" })).not.toBeNull();
    expect(parseWortwerkEvidence(store.getSnapshot().events).answers).toHaveLength(0);
  });

  it("skips unavailable source audio without a grade or strike while the Blitz clock continues", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const user = userEvent.setup();
    enable();
    testState.forceAudio = true;
    mountRun("blitz");
    await user.click(screen.getByRole("button", { name: "Start Blitz" }));
    await user.click(screen.getByRole("button", { name: "Audio won't play? Skip this task" }));
    expect(parseWortwerkEvidence(store.getSnapshot().events).answers).toHaveLength(0);
    expect(screen.getByLabelText("Strikes: 0 of 3")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByRole("timer").textContent).toBe("50 seconds");
  });

  it("stops Boss after three strikes and keeps the last answer reveal in the result", async () => {
    const user = userEvent.setup();
    enable();
    testState.query = `mode=boss&pack=${pack.id}`;
    mountRun();
    await user.click(screen.getByRole("button", { name: "Start Boss" }));
    await answerCurrent(user, false);
    expect(screen.getByLabelText("Strikes: 1 of 3")).not.toBeNull();
    await answerCurrent(user, false);
    await answerCurrent(user, false);
    expect(screen.getByRole("heading", { name: "Boss round finished" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Answer feedback" })).not.toBeNull();
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    expect(evidence.answers).toHaveLength(3);
    expect(evidence.sessions[0]?.completed).toBe(false);
    expect(evidence.sessions[0]?.mode).toBe("boss");
  });

  it("shows no strikes in a Daily Run after repeated misses", async () => {
    const user = userEvent.setup();
    enable();
    mountRun();
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    for (let count = 0; count < 3; count++) await answerCurrent(user, false);
    expect(screen.queryByLabelText(/Strikes/u)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Boss round finished" })).toBeNull();
    expect(parseWortwerkEvidence(store.getSnapshot().events).answers).toHaveLength(3);
  });

  it("compares a Blitz ghost only within the same pack, scope and difficulty", async () => {
    enable();
    const now = Date.now();
    for (const [id, scope, difficultyId, correct] of [["same", { v: 1 }, difficulty.id, 3], ["other-scope", { v: 1, lessons: [2] }, difficulty.id, 99], ["other-level", { v: 1 }, "other-difficulty", 100]] as const) {
      recordSession({ sessionId: id, mode: "blitz", startedAt: new Date(now - 60_000).toISOString(), completedAt: new Date(now - 1_000).toISOString(), answered: correct, correct, completed: true, scopeKey: `${pack.id}:${encodeScope(scope as { v: 1; lessons?: number[] })}`, difficultyId });
    }
    mountRun("blitz");
    expect(screen.getByText("Personal best in this scope: 3 correct from 3 answers.")).not.toBeNull();
    expect(screen.queryByText(/99 correct|100 correct/u)).toBeNull();
  });

  it("combines a Boss unit with existing item filters and never broadens an empty intersection", async () => {
    enable();
    const splitPack: ContentPack = { ...pack, units: [...pack.units, { id: "u2", title: "Second unit", canDo: [] }], items: pack.items.map((item, index) => index === 7 ? { ...item, unitId: "u2" } : item) };
    const splitContent: WortwerkContent = { packs: [{ ...content.packs[0]!, pack: splitPack }] };
    testState.query = `mode=boss&unit=u2&scope=${encodeScope({ v: 1, items: [pack.items[0]!.id] })}`;
    const view = mountRun(undefined, splitContent);
    expect((screen.getByRole("button", { name: "Start Boss" }) as HTMLButtonElement).disabled).toBe(true);
    view.unmount();
    testState.query = "mode=boss&unit=u2";
    const user = userEvent.setup();
    mountRun(undefined, splitContent);
    expect(screen.getByText("Boss · Second unit")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Start Boss" }));
    const task = await answerCurrent(user);
    expect(task.itemId).toBe(pack.items[7]!.id);
    expect(screen.getByRole("heading", { name: "Boss complete" })).not.toBeNull();
    expect(parseWortwerkEvidence(store.getSnapshot().events).sessions[0]?.completed).toBe(true);
  });
});

describe("Daily puzzle", () => {
  it("uses exactly six fixed date/pack tasks independently of progress and scope, and copies only a share grid", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const user = userEvent.setup();
    enable();
    testState.query = `scope=${encodeScope({ v: 1, items: ["not-in-pack"], tags: ["not-a-topic"] })}`;
    const first = mountRun("puzzle");
    expect(screen.getByText(/6 eligible tasks/u)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Start Daily puzzle" }));
    const before: Array<{ item: string; template: string; question: unknown }> = [];
    for (let count = 0; count < 6; count++) {
      const task = await answerCurrent(user);
      before.push({ item: task.itemId, template: task.templateId, question: task.question });
    }
    expect(screen.getByRole("heading", { name: "Daily puzzle complete" })).not.toBeNull();
    expect(Array.from(screen.getByLabelText("Puzzle share grid").textContent ?? "")).toHaveLength(6);
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Copy result grid" }));
    expect(write).toHaveBeenCalledExactlyOnceWith("Wortwerk · 2026-10-23\n🟩🟩🟩🟩🟩🟩");
    first.unmount();
    expect(parseWortwerkEvidence(store.getSnapshot().events).answers).toHaveLength(6);
    mountRun("puzzle");
    await user.click(screen.getByRole("button", { name: "Start Daily puzzle" }));
    const after: typeof before = [];
    for (let count = 0; count < 6; count++) {
      const task = await answerCurrent(user);
      after.push({ item: task.itemId, template: task.templateId, question: task.question });
    }
    expect(after).toEqual(before);
    expect(parseWortwerkEvidence(store.getSnapshot().events).sessions.every(session => session.mode === "free")).toBe(true);
    expect(screen.queryByLabelText(/Strikes/u)).toBeNull();
  });

  it("uses the actual local date when starting after midnight without a clock tick", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-22T23:59:59Z"));
    const user = userEvent.setup();
    enable();
    mountRun("puzzle");
    expect(screen.getByText(/2026-10-22/u)).not.toBeNull();
    vi.setSystemTime(new Date("2026-10-23T00:00:01Z"));
    await user.click(screen.getByRole("button", { name: "Start Daily puzzle" }));
    const first = testState.latestTask as GeneratedTask;
    expect(first.itemId).toBe(selectDailyPuzzle(pack.id, pack.items.map(item => item.id), "2026-10-23")[0]);
  });

  it("uses the learner's local calendar date and stays unavailable with fewer than six items", () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-23T02:30:00Z"));
    enable();
    store.setDoc("settings", { enabledPackIds: [pack.id], timeZone: "America/New_York" });
    const view = mountRun("puzzle");
    expect(screen.getByText(/2026-10-22/u)).not.toBeNull();
    view.unmount();
    const small: WortwerkContent = { packs: [{ ...content.packs[0]!, pack: { ...pack, items: pack.items.slice(0, 5) } }] };
    mountRun("puzzle", small);
    expect(screen.getByText(/needs six eligible objective tasks/u)).not.toBeNull();
    expect((screen.getByRole("button", { name: "Start Daily puzzle" }) as HTMLButtonElement).disabled).toBe(true);
  });
});


describe("bounded optional Run bonus", () => {
  it("offers three extra tasks after an eligible full Run, never adds comebacks, and keeps the goal complete", async () => {
    const user = userEvent.setup();
    const parentId = Array.from({ length: 100 }, (_, index) => `bonus-parent-${index}`).find(id => boundedRunBonus(id).eligible)!;
    testState.sessionIds = [parentId, "bonus-child"];
    enable(); mountRun();
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    for (let count = 0; count < 20 && !screen.queryByRole("heading", { name: "Daily Run complete" }); count++) await answerCurrent(user);
    expect(screen.getByRole("heading", { name: "Daily Run complete" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Back to map" }).getAttribute("href")).toBe("/play/map");
    const before = parseWortwerkEvidence(store.getSnapshot().events);
    expect(before.sessions.find(row => row.sessionId === parentId)?.completed).toBe(true);
    await user.click(screen.getByRole("button", { name: "Optional bonus · 3 tasks · up to 30 extra XP" }));
    expect(screen.getByRole("progressbar", { name: "Practice progress" }).getAttribute("max")).toBe("3");
    await answerCurrent(user, false);
    await answerCurrent(user);
    await answerCurrent(user);
    expect(screen.getByRole("heading", { name: "Bonus round complete" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Optional bonus|Fix these/u })).toBeNull();
    const after = parseWortwerkEvidence(store.getSnapshot().events);
    expect(after.answers.filter(row => row.sessionId === "bonus-child")).toHaveLength(3);
    expect(after.sessions.find(row => row.sessionId === "bonus-child")).toMatchObject({ mode: "free", bonusOf: parentId, answered: 3 });
    expect(after.sessions.filter(row => row.mode === "run" && row.completed)).toHaveLength(1);
  });
  it("excludes self-only reading from the public six-item puzzle", () => {
    const original = fixtureItems.find(item => item.type === "text") as unknown as PackText;
    if (original.type !== "text") throw new Error("Expected authored text");
    const { questions: _questions, audio: _audio, ...text } = original;
    const selfOnlyText = { ...text, body: "One source paragraph." };
    const short = { ...pack, items: [...pack.items.slice(0, 5), selfOnlyText] } as ContentPack;
    enable(); mountRun("puzzle", { packs: [{ ...content.packs[0]!, pack: short }] });
    expect(screen.getByText(/0 eligible tasks/u)).not.toBeNull();
    expect((screen.getByRole("button", { name: "Start Daily puzzle" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
