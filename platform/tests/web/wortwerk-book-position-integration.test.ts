/// <reference lib="dom" />
// @vitest-environment jsdom
import { createElement, Fragment, type ComponentType, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackLexeme } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask } from "../../packages/wortwerk/src/tasks.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server";
import { createWortwerkStore, type WortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { recordAnswer } from "../../apps/web/lib/wortwerk/learning-state";
import { positionScope, type BookPosition } from "../../apps/web/lib/study/book-position";
import { filterCompanionItems } from "../../apps/web/lib/wortwerk/book-companion";
import { selectedPanelMetadata } from "../../apps/web/lib/wortwerk/panel-catalog";
import type { PlayScope } from "../../apps/web/lib/wortwerk/links";

const holder = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("../../apps/web/lib/wortwerk/store", async importOriginal => {
  const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/store")>();
  return { ...actual, wortwerkStore: new Proxy({}, { get: (_target, property) => Reflect.get(holder.store as object, property) }) };
});
const providerModule = "../../apps/web/components/wortwerk/PlayProvider";
const homeModule = "../../apps/web/components/wortwerk/PlayHome";
const { PlayProvider, usePlayContent } = await import(providerModule) as {
  PlayProvider: ComponentType<{ content: WortwerkContent; children: ReactNode }>;
  usePlayContent(): { scope: PlayScope } | null;
};
const { PlayHome } = await import(homeModule) as { PlayHome: ComponentType };
const position: BookPosition = { v: 1, book: "book-fixture", lesson: 2, page: 20, lessonDone: false };
const language: LanguageProfile = { schemaVersion: 1, id: "xx", label: "Test language", locale: "en", genders: [], pluralPatterns: [], cases: [],
  prepositionsByCase: {}, separablePrefixes: [], helperKeys: [], normalization: { caseSensitivePos: [], equivalences: [] }, ttsVoices: [], grammarLabels: {} };
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "fixture", optionsCount: 4, timerSeconds: 30,
  audioSpeedRange: [0.8, 1.2], hintsAllowed: true, maxPassageLength: 100, distractorCloseness: 1, typedAnswerRatio: 0.5 };
function word(id: string, lesson: number, page?: number, patch: Partial<PackLexeme> = {}): PackLexeme {
  return { id, type: "lexeme", lemma: id, meaning: `meaning ${id}`, pos: "noun", unitId: `unit-${lesson}`, tags: ["home"], source: "course",
    bookRef: { book: "book-fixture", lesson, ...(page === undefined ? {} : { page }) }, ...patch };
}
const pack: ContentPack = { schemaVersion: 1, id: "companion-fixture", language: "xx", cefr: "A2", title: "Book companion fixture", difficulty: "fixture",
  units: [1, 2, 4].map(lesson => ({ id: `unit-${lesson}`, title: `Unit ${lesson}`, canDo: [], bookRef: { book: "book-fixture", lesson } })),
  maps: [], review: { status: "pending-german-review" }, items: [word("earlier", 1), word("before", 2, 19), word("at", 2, 20), word("after", 2, 21),
    word("unknown-page", 2), word("later", 4, 40, { tags: ["work"] }), word("teacher-before", 2, 18, { source: "teacher-extra" }),
    word("teacher-after", 2, 23, { source: "teacher-extra" }), word("other-topic", 2, 18, { tags: ["work"] })] };
const content: WortwerkContent = { packs: [{ pack, language, difficulty, fixture: true, resources: {} }] };
let store: WortwerkStore;
const clock = { now: new Date() };
beforeEach(() => {
  clock.now = new Date();
  const values = new Map<string, string>();
  store = createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }, { now: () => clock.now, deviceId: "companion-test" });
  holder.store = store;
  store.setDoc("settings", { enabledPackIds: [pack.id], timeZone: "UTC" });
  store.setDoc("study.pack", pack.id);
});
afterEach(() => cleanup());
function ScopeReadout() { return createElement("output", { "aria-label": "Active practice scope" }, JSON.stringify(usePlayContent()?.scope)); }
function mount(home = false) {
  return render(createElement(PlayProvider, { content, children: createElement(Fragment, null, home ? createElement(PlayHome) : null, createElement(ScopeReadout)) }));
}
function activeScope(): PlayScope { return JSON.parse(screen.getByLabelText("Active practice scope").textContent ?? "null") as PlayScope; }

describe("book companion integration", () => {
  it("mounts the scope picker and defaults to the confirmed book position without changing authored pages", async () => {
    store.setDoc("study.position", position);
    mount(true);
    await waitFor(() => expect(store.getDoc("study.scope")).toBeDefined());
    expect(screen.getByRole("heading", { name: "Practise your book" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Practice selection" })).toHaveProperty("value", "position");
    expect(screen.getByRole("spinbutton", { name: /Printed page/u })).toHaveProperty("value", "20");
    expect(activeScope()).toEqual(positionScope(position));
    expect(filterCompanionItems(pack, activeScope()).map(item => item.id)).toEqual(["earlier", "before", "at", "teacher-before", "other-topic"]);
    expect(store.getDoc("study.position")).toEqual(position);
    await waitFor(() => expect(selectedPanelMetadata(store.getSnapshot()).status).toBe("ready"));
    fireEvent.click(screen.getByLabelText("Teacher extras"));
    expect(activeScope()).toMatchObject({ sources: ["teacher-extra"], upTo: { lesson: 2, page: 20 } });
    expect(filterCompanionItems(pack, activeScope()).map(item => item.id)).toEqual(["teacher-before"]);
  });

  it("starts with no future lessons before a position or explicit selection has been confirmed", () => {
    mount(true);
    expect(activeScope()).toEqual({ v: 1, book: "book-fixture", lessons: [] });
    expect(filterCompanionItems(pack, activeScope())).toEqual([]);
    expect(store.getDoc("study.position")).toBeUndefined();
    expect(store.getDoc("study.scope")).toBeUndefined();
    expect(screen.getByText("Confirm your book position to practise these pages.")).toBeTruthy();
  });
  it("keeps an explicitly saved whole-pack selection", () => {
    store.setDoc("study.scope", { v: 1 });
    mount();
    expect(activeScope()).toEqual({ v: 1 });
    expect(filterCompanionItems(pack, activeScope())).toHaveLength(pack.items.length);
  });
  it("preserves an explicitly stored scope before and after the confirmed position changes", () => {
    const explicit: PlayScope = { v: 1, book: "book-fixture", lessons: [4], tags: ["work"] };
    store.setDoc("study.scope", explicit);
    store.setDoc("study.position", position);
    mount();
    expect(activeScope()).toEqual(explicit);
    act(() => store.setDoc("study.position", { ...position, lesson: 4, page: 42 }));
    expect(activeScope()).toEqual(explicit);
    expect(store.getDoc("study.scope")).toEqual(explicit);
  });

  it("uses only earlier lessons when the confirmed current page is unknown", async () => {
    const unknown = { v: 1 as const, book: position.book, lesson: 2, lessonDone: false };
    store.setDoc("study.position", unknown);
    mount();
    await waitFor(() => expect(activeScope()).toEqual({ v: 1, book: "book-fixture", lessons: [1] }));
    expect(filterCompanionItems(pack, activeScope()).map(item => item.id)).toEqual(["earlier"]);
    expect(store.getDoc("study.position")).toEqual(unknown);
  });

  it("does not infer a new book position from an unrelated saved book", () => {
    store.setDoc("study.position", { ...position, book: "another-book" });
    mount();
    expect(activeScope()).toEqual({ v: 1, book: "book-fixture", lessons: [] });
    expect(store.getDoc("study.scope")).toBeUndefined();
    expect(store.getDoc<BookPosition>("study.position")?.book).toBe("another-book");
  });

  it("offers a tricky smart selection from two recent failed answers and keeps source filters combined", () => {
    const now = new Date(); clock.now = now;
    const task: GeneratedTask = { id: "task", packId: pack.id, itemId: "before", dimension: "meaning", templateId: "corners.meaning", skill: "vocabulary", mechanic: "corners",
      format: "recognition", testedDimensions: ["meaning"], revealFields: [], question: { instruction: "Choose", options: [], input: "choice", lang: "en", helperKeys: [] }, solution: {}, feedback: { answer: "answer", summary: "Meaning" } };
    recordAnswer(task, { outcome: "incorrect", correct: false, hinted: false, normalizedAnswer: "wrong" }, { store, now, timeZone: "UTC" });
    recordAnswer(task, { outcome: "incorrect", correct: false, hinted: false, normalizedAnswer: "wrong" }, { store, now, timeZone: "UTC" });
    const selfTask = { ...task, itemId: "later", templateId: "record.prompt", skill: "speaking", solution: { selfCheck: true } };
    recordAnswer(selfTask, { outcome: "incorrect", correct: false, hinted: true, normalizedAnswer: "self:practise", assessment: "self" }, { store, now, timeZone: "UTC" });
    recordAnswer(selfTask, { outcome: "incorrect", correct: false, hinted: true, normalizedAnswer: "self:practise", assessment: "self" }, { store, now, timeZone: "UTC" });
    store.setDoc("study.position", position);
    mount(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Practice selection" }), { target: { value: "tricky" } });
    expect(activeScope()).toMatchObject({ items: ["before"] });
    fireEvent.click(screen.getByLabelText("Course"));
    expect(activeScope()).toMatchObject({ items: ["before"], sources: ["course"] });
    expect(filterCompanionItems(pack, activeScope()).map(item => item.id)).toEqual(["before"]);
  });
});
