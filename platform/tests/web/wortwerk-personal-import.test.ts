/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ContentPack, LanguageProfile, PackManifest } from "../../packages/content/src/types/packs.js";
import { createWortwerkStore, type WortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { createPersonalImportId, previewPersonalCsv, savePersonalPack, readPersonalPacks, restorePersonalPacks, personalPackJson } from "../../apps/web/lib/wortwerk/personal-import";
const personalImportPath = "../../apps/web/components/wortwerk/PersonalImport.js";
const { PersonalImport } = await import(personalImportPath) as {
    PersonalImport: ComponentType<{
        manifest: PackManifest;
        language: LanguageProfile;
        store?: WortwerkStore;
        onSaved?: (pack: ContentPack, enabled: boolean) => void;
    }>;
};
import { clearOverlayPacks, getOverlayPacks } from "../../packages/wortwerk/src/registry.js";
import language from "../../content/languages/de.json";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
const profile = language as LanguageProfile;
const manifest: PackManifest = { ...fixture, units: [{ id: "u1", title: "Unit", canDo: [], bookRef: { book: "fixture", lesson: 3 } }] } as PackManifest;
const csv = 'lemma,meaning,gender,pos\nApfel,apple,male,noun\nBuch,book,neuter,noun';
function memory() { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; }
afterEach(() => { cleanup(); clearOverlayPacks(); });
describe("student personal words", () => {
    it("preserves newer personal payloads and document envelopes when an older form tries to resave", () => {
        const store = createWortwerkStore(memory());
        const pack = previewPersonalCsv(csv, { manifest, language: profile }).pack!;
        const key = `personal.pack.${pack.id}`;
        store.setDoc(key, { schemaVersion: 2, pack, enabledForTesting: true });
        expect(() => savePersonalPack(pack, profile, { store })).toThrow("update");
        expect(store.getDoc<{
            schemaVersion: number;
        }>(key)?.schemaVersion).toBe(2);
        const doc = store.setDoc(`personal.pack.future`, { schemaVersion: 1, pack: { ...pack, id: "personal-future" }, enabledForTesting: true });
        store.applyRemoteDocs([{ ...doc, key: `personal.pack.personal-future`, schemaVersion: 2, updatedAt: "2099-01-01T00:00:00.000Z" }]);
        expect(() => savePersonalPack({ ...pack, id: "personal-future" }, profile, { store })).toThrow("update");
        expect(readPersonalPacks([profile], store).packs).toEqual([]);
    });
    it("exports self-contained inline mini-packs without inherited resource paths", () => {
        const preview = previewPersonalCsv(csv, { manifest: { ...manifest, itemFiles: ["items/source.json"], story: "story.json", exam: "exam.json" }, language: profile });
        expect(preview.issues).toEqual([]);
        const exported = JSON.parse(personalPackJson(preview.pack!, profile)) as Record<string, unknown>;
        expect(exported.itemFiles).toBeUndefined();
        expect(exported.story).toBeUndefined();
        expect(exported.exam).toBeUndefined();
        expect(Array.isArray(exported.items)).toBe(true);
    });
    it("gives every imported pack its own namespace and keeps it pending/off by default", () => {
        const first = previewPersonalCsv(csv, { manifest, language: profile });
        const second = previewPersonalCsv(csv, { manifest, language: profile });
        expect(first.issues).toEqual([]);
        expect(first.pack?.id).toMatch(/^personal-[0-9a-f-]+$/);
        expect(first.pack?.id).not.toBe(manifest.id);
        expect(first.pack?.id).not.toBe(second.pack?.id);
        const store = createWortwerkStore(memory());
        savePersonalPack(first.pack!, profile, { store });
        expect(readPersonalPacks([profile], store).packs[0]?.enabledForTesting).toBe(false);
        expect(getOverlayPacks()).toEqual([]);
        expect(store.getSnapshot().docs).toHaveLength(1);
    });
    it("validates all rows before saving or overlay registration", () => {
        const preview = previewPersonalCsv(csv + '\napfel,duplicate,male,noun', { manifest, language: profile });
        expect(preview.pack).toBeNull();
        const store = createWortwerkStore(memory());
        const valid = previewPersonalCsv(csv, { manifest, language: profile }).pack!;
        const invalid = { ...valid, items: valid.items.map(item => ({ ...item, source: "teacher-extra" as const })) };
        expect(() => savePersonalPack(invalid, profile, { store, enabledForTesting: true })).toThrow("personal sources");
        expect(store.getSnapshot().docs).toEqual([]);
        expect(getOverlayPacks()).toEqual([]);
    });
    it("stores raw mini-pack data in sync docs and restores only explicit enabled valid packs", () => {
        const storage = memory();
        const store = createWortwerkStore(storage);
        const pack = previewPersonalCsv(csv, { manifest, language: profile }).pack!;
        savePersonalPack(pack, profile, { store, enabledForTesting: true });
        expect(getOverlayPacks()[0]?.id).toBe(pack.id);
        clearOverlayPacks();
        const reloaded = createWortwerkStore(storage);
        const result = restorePersonalPacks([profile], reloaded);
        expect(result.issues).toEqual([]);
        expect(getOverlayPacks()[0]).toEqual(pack);
        expect(JSON.parse(personalPackJson(pack, profile))).toEqual(pack);
        reloaded.setDoc('personal.pack.invalid', { schemaVersion: 9, enabledForTesting: true, pack: {} });
        expect(restorePersonalPacks([profile], reloaded).issues).toHaveLength(1);
    });
    it("does not overwrite course packs or promote language review", () => {
        const store = createWortwerkStore(memory());
        const pack = previewPersonalCsv(csv, { manifest, language: profile }).pack!;
        expect(() => savePersonalPack({ ...pack, id: manifest.id }, profile, { store })).toThrow("namespace");
        expect(() => savePersonalPack({ ...pack, review: { status: "reviewed", reviewer: "fixture", reviewedAt: "2026-10-22" } }, profile, { store })).toThrow();
        expect(createPersonalImportId()).not.toBe(createPersonalImportId());
    });
    it("offers a real preview and explicit test opt-in before a single save", () => {
        const store = createWortwerkStore(memory());
        const saved = vi.fn();
        render(createElement(PersonalImport, { manifest, language: profile, store, onSaved: saved }));
        fireEvent.change(screen.getByRole("textbox", { name: "CSV text" }), { target: { value: csv } });
        fireEvent.click(screen.getByRole("button", { name: "Preview words" }));
        expect(screen.getByText("2 words ready to import")).toBeTruthy();
        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
        expect(store.getSnapshot().docs).toEqual([]);
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByRole("button", { name: "Save personal pack" }));
        fireEvent.click(screen.getByRole("button", { name: "Save personal pack" }));
        expect(saved).toHaveBeenCalledTimes(1);
        expect(saved.mock.calls[0]?.[1]).toBe(true);
        expect(getOverlayPacks()).toHaveLength(1);
        expect(store.getSnapshot().docs).toHaveLength(1);
    });
    it("changing CSV invalidates the old preview and never saves a partial invalid batch", () => {
        const store = createWortwerkStore(memory());
        render(createElement(PersonalImport, { manifest, language: profile, store }));
        const input = screen.getByRole("textbox", { name: "CSV text" });
        fireEvent.change(input, { target: { value: csv } });
        fireEvent.click(screen.getByRole("button", { name: "Preview words" }));
        fireEvent.change(input, { target: { value: 'lemma,meaning\nBuch,book\nbuch,duplicate' } });
        expect(screen.queryByRole("button", { name: "Save personal pack" })).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Preview words" }));
        expect(screen.getByText(/Duplicate headword/u)).toBeTruthy();
        expect(store.getSnapshot().docs).toEqual([]);
    });
});
