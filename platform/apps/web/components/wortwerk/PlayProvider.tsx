"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { WortwerkContent, PlayPack } from "@/lib/wortwerk/content.server";
import { getOverlayPacks, subscribeOverlayPacks } from "@/lib/wortwerk/pack-loader";
import { wortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { parsePlayScope, type PlayScope } from "@/lib/wortwerk/links";
import { buildPanelCatalog, cachePanelCatalog, PANEL_CATALOG_KEY } from "@/lib/wortwerk/panel-catalog";

type PlaySettings = { enabledPackIds?: string[]; [key: string]: unknown };
export type PlayContextValue = {
  packs: PlayPack[]; enabledPacks: PlayPack[]; selectedPack: PlayPack | undefined;
  scope: PlayScope; hydrated: boolean;
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
  const refreshOverlays = useCallback(() => {
    const known = content.packs;
    setOverlays(getOverlayPacks().flatMap(pack => {
      const language = (content.languages ?? known.map(entry => entry.language)).find(profile => profile.id === pack.language);
      const difficulty = (content.difficulties ?? known.map(entry => entry.difficulty)).find(profile => profile.id === pack.difficulty);
      return language && difficulty ? [{ pack, language, difficulty, fixture: false, resources: {} }] : [];
    }));
  }, [content]);
  useEffect(() => {
    refreshOverlays();
    const unsubscribe = subscribeOverlayPacks(refreshOverlays);
    window.addEventListener("focus", refreshOverlays);
    window.addEventListener("wortwerk-overlays-changed", refreshOverlays);
    return () => { unsubscribe(); window.removeEventListener("focus", refreshOverlays); window.removeEventListener("wortwerk-overlays-changed", refreshOverlays); };
  }, [refreshOverlays]);

  const packs = useMemo(() => {
    const combined = new Map(content.packs.map(pack => [pack.pack.id, pack]));
    for (const pack of overlays) combined.set(pack.pack.id, pack);
    return [...combined.values()];
  }, [content, overlays]);
  const settings = settingsValue(state.snapshot.docs.find(doc => doc.key === "settings")?.value);
  const explicitIds = Array.isArray(settings.enabledPackIds) && settings.enabledPackIds.every(id => typeof id === "string") ? settings.enabledPackIds : undefined;
  const enabledPacks = packs.filter(({ pack, fixture }) => explicitIds ? explicitIds.includes(pack.id) : !fixture && pack.review.status === "reviewed");
  const selectedId = state.snapshot.docs.find(doc => doc.key === "study.pack")?.value;
  const selectedPack = enabledPacks.find(pack => pack.pack.id === selectedId) ?? enabledPacks[0];
  const savedScope = state.snapshot.docs.find(doc => doc.key === "study.scope")?.value;
  const scope = useMemo<PlayScope>(() => {
    try { if (savedScope) return parsePlayScope(savedScope); } catch { /* An invalid old scope never blocks a new run. */ }
    return { v: 1 };
  }, [savedScope]);
  const catalog = useMemo(() => buildPanelCatalog(packs, scope), [packs, scope]);
  const savedCatalog = state.snapshot.docs.find(doc => doc.key === PANEL_CATALOG_KEY)?.value;
  useEffect(() => {
    if (state.hydrated) cachePanelCatalog(wortwerkStore, catalog);
  }, [catalog, savedCatalog, state.hydrated]);

  function setPackEnabled(id: string, enabled: boolean) {
    const ids = new Set(enabledPacks.map(pack => pack.pack.id));
    if (enabled) ids.add(id); else ids.delete(id);
    wortwerkStore.setDoc("settings", { ...settings, enabledPackIds: [...ids].sort() });
    if (enabled) wortwerkStore.setDoc("study.pack", id);
  }
  function selectPack(id: string) {
    if (enabledPacks.some(pack => pack.pack.id === id)) wortwerkStore.setDoc("study.pack", id);
  }

  return <PlayContext.Provider value={{ packs, enabledPacks, selectedPack, scope, hydrated: state.hydrated, setPackEnabled, selectPack, refreshOverlays }}>{children}</PlayContext.Provider>;
}
