/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server";
import type { PlayScope } from "../../apps/web/lib/wortwerk/links";
type PlayContextValue = WortwerkContent & { enabledPacks: WortwerkContent["packs"]; selectedPack: WortwerkContent["packs"][number] | undefined; scope: PlayScope; hydrated: boolean; setPackEnabled:(id:string,enabled:boolean)=>void; selectPack:(id:string)=>void; refreshOverlays:()=>void };
import profile from "../../content/languages/de.json";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import { createWortwerkStore, WORTWERK_STORAGE_KEY, type WortwerkBackup, type WortwerkStore } from "../../apps/web/lib/wortwerk/store";
const personalDeckPath = "../../apps/web/components/wortwerk/PersonalDeck.js";
const { PersonalDeck } = await import(personalDeckPath) as { PersonalDeck: ComponentType<{ store?: WortwerkStore }> };
const backupPanelPath = "../../apps/web/components/wortwerk/BackupPanel.js";
const { BackupPanel } = await import(backupPanelPath) as { BackupPanel: ComponentType<{ store?: WortwerkStore }> };

const context = vi.hoisted(() => ({ current: null as PlayContextValue | null }));
vi.mock("../../apps/web/components/wortwerk/PlayProvider", () => ({ usePlayContent: () => context.current }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => createElement("a", props, children) }));
const now = new Date("2026-10-22T12:00:00Z");
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "fixture", optionsCount: 4, timerSeconds: 60, audioSpeedRange: [0.7, 1], hintsAllowed: true, maxPassageLength: 200, distractorCloseness: 1, typedAnswerRatio: 0 };
function memoryStore(deviceId = "fixture") {
  const values = new Map<string, string>();
  return createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }, { deviceId });
}
function install() {
  const selected = { pack: { ...manifest, items } as ContentPack, language: profile as LanguageProfile, difficulty, fixture: true, resources: {} };
  context.current = { packs: [selected], enabledPacks: [selected], selectedPack: selected, scope: { v: 1 }, hydrated: true, setPackEnabled: () => undefined, selectPack: () => undefined, refreshOverlays: () => undefined };
}
function add(store: WortwerkStore, word = "Name", itemId = "w0") { store.appendEvent("deck.add", { packId: manifest.id, itemId, word }); }
function miss(store: WortwerkStore, createdAt: string, itemId = "w0", selfAssessed = false) {
  vi.setSystemTime(new Date(createdAt));
  store.appendEvent("answer", { packId: manifest.id, itemId, dimension: "meaning", templateId: "corners.meaning", format: "recognition", correct: false, hinted: selfAssessed, selfAssessed, skill: "vocabulary", studyDate: createdAt.slice(0, 10), calendarDate: createdAt.slice(0, 10) });
}
async function fileText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob); });
}
function upload(text: string) {
  const file = new File([text], "practice.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  fireEvent.change(screen.getByLabelText("Choose practice backup"), { target: { files: [file] } });
}
beforeEach(() => { install(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Wortwerk personal investment", () => {
  it("saves scoped source items and keeps notes, examples and Difficult across remounts", () => {
    const store = memoryStore();
    const view = render(createElement(PersonalDeck, { store }));
    fireEvent.change(screen.getByLabelText("Add a source item"), { target: { value: "w0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to personal deck" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Difficult: Name" }));
    fireEvent.change(screen.getByLabelText("Private note for Name"), { target: { value: "My private memory cue." } });
    fireEvent.change(screen.getByLabelText("Own examples for Name · one per line"), { target: { value: "My own first example.\nMy own second example." } });
    fireEvent.click(screen.getByRole("button", { name: "Save notes for Name" }));
    expect(store.getSnapshot().docs.some(doc => doc.key.startsWith("deck.annotation:") && (doc.value as { note: string }).note === "My private memory cue.")).toBe(true);
    view.unmount(); render(createElement(PersonalDeck, { store }));
    expect((screen.getByLabelText("Private note for Name") as HTMLTextAreaElement).value).toBe("My private memory cue.");
    expect((screen.getByLabelText("Own examples for Name · one per line") as HTMLTextAreaElement).value).toContain("My own second example.");
    expect((screen.getByRole("checkbox", { name: "Mark Difficult: Name" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("link", { name: "Practise Name" }).getAttribute("href")).toContain("scope=");
    expect(screen.getByRole("link", { name: "Open source card" }).getAttribute("href")).toMatch(/^\/(?!\/)/);
  });
  it("deduplicates read-to-learn words and does not invent a translation", () => {
    const store = memoryStore();
    add(store, "Unlisted source word", "text1"); add(store, "Unlisted source word", "text1");
    render(createElement(PersonalDeck, { store }));
    expect(screen.getAllByRole("heading", { name: "Unlisted source word" })).toHaveLength(1);
    expect(screen.getByText("Saved from your source item.")).not.toBeNull();
  });
  it("adds two misses within fourteen local days, excluding old misses and self-checks", () => {
    vi.useFakeTimers();
    const store = memoryStore();
    miss(store, "2026-10-09T12:00:00.000Z"); miss(store, "2026-10-22T10:00:00.000Z");
    miss(store, "2026-10-08T12:00:00.000Z", "w1"); miss(store, "2026-10-22T10:01:00.000Z", "w1");
    miss(store, "2026-10-22T10:02:00.000Z", "w2", true); miss(store, "2026-10-22T10:03:00.000Z", "w2", true);
    vi.setSystemTime(now);
    render(createElement(PersonalDeck, { store }));
    expect(screen.getByText("Automatic Difficult · 2 missed answers in the last 14 days.")).not.toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 }).map(heading => heading.textContent)).toEqual(["Name"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Show Difficult only" }));
    expect(screen.getByRole("heading", { name: "Name" })).not.toBeNull();
  });
  it("preserves an annotation from a newer app instead of overwriting it", () => {
    const store = memoryStore(); add(store);
    const key = `deck.annotation:${JSON.stringify([manifest.id, "w0", "Name"])}`;
    store.setDoc(key, { v: 2, privateFutureNotes: ["Keep this data"] });
    const before = store.getDoc(key);
    render(createElement(PersonalDeck, { store }));
    fireEvent.change(screen.getByLabelText("Private note for Name"), { target: { value: "An older-app edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save notes for Name" }));
    expect(screen.getByRole("status").textContent).toContain("newer app");
    expect(store.getDoc(key)).toEqual(before);
  });
  it("isolates annotations by pack, item and saved word and respects current scope", () => {
    const store = memoryStore(); add(store, "First word", "text1"); add(store, "Second word", "text1"); add(store, "Name");
    context.current!.scope = { v: 1, items: ["text1"] };
    render(createElement(PersonalDeck, { store }));
    expect(screen.queryByRole("heading", { name: "Name" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Private note for First word"), { target: { value: "Only the first word" } });
    fireEvent.click(screen.getByRole("button", { name: "Save notes for First word" }));
    expect((screen.getByLabelText("Private note for Second word") as HTMLTextAreaElement).value).toBe("");
    expect(store.getSnapshot().docs).toHaveLength(1);
  });
});

describe("Wortwerk practice backup UI", () => {
  it("downloads the actual raw events and documents, including memory fallback data", async () => {
    const store = createWortwerkStore({ getItem: () => { throw new Error("private mode"); }, setItem: () => { throw new Error("private mode"); } });
    add(store); store.setDoc("settings", { enabledPackIds: [manifest.id] }); store.setDoc("deck.annotation:fixture", { note: "Private note" });
    let exported: Blob | undefined;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn((blob: Blob) => { exported = blob; return "blob:practice"; }) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(createElement(BackupPanel, { store }));
    fireEvent.click(screen.getByRole("button", { name: "Download practice JSON" }));
    expect(JSON.parse(await fileText(exported!))).toEqual(store.exportBackup());
    expect(screen.getByText(/separate from the course-learning backup/)).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain("in-memory evidence");
  });
  it("previews then merges a full round trip, preserving newer docs and deduplicating events", async () => {
    const source = memoryStore("source"); add(source); source.setDoc("settings", { scope: "older" });
    const target = memoryStore("target"); target.restoreBackup(source.exportBackup()); target.setDoc("settings", { scope: "newer" });
    add(source, "Second saved word", "text1");
    const noteKey = `deck.annotation:${JSON.stringify([manifest.id, "w0", "Name"])}`;
    source.setDoc(noteKey, { v: 1, packId: manifest.id, itemId: "w0", word: "Name", note: "A restored private cue", examples: ["My own example"] });
    const backup = source.exportBackup();
    render(createElement(BackupPanel, { store: target }));
    upload(JSON.stringify(backup));
    await screen.findByRole("heading", { name: "Ready to merge" });
    expect(target.getSnapshot().events).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Merge practice backup" }));
    expect(target.getSnapshot().events).toHaveLength(2);
    expect(target.getDoc("settings")).toEqual({ scope: "newer" });
    expect(target.getDoc(noteKey)).toEqual(source.getDoc(noteKey));
    expect(screen.getByRole("status").textContent).toContain("Practice backup merged");
    upload(JSON.stringify(backup)); await screen.findByRole("heading", { name: "Ready to merge" });
    fireEvent.click(screen.getByRole("button", { name: "Merge practice backup" }));
    expect(target.getSnapshot().events).toHaveLength(2);
  });
  it("rejects malformed and future backups before changing any local evidence", async () => {
    const store = memoryStore(); add(store);
    const original = store.exportBackup();
    render(createElement(BackupPanel, { store }));
    upload(JSON.stringify({ ...original, events: [...original.events, { id: "invalid" }] }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Import rejected"));
    expect(store.exportBackup()).toEqual(original);
    upload(JSON.stringify({ schemaVersion: 3, events: [], docs: [] }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("newer app"));
    expect(store.exportBackup()).toEqual(original);
    upload(JSON.stringify({ ...original, docs: [{ store: "wortwerk-docs", key: "settings", deviceId: "future", updatedAt: now.toISOString(), schemaVersion: 2, value: {} }] }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("newer practice records"));
    expect(store.exportBackup()).toEqual(original);
  });
  it("rechecks conflicting event ids at merge time without a partial application", async () => {
    const store = memoryStore(); add(store);
    const original = store.exportBackup();
    const conflicting: WortwerkBackup = { ...original, events: original.events.map(event => ({ ...event, payload: { changed: true } })) };
    render(createElement(BackupPanel, { store }));
    upload(JSON.stringify(conflicting));
    await screen.findByRole("heading", { name: "Ready to merge" });
    fireEvent.click(screen.getByRole("button", { name: "Merge practice backup" }));
    expect(screen.getByRole("status").textContent).toContain("Conflicting Wortwerk event id");
    expect(store.exportBackup()).toEqual(original);
  });
  it("does not replace an existing document whose schema is newer than this app", async () => {
    const store = memoryStore();
    store.applyRemoteDocs([{ store: "wortwerk-docs", key: "settings", deviceId: "future", updatedAt: "2026-01-01T00:00:00.000Z", schemaVersion: 2, value: { future: true } }]);
    const source = memoryStore("source"); source.setDoc("settings", { oldApp: true });
    const original = store.exportBackup();
    render(createElement(BackupPanel, { store })); upload(JSON.stringify(source.exportBackup()));
    await screen.findByRole("heading", { name: "Ready to merge" }); fireEvent.click(screen.getByRole("button", { name: "Merge practice backup" }));
    expect(screen.getByRole("status").textContent).toContain("needs a newer app");
    expect(store.exportBackup()).toEqual(original);
  });
  it("checks file size before reading it and preserves future stored envelopes", async () => {
    const store = memoryStore(); render(createElement(BackupPanel, { store }));
    const read = vi.fn();
    fireEvent.change(screen.getByLabelText("Choose practice backup"), { target: { files: [{ size: 20_000_001, text: read }] } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("20 MB"));
    expect(read).not.toHaveBeenCalled();
    cleanup();
    const raw = JSON.stringify({ schemaVersion: 3, future: true }); const write = vi.fn();
    const future = createWortwerkStore({ getItem: key => key === WORTWERK_STORAGE_KEY ? raw : null, setItem: write });
    render(createElement(BackupPanel, { store: future }));
    expect((screen.getByRole("button", { name: "Import practice JSON" }) as HTMLButtonElement).disabled).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });
});
