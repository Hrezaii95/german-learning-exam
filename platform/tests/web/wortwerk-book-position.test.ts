// @vitest-environment jsdom
import { createElement, type AnchorHTMLAttributes, type ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { confirmBookAdvance, matchesBookPosition, parseBookPosition, positionScope, proposeBookAdvance, readBookPosition, resolveBookPosition, type BookPosition, type BookAdvanceProposal } from "../../apps/web/lib/study/book-position";
import { companionScope, filterCompanionItems, lessonLoopLinks, type ScopeSelection } from "../../apps/web/lib/wortwerk/book-companion";
import { createWortwerkStore, type WortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { decodeScope, type PlayScope } from "../../apps/web/lib/wortwerk/links";
import type { ContentPack, PackLexeme } from "../../packages/content/src/types/packs.js";

vi.mock("next/link", () => ({ default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => createElement("a", { ...props, href }) }));
const scopePickerModule = "../../apps/web/components/wortwerk/ScopePicker";
const { BookAdvancePrompt, ScopePicker, printCurrentScope } = await import(scopePickerModule) as {
  BookAdvancePrompt: ComponentType<{ proposal: BookAdvanceProposal; store?: WortwerkStore }>;
  ScopePicker: ComponentType<{ pack: ContentPack; store?: WortwerkStore; skills?: { id: string; label: string }[] }>;
  printCurrentScope(pack: ContentPack, scope: PlayScope): void;
};
const position: BookPosition = { v: 1, book: "test-book", lesson: 2, page: 20, lessonDone: false };
function item(id: string, lesson: number, page?: number, patch: Partial<PackLexeme> = {}): PackLexeme {
  return { id, type: "lexeme", lemma: id, meaning: `meaning ${id}`, pos: "noun", unitId: `unit-${lesson}`,
    bookRef: { book: "test-book", lesson, ...(page === undefined ? {} : { page }) },
    tags: ["home"], source: "course", forms: { plural: [`${id}s`] }, ...patch };
}
const items = [item("earlier", 1), item("before", 2, 19), item("at", 2, 20), item("after", 2, 21),
  item("unknown-page", 2), item("later", 4, 40), item("extra-before", 2, 18, { source: "teacher-extra" }),
  item("extra-after", 2, 24, { source: "teacher-extra" }), item("other-topic", 2, 18, { tags: ["work"] })];
const pack: ContentPack = { schemaVersion: 1, id: "test-pack", language: "xx", cefr: "A2", title: "Test book pack",
  units: [1, 2, 4].map(lesson => ({ id: `unit-${lesson}`, title: `Unit ${lesson}`, canDo: [], bookRef: { book: "test-book", lesson } })),
  maps: [], difficulty: "test", review: { status: "pending-german-review" }, items };
function store() { return createWortwerkStore({ getItem: () => null, setItem: () => {} }, { deviceId: "test-device" }); }
const selection: ScopeSelection = { mode: "position", book: "test-book", lessons: [], tags: [], sources: [], skills: [], includeWholeCurrentLesson: false };
afterEach(() => { cleanup(); document.querySelectorAll("iframe").forEach(frame => frame.remove()); vi.restoreAllMocks(); });

describe("book position and the shared page rule", () => {
  it("validates versioned documents and upgrades the original shape without inventing a page", () => {
    expect(parseBookPosition({ book: "test-book", lesson: 3 })).toEqual({ v: 1, book: "test-book", lesson: 3, lessonDone: false });
    for (const value of [{ ...position, v: 2 }, { ...position, page: 0 }, { ...position, lesson: 1.5 }, { ...position, book: "" }, { ...position, lessonDone: "yes" }]) expect(() => parseBookPosition(value)).toThrow();
    expect(readBookPosition(null)).toBeNull();
  });
  it("uses a matching personal position before the class default", () => {
    expect(resolveBookPosition(position, { ...position, lesson: 4 }, "test-book")).toEqual(position);
    expect(resolveBookPosition(null, position, "test-book")).toEqual(position);
    expect(resolveBookPosition(position, null, "another-book")).toBeNull();
  });
  it("includes earlier lessons and only current-lesson pages at or before the position", () => {
    expect(items.filter(row => matchesBookPosition(row, position)).map(row => row.id)).toEqual(["earlier", "before", "at", "extra-before", "other-topic"]);
    expect(matchesBookPosition(item("other-book", 1, 1, { bookRef: { book: "other", lesson: 1 } }), position)).toBe(false);
  });
  it("admits unknown-page current-lesson items only on explicit whole-lesson inclusion or completion", () => {
    expect(matchesBookPosition(items[4]!, position)).toBe(false);
    expect(matchesBookPosition(items[4]!, position, { includeWholeCurrentLesson: true })).toBe(true);
    expect(matchesBookPosition(items[4]!, { ...position, lessonDone: true })).toBe(true);
    const wholeScope = positionScope(position, true);
    expect(wholeScope).toEqual({ v: 1, book: "test-book", lessons: [1, 2] });
    expect(filterCompanionItems(pack, wholeScope).some(row => row.id === "unknown-page")).toBe(true);
  });
  it("keeps an unknown current page out of scope, including an honest empty first lesson", () => {
    const unknown = { ...position, page: undefined };
    const { page: _page, ...withoutPage } = unknown;
    expect(positionScope(withoutPage)).toEqual({ v: 1, book: "test-book", lessons: [1] });
    expect(items.filter(row => matchesBookPosition(row, withoutPage)).map(row => row.id)).toEqual(["earlier"]);
    expect(filterCompanionItems(pack, positionScope({ ...withoutPage, lesson: 1 }))).toEqual([]);
    expect(matchesBookPosition(items[4]!, withoutPage, { includeWholeCurrentLesson: true })).toBe(true);
  });
  it("does not exempt teacher extras from the teacher-attached lesson/page", () => {
    expect(matchesBookPosition(items[6]!, position)).toBe(true);
    expect(matchesBookPosition(items[7]!, position)).toBe(false);
  });
  it("proposes a later page without mutating state and requires confirmation", () => {
    const state = store(); state.setDoc("study.position", position);
    const proposal = proposeBookAdvance(position, { kind: "page", book: "test-book", lesson: 4, page: 42 })!;
    expect(state.getDoc("study.position")).toEqual(position);
    expect(confirmBookAdvance(state, proposal)).toEqual({ v: 1, book: "test-book", lesson: 4, page: 42, lessonDone: false });
    expect(() => confirmBookAdvance(state, proposal)).toThrow(/changed/);
    expect(proposeBookAdvance(position, { kind: "page", book: "test-book", lesson: 2, page: 19 })).toBeNull();
    expect(proposeBookAdvance(position, { kind: "page", book: "different", lesson: 4, page: 42 })).toBeNull();
  });
  it("adopts a class default only when the learner explicitly confirms the proposed advance", () => {
    const state = store();
    const proposal = proposeBookAdvance(position, { kind: "page", book: "test-book", lesson: 2, page: 22 })!;
    expect(state.getDoc("study.position")).toBeUndefined();
    expect(confirmBookAdvance(state, proposal, { classPosition: position }).page).toBe(22);
  });
  it("finishes only the current lesson without guessing the next lesson's page", () => {
    const state = store(); state.setDoc("study.position", position);
    const proposal = proposeBookAdvance(position, { kind: "lesson-complete", book: "test-book", lesson: 2 })!;
    expect(confirmBookAdvance(state, proposal)).toEqual({ ...position, lessonDone: true });
    expect(proposeBookAdvance(position, { kind: "lesson-complete", book: "test-book", lesson: 4 })).toBeNull();
    expect(proposeBookAdvance({ ...position, lessonDone: true }, { kind: "page", book: "test-book", lesson: 2, page: 25 })).toBeNull();
  });
});

describe("book companion selections and controls", () => {
  it("combines lesson, topics, sources and skill fields using shared scope semantics", () => {
    const scope = companionScope({ ...selection, mode: "multiple", lessons: [2], tags: ["home"], sources: ["teacher-extra"], skills: ["plural"] }, position)!;
    expect(scope).toMatchObject({ lessons: [2], tags: ["home"], sources: ["teacher-extra"], skills: ["plural"] });
    expect(filterCompanionItems(pack, scope).map(row => row.id)).toEqual(["extra-before", "extra-after"]);
    expect(companionScope(selection, null)).toBeNull();
    expect(companionScope({ ...selection, mode: "due" }, position, { due: [] })).toBeNull();
    expect(companionScope({ ...selection, mode: "tricky" }, position, { tricky: ["after"] })?.items).toEqual(["after"]);
  });
  it("makes a lesson loop from authored lesson numbers without inferring missing lessons or pages", () => {
    const links = lessonLoopLinks(pack, position);
    const previewScope = decodeScope(new URL(links.preview!, "https://example.test").searchParams.get("scope")!);
    expect(previewScope.lessons).toEqual([4]);
    expect(previewScope.upTo).toBeUndefined();
    expect(links.boss).toContain("unit=unit-2");
    const today = decodeScope(new URL(links.today, "https://example.test").searchParams.get("scope")!);
    expect(filterCompanionItems(pack, today).every(row => row.bookRef.lesson === 2 && row.bookRef.page !== undefined && row.bookRef.page <= 20)).toBe(true);
  });
  it("starts at a confirmed position, persists intersected filters, and prints only that selection", () => {
    const state = store(); state.setDoc("study.position", position);
    render(createElement(ScopePicker, { pack, store: state, skills: [{ id: "plural", label: "Plurals" }] }));
    expect(screen.getByRole("combobox", { name: "Practice selection" })).toHaveProperty("value", "position");
    expect(screen.getByText("5 items in this practice selection.")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("home"));
    fireEvent.click(screen.getByLabelText("Teacher extras"));
    fireEvent.click(screen.getByLabelText("Plurals"));
    expect(state.getDoc("study.scope")).toMatchObject({ book: "test-book", upTo: { lesson: 2, page: 20 }, tags: ["home"], sources: ["teacher-extra"], skills: ["plural"] });
    expect(screen.getByText("1 items in this practice selection.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Practise this selection" }).getAttribute("href")).toContain("scope=");
  });
  it("asks for a position instead of silently practising later pages and lets the learner confirm it", () => {
    const state = store(); render(createElement(ScopePicker, { pack, store: state }));
    expect(screen.getByRole("button", { name: "Practise this selection" })).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("combobox", { name: "Current lesson" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Printed page/ }), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm book position" }));
    expect(state.getDoc("study.position")).toEqual(position);
    expect(screen.getByRole("link", { name: "Practise this selection" })).toBeTruthy();
  });
  it("keeps a confirmed lesson visible even when this sparse pack has no entries from it", () => {
    const state = store(); state.setDoc("study.position", { ...position, lesson: 3, page: 30 });
    render(createElement(ScopePicker, { pack, store: state }));
    expect(screen.getByRole("combobox", { name: "Current lesson" })).toHaveProperty("value", "3");
    fireEvent.click(screen.getByRole("button", { name: "Confirm book position" }));
    expect(state.getDoc("study.position")).toEqual({ ...position, lesson: 3, page: 30 });
  });
  it("offers keep/confirm paths for advances without writing on render", () => {
    const state = store(); state.setDoc("study.position", position);
    const proposal = proposeBookAdvance(position, { kind: "page", book: "test-book", lesson: 2, page: 22 })!;
    render(createElement(BookAdvancePrompt, { proposal, store: state }));
    expect(state.getDoc("study.position")).toEqual(position);
    fireEvent.click(screen.getByRole("button", { name: "Confirm advance" }));
    expect(state.getDoc<BookPosition>("study.position")?.page).toBe(22);
    expect(screen.getByRole("status").textContent).toContain("updated");
  });
  it.each(["study.position", "study.scope"] as const)("does not confirm an advance beside future %s data", key => {
    const state = store(); state.setDoc("study.position", position);
    const futureValue = key === "study.position" ? position : { v: 1, book: position.book, lessons: [4] };
    state.applyRemoteDocs([{ store: "wortwerk-docs", key, deviceId: "future", schemaVersion: 2,
      updatedAt: new Date(Date.now() + 1000).toISOString(), value: futureValue }]);
    const before = state.getSnapshot();
    const proposal = proposeBookAdvance(position, { kind: "page", book: position.book, lesson: 2, page: 22 })!;
    render(createElement(BookAdvancePrompt, { proposal, store: state }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm advance" }));
    expect(state.getSnapshot()).toBe(before);
    expect(state.getDoc("study.position")).toEqual(position);
    expect(screen.getByRole("alert").textContent).toContain("update");
    expect(screen.queryByText("Book position updated.")).toBeNull();
  });
  it.each(["study.position", "study.scope"] as const)("shows update guidance instead of a saved claim for future %s in the picker", key => {
    const state = store(); state.setDoc("study.position", position);
    const scope = { v: 1, book: position.book, lessons: [2] };
    state.setDoc("study.scope", scope);
    state.applyRemoteDocs([{ store: "wortwerk-docs", key, deviceId: "future", schemaVersion: 2,
      updatedAt: new Date(Date.now() + 1000).toISOString(), value: key === "study.position" ? position : scope }]);
    const before = state.getSnapshot();
    render(createElement(ScopePicker, { pack, store: state }));
    fireEvent.change(screen.getByRole("spinbutton", { name: /Printed page/u }), { target: { value: "22" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm book position" }));
    expect(state.getSnapshot()).toBe(before);
    expect(state.getDoc("study.position")).toEqual(position);
    expect(screen.getByRole("status").textContent).toContain("update");
    expect(screen.queryByText(/Book position saved/u)).toBeNull();
  });
  it("keeps a future scope payload read-only when a topic filter is changed", () => {
    const state = store(); state.setDoc("study.position", position);
    const future = { v: 2, book: position.book, lessons: [2] };
    state.setDoc("study.scope", future);
    const before = state.getSnapshot();
    render(createElement(ScopePicker, { pack, store: state }));
    fireEvent.click(screen.getByLabelText("home"));
    expect(state.getSnapshot()).toBe(before);
    expect(state.getDoc("study.scope")).toEqual(future);
    expect(screen.getByRole("status").textContent).toContain("update");
  });
  it("does not derive a new scope from a position stored by a newer app", () => {
    const state = store();
    state.applyRemoteDocs([{ store: "wortwerk-docs", key: "study.position", deviceId: "future", schemaVersion: 2,
      updatedAt: new Date(Date.now() + 1000).toISOString(), value: position }]);
    const before = state.getSnapshot();
    render(createElement(ScopePicker, { pack, store: state }));
    fireEvent.click(screen.getByLabelText("home"));
    expect(state.getSnapshot()).toBe(before);
    expect(state.getDoc("study.scope")).toBeUndefined();
    expect(screen.getByRole("status").textContent).toContain("update");
  });
  it("builds an isolated printable document with safe text and exact scope rows", () => {
    const frames: HTMLIFrameElement[] = [];
    const original = document.body.append.bind(document.body);
    vi.spyOn(document.body, "append").mockImplementation((...nodes: (Node | string)[]) => {
      original(...nodes);
      for (const node of nodes) if (node instanceof HTMLIFrameElement) {
        frames.push(node);
        if (node.contentWindow) { node.contentWindow.print = vi.fn(); node.contentWindow.focus = vi.fn(); }
      }
    });
    printCurrentScope({ ...pack, items: [...pack.items, item("unsafe", 2, 18, { lemma: "<img src=x onerror=alert(1)>", tags: ["work"] })] }, { v: 1, book: "test-book", lessons: [2], tags: ["work"] });
    expect(frames).toHaveLength(1);
    expect(frames[0]!.contentDocument!.querySelectorAll("td")).toHaveLength(6);
    expect(frames[0]!.contentDocument!.body.textContent).toContain("other-topic");
    expect(frames[0]!.contentDocument!.querySelector("img")).toBeNull();
    expect(frames[0]!.contentDocument!.body.textContent).toContain("<img src=x onerror=alert(1)>");
    frames[0]!.contentWindow!.dispatchEvent(new Event("afterprint"));
    expect(document.querySelector("iframe")).toBeNull();
  });
});
