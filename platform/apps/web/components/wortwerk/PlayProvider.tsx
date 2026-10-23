"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DifficultyProfile, LanguageProfile } from "../../../../packages/content/src/types/packs.js";
import { restorePersonalPacks } from "@/lib/wortwerk/personal-import";
import type { WortwerkContent, PlayPack } from "@/lib/wortwerk/content.server";
import { getOverlayPacks, subscribeOverlayPacks } from "@/lib/wortwerk/pack-loader";
import { wortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { parsePlayScope, type PlayScope } from "@/lib/wortwerk/links";
import { buildPanelCatalog, cachePanelCatalog, PANEL_CATALOG_KEY } from "@/lib/wortwerk/panel-catalog";
import { positionScope, readBookPosition } from "@/lib/study/book-position";

type PlaySettings = { enabledPackIds?: string[]; [key: string]: unknown };
export type PlayContextValue = {
  packs: PlayPack[]; enabledPacks: PlayPack[]; selectedPack: PlayPack | undefined;
  scope: PlayScope; hydrated: boolean;
  languages: LanguageProfile[]; difficulties: DifficultyProfile[]; personalIssues: string[];
  setPackEnabled(id: string, enabled: boolean): void;
  selectPack(id: string): void;
  refreshOverlays(): void;
};
const PlayContext = createContext<PlayContextValue | null>(null);
export function usePlayContent(): PlayContextValue | null { return useContext(PlayContext); }

function settingsValue(value: unknown): PlaySettings {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PlaySettings : {};
}

export function PlayProvider({ content, children }: { content: WortwerkContent; children: ReactNode }) {
  const state = useWortwerkState();
  const [overlays, setOverlays] = useState<PlayPack[]>([]);
  const languages = useMemo(() => [...new Map([...(content.languages ?? []), ...content.packs.map(pack => pack.language)].map(profile => [profile.id, profile])).values()], [content]);
  const difficulties = useMemo(() => [...new Map([...(content.difficulties ?? []), ...content.packs.map(pack => pack.difficulty)].map(profile => [profile.id, profile])).values()], [content]);
  const [personal, setPersonal] = useState<{ packs: PlayPack[]; enabledIds: string[]; issues: string[]; revision: string }>({ packs: [], enabledIds: [], issues: [], revision: "" });
  const personalDocuments = state.snapshot.docs.filter(doc => doc.key.startsWith("personal.pack."));
  const personalRevision = JSON.stringify(personalDocuments.map(doc => [doc.key, doc.updatedAt, doc.deviceId, doc.schemaVersion, doc.value]));
  const storedPersonalIds = JSON.stringify(personalDocuments.map(doc => doc.key.slice("personal.pack.".length)));
  const restoreLocalPacks = useCallback((revision: string) => {
    const restored = restorePersonalPacks(languages, wortwerkStore);
    const packs = restored.packs.flatMap(({ pack }) => {
      const language = languages.find(profile => profile.id === pack.language);
      const difficulty = difficulties.find(profile => profile.id === pack.difficulty);
      return language && difficulty ? [{ pack, language, difficulty, fixture: false, resources: {} }] : [];
    });
    setPersonal({ packs, enabledIds: restored.packs.filter(document => document.enabledForTesting).map(document => document.pack.id), issues: restored.issues, revision });
  }, [languages, difficulties]);
  useEffect(() => { if (state.hydrated) restoreLocalPacks(personalRevision); }, [state.hydrated, personalRevision, restoreLocalPacks]);
  const refreshOverlays = useCallback(() => {
    setOverlays(getOverlayPacks().flatMap(pack => {
      const language = languages.find(profile => profile.id === pack.language);
      const difficulty = difficulties.find(profile => profile.id === pack.difficulty);
      return language && difficulty ? [{ pack, language, difficulty, fixture: false, resources: {} }] : [];
    }));
  }, [languages, difficulties]);
  useEffect(() => {
    refreshOverlays();
    const unsubscribe = subscribeOverlayPacks(refreshOverlays);
    window.addEventListener("focus", refreshOverlays);
    window.addEventListener("wortwerk-overlays-changed", refreshOverlays);
    return () => { unsubscribe(); window.removeEventListener("focus", refreshOverlays); window.removeEventListener("wortwerk-overlays-changed", refreshOverlays); };
  }, [refreshOverlays]);

  const packs = useMemo(() => {
    const combined = new Map(content.packs.map(pack => [pack.pack.id, pack]));
    const savedIds = new Set(JSON.parse(storedPersonalIds) as string[]);
    const restored = personal.revision === personalRevision;
    const supportedIds = new Set(restored ? personal.packs.map(entry => entry.pack.id) : []);
    for (const pack of overlays) {
      if (pack.pack.id.startsWith("personal-") && savedIds.has(pack.pack.id) && !supportedIds.has(pack.pack.id)) continue;
      combined.set(pack.pack.id, pack);
    }
    if (restored) for (const pack of personal.packs) combined.set(pack.pack.id, pack);
    return [...combined.values()];
  }, [content, overlays, personal.packs, personal.revision, personalRevision, storedPersonalIds]);
  const settings = settingsValue(state.snapshot.docs.find(doc => doc.key === "settings" && doc.schemaVersion === 1)?.value);
  const explicitIds = Array.isArray(settings.enabledPackIds) && settings.enabledPackIds.every(id => typeof id === "string") ? settings.enabledPackIds : undefined;
  const enabledPacks = packs.filter(({ pack, fixture }) => explicitIds ? explicitIds.includes(pack.id) : !fixture && pack.review.status === "reviewed" || personal.enabledIds.includes(pack.id));
  const selectedId = state.snapshot.docs.find(doc => doc.key === "study.pack" && doc.schemaVersion === 1)?.value;
  const selectedPack = enabledPacks.find(pack => pack.pack.id === selectedId) ?? enabledPacks[0];
  const scopeDoc = state.snapshot.docs.find(doc => doc.key === "study.scope");
  const savedScope = scopeDoc?.value;
  const positionDoc = state.snapshot.docs.find(doc => doc.key === "study.position");
  const savedPosition = positionDoc?.schemaVersion === 1 ? positionDoc.value : undefined;
  const unconfirmedScope = useMemo<PlayScope>(() => {
    const books = selectedPack ? [...new Set([...selectedPack.pack.items.map(item => item.bookRef.book),
      ...selectedPack.pack.units.flatMap(unit => unit.bookRef ? [unit.bookRef.book] : [])])].sort() : [];
    return books[0] ? { v: 1, book: books[0], lessons: [] } : { v: 1 };
  }, [selectedPack]);
  const defaultPosition = useMemo(() => {
    const position = readBookPosition(savedPosition);
    return position && selectedPack && (selectedPack.pack.items.some(item => item.bookRef.book === position.book)
      || selectedPack.pack.units.some(unit => unit.bookRef?.book === position.book)) ? position : null;
  }, [savedPosition, selectedPack]);
  const scope = useMemo<PlayScope>(() => {
    if (scopeDoc && scopeDoc.schemaVersion > 1) return unconfirmedScope;
    if (savedScope !== undefined) {
      try { return parsePlayScope(savedScope); } catch { return unconfirmedScope; }
    }
    return defaultPosition ? positionScope(defaultPosition) : unconfirmedScope;
  }, [savedScope, defaultPosition, unconfirmedScope, scopeDoc]);
  useEffect(() => {
    // A confirmed position is a default, never a replacement for explicit filters.
    // Persist it so dashboard panels and shared links read the very same scope.
    if (!state.hydrated || savedScope !== undefined || !defaultPosition || wortwerkStore.getDoc("study.scope") !== undefined) return;
    wortwerkStore.setDoc("study.scope", { ...positionScope(defaultPosition), selection: {
      mode: "position", book: defaultPosition.book, lessons: [], tags: [], sources: [], skills: [], includeWholeCurrentLesson: false,
    } });
  }, [defaultPosition, savedScope, state.hydrated]);
  const catalog = useMemo(() => buildPanelCatalog(packs, scope), [packs, scope]);
  const savedCatalog = state.snapshot.docs.find(doc => doc.key === PANEL_CATALOG_KEY)?.value;
  useEffect(() => {
    if (state.hydrated) cachePanelCatalog(wortwerkStore, catalog);
  }, [catalog, savedCatalog, state.hydrated]);

  function setPackEnabled(id: string, enabled: boolean) {
    wortwerkStore.refresh();
    const futureSettings = wortwerkStore.getSnapshot().docs.find(doc => doc.key === "settings" && doc.schemaVersion > 1);
    if (futureSettings) { setPersonal(previous => ({ ...previous, issues: ["Please update the app before changing pack settings."] })); return; }
    const personalKey = `personal.pack.${id}`;
    const document = wortwerkStore.getDoc<{ schemaVersion?: unknown; enabledForTesting?: unknown; pack?: unknown }>(personalKey);
    const personalEnvelope = wortwerkStore.getSnapshot().docs.find(doc => doc.key === personalKey);
    if (personalEnvelope?.schemaVersion === 1 && document?.schemaVersion === 1 && typeof document.enabledForTesting === "boolean" && document.enabledForTesting !== enabled) {
      wortwerkStore.setDoc(personalKey, { ...document, enabledForTesting: enabled });
    }
    const ids = new Set(enabledPacks.map(pack => pack.pack.id));
    if (enabled) ids.add(id); else ids.delete(id);
    wortwerkStore.setDoc("settings", { ...settings, enabledPackIds: [...ids].sort() });
    if (enabled) wortwerkStore.setDoc("study.pack", id);
  }
  function selectPack(id: string) {
    if (enabledPacks.some(pack => pack.pack.id === id)) wortwerkStore.setDoc("study.pack", id);
  }

  return <PlayContext.Provider value={{ packs, enabledPacks, selectedPack, scope, hydrated: state.hydrated, languages, difficulties, personalIssues: personal.issues, setPackEnabled, selectPack, refreshOverlays }}>{children}</PlayContext.Provider>;
}
