"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ExtraProfessionRow,
  ExtraProfessionsProjection,
} from "@/lib/content/extra-professions";
import {
  ProfessionInfographic,
  countRowPronunciationPreviews,
} from "./ProfessionInfographic";
import styles from "./professions.module.css";

function foldSearch(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function SourceBackedReview({ rows }: { rows: readonly ExtraProfessionRow[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<ReadonlySet<string>>(new Set());
  const row = rows[index % Math.max(rows.length, 1)];

  if (!row) return <p className="muted">No rows match the current filters.</p>;
  const activeRow = row;

  function advance(markReviewed: boolean) {
    if (markReviewed) setReviewed((current) => new Set([...current, activeRow.id]));
    setRevealed(false);
    setIndex((current) => (current + 1) % rows.length);
  }

  return (
    <section className={`panel ${styles.review}`} aria-labelledby="optional-review-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Optional review</p>
          <h2 id="optional-review-heading">Source-backed visual flashcards</h2>
        </div>
        <span className="meta-chip" aria-live="polite">{reviewed.size} marked reviewed</span>
      </div>
      <p className="muted">Self-review only. It records no mastery and does not affect Lesson 2 completion.</p>
      <button
        type="button"
        className={styles.flashcard}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        <span className="dense">Row {row.sourceRow} · tap to flip</span>
        <strong lang={revealed ? "de" : "en"}>
          {revealed
            ? [...row.masculine, ...row.feminine].map((form) => `${form.singular} → ${form.plural}`).join(" · ")
            : row.meaningEn}
        </strong>
      </button>
      {revealed ? <ProfessionInfographic row={row} compact /> : null}
      <div className={styles.actions}>
        <button className="btn btn-secondary" type="button" onClick={() => advance(false)}>Again</button>
        <button className="btn btn-primary" type="button" onClick={() => advance(true)}>Mark reviewed</button>
        <Link className="btn btn-secondary" href={row.detailPath}>Open row</Link>
      </div>
    </section>
  );
}

export function ProfessionCollectionClient({ projection }: { projection: ExtraProfessionsProjection }) {
  const [query, setQuery] = useState("");
  const [alternativesOnly, setAlternativesOnly] = useState(false);
  const filteredRows = useMemo(() => {
    const needle = foldSearch(query.trim());
    return projection.rows.filter(
      (row) =>
        (!alternativesOnly || row.hasAlternatives) &&
        (needle === "" || foldSearch(row.searchText).includes(needle)),
    );
  }, [alternativesOnly, projection.rows, query]);
  const audioRowCount = projection.collection.media.synthesizedPreviewRowCount;
  const audioAssetCount = projection.collection.media.synthesizedPreviewAssetCount;

  return (
    <div className="stack">
      <header className={`page-header ${styles.hero}`}>
        <div>
          <p className={styles.eyebrow}>Optional collection · Lesson 2 companion</p>
          <h1>{projection.collection.titleDe}</h1>
          <p className="lede">
            All {projection.collection.sourceRowCount} rows from the learner note, preserved as written and mapped into one consistent visual system.
          </p>
        </div>
        <div className={styles.legend} aria-label="Infographic legend">
          <span className={styles.legendMasculine}><b>M</b> masculine · der</span>
          <span className={styles.legendFeminine}><b>F</b> feminine · die</span>
          <span className={styles.legendPlural}><b>∞</b> plural · die</span>
          <span className={styles.legendAlternative}><b>／</b> source alternative</span>
        </div>
        <div className="meta-row">
          <span className="meta-chip">48 source rows</span>
          <span className="meta-chip">{projection.collection.sourceFormLexemeCount} form lexemes</span>
          <span className="meta-chip">{audioAssetCount} exact audio previews across {audioRowCount} rows</span>
          <span className="meta-chip">Optional — not core completion</span>
        </div>
      </header>

      <aside className={`panel ${styles.notice}`} aria-labelledby="collection-status-heading">
        <h2 id="collection-status-heading">Publication status</h2>
        <p><strong>Text:</strong> exact source candidates; qualified German-language review pending.</p>
        <p><strong>Graphics:</strong> semantic diagrams built from those exact forms; no profession image was supplied.</p>
        <p><strong>Audio:</strong> only exact owner-authorized synthesized previews are exposed. Every absent match is explicitly marked not published.</p>
      </aside>

      <section className={`panel ${styles.filters}`} aria-labelledby="filter-heading">
        <h2 id="filter-heading">Find a profession</h2>
        <label>
          <span>Search English or German</span>
          <input className="hub-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. gardener, Gärtner, Gaertner" />
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={alternativesOnly} onChange={(event) => setAlternativesOnly(event.target.checked)} />
          Show only rows with slash alternatives
        </label>
        <p className="dense" role="status" aria-live="polite">Showing {filteredRows.length} of {projection.rows.length} rows</p>
      </section>

      <SourceBackedReview rows={filteredRows} />

      <section aria-labelledby="profession-list-heading">
        <div className={styles.sectionHeading}>
          <h2 id="profession-list-heading">Complete visual source list</h2>
          <span className="dense">Every card uses the same semantic grammar</span>
        </div>
        {filteredRows.length === 0 ? (
          <div className="panel"><h3>No matching profession</h3><p className="muted">Clear the search or include rows without alternatives.</p></div>
        ) : (
          <ol className={styles.grid}>
            {filteredRows.map((row) => {
              const audioCount = countRowPronunciationPreviews(row);
              return (
                <li key={row.id} className={`panel ${styles.card}`} value={row.sourceRow}>
                  <div className={styles.cardTopline}>
                    <span className="dense">Source row {row.sourceRow}</span>
                    <span className={audioCount > 0 ? styles.readyBadge : styles.missingBadge}>
                      {audioCount > 0 ? `${audioCount} audio previews` : "Audio not published"}
                    </span>
                  </div>
                  <div>
                    <p className={styles.eyebrow}>English meaning</p>
                    <h3>{row.meaningEn}</h3>
                  </div>
                  <ProfessionInfographic row={row} compact />
                  <div className={styles.cardFooter}>
                    {row.hasAlternatives ? <span className="meta-chip">Slash alternatives preserved</span> : <span className="dense">One masculine/feminine pair</span>}
                    <Link className="btn btn-secondary" href={row.detailPath}>Study forms and audio</Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
