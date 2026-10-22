"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CefrLevel } from "../../../../packages/content/src/types/common.js";
import type { PackManifest } from "../../../../packages/content/src/types/packs.js";
import { validatePack } from "../../../../packages/content/src/validation/packs.js";
import { PersonalImport } from "./PersonalImport";
import { usePlayContent } from "./PlayProvider";
/** Uses installed language/difficulty data even before a course pack is available. */
export function PlayPackSettings() {
    const content = usePlayContent();
    const [chosenLanguage, setLanguage] = useState<string | null>(null);
    const [chosenDifficulty, setDifficulty] = useState<string | null>(null);
    const selected = content?.selectedPack;
    const language = content?.languages.find(profile => profile.id === chosenLanguage) ?? selected?.language ?? content?.languages[0];
    const difficulty = content?.difficulties.find(profile => profile.id === chosenDifficulty) ?? selected?.difficulty ?? content?.difficulties[0];
    const template = useMemo<PackManifest | null>(() => {
        if (!language || !difficulty)
            return null;
        const authored = content?.packs.find(entry => entry.pack.language === language.id && entry.pack.difficulty === difficulty.id)?.pack;
        const manifest: PackManifest = authored ?? { schemaVersion: 1, id: "personal-template", language: language.id,
            cefr: difficulty.id as CefrLevel, title: "My words", units: [{ id: "personal", title: "My words", canDo: [] }], maps: [],
            difficulty: difficulty.id, review: { status: "pending-german-review" } };
        // A profile id is usable as a level only when the existing schema accepts it.
        return validatePack({ ...manifest, items: [] }, language).length ? null : manifest;
    }, [content?.packs, language, difficulty]);
    return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">Choose your content</p><h1>Content packs</h1><p>Pending review and test fixture packs are off by default. Enabling one is an explicit testing choice.</p></header>
    <section className="ww-panel"><h2>Available packs</h2>{content?.packs.length ? <ul className="ww-pack-list">{content.packs.map(({ pack, fixture }) => <li key={pack.id}><label className="ww-pack-toggle" aria-label={`Enable ${pack.title}`}><input type="checkbox" checked={content.enabledPacks.some(candidate => candidate.pack.id === pack.id)} onChange={event => content.setPackEnabled(pack.id, event.target.checked)}/><span><strong>{pack.title}</strong><span className="ww-muted">{pack.cefr} · {pack.items.length} items · {fixture ? "Test fixture · " : ""}{pack.review.status === "reviewed" ? "Reviewed" : "Pending review"}</span></span></label></li>)}</ul> : <p>No packs have been installed.</p>}
      <button type="button" className="ww-button" onClick={() => content?.refreshOverlays()}>Refresh class extras</button><p className="ww-muted">Class extras appear when compatible language and difficulty profiles are installed.</p>
      {content?.personalIssues.map((issue, index) => <p role="status" key={`${index}:${issue}`}>{issue}</p>)}
    </section>
    <section className="ww-panel"><h2>Import context</h2><p>Choose the language and level for your own vocabulary. Book and lesson references come from your CSV, the fields below, or authored units in the selected pack.</p>
      <label style={{ display: "block" }}>Language<select value={language?.id ?? ""} onChange={event => setLanguage(event.target.value)} style={{ minHeight: 44, width: "100%", maxWidth: "100%" }}>{content?.languages.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
      <label style={{ display: "block" }}>Level<select value={difficulty?.id ?? ""} onChange={event => setDifficulty(event.target.value)} style={{ minHeight: 44, width: "100%", maxWidth: "100%" }}>{content?.difficulties.map(profile => <option key={profile.id} value={profile.id}>{profile.id}</option>)}</select></label>
    </section>
    {template && language ? <PersonalImport key={`${template.id}:${language.id}:${difficulty?.id}`} manifest={template} language={language} onSaved={(pack, enabled) => { content?.refreshOverlays(); content?.setPackEnabled(pack.id, enabled); }}/> : <p>Install a compatible language and level profile before importing personal vocabulary.</p>}
    <Link className="ww-button ww-button--primary" href="/play">Back to Today</Link>
  </div>;
}
