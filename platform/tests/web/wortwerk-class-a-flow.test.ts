/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
import { parseWortwerkEvidence } from "../../apps/web/lib/wortwerk/learning-state.js";
import { challengeHref, decodeChallenge, encodeChallenge, readPendingAssignments, type BlitzChallenge } from "../../apps/web/lib/wortwerk/challenges.js";
import { decodeReceipt, encodeStudentCode, RECEIPT_DISCLAIMER } from "../../apps/web/lib/wortwerk/receipts.js";
import { decodeScope, encodeScope } from "../../apps/web/lib/wortwerk/links.js";
import { clearOverlayPacks } from "../../packages/wortwerk/src/registry.js";

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
const receiptPath = "../../apps/web/components/wortwerk/ReceiptPanel.js";
const { AssignmentCard } = await import(receiptPath) as { AssignmentCard: ComponentType };
const playerPath = "../../apps/web/components/wortwerk/RunPlayer.js";
const { PlayProvider } = await import(providerPath) as { PlayProvider: ComponentType<{ content: WortwerkContent; children: ReactNode }> };
const { RunPlayer } = await import(playerPath) as { RunPlayer: ComponentType<{ modeOverride?: "blitz" | "puzzle" }> };
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
afterEach(() => { cleanup(); clearOverlayPacks(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

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


const challenge: BlitzChallenge = { v: 1, packId: pack.id, difficultyId: difficulty.id, scope: { v: 1, items: ["w1"] }, score: 7, durationSeconds: 60 };
function openChallenge(value = challenge) { testState.query = challengeHref(value).split("?")[1]!; }
async function finishRun(user: ReturnType<typeof userEvent.setup>) {
  for (let count = 0; count < 25 && !screen.queryByRole("heading", { name: "Daily Run complete" }); count++) await answerCurrent(user);
  expect(screen.getByRole("heading", { name: "Daily Run complete" })).not.toBeNull();
}

describe("Class A assignments and self-reported result codes", () => {
  it("remembers an opened assignment for Today without starting practice, then creates a stable receipt on request", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
    const user = userEvent.setup(); enable();
    testState.query = `assignment=class-task&scope=${encodeScope({ v: 1, count: 5 })}`;
    const preview = mountRun();
    expect(readPendingAssignments(store.getDoc("assignments.pending"))).toMatchObject([{ assignmentId: "class-task", packId: pack.id, scope: { v: 1, count: 5 } }]);
    expect(parseWortwerkEvidence(store.getSnapshot().events)).toEqual({ answers: [], sessions: [] });
    expect(screen.queryByRole("button", { name: "Create a result code" })).toBeNull();
    const pending = store.getDoc("assignments.pending");
    preview.unmount();
    const today = render(createElement(AssignmentCard));
    const continuation = screen.getByRole("link", { name: "Continue assignment class-task" }).getAttribute("href")!;
    expect(new URL(continuation, "https://example.test").searchParams.get("assignment")).toBe("class-task");
    today.unmount(); mountRun();
    expect(store.getDoc("assignments.pending")).toBe(pending);
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    await finishRun(user);
    expect(store.getDoc("assignments.pending")).toBe(pending);
    expect(screen.queryByRole("textbox", { name: "Result code" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Create a result code" }));
    const field = screen.getByRole("textbox", { name: "Result code" }) as HTMLTextAreaElement;
    const code = field.value;
    const evidence = parseWortwerkEvidence(store.getSnapshot().events);
    const session = evidence.sessions.find(row => row.mode === "run")!;
    expect(decodeReceipt(code)).toMatchObject({ packId: pack.id, assignmentId: "class-task", completedAt: session.completedAt, answered: session.answered, correct: session.correct });
    expect(screen.getByText(RECEIPT_DISCLAIMER)).not.toBeNull();
    act(() => { vi.setSystemTime(new Date("2026-10-23T12:05:00.000Z")); store.appendEvent("local.note", { value: "An unrelated local update" }); });
    await user.click(screen.getByRole("button", { name: "Copy result code" }));
    expect(field.value).toBe(code);
  });
  it("remembers a valid assignment even when its requested pack is disabled or unavailable", () => {
    testState.query = `assignment=later-task&pack=not-installed&scope=${encodeScope({ v: 1, lessons: [2] })}`;
    mountRun();
    expect(screen.getByRole("heading", { name: "Choose a content pack" })).not.toBeNull();
    expect(readPendingAssignments(store.getDoc("assignments.pending"))).toMatchObject([{ assignmentId: "later-task", packId: "not-installed", scope: { v: 1, lessons: [2] } }]);
    expect(parseWortwerkEvidence(store.getSnapshot().events)).toEqual({ answers: [], sessions: [] });
  });
  it.each(["***", btoa(JSON.stringify({ v: 2, items: ["w0"] }))])("never remembers an assignment with an invalid or future scope %s", scope => {
    enable(); testState.query = new URLSearchParams({ assignment: "invalid-task", scope }).toString(); mountRun();
    expect(screen.getByRole("alert")).not.toBeNull();
    expect(store.getDoc("assignments.pending")).toBeUndefined();
    expect(store.getSnapshot().events).toHaveLength(0);
  });
  it("does not offer a completion receipt after an audio skip or failed Boss", async () => {
    const user = userEvent.setup(); enable(); testState.forceAudio = true;
    const view = mountRun();
    await user.click(screen.getByRole("button", { name: "Start Daily Run" }));
    await user.click(screen.getByRole("button", { name: "Audio won't play? Skip this task" }));
    for (let count = 0; count < 20 && !screen.queryByRole("heading", { name: "Practice finished with skips" }); count++) await answerCurrent(user);
    expect(screen.getByRole("heading", { name: "Practice finished with skips" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Create a result code" })).toBeNull();
    view.unmount(); testState.forceAudio = false; testState.query = "mode=boss";
    mountRun(); await user.click(screen.getByRole("button", { name: "Start Boss" }));
    for (let index = 0; index < 3; index++) await answerCurrent(user, false);
    expect(screen.getByRole("heading", { name: "Boss round finished" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Create a result code" })).toBeNull();
  });
});

describe("asynchronous Blitz targets are exact comparable contexts", () => {
  it("uses encoded pack and scope instead of stored defaults and shows the target before, during and after play", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] }); vi.setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
    const user = userEvent.setup(); enable();
    store.setDoc("study.scope", { v: 1, items: ["w0"] });
    const other = { ...content.packs[0]!, pack: { ...pack, id: "other-enabled-pack" } };
    store.setDoc("settings", { enabledPackIds: [other.pack.id, pack.id], timeZone: "UTC" });
    store.setDoc("study.pack", other.pack.id);
    // A compact link may omit redundant pack/scope/difficulty query fields.
    testState.query = `challenge=${encodeChallenge(challenge)}`;
    mountRun("blitz", { packs: [other, content.packs[0]!] });
    expect(screen.getByText(/Shared target: 7 correct · 60 seconds/u)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Start Blitz" }));
    expect(screen.getByText("Shared target: 7 correct · 60 seconds.")).not.toBeNull();
    expect((testState.latestTask as GeneratedTask).itemId).toBe("w1");
    expect((testState.latestTask as GeneratedTask).packId).toBe(pack.id);
    await answerCurrent(user);
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.getByRole("heading", { name: "Blitz complete" })).not.toBeNull();
    expect(screen.getByText("Shared target: 7 correct. Your round: 1 correct in the same pack, selection and difficulty.")).not.toBeNull();
  });
  it.each(["pack", "scope", "difficulty"] as const)("rejects conflicting redundant %s rather than showing a false comparison", field => {
    enable(); openChallenge();
    const query = new URLSearchParams(testState.query);
    query.set(field, field === "scope" ? encodeScope({ v: 1, items: ["w0"] }) : "wrong-value");
    testState.query = query.toString(); mountRun("blitz");
    expect(screen.getByRole("alert").textContent).toContain("conflicting");
    expect(screen.queryByRole("button", { name: "Start Blitz" })).toBeNull();
    expect(store.getSnapshot().events).toHaveLength(0);
  });
  it("rejects a target difficulty that does not match the actual available pack", () => {
    enable(); openChallenge({ ...challenge, difficultyId: "uninstalled-level" }); mountRun("blitz");
    expect(screen.getByRole("alert").textContent).toContain("different pack, practice selection or level");
    expect(screen.queryByText(/Shared target:/u)).toBeNull();
  });
  it("rejects invalid and future challenges and never enables a disabled pack", () => {
    enable(); testState.query = "challenge=";
    const invalid = mountRun("blitz"); expect(screen.getByRole("alert")).not.toBeNull(); invalid.unmount();
    testState.query = `challenge=${encodeStudentCode("WWC1", { ...challenge, v: 2 })}`;
    const future = mountRun("blitz"); expect(screen.getByRole("alert").textContent).toContain("update"); future.unmount();
    store.setDoc("settings", { enabledPackIds: [], timeZone: "UTC" }); openChallenge(); mountRun("blitz");
    expect(screen.getByRole("heading", { name: "Choose a content pack" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Start Blitz" })).toBeNull();
  });
  it("creates a base-path-aware challenge only on a copy gesture and exposes an exact-context link", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] }); vi.setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
    vi.stubEnv("NEXT_PUBLIC_GL_PAGES_BASE_PATH", "/german-learning-exam");
    const user = userEvent.setup(); const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    enable(); openChallenge(); mountRun("blitz");
    await user.click(screen.getByRole("button", { name: "Start Blitz" })); await answerCurrent(user);
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.queryByRole("textbox", { name: "Blitz challenge link" })).toBeNull();
    expect(writeText).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Copy Blitz challenge link" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const link = new URL(writeText.mock.calls[0]![0] as string);
    expect(link.pathname).toBe("/german-learning-exam/play/blitz/");
    const target = decodeChallenge(link.searchParams.get("challenge")!);
    expect(target).toEqual({ ...challenge, score: 1 });
    expect(decodeScope(link.searchParams.get("scope")!)).toEqual(challenge.scope);
    expect(link.searchParams.get("pack")).toBe(pack.id);
    expect(link.searchParams.get("difficulty")).toBe(difficulty.id);
    expect(link.href).not.toContain("Name");
    expect((screen.getByRole("textbox", { name: "Blitz challenge link" }) as HTMLTextAreaElement).value).toBe(link.href);
  });
});
