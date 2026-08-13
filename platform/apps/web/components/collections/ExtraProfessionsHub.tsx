"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ExtraProfessionRow,
  ExtraProfessionsProjection,
} from "@/lib/content/extra-professions";
import styles from "./extra-professions.module.css";

function foldSearch(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function FormsSummary({ row }: { row: ExtraProfessionRow }) {
  return (
    <dl className={styles.formsSummary}>
      <div>
        <dt>Masculine</dt>
        <dd lang="de">{row.masculine.map((form) => form.singular).join(" · ")}</dd>
      </div>
      <div>
        <dt>Feminine</dt>
        <dd lang="de">{row.feminine.map((form) => form.singular).join(" · ")}</dd>
      </div>
    </dl>
  );
}

function SourceBackedReview({ rows }: { rows: readonly ExtraProfessionRow[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<ReadonlySet<string>>(new Set());
  const row = rows[index % Math.max(rows.length, 1)];

  if (!row) {
    return <p className="muted">No rows match the current filters.</p>;
  }

  function advance(markReviewed: boolean) {
    if (markReviewed) {
      setReviewed((current) => new Set([...current, row!.id]));
    }
    setRevealed(false);
    setIndex((current) => (current + 1) % rows.length);
  }

  return (
    <section className={`panel ${styles.review}`} aria-labelledby="optional-review-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Optional review</p>
          <h2 id="optional-review-heading">Source-backed flashcards</h2>
        </div>
        <span className="meta-chip" aria-live="polite">
          {reviewed.size} marked reviewed
        </span>
      </div>
      <p className="muted">
        Self-review only. It records no mastery and does not affect Lesson 2 completion.
      </p>
      <button
        type="button"
        className={styles.flashcard}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        <span className="dense">Row {row.sourceRow} · tap to flip</span>
        <strong lang={revealed ? "de" : "en"}>
          {revealed
            ? [...row.masculine, ...row.feminine]
                .map((form) => `${form.singular} → ${form.plural}`)
                .join(" · ")
            : row.meaningEn}
        </strong>
      </button>
      <div className={styles.actions}>
        <button className="btn btn-secondary" type="button" onClick={() => advance(false)}>
          Again
        </button>
        <button className="btn btn-primary" type="button" onClick={() => advance(true)}>
          Mark reviewed
        </button>
        <Link className="btn btn-secondary" href={row.detailPath}>
          Open row
        </Link>
      </div>
    </section>
  );
}

export function ExtraProfessionsHub({
  projection,
}: {
  projection: ExtraProfessionsProjection;
}) {
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

  return (
    <div className="stack">
      <header className="page-header">
        <p className={styles.eyebrow}>Optional collection · Lesson 2 companion</p>
        <h1>{projection.collection.titleDe}</h1>
        <p className="lede">
          All {projection.collection.sourceRowCount} rows from the learner note, preserved as
          written for study and review. This collection is separate from the core lesson path.
        </p>
        <div className="meta-row">
          <span className="meta-chip">48 source rows</span>
          <span className="meta-chip">{projection.collection.sourceFormLexemeCount} form lexemes</span>
          <span className="meta-chip">Optional — not core completion</span>
        </div>
      </header>

      <aside className={`panel ${styles.notice}`} aria-labelledby="collection-status-heading">
        <h2 id="collection-status-heading">Source and media status</h2>
        <p>
          These forms are source-backed candidates and still need qualified German-language
          review. They are not presented as editorially approved course vocabulary.
        </p>
        <p>{projection.collection.media.message}</p>
      </aside>

      <section className={`panel ${styles.filters}`} aria-labelledby="filter-heading">
        <h2 id="filter-heading">Find a profession</h2>
        <label>
          <span>Search English or German</span>
          <input
            className="hub-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. gardener, Gärtner, Gaertner"
          />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={alternativesOnly}
            onChange={(event) => setAlternativesOnly(event.target.checked)}
          />
          Show only rows with slash alternatives
        </label>
        <p className="dense" role="status" aria-live="polite">
          Showing {filteredRows.length} of {projection.rows.length} rows
        </p>
      </section>

      <SourceBackedReview rows={filteredRows} />

      <section aria-labelledby="profession-list-heading">
        <div className={styles.sectionHeading}>
          <h2 id="profession-list-heading">Complete source list</h2>
          <span className="dense">Each row has a stable link</span>
        </div>
        {filteredRows.length === 0 ? (
          <div className="panel">
            <h3>No matching profession</h3>
            <p className="muted">Clear the search or include rows without alternatives.</p>
          </div>
        ) : (
          <ol className={styles.grid}>
            {filteredRows.map((row) => (
              <li key={row.id} className={`panel ${styles.card}`} value={row.sourceRow}>
                <div className={styles.cardTopline}>
                  <span className="dense">Source row {row.sourceRow}</span>
                  {row.hasAlternatives ? <span className="meta-chip">Alternatives</span> : null}
                </div>
                <h3>{row.meaningEn}</h3>
                <FormsSummary row={row} />
                <Link className="btn btn-secondary" href={row.detailPath}>
                  Open all forms
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
