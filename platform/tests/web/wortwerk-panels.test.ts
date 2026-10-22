/// <reference lib="dom" />
// @vitest-environment jsdom
import { createElement, Fragment, type ComponentType, type ReactNode } from "react";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask, GradeResult } from "../../packages/wortwerk/src/tasks.js";
import type { WortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { recordAnswer, recordSession } from "../../apps/web/lib/wortwerk/learning-state";
import { buildPanelCatalog, cachePanelCatalog, PANEL_CATALOG_KEY, parsePanelCatalog, selectedPanelMetadata } from "../../apps/web/lib/wortwerk/panel-catalog";




const holder = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("../../apps/web/lib/wortwerk/store", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/store")>();
  return { ...actual, wortwerkStore: new Proxy({}, { get: (_target, key) => Reflect.get(holder.store as object, key) }) };
});
const providerPath="../../apps/web/components/wortwerk/PlayProvider.js";
const todayPath="../../apps/web/components/wortwerk/TodayPanel.js";
const summaryPath="../../apps/web/components/wortwerk/ProgressSummary.js";
const {PlayProvider}=await import(providerPath) as {PlayProvider:ComponentType<{content:WortwerkContent;children:ReactNode}>};
const {TodayPanel}=await import(todayPath) as {TodayPanel:ComponentType};
const {ProgressSummary}=await import(summaryPath) as {ProgressSummary:ComponentType};
const language: LanguageProfile = { schemaVersion: 1, id: "xx", label: "Test language", locale: "en", genders: [], pluralPatterns: [], cases: [],
  prepositionsByCase: {}, separablePrefixes: [], helperKeys: [], normalization: { caseSensitivePos: [], equivalences: [] }, ttsVoices: [], grammarLabels: {} };
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "sample", optionsCount: 4, timerSeconds: 30,
  audioSpeedRange: [0.8, 1.2], hintsAllowed: true, maxPassageLength: 100, distractorCloseness: 1, typedAnswerRatio: 0.5 };
const pack: ContentPack = { schemaVersion: 1, id: "panel-fixture", language: "xx", cefr: "A2", title: "Panel fixture", units: [], maps: [], difficulty: "sample",
  review: { status: "pending-german-review" }, items: Array.from({ length: 8 }, (_, index) => ({ id: `item-${index}`, type: "lexeme" as const,
    lemma: `word-${index}`, meaning: `meaning-${index}`, pos: "noun", unitId: "unit", bookRef: { book: "fixture-book", lesson: 1 }, tags: [], source: "course" as const })) };
const source = { pack, language, difficulty, fixture: true, resources: {} };
const result: GradeResult = { outcome: "correct", correct: true, hinted: false, normalizedAnswer: "answer" };
function task(itemId: string, format: GeneratedTask["format"] = "recall"): GeneratedTask {
  return { id: `task-${itemId}`, packId: pack.id, itemId, dimension: "meaning", skill: "vocabulary", mechanic: "corners", format,
    templateId: format === "recall" ? "corners.meaning.recall" : "corners.meaning", testedDimensions: ["meaning"], revealFields: [],
    question: { instruction: "Answer", options: [], input: "text", lang: "en", helperKeys: [] }, solution: { accepted: ["answer"] }, feedback: { answer: "answer", summary: "Meaning" } };
}
let store: WortwerkStore;
let now: Date;
const clock = { value: new Date() };
beforeEach(() => {
  now = new Date(); clock.value = now;
  const values = new Map<string, string>();
  store = createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }, { now: () => clock.value, deviceId: "panel-device" });
  holder.store = store;
  store.setDoc("study.scope", { v: 1 });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function panels() { return createElement(Fragment, null, createElement(TodayPanel), createElement(ProgressSummary)); }
function evidence(itemId: string, daysAgo: number, format: GeneratedTask["format"] = "recall") {
  const at = new Date(now); at.setUTCDate(at.getUTCDate() - daysAgo); clock.value = at;
  recordAnswer(task(itemId, format), result, { store, now: at, timeZone: "UTC", sessionId: daysAgo ? "history" : "quick" });
}

describe("embeddable Wortwerk panels", () => {
  it("keeps real progress, preview, Quick review and the next milestone after the PlayProvider is removed", async () => {
    store.setDoc("settings", { enabledPackIds: [pack.id], timeZone: "UTC" }); store.setDoc("study.pack", pack.id);
    evidence("item-0", 8); evidence("item-0", 7); evidence("item-1", 1);
    for (let index = 2; index < 7; index++) evidence(`item-${index}`, 0, "recognition");
    clock.value = now;
    recordSession({ sessionId: "quick", mode: "quick", startedAt: now.toISOString(), answered: 5, correct: 5, completed: true }, { store, now, timeZone: "UTC" });
    const provider = render(createElement(PlayProvider, { content: { packs: [source] }, children: panels() }));
    await waitFor(() => expect(store.getDoc(PANEL_CATALOG_KEY)).toBeDefined());
    const catalog = store.getDoc<Record<string, unknown>>(PANEL_CATALOG_KEY)!;
    expect(JSON.stringify(catalog)).not.toMatch(/"(?:strength|securedAt|xp|attempts|correct|progress)"/u);
    provider.unmount();
    render(panels());
    expect(screen.getByText("1 day in your streak")).toBeTruthy();
    const heading = screen.getByText("Items complete");
    expect(heading.parentElement?.querySelector("dd")?.textContent).toBe("1 / 8");
    expect(screen.getByText("8 eligible tasks · about 2 min · a shorter pack-sized run")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quick review · 1 min" }).getAttribute("href")).toContain(`pack=${pack.id}`);
    const milestone = screen.getByRole("heading", { name: "Next milestone" }).parentElement!;
    expect(within(milestone).getByText("word-1")).toBeTruthy();
    expect(milestone.textContent).toContain("1 more calendar day");
  });

  it("shows unavailable pack metrics honestly before a catalog exists and always offers Quick review", () => {
    render(panels());
    expect(screen.getByText(/Pack progress is unavailable here/u)).toBeTruthy();
    expect(screen.queryByText("Items complete")).toBeNull();
    expect(screen.getByRole("link", { name: "Quick review · 1 min" }).getAttribute("href")).toContain("mode=quick");
    expect(screen.getByRole("link", { name: "Open today's practice" })).toBeTruthy();
  });

  it("hides stale scope totals rather than presenting a previous selection's progress", () => {
    store.setDoc("settings", { enabledPackIds: [pack.id] }); store.setDoc("study.pack", pack.id);
    cachePanelCatalog(store, buildPanelCatalog([source], { v: 1 }));
    render(panels());
    expect(screen.getByText("Items complete")).toBeTruthy();
    act(() => store.setDoc("study.scope", { v: 1, lessons: [] }));
    expect(screen.queryByText("Items complete")).toBeNull();
    expect(screen.getByText(/Open practice to refresh the content/u)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quick review · 1 min" })).toBeTruthy();
  });
});

describe("panel catalog metadata", () => {
  it("validates metadata, respects pending enablement and avoids repeat writes", () => {
    const catalog = buildPanelCatalog([source], { v: 1 });
    expect(parsePanelCatalog(catalog)?.packs[0]?.capabilities).toHaveLength(8);
    expect(cachePanelCatalog(store, catalog)).toBe(true);
    const before = store.getSnapshot();
    expect(cachePanelCatalog(store, catalog)).toBe(false);
    expect(store.getSnapshot()).toBe(before);
    expect(selectedPanelMetadata(store.getSnapshot()).status).toBe("missing");
    store.setDoc("settings", { enabledPackIds: [pack.id] });
    expect(selectedPanelMetadata(store.getSnapshot()).status).toBe("ready");
    const bad = structuredClone(catalog); bad.packs[0]!.capabilities[0]!.packId = "wrong-pack";
    expect(parsePanelCatalog(bad)).toBeNull();
    expect(parsePanelCatalog({ v: 2, packs: [] })).toBeNull();
  });
  it("preserves self-assessment capability metadata without accepting unknown assessments", () => {
    const catalog = buildPanelCatalog([source], { v: 1 });
    const template = catalog.packs[0]!.capabilities[0]!.templates[0]! as unknown as Record<string, unknown>;
    template.assessment = "self";
    expect(parsePanelCatalog(catalog)?.packs[0]?.capabilities[0]?.templates[0]).toMatchObject({ assessment: "self" });
    template.assessment = "unrecognised";
    expect(parsePanelCatalog(catalog)).toBeNull();
  });
  it("preserves unsupported future catalogs and does not interpret their counts", () => {
    const future = { v: 2, packs: [], learned: 1000 };
    store.setDoc(PANEL_CATALOG_KEY, future);
    expect(cachePanelCatalog(store, buildPanelCatalog([source], { v: 1 }))).toBe(false);
    expect(store.getDoc(PANEL_CATALOG_KEY)).toEqual(future);
    expect(selectedPanelMetadata(store.getSnapshot()).status).toBe("unsupported");
  });
});
