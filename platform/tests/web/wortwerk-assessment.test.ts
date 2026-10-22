/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType, type ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server.js";
import { createWortwerkStore, type WortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import { recordAnswer } from "../../apps/web/lib/wortwerk/learning-state.js";
import { buildPanelCatalog, PANEL_CATALOG_KEY, parsePanelCatalog } from "../../apps/web/lib/wortwerk/panel-catalog.js";
import { generateLiteracyTask, gradeLiteracyTask } from "../../packages/wortwerk/src/templates/literacy.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import profile from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";

const testState = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("../../apps/web/lib/wortwerk/store.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/store.js")>();
  return { ...actual, wortwerkStore: new Proxy({}, { get: (_target, key) => Reflect.get(testState.store as object, key) }) };
});
vi.mock("../../apps/web/lib/wortwerk/runtime.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/runtime.js")>();
  const { CORNERS_TEMPLATES } = await import("../../packages/wortwerk/src/templates/corners.js");
  const { LITERACY_TEMPLATES } = await import("../../packages/wortwerk/src/templates/literacy.js");
  return { ...actual, playableCapabilities: (...args: Parameters<typeof actual.playableCapabilities>) => actual.playableCapabilities(args[0], args[1], args[2], args[3], [...CORNERS_TEMPLATES, ...LITERACY_TEMPLATES]) };
});

// Variable imports keep JSX source in the separate web TypeScript compiler.
const providerPath = "../../apps/web/components/wortwerk/PlayProvider.js";
const todayPath = "../../apps/web/components/wortwerk/TodayPanel.js";
const summaryPath = "../../apps/web/components/wortwerk/ProgressSummary.js";
const { PlayProvider } = await import(providerPath) as { PlayProvider: ComponentType<{ content: WortwerkContent; children: ReactNode }> };
const { TodayPanel } = await import(todayPath) as { TodayPanel: ComponentType };
const { ProgressSummary } = await import(summaryPath) as { ProgressSummary: ComponentType };
const pack = { ...manifest, items: items.filter(item => item.type === "speakingPrompt") } as unknown as ContentPack;
const content: WortwerkContent = { packs: [{ pack, language: profile as LanguageProfile, difficulty: difficulty as DifficultyProfile, fixture: true, resources: {} }] };
let store: WortwerkStore;

beforeEach(() => {
  const saved = new Map<string, string>();
  store = createWortwerkStore({ getItem: key => saved.get(key) ?? null, setItem: (key, value) => { saved.set(key, value); } });
  testState.store = store;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows self-check practice without an impossible secured milestone inside and outside the provider", () => {
  store.setDoc("settings", { enabledPackIds: [pack.id] });
  store.setDoc("study.pack", pack.id);
  store.setDoc("study.scope", { v: 1 });
  const view = render(createElement(PlayProvider, { content, children: createElement("div", null, createElement(TodayPanel), createElement(ProgressSummary)) }));
  const milestone = screen.getByRole("heading", { name: "Next milestone" }).parentElement!;
  expect(milestone.textContent).toContain("Self-check practice");
  expect(milestone.textContent).not.toContain("Recall it correctly");
  const generated = generateLiteracyTask({ templateId: "record.prompt", item: pack.items[0]!, pack, profile: profile as LanguageProfile, difficulty: difficulty as DifficultyProfile, random: () => 0.5 })!;
  act(() => { recordAnswer(generated, gradeLiteracyTask(generated, "self:complete", profile as LanguageProfile)); });
  expect(screen.getByText("Items complete").nextElementSibling?.textContent).toBe("0 / 0");
  expect(screen.getByText("Items practised").nextElementSibling?.textContent).toBe("1");
  expect(screen.getByText("Self-check practice", { selector: "dt" }).nextElementSibling?.textContent).toBe("1 attempt");
  expect(milestone.textContent).toContain("1 item practised");
  view.unmount();
  render(createElement("div", null, createElement(TodayPanel), createElement(ProgressSummary)));
  expect(screen.getByText("Items complete").nextElementSibling?.textContent).toBe("0 / 0");
  expect(screen.getByText("Self-check practice", { selector: "dt" }).nextElementSibling?.textContent).toBe("1 attempt");
  const standaloneMilestone = screen.getByRole("heading", { name: "Next milestone" }).parentElement!;
  expect(standaloneMilestone.textContent).toContain("1 item practised");
  expect(standaloneMilestone.textContent).not.toContain("Recall it correctly");
});

it("requests a refresh for legacy cached assessment metadata instead of promising self-check mastery", () => {
  store.setDoc("settings", { enabledPackIds: [pack.id] });
  store.setDoc("study.pack", pack.id);
  store.setDoc("study.scope", { v: 1 });
  const catalog = buildPanelCatalog(content.packs, { v: 1 });
  expect(catalog.packs[0]!.capabilities[0]!.templates.every(template => template.assessment === "self")).toBe(true);
  expect(parsePanelCatalog(catalog)).not.toBeNull();
  for (const capability of catalog.packs[0]!.capabilities) for (const template of capability.templates) delete template.assessment;
  expect(parsePanelCatalog(catalog)).toBeNull();
  store.setDoc(PANEL_CATALOG_KEY, catalog);
  render(createElement("div", null, createElement(TodayPanel), createElement(ProgressSummary)));
  expect(screen.getByText(/Pack progress is unavailable here/u)).toBeTruthy();
  expect(screen.queryByText("Items complete")).toBeNull();
  expect(screen.queryByRole("link", { name: "Preview Daily Run" })).toBeNull();
  const milestone = screen.getByRole("heading", { name: "Next milestone" }).parentElement!;
  expect(milestone.textContent).toContain("Open practice");
  expect(milestone.textContent).not.toContain("Recall it correctly");
});
