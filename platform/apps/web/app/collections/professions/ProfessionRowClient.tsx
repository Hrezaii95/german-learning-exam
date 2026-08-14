"use client";

import Link from "next/link";
import { useState } from "react";
import { PronunciationControl } from "@/components/audio/PronunciationControl";
import type { ExtraProfessionRow } from "@/lib/content/extra-professions";
import { resolvePublishedPronunciationExact } from "@/lib/content/media-availability";
import { ProfessionInfographic, countRowPronunciationPreviews } from "./ProfessionInfographic";
import styles from "./professions.module.css";

export function ProfessionRowClient({ row }: { row: ExtraProfessionRow }) {
  const [revealed, setRevealed] = useState(false);
  const forms = [
    ...row.masculine.map((form, index) => ({ ...form, gender: "Masculine", alternative: index > 0 })),
    ...row.feminine.map((form, index) => ({ ...form, gender: "Feminine", alternative: index > 0 })),
  ];
  const previewCount = countRowPronunciationPreviews(row);

  return (
    <div className="stack">
      <p><Link className="back-link" href="/collections/professions">← All optional professions</Link></p>
      <header className={`page-header ${styles.detailHero}`}>
        <div>
          <p className={styles.eyebrow}>Optional source row {row.sourceRow}</p>
          <h1>{row.meaningEn}</h1>
          <p className="lede">Compare person form, article, gender, and exact source plural at a glance.</p>
        </div>
        <div className="meta-row">
          <span className="meta-chip">Candidate — German review pending</span>
          <span className="meta-chip">{previewCount > 0 ? `${previewCount} exact audio previews` : "Audio not available yet"}</span>
          <span className="meta-chip">Does not affect Lesson 2 completion</span>
        </div>
      </header>

      <section className={`panel ${styles.visualPanel}`} aria-labelledby="form-map-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Infographic</p><h2 id="form-map-heading">Person-form and plural map</h2></div>
          <span className="dense">Blue = masculine · pink = feminine · violet = plural</span>
        </div>
        <ProfessionInfographic row={row} />
      </section>

      <section className="panel" aria-labelledby="audio-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Pronunciation</p><h2 id="audio-heading">Exact-form audio</h2></div>
          <span className={previewCount > 0 ? styles.readyBadge : styles.missingBadge}>{previewCount} of {forms.length * 2} forms available</span>
        </div>
        <p className="muted">Playable clips are owner-authorized synthesized previews and still await independent German listening review.</p>
        <div className={styles.audioGrid}>
          {forms.flatMap((form) => [
            { key: `${form.gender}-${form.singular}`, kind: `${form.gender}${form.alternative ? " alternative" : ""} singular`, text: form.singular },
            { key: `${form.gender}-${form.plural}-plural`, kind: `${form.gender}${form.alternative ? " alternative" : ""} plural`, text: form.plural },
          ]).map((item) => (
            <article className={styles.audioCard} key={item.key}>
              <span className="dense">{item.kind}</span>
              <h3 lang="de">{item.text}</h3>
              <PronunciationControl media={resolvePublishedPronunciationExact(item.text)} label={item.text} />
            </article>
          ))}
        </div>
      </section>

      <section className={`panel ${styles.review}`} aria-labelledby="row-review-heading">
        <h2 id="row-review-heading">Quick self-review</h2>
        <p className="muted">Recall every German singular and plural, then reveal the source forms.</p>
        <button type="button" className={styles.flashcard} aria-pressed={revealed} onClick={() => setRevealed((current) => !current)}>
          <span className="dense">{revealed ? "Source forms" : "English prompt"}</span>
          <strong lang={revealed ? "de" : "en"}>{revealed ? forms.map((form) => `${form.singular} → ${form.plural}`).join(" · ") : row.meaningEn}</strong>
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => setRevealed(false)}>Try again</button>
      </section>

      <aside className={`panel ${styles.notice}`}>
        <h2>Content boundary</h2>
        <p>German forms are reproduced exactly from the optional learner note and remain candidates pending qualified German-language review.</p>
        <p>There is no course illustration for this profession. The diagram above is a text-based meaning graphic, not an illustration from the course.</p>
      </aside>
    </div>
  );
}
