/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server";
import type { PlayScope } from "../../apps/web/lib/wortwerk/links";
type PlayContextValue = WortwerkContent & { enabledPacks: WortwerkContent["packs"]; selectedPack: WortwerkContent["packs"][number] | undefined; scope: PlayScope; hydrated: boolean; setPackEnabled:(id:string,enabled:boolean)=>void; selectPack:(id:string)=>void; refreshOverlays:()=>void };
import type { PlayPack } from "../../apps/web/lib/wortwerk/content.server";
import type { SyncEvent } from "../../apps/web/lib/wortwerk/sync-store";
import profileData from "../../content/languages/de.json";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import { getLiteracyTemplate } from "../../packages/wortwerk/src/templates/literacy.js";
import { seededRng } from "../../packages/wortwerk/src/random.js";
import * as runtime from "../../apps/web/lib/wortwerk/runtime";
import { deriveWortwerkState, parseWortwerkEvidence } from "../../apps/web/lib/wortwerk/learning-state";
import { createWortwerkStore, wortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { playableCapabilities } from "../../apps/web/lib/wortwerk/runtime";
import { parseExamResource, parseStoryResource, assertPackResource, examItemRefs } from "../../apps/web/lib/wortwerk/resources";
import { validatePack } from "../../packages/content/src/validation/packs.js";
import { checkPackSchema } from "../../packages/content/src/validation/packs-schema.js";
import storySchema from "../../packages/content/src/validation/story-resource.schema.json";
import examSchema from "../../packages/content/src/validation/exam-resource.schema.json";
const explorePanelPath = "../../apps/web/components/wortwerk/ExplorePanel.js";
const { ExplorePanel } = await import(explorePanelPath) as { ExplorePanel: ComponentType<{ view: "map" | "journey" | "skills" | "progress" }> };
const storyPanelPath = "../../apps/web/components/wortwerk/StoryPanel.js";
const { StoryPanel } = await import(storyPanelPath) as { StoryPanel: ComponentType<Record<string, never>> };
const examPanelPath = "../../apps/web/components/wortwerk/ExamPanel.js";
const { ExamPanel } = await import(examPanelPath) as { ExamPanel: ComponentType<Record<string, never>> };

const context = vi.hoisted(() => ({ current: null as PlayContextValue | null, state: null as unknown }));
vi.mock("../../apps/web/components/wortwerk/PlayProvider", () => ({ usePlayContent: () => context.current }));
vi.mock("../../apps/web/lib/wortwerk/use-wortwerk", () => ({ useWortwerkState: () => context.state }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => createElement("a", props, children) }));
const now = new Date("2026-10-22T12:00:00Z");
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "fixture", optionsCount: 4, timerSeconds: 60, audioSpeedRange: [0.7, 1], hintsAllowed: true, maxPassageLength: 200, distractorCloseness: 1, typedAnswerRatio: 0 };
let selected: PlayPack;
let emitted: SyncEvent[];
function installState(pack: PlayPack = selected) {
  const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined }, { now: () => now });
  const capabilities = playableCapabilities(pack.pack, pack.language, pack.difficulty);
  context.state = { ...deriveWortwerkState(store.getSnapshot(), { capabilities, now, timeZone: "UTC" }), now, timeZone: "UTC", hydrated: true };
  context.current = { packs: [pack], enabledPacks: [pack], selectedPack: pack, scope: { v: 1 }, hydrated: true, setPackEnabled: () => undefined, selectPack: () => undefined, refreshOverlays: () => undefined };
}
beforeEach(() => {
  selected = { pack: { ...manifest, items: fixtureItems } as ContentPack, language: profileData as LanguageProfile, difficulty, fixture: true, resources: {} };
  emitted = [];
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  installState();
  vi.spyOn(wortwerkStore, "appendEvent").mockImplementation((type, payload) => {
    const event: SyncEvent = { id: `event-${emitted.length + 1}`, store: "wortwerk", deviceId: "fixture", schemaVersion: 1, createdAt: new Date().toISOString(), type, payload };
    emitted.push(event); return event;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Wortwerk authored resource validation", () => {
  it("validates story references, unit gates, duplicate ids and the JSON schema", () => {
    const resource = { schemaVersion: 1, title: "Source story", chapters: [{ id: "one", title: "Source chapter", unitId: "u1", itemRefs: ["dialogue1", "text1", "s1"], requires: { unitId: "u1", securedRatio: 0 } }] };
    expect(parseStoryResource(resource, selected.pack).issues).toEqual([]);
    expect(checkPackSchema(resource, storySchema)).toEqual([]);
    expect(parseStoryResource({ ...resource, schemaVersion: 2 }, selected.pack).value).toBeNull();
    expect(parseStoryResource({ ...resource, chapters: [{ ...resource.chapters[0], itemRefs: ["w0"] }] }, selected.pack).value).toBeNull();
    expect(parseStoryResource({ ...resource, chapters: [resource.chapters[0], resource.chapters[0]] }, selected.pack).value).toBeNull();
    expect(parseStoryResource({ ...resource, chapters: [{ ...resource.chapters[0], requires: { unitId: "missing", securedRatio: 2 } }] }, selected.pack).value).toBeNull();
  });
  it("validates additive badge definitions and rejects duplicate or unsafe requirements", () => {
    const pack: ContentPack = { ...selected.pack, badges: [{ id: "badge", title: "Fixture badge", requirement: { type: "secured", count: 1, filters: [{ field: "forms.pluralPattern", value: "fixture" }] } }] };
    expect(validatePack(pack, selected.language)).toEqual([]);
    expect(validatePack({ ...pack, badges: [...pack.badges!, ...pack.badges!] }, selected.language).some(issue => issue.code === "DUPLICATE_ID")).toBe(true);
    expect(validatePack({ ...pack, badges: [{ ...pack.badges![0], requirement: { type: "streak", days: 0 } }] }, selected.language).length).toBeGreaterThan(0);
    expect(validatePack({ ...pack, badges: [{ ...pack.badges![0], requirement: { type: "secured", count: 1, filters: [{ field: "field[expression]", value: "x" }] } }] }, selected.language).some(issue => issue.code === "BADGE_FILTER")).toBe(true);
  });
  it("rejects unsafe source card navigation in both schema and custom validation", () => {
    for (const href of ["javascript:alert(1)", "//outside.test/path", "/\\outside.test", "/path with-space", "/path\u0000", "/path\u007f"]) {
      const pack = { ...selected.pack, items: selected.pack.items.map(item => item.id === "w0" ? { ...item, sourceRef: { cardId: "source", href, lessons: [1], sources: ["course"] } } : item) };
      expect(validatePack(pack, selected.language).some(issue => issue.path.includes("sourceRef.href"))).toBe(true);
    }
    expect(validatePack(selected.pack, selected.language)).toEqual([]);
  });
  it("validates examTask references and detects missing refs and cycles", () => {
    const resource = { schemaVersion: 1, title: "Source exam", taskRefs: ["exam1"] };
    expect(parseExamResource(resource, selected.pack).issues).toEqual([]);
    expect(checkPackSchema(resource, examSchema)).toEqual([]);
    expect(examItemRefs(selected.pack, "exam1")).toEqual(["text1"]);
    expect(parseExamResource({ ...resource, taskRefs: ["w0"] }, selected.pack).value).toBeNull();
    const cyclic = { ...selected.pack, items: selected.pack.items.map(item => item.id === "exam1" ? { ...item, type: "examTask" as const, section: "reading", timing: 1, itemRefs: ["exam1"] } : item) };
    expect(parseExamResource(resource, cyclic).issues.some(issue => issue.message.includes("Cyclic"))).toBe(true);
    expect(() => assertPackResource({ ...resource, taskRefs: ["missing"] }, "exam", selected.pack)).toThrow(/Invalid exam resource/);
  });
});

describe("Wortwerk exploration panels", () => {
  it("shows a pack choice when no enabled pack exists", () => {
    context.current = null;
    render(createElement(ExplorePanel, { view: "map" }));
    expect(screen.getByRole("link", { name: "Choose a pack" }).getAttribute("href")).toBe("/play/packs");
  });
  it("renders authored map cells, data-driven dimension segments and source links", () => {
    render(createElement(ExplorePanel, { view: "map" }));
    expect(screen.getByRole("heading", { name: "Your map", level: 1 })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Next milestone" })).not.toBeNull();
    expect(screen.getAllByText(/○ new/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Source card" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Practise this pattern" }).getAttribute("href")).toContain("/play/run?scope=");
  });
  it("suppresses unsafe source links even for an invalid direct UI payload", () => {
    selected.pack = { ...selected.pack, items: selected.pack.items.map(item => item.id === "w0" ? { ...item, sourceRef: { cardId: "source", href: "javascript:alert(1)", lessons: [1], sources: ["course"] } } : item) };
    installState(); render(createElement(ExplorePanel, { view: "map" }));
    expect([...document.querySelectorAll("a")].every(link => !link.getAttribute("href")?.startsWith("javascript:"))).toBe(true);
  });
  it.each(["journey", "skills"] as const)("renders %s from pack and capability data", view => {
    render(createElement(ExplorePanel, { view }));
    expect(screen.getByRole("heading", { level: 1 })).not.toBeNull();
    if (view === "journey") expect(screen.getByText(/Unit boss unlocks at 80% secured/)).not.toBeNull();
    else expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
  });
  it("shows private metrics, finite quests, collection and a local calendar reminder", () => {
    const createUrl = vi.fn(() => "blob:reminder");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(createElement(ExplorePanel, { view: "progress" }));
    expect(screen.getByRole("heading", { name: "Your learning, on this device" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Small quests for today" })).not.toBeNull();
    expect(screen.getByText("0 / 8 cards collected through unhinted retrieval.")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add daily reminder to my calendar" }));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("calendar file is ready");
  });
});

describe("Wortwerk authored story", () => {
  it("does not manufacture story content when a resource is absent", () => {
    render(createElement(StoryPanel));
    expect(screen.getByText("No story has been authored for this pack yet.")).not.toBeNull();
  });
  it("keeps chapters gated by unit mastery and reads only referenced source content", () => {
    selected.resources.story = { schemaVersion: 1, title: "Source story", chapters: [{ id: "locked", title: "Locked chapter", unitId: "u1", itemRefs: ["dialogue1"] }, { id: "open", title: "Open chapter", unitId: "u1", itemRefs: ["dialogue1"], requires: { unitId: "u1", securedRatio: 0 } }] };
    installState(); render(createElement(StoryPanel));
    const buttons = screen.getAllByRole("button", { name: "Open chapter" });
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(buttons[1]!);
    const dialogue = selected.pack.items.find(item => item.id === "dialogue1");
    const turn = dialogue?.type === "dialogue" ? dialogue.turns[0]! : null;
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === `${turn?.speaker}: ${turn?.text}`)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Finish chapter" }));
    expect(emitted.some(event => event.type === "story.chapter" && (event.payload as { chapterId: string }).chapterId === "open")).toBe(true);
  });
});

describe("Wortwerk timed exam simulation", () => {
  function prepareExam() {
    selected.pack = { ...selected.pack, items: selected.pack.items.map(item => item.id === "exam1" ? { ...item, type: "examTask" as const, section: "vocabulary", timing: 2, itemRefs: ["w0"], scoring: { maxScore: 1, pointsPerItem: 1 } } : item) };
    selected.resources.exam = { schemaVersion: 1, title: "Source exam", taskRefs: ["exam1"] };
    installState();
  }
  it("uses authored elapsed timing, rejecting answers after the section deadline", () => {
    vi.useFakeTimers(); vi.setSystemTime(now); prepareExam();
    render(createElement(ExamPanel));
    fireEvent.click(screen.getByRole("button", { name: "Start exam simulation" }));
    expect(screen.getByRole("timer").textContent).toBe("0:02");
    expect(document.querySelector(".ww-corners__prompt")?.textContent).toContain("Name");
    expect(document.querySelector(".ww-corners__prompt")?.textContent).not.toContain("der Name");
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.getByRole("heading", { name: "Section finished" })).not.toBeNull();
    expect(screen.getByText(/Time finished/)).not.toBeNull();
    expect(emitted.filter(event => event.type === "answer")).toHaveLength(0);
  });
  it("records writing as a self-check with no objective points or recall milestone", () => {
    vi.useFakeTimers(); vi.setSystemTime(now); prepareExam();
    selected.pack = { ...selected.pack, items: selected.pack.items.map(item => item.id === "exam1" ? { ...item, type: "examTask" as const, section: "writing", timing: 60, itemRefs: ["write1"] } : item) };
    const template = getLiteracyTemplate("write.prompt")!;
    const originalCapabilities = runtime.playableCapabilities;
    const originalMaterialize = runtime.materializeTask;
    const originalTemplate = runtime.templateFor;
    vi.spyOn(runtime, "playableCapabilities").mockImplementation((pack, language, difficulty, scope) => {
      const rows = originalCapabilities(pack, language, difficulty, scope);
      return rows.some(row => row.itemId === "write1") ? rows : [...rows, { packId: pack.id, itemId: "write1", dimensions: [template.dimension], templates: [{ id: template.id, dimension: template.dimension, skill: template.skill, format: template.format }] }];
    });
    vi.spyOn(runtime, "materializeTask").mockImplementation((task, pack, language, difficulty, seed) => task.templateId === template.id ? template.generate(pack.items.find(item => item.id === task.itemId)!, pack, language, difficulty, seededRng(seed)) : originalMaterialize(task, pack, language, difficulty, seed));
    vi.spyOn(runtime, "templateFor").mockImplementation(id => id === template.id ? template : originalTemplate(id));
    installState(); render(createElement(ExamPanel));
    fireEvent.click(screen.getByRole("button", { name: "Start exam simulation" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your response" }), { target: { value: "My independent response." } });
    fireEvent.click(screen.getByRole("button", { name: "Compare with the model" }));
    for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "I covered these points" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Production self-checks receive no objective score.")).not.toBeNull();
    expect(screen.getByText("1 production self-check recorded separately.")).not.toBeNull();
    expect(parseWortwerkEvidence(emitted).answers[0]).toMatchObject({ hinted: true, skill: "writing" });
  });
  it("scores exact source-backed sentence writing objectively while preserving its raw evidence", () => {
    vi.useFakeTimers(); vi.setSystemTime(now); prepareExam();
    selected.pack = { ...selected.pack, items: selected.pack.items.map(item => item.id === "exam1" ? { ...item, type: "examTask" as const, section: "writing", timing: 60, itemRefs: ["s1"] } : item) };
    const sentence = selected.pack.items.find(item => item.id === "s1");
    if (sentence?.type !== "sentence") throw new Error("Expected authored sentence");
    installState(); render(createElement(ExamPanel));
    fireEvent.click(screen.getByRole("button", { name: "Start exam simulation" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your response" }), { target: { value: sentence.text } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Objective answers: 1 / 1 · points 1 / 1.")).not.toBeNull();
    expect(screen.queryByText(/production self-check recorded/)).toBeNull();
    const evidence = parseWortwerkEvidence(emitted).answers[0];
    expect(evidence).toMatchObject({ skill: "writing", templateId: "write.sentence", correct: true, hinted: false });
    expect(evidence).not.toHaveProperty("selfAssessed");
  });
  it("runs actual generated tasks and records objective section results separately from self-checks", () => {
    vi.useFakeTimers(); vi.setSystemTime(now); prepareExam();
    render(createElement(ExamPanel));
    fireEvent.click(screen.getByRole("button", { name: "Start exam simulation" }));
    fireEvent.click(screen.getByRole("button", { name: "der · Masculine" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Objective answers: 1 / 1 · points 1 / 1.")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Finish exam practice" }));
    expect(screen.getByRole("heading", { name: "Exam practice finished" })).not.toBeNull();
    expect(emitted.filter(event => event.type === "answer")).toHaveLength(1);
    expect(emitted.some(event => event.type === "exam.completed")).toBe(true);
    expect(emitted.filter(event => event.type === "session").map(event => (event.payload as { mode: string }).mode)).toEqual(["free", "free"]);
  });
});


it("keeps practice restore available before any pending pack is enabled", () => {
  context.current = { ...context.current!, enabledPacks: [], selectedPack: undefined };
  render(createElement(ExplorePanel, { view: "progress" }));
  expect(screen.getByRole("heading", { name: "Practice backup" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "Import practice JSON" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "Download practice JSON" })).not.toBeNull();
});

it("retains a staged backup when restoring pack selection changes the progress subtree", async () => {
  const incoming = createWortwerkStore({ getItem: () => null, setItem: () => undefined });
  incoming.setDoc("settings", { enabledPackIds: [selected.pack.id] });
  context.current = { ...context.current!, enabledPacks: [], selectedPack: undefined };
  const view = render(createElement(ExplorePanel, { view: "progress" }));
  const backup = screen.getByRole("region", { name: "Practice backup" });
  const file = new File([JSON.stringify(incoming.exportBackup())], "practice.json", { type: "application/json" });
  fireEvent.change(screen.getByLabelText("Choose practice backup"), { target: { files: [file] } });
  expect(await screen.findByRole("heading", { name: "Ready to merge" })).toBeTruthy();
  expect(screen.getByText("0 incoming events · 1 incoming documents.")).toBeTruthy();
  context.current = { ...context.current!, enabledPacks: [selected], selectedPack: selected };
  view.rerender(createElement(ExplorePanel, { view: "progress" }));
  expect(screen.getByRole("region", { name: "Practice backup" })).toBe(backup);
  expect(screen.getAllByRole("heading", { name: "Practice backup" })).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Ready to merge" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Merge practice backup" }) as HTMLButtonElement).disabled).toBe(false);
});

it("keeps the merge confirmation when an imported pack choice enables the selected content", async () => {
  const incoming = createWortwerkStore({ getItem: () => null, setItem: () => undefined });
  incoming.setDoc("settings", { enabledPackIds: [selected.pack.id] });
  incoming.setDoc("study.pack", selected.pack.id);
  context.current = { ...context.current!, enabledPacks: [], selectedPack: undefined };
  const view = render(createElement(ExplorePanel, { view: "progress" }));
  const backup = screen.getByRole("region", { name: "Practice backup" });
  fireEvent.change(screen.getByLabelText("Choose practice backup"), { target: { files: [new File([JSON.stringify(incoming.exportBackup())], "practice.json", { type: "application/json" })] } });
  expect(await screen.findByRole("heading", { name: "Ready to merge" })).toBeTruthy();
  const restore = wortwerkStore.restoreBackup.bind(wortwerkStore);
  const merge = vi.spyOn(wortwerkStore, "restoreBackup").mockImplementation(value => {
    restore(value);
    context.current = { ...context.current!, enabledPacks: [selected], selectedPack: selected };
    view.rerender(createElement(ExplorePanel, { view: "progress" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "Merge practice backup" }));
  expect(merge).toHaveBeenCalledTimes(1);
  expect(wortwerkStore.getDoc("study.pack")).toBe(selected.pack.id);
  expect(screen.getByRole("region", { name: "Practice backup" })).toBe(backup);
  expect(screen.getByText(/^Practice backup merged[. ]/u)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Ready to merge" })).toBeNull();
});
