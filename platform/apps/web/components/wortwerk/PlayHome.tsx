"use client";

import Link from "next/link";
import { TodayPanel } from "./TodayPanel";
import { ProgressSummary } from "./ProgressSummary";
import { usePlayContent } from "./PlayProvider";

export function PlayHome() {
  const content = usePlayContent();
  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">Book-aligned practice</p><h1>Wortwerk</h1><p>A little recall, across the skills you need.</p>{content?.selectedPack ? <label className="ww-pack-select">Content pack<select value={content.selectedPack.pack.id} onChange={event => content.selectPack(event.target.value)}>{content.enabledPacks.map(({ pack }) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}</select></label> : <p>No content pack is enabled. Choose reviewed content when available, or explicitly enable a test fixture in pack settings.</p>}<Link href="/play/packs">Content packs</Link></header><TodayPanel /><ProgressSummary /></div>;
}

export function PlayPackSettings() {
  const content = usePlayContent();
  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">Choose your content</p><h1>Content packs</h1><p>Pending review and test fixture packs are off by default. Enabling one is an explicit testing choice.</p></header><section className="ww-panel"><h2>Available packs</h2>{content?.packs.length ? <ul className="ww-pack-list">{content.packs.map(({ pack, fixture }) => <li key={pack.id}><label className="ww-pack-toggle" aria-label={`Enable ${pack.title}`}><input type="checkbox" checked={content.enabledPacks.some(candidate => candidate.pack.id === pack.id)} onChange={event => content.setPackEnabled(pack.id, event.target.checked)} /><span><strong>{pack.title}</strong><span className="ww-muted">{pack.cefr} · {pack.items.length} items · {fixture ? "Test fixture · " : ""}{pack.review.status === "reviewed" ? "Reviewed" : "Pending German review"}</span></span></label></li>)}</ul> : <p>No packs have been installed.</p>}<button type="button" className="ww-button" onClick={() => content?.refreshOverlays()}>Refresh class extras</button><p className="ww-muted">Class extras appear when a compatible language and difficulty profile is installed.</p></section><Link className="ww-button ww-button--primary" href="/play">Back to Today</Link></div>;
}
