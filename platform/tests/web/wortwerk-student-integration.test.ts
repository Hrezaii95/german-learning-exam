/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, Fragment, type ComponentType, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackManifest } from "../../packages/content/src/types/packs.js";
import type { CefrLevel } from "../../packages/content/src/types/common.js";
import type { WortwerkContent } from "../../apps/web/lib/wortwerk/content.server.js";
import type { WortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import type { PlayScope } from "../../apps/web/lib/wortwerk/links.js";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
import { previewPersonalCsv, savePersonalPack } from "../../apps/web/lib/wortwerk/personal-import.js";
import { clearOverlayPacks, getOverlayPacks, registerOverlayPacks } from "../../packages/wortwerk/src/registry.js";
import languageData from "../../content/languages/de.json";
import difficultyData from "../../content/difficulty/A1.json";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureDifficultyData from "../fixtures/packs/de-b2-sample/difficulty.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
const testState = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("../../apps/web/lib/wortwerk/store.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../apps/web/lib/wortwerk/store.js")>();
    return { ...actual, wortwerkStore: new Proxy({}, { get: (_target, property) => Reflect.get(testState.store as object, property) }) };
});
const providerPath = "../../apps/web/components/wortwerk/PlayProvider.js";
const pickerPath = "../../apps/web/components/wortwerk/PackPicker.js";
const receiptPath = "../../apps/web/components/wortwerk/ReceiptPanel.js";
const todayPath = "../../apps/web/components/wortwerk/TodayPanel.js";
type ContextView = {
    enabledPacks: Array<{
        pack: ContentPack;
    }>;
    selectedPack?: {
        pack: ContentPack;
    };
};
const { PlayProvider, usePlayContent } = await import(providerPath) as {
    PlayProvider: ComponentType<{
        content: WortwerkContent;
        children: ReactNode;
    }>;
    usePlayContent: () => ContextView | null;
};
const { PlayPackSettings } = await import(pickerPath) as {
    PlayPackSettings: ComponentType;
};
const { AssignmentMemory } = await import(receiptPath) as {
    AssignmentMemory: ComponentType<{
        assignmentId?: string;
        scope: PlayScope;
        packId?: string;
        store?: WortwerkStore;
    }>;
};
const { TodayPanel } = await import(todayPath) as {
    TodayPanel: ComponentType;
};
const language = languageData as LanguageProfile;
const difficulty = difficultyData as DifficultyProfile;
const profilesOnly: WortwerkContent = { packs: [], languages: [language], difficulties: [difficulty] };
const manifest: PackManifest = { ...fixture, language: language.id, difficulty: difficulty.id, cefr: difficulty.id as CefrLevel,
    units: [{ id: "mine", title: "Personal words", canDo: [], bookRef: { book: "my-book", lesson: 2 } }] } as PackManifest;
const csv = "lemma,meaning,book,lesson\nalpha,first,my-book,2\nbeta,second,my-book,2";
let store: WortwerkStore;
beforeEach(() => {
    const values = new Map<string, string>();
    store = createWortwerkStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } });
    testState.store = store;
    clearOverlayPacks();
});
afterEach(() => { cleanup(); clearOverlayPacks(); vi.restoreAllMocks(); });
function Readout() {
    const value = usePlayContent();
    return createElement("output", { "aria-label": "Enabled pack ids" }, JSON.stringify(value?.enabledPacks.map(pack => pack.pack.id) ?? []));
}
function mount(children: ReactNode, content: WortwerkContent = profilesOnly) { return render(createElement(PlayProvider, { content, children })); }
describe("Wortwerk student-side Class A integration", () => {
    it("supports CSV import with installed profiles and no course pack, staying off until explicit opt-in", async () => {
        mount(createElement(Fragment, null, createElement(PlayPackSettings), createElement(Readout)));
        expect(screen.getByRole("heading", { name: "Your own words" })).toBeTruthy();
        fireEvent.change(screen.getByRole("textbox", { name: "CSV text" }), { target: { value: csv } });
        fireEvent.click(screen.getByRole("button", { name: "Preview words" }));
        expect(screen.getByText("2 words ready to import")).toBeTruthy();
        expect((screen.getByRole("checkbox", { name: "Enable this pending pack for testing" }) as HTMLInputElement).checked).toBe(false);
        fireEvent.click(screen.getByRole("button", { name: "Save personal pack" }));
        await waitFor(() => expect(screen.getByRole("checkbox", { name: "Enable My words" })).toBeTruthy());
        expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toBe("[]");
        const stored = store.getSnapshot().docs.find(doc => doc.key.startsWith("personal.pack."))?.value as {
            pack: ContentPack;
        };
        expect(stored.pack.review.status).toBe("pending-german-review");
        fireEvent.click(screen.getByRole("checkbox", { name: "Enable My words" }));
        await waitFor(() => expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toContain(stored.pack.id));
    });
    it("turns a resaved personal pack off when the learner removes the test opt-in", async () => {
        const fixtureDifficulty = fixtureDifficultyData as DifficultyProfile;
        const course = { ...fixture, items: fixtureItems } as unknown as ContentPack;
        const content: WortwerkContent = { packs: [{ pack: course, language, difficulty: fixtureDifficulty, fixture: true, resources: {} }],
            languages: [language], difficulties: [difficulty, fixtureDifficulty] };
        mount(createElement(Fragment, null, createElement(PlayPackSettings), createElement(Readout)), content);
        fireEvent.change(screen.getByRole("combobox", { name: "Level" }), { target: { value: fixtureDifficulty.id } });
        const input = screen.getByRole("textbox", { name: "CSV text" });
        fireEvent.change(input, { target: { value: csv } });
        fireEvent.click(screen.getByRole("button", { name: "Preview words" }));
        fireEvent.click(screen.getByRole("checkbox", { name: "Enable this pending pack for testing" }));
        fireEvent.click(screen.getByRole("button", { name: "Save personal pack" }));
        await waitFor(() => expect((screen.getByRole("checkbox", { name: "Enable My words" }) as HTMLInputElement).checked).toBe(true));
        const key = store.getSnapshot().docs.find(doc => doc.key.startsWith("personal.pack."))!.key;
        fireEvent.change(input, { target: { value: `${csv}\ngamma,third,my-book,2` } });
        fireEvent.click(screen.getByRole("button", { name: "Preview words" }));
        fireEvent.click(screen.getByRole("checkbox", { name: "Enable this pending pack for testing" }));
        fireEvent.click(screen.getByRole("button", { name: "Save personal pack" }));
        await waitFor(() => expect((screen.getByRole("checkbox", { name: "Enable My words" }) as HTMLInputElement).checked).toBe(false));
        expect(store.getDoc<{
            enabledForTesting: boolean;
        }>(key)?.enabledForTesting).toBe(false);
        expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toBe("[]");
    });
    it("restores explicit personal opt-in without clearing the teacher registry", async () => {
        const personal = previewPersonalCsv(csv, { manifest, language }).pack!;
        savePersonalPack(personal, language, { store, enabledForTesting: true });
        clearOverlayPacks();
        const teacher = { ...fixture, id: "class-extras", items: fixtureItems.map(item => ({ ...item, source: "teacher-extra" })) } as unknown as ContentPack;
        registerOverlayPacks([teacher]);
        mount(createElement(Readout));
        await waitFor(() => expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toContain(personal.id));
        expect(getOverlayPacks().map(pack => pack.id).sort()).toEqual([teacher.id, personal.id].sort());
        expect(store.getDoc<{
            pack: ContentPack;
        }>(`personal.pack.${personal.id}`)?.pack.items.every(item => item.source === "study-extra")).toBe(true);
    });
    it("quarantines an already registered personal pack when its stored payload becomes unsupported", async () => {
        const personal = previewPersonalCsv(csv, { manifest, language }).pack!;
        savePersonalPack(personal, language, { store, enabledForTesting: true });
        store.setDoc("settings", { enabledPackIds: [personal.id] });
        mount(createElement(Readout));
        await waitFor(() => expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toContain(personal.id));
        const key = `personal.pack.${personal.id}`;
        const previous = store.getDoc<{ schemaVersion: number; pack: ContentPack; enabledForTesting: boolean }>(key)!;
        act(() => { store.setDoc(key, { ...previous, schemaVersion: 2 }); });
        await waitFor(() => expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toBe("[]"));
        expect(getOverlayPacks().some(pack => pack.id === personal.id)).toBe(true);
    });
    it("rebuilds the selected personal pack when a same-timestamp remote document wins", async () => {
        const personal = previewPersonalCsv(csv, { manifest, language }).pack!;
        savePersonalPack(personal, language, { store, enabledForTesting: true });
        store.setDoc("settings", { enabledPackIds: [personal.id] });
        store.setDoc("study.pack", personal.id);
        const teacher = { ...fixture, id: "class-tie-extras", items: fixtureItems.map(item => ({ ...item, source: "teacher-extra" })) } as unknown as ContentPack;
        registerOverlayPacks([teacher]);
        function SelectedReadout() {
            const selected = usePlayContent()?.selectedPack?.pack;
            return createElement("output", { "aria-label": "Selected personal content" }, selected ? `${selected.title}:${selected.items.map(item => item.type === "lexeme" ? item.lemma : item.id).join(",")}` : "none");
        }
        mount(createElement(Fragment, null, createElement(Readout), createElement(SelectedReadout)));
        await waitFor(() => expect(screen.getByRole("status", { name: "Selected personal content" }).textContent).toBe("My words:alpha,beta"));
        const key = `personal.pack.${personal.id}`;
        const previous = store.getSnapshot().docs.find(doc => doc.key === key)!;
        const value = previous.value as { schemaVersion: number; pack: ContentPack; enabledForTesting: boolean };
        const revised = { ...value, pack: { ...value.pack, title: "Updated personal words", items: value.pack.items.map((item, index) => item.type === "lexeme" && index === 0 ? { ...item, lemma: "gamma" } : item) } };
        act(() => { store.applyRemoteDocs([{ ...previous, deviceId: `${previous.deviceId}~`, value: revised }]); });
        expect(store.getDoc<{ pack: ContentPack }>(key)?.pack.title).toBe("Updated personal words");
        await waitFor(() => expect(screen.getByRole("status", { name: "Selected personal content" }).textContent).toBe("Updated personal words:gamma,beta"));
        expect(getOverlayPacks().some(pack => pack.id === teacher.id)).toBe(true);
        // The winning timestamp can stay equal when an unsupported newer record arrives too.
        act(() => { store.applyRemoteDocs([{ ...previous, deviceId: `${previous.deviceId}~~`, schemaVersion: 2, value: revised }]); });
        await waitFor(() => expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toBe("[]"));
        expect(screen.getByRole("status", { name: "Selected personal content" }).textContent).toBe("none");
        expect(getOverlayPacks().some(pack => pack.id === teacher.id)).toBe(true);
    });
    it("keeps explicitly disabled restored content off even when its original import opted in", async () => {
        const personal = previewPersonalCsv(csv, { manifest, language }).pack!;
        savePersonalPack(personal, language, { store, enabledForTesting: true });
        store.setDoc("settings", { enabledPackIds: [] });
        mount(createElement(Fragment, null, createElement(PlayPackSettings), createElement(Readout)));
        await waitFor(() => expect(screen.getByRole("checkbox", { name: "Enable My words" })).toBeTruthy());
        expect((screen.getByRole("checkbox", { name: "Enable My words" }) as HTMLInputElement).checked).toBe(false);
        expect(screen.getByRole("status", { name: "Enabled pack ids" }).textContent).toBe("[]");
        fireEvent.click(screen.getByRole("checkbox", { name: "Enable My words" }));
        fireEvent.click(screen.getByRole("checkbox", { name: "Enable My words" }));
        expect(store.getDoc<{
            enabledForTesting: boolean;
        }>(`personal.pack.${personal.id}`)?.enabledForTesting).toBe(false);
    });
    it("remembers a started assignment through an idempotent effect and surfaces it on Today", async () => {
        const scope: PlayScope = { v: 1, lessons: [2], count: 5 };
        const children = createElement(Fragment, null, createElement(AssignmentMemory, { assignmentId: "homework", scope, packId: "sample", store }), createElement(TodayPanel));
        const view = mount(children);
        await waitFor(() => expect(screen.getByRole("link", { name: "Continue assignment homework" })).toBeTruthy());
        view.rerender(createElement(PlayProvider, { content: profilesOnly, children }));
        expect(store.getDoc<{
            assignments: unknown[];
        }>("assignments.pending")?.assignments).toHaveLength(1);
        act(() => { store.appendEvent("assignment.progress", { assignmentId: "homework", answered: 5, correct: 4, bySkill: { meaning: { answered: 5, correct: 4 } }, completed: true }); });
        expect(screen.queryByRole("link", { name: "Continue assignment homework" })).toBeNull();
    });
});
