"use client";

import Link from "next/link";
import { useMemo } from "react";
import { playableCapabilities } from "@/lib/wortwerk/runtime";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { ScopePicker } from "./ScopePicker";
import { TodayPanel } from "./TodayPanel";
import { ProgressSummary } from "./ProgressSummary";
import { usePlayContent } from "./PlayProvider";

export function PlayHome() {
  const content = usePlayContent();
  const selected = content?.selectedPack;
  const capabilities = useMemo(() => selected ? playableCapabilities(selected.pack, selected.language, selected.difficulty) : [], [selected]);
  const state = useWortwerkState({ capabilities });
  const skills = useMemo(() => [...new Set(capabilities.flatMap(item => item.templates.flatMap(template => [template.skill, template.dimension])))].sort().map(id => ({
    id, label: selected?.language.grammarLabels[id] ?? `${id.slice(0, 1).toUpperCase()}${id.slice(1).replace(/-/g, " ")}`,
  })), [capabilities, selected]);
  const smartSets = useMemo(() => {
    const failures = new Map<string, number>();
    const recent = state.now.getTime() - 14 * 86_400_000;
    for (const answer of state.answers) if (answer.packId === selected?.pack.id && answer.selfAssessed !== true && !answer.correct && Date.parse(answer.createdAt) >= recent) failures.set(answer.itemId, (failures.get(answer.itemId) ?? 0) + 1);
    return { due: state.progress.filter(item => Object.values(item.segments).some(segment => segment.due)).map(item => item.itemId),
      tricky: [...failures].filter(([, misses]) => misses >= 2).map(([itemId]) => itemId) };
  }, [state.answers, state.progress, state.now, selected]);
  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">Book-aligned practice</p><h1>Wortwerk</h1><p>A little recall, across the skills you need.</p>{content?.selectedPack ? <label className="ww-pack-select">Content pack<select value={content.selectedPack.pack.id} onChange={event => content.selectPack(event.target.value)}>{content.enabledPacks.map(({ pack }) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}</select></label> : <p>No content pack is enabled. Choose reviewed content when available, or explicitly enable a test fixture in pack settings.</p>}<Link href="/play/packs">Content packs</Link></header>{selected ? <ScopePicker pack={selected.pack} skills={skills} smartSets={smartSets} /> : null}<TodayPanel /><section className="ww-panel"><h2>Explore your learning</h2><nav aria-label="Practice views" className="ww-actions">{[["map", "Map"], ["journey", "Journey"], ["skills", "Skills"], ["progress", "Progress and personal deck"], ["story", "Story"], ["exam", "Exam practice"], ["blitz", "Blitz"], ["puzzle", "Daily puzzle"]].map(([route, label]) => <Link key={route} className="ww-button" href={`/play/${route}`}>{label}</Link>)}</nav></section><ProgressSummary /></div>;
}

export function PlayPackSettings() {
  const content = usePlayContent();
  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">Choose your content</p><h1>Content packs</h1><p>Pending review and test fixture packs are off by default. Enabling one is an explicit testing choice.</p></header><section className="ww-panel"><h2>Available packs</h2>{content?.packs.length ? <ul className="ww-pack-list">{content.packs.map(({ pack, fixture }) => <li key={pack.id}><label className="ww-pack-toggle" aria-label={`Enable ${pack.title}`}><input type="checkbox" checked={content.enabledPacks.some(candidate => candidate.pack.id === pack.id)} onChange={event => content.setPackEnabled(pack.id, event.target.checked)} /><span><strong>{pack.title}</strong><span className="ww-muted">{pack.cefr} · {pack.items.length} items · {fixture ? "Test fixture · " : ""}{pack.review.status === "reviewed" ? "Reviewed" : "Pending German review"}</span></span></label></li>)}</ul> : <p>No packs have been installed.</p>}<button type="button" className="ww-button" onClick={() => content?.refreshOverlays()}>Refresh class extras</button><p className="ww-muted">Class extras appear when a compatible language and difficulty profile is installed.</p></section><Link className="ww-button ww-button--primary" href="/play">Back to Today</Link></div>;
}
