import type { ContentPack, LanguageProfile, PackManifest } from "../../../../packages/content/src/types/packs.js";
import { assertContentPack, validatePack } from "../../../../packages/content/src/validation/packs.js";
import { previewCsvPack, type CsvImportPreview } from "../../../../packages/wortwerk/src/csv.js";
import { registerOverlayPacks } from "../../../../packages/wortwerk/src/registry.js";
import { createUuidV7Factory, wortwerkStore, type WortwerkStore } from "./store";
const uuid = createUuidV7Factory();
const prefix = "personal.pack.";
export type PersonalPackDocument = {
    schemaVersion: 1;
    pack: ContentPack;
    enabledForTesting: boolean;
};
export type PersonalImportContext = {
    manifest: PackManifest;
    language: LanguageProfile;
    book?: string;
    lesson?: number;
    id?: string;
    title?: string;
};
export function createPersonalImportId(): string { return `personal-${uuid()}`; }
function personal(pack: ContentPack, language: LanguageProfile) {
    assertContentPack(pack, language);
    if (!/^personal-[a-z0-9-]+$/u.test(pack.id) || pack.review.status !== "pending-german-review" || pack.items.some(item => item.source !== "study-extra" || item.review?.status !== "pending-german-review"))
        throw new Error("Personal imports must use their own namespace, pending review and personal sources.");
}
export function previewPersonalCsv(csv: string, { manifest, language, book, lesson, id = createPersonalImportId(), title = "My words" }: PersonalImportContext): CsvImportPreview {
    const { story: _story, exam: _exam, itemFiles: _files, ...metadata } = manifest;
    return previewCsvPack({ csv, manifest: { ...metadata, id, title, review: { status: "pending-german-review" } }, language, source: "study-extra", namespace: id, ...(book ? { book } : {}), ...(lesson !== undefined ? { lesson } : {}) });
}
/** One document contains both content and the explicit test opt-in. */
export function savePersonalPack(pack: ContentPack, language: LanguageProfile, options: {
    enabledForTesting?: boolean;
    store?: WortwerkStore;
} = {}): PersonalPackDocument {
    personal(pack, language);
    const document: PersonalPackDocument = { schemaVersion: 1, pack: structuredClone(pack), enabledForTesting: options.enabledForTesting === true };
    const store = options.store ?? wortwerkStore;
    store.refresh();
    const envelope = store.getSnapshot().docs.find(doc => doc.key === `${prefix}${pack.id}`);
    if (envelope && envelope.schemaVersion > 1)
        throw new Error("Please update the app before replacing this personal pack.");
    const existing = store.getDoc<unknown>(`${prefix}${pack.id}`);
    if (record(existing) && typeof existing.schemaVersion === "number" && existing.schemaVersion > 1)
        throw new Error("Please update the app before replacing this personal pack.");
    store.setDoc(`${prefix}${pack.id}`, document);
    if (document.enabledForTesting)
        registerOverlayPacks([pack]);
    return document;
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function readPersonalPacks(languages: readonly LanguageProfile[], store: WortwerkStore = wortwerkStore): {
    packs: PersonalPackDocument[];
    issues: string[];
} {
    const packs: PersonalPackDocument[] = [];
    const issues: string[] = [];
    for (const doc of store.getSnapshot().docs) {
        if (!doc.key.startsWith(prefix))
            continue;
        if (doc.schemaVersion !== 1) {
            issues.push("A saved personal pack needs a newer app version.");
            continue;
        }
        const value = doc.value;
        if (record(value) && typeof value.schemaVersion === "number" && value.schemaVersion > 1) {
            issues.push("A saved personal pack needs a newer app version.");
            continue;
        }
        if (!record(value) || value.schemaVersion !== 1 || typeof value.enabledForTesting !== "boolean" || !record(value.pack) || typeof value.pack.language !== "string") {
            issues.push("A saved personal pack has an unsupported format.");
            continue;
        }
        const storedPack = value.pack;
        const language = languages.find(profile => profile.id === storedPack.language);
        if (!language) {
            issues.push("A saved personal pack needs its language profile installed.");
            continue;
        }
        if (validatePack(value.pack, language).length) {
            issues.push("A saved personal pack did not pass content validation.");
            continue;
        }
        const pack = value.pack as ContentPack;
        try {
            personal(pack, language);
            if (doc.key !== `${prefix}${pack.id}`)
                throw new Error("Mismatched personal pack id");
        }
        catch {
            issues.push("A saved personal pack has invalid source or review metadata.");
            continue;
        }
        packs.push({ schemaVersion: 1, pack: structuredClone(pack), enabledForTesting: value.enabledForTesting });
    }
    return { packs, issues };
}
/** The normal pack picker still owns which enabled pack is selected for practice. */
export function restorePersonalPacks(languages: readonly LanguageProfile[], store: WortwerkStore = wortwerkStore): {
    packs: PersonalPackDocument[];
    issues: string[];
} {
    const result = readPersonalPacks(languages, store);
    registerOverlayPacks(result.packs.filter(value => value.enabledForTesting).map(value => value.pack));
    return result;
}
export function personalPackJson(pack: ContentPack, language: LanguageProfile): string { personal(pack, language); return `${JSON.stringify(pack, null, 2)}\n`; }
