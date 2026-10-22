"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deriveUnitProgress } from "../../../../packages/learning/src/wortwerk/engagement-depth.js";
import { playableCapabilities } from "@/lib/wortwerk/runtime";
import { parseStoryResource, type PackStoryChapter } from "@/lib/wortwerk/resources";
import { wortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { usePlayContent } from "./PlayProvider";
import { QuestionAudio } from "./QuestionAudio";

export function StoryPanel() {
  const content = usePlayContent();
  return content?.selectedPack ? <StoryContent key={content.selectedPack.pack.id} selected={content.selectedPack} /> : <div className="ww-page"><section className="ww-panel"><h1>Story</h1><p>Choose a content pack to see its story chapters.</p><Link href="/play/packs">Choose a pack</Link></section></div>;
}
function StoryContent({ selected }: { selected: PlayPack }) {
  const capabilities = useMemo(() => playableCapabilities(selected.pack, selected.language, selected.difficulty), [selected]);
  const state = useWortwerkState({ capabilities });
  const resource = selected.resources.story === undefined ? null : parseStoryResource(selected.resources.story, selected.pack);
  const units = deriveUnitProgress(selected.pack, state.progress);
  const [active, setActive] = useState<PackStoryChapter | null>(null);
  const completed = new Set(state.snapshot.events.filter(event => event.type === "story.chapter" && event.schemaVersion === 1 && Number.isFinite(Date.parse(event.createdAt)) && Date.parse(event.createdAt) <= state.now.getTime() && event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)).flatMap(event => {
    const payload = event.payload as Record<string, unknown>;
    return payload.packId === selected.pack.id && payload.completed === true && typeof payload.chapterId === "string" ? [payload.chapterId] : [];
  }));
  const unlocked = (chapter: PackStoryChapter): boolean => {
    const gate = chapter.requires ?? { unitId: chapter.unitId, securedRatio: 0.8 };
    const unit = units.find(unit => unit.unitId === gate.unitId);
    return gate.securedRatio === 0 || !!unit && unit.securedRatio >= gate.securedRatio;
  };
  function finish() {
    if (!active || !unlocked(active)) return;
    if (!completed.has(active.id)) wortwerkStore.appendEvent("story.chapter", { packId: selected.pack.id, chapterId: active.id, completed: true });
    setActive(null);
  }
  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">{selected.pack.title}</p><h1>{resource?.value?.title ?? "Story"}</h1><Link className="ww-button" href="/play/journey">Back to journey</Link></header>
    {!resource ? <section className="ww-panel"><p>No story has been authored for this pack yet.</p></section> : !resource.value ? <section className="ww-panel"><p>This story needs an authoring fix before its chapters can open.</p></section> : active && unlocked(active) ? <section className="ww-panel"><h2>{active.title}</h2><div lang={selected.language.locale}>{active.itemRefs.map(id => {
      const item = selected.pack.items.find(item => item.id === id);
      return item?.type === "dialogue" ? <div key={id}>{item.turns.map((turn, index) => <div className="ww-preview" key={index}><p><strong>{turn.speaker}</strong>: {turn.text}</p>{turn.audio ? <QuestionAudio audio={turn.audio} /> : null}</div>)}</div> : item?.type === "text" ? <article key={id}><h3>{item.title}</h3><p style={{ whiteSpace: "pre-wrap" }}>{item.body}</p>{item.audio ? <QuestionAudio audio={item.audio} /> : null}</article> : item?.type === "sentence" ? <article key={id}><p>{item.text}</p><p>{item.translation}</p>{item.audio ? <QuestionAudio audio={item.audio} /> : null}</article> : null;
    })}</div><p className="ww-muted">Reading a chapter records story completion. Recall milestones still come from practice on different days.</p><button type="button" className="ww-button ww-button--primary" onClick={finish}>Finish chapter</button><button type="button" className="ww-button" onClick={() => setActive(null)}>Back to chapters</button></section> : <section className="ww-panel"><h2>Chapters</h2><ol className="ww-pack-list">{resource.value.chapters.map(chapter => <li key={chapter.id}><h3>{chapter.title}</h3><p>{completed.has(chapter.id) ? "✓ Complete" : unlocked(chapter) ? "Ready to read" : "Locked · secure the required unit first"}</p><button type="button" className="ww-button" disabled={!unlocked(chapter)} onClick={() => setActive(chapter)}>Open chapter</button></li>)}</ol></section>}
  </div>;
}
