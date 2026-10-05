"use client";
import { LAside, LButton, LDd, LDiv, LDl, LDt, LH1, LH2, LH3, LHeader, LInput, LLabel, LLi, LOl, LP, LSection, LSpan, LStrong } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
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
    <LDl className={styles.formsSummary}>
      <LDiv>
        <LDt>Masculine</LDt>
        <LDd lang="de">{row.masculine.map((form) => form.singular).join(" · ")}</LDd>
      </LDiv>
      <LDiv>
        <LDt>Feminine</LDt>
        <LDd lang="de">{row.feminine.map((form) => form.singular).join(" · ")}</LDd>
      </LDiv>
    </LDl>
  );
}

function SourceBackedReview({ rows }: { rows: readonly ExtraProfessionRow[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<ReadonlySet<string>>(new Set());
  const row = rows[index % Math.max(rows.length, 1)];

  if (!row) {
    return <LP className="muted">No rows match the current filters.</LP>;
  }

  function advance(markReviewed: boolean) {
    if (markReviewed) {
      setReviewed((current) => new Set([...current, row!.id]));
    }
    setRevealed(false);
    setIndex((current) => (current + 1) % rows.length);
  }

  return (
    <LSection className={`panel ${styles.review}`} aria-labelledby="optional-review-heading">
      <LDiv className={styles.sectionHeading}>
        <LDiv>
          <LP className={styles.eyebrow}>Optional review</LP>
          <LH2 id="optional-review-heading">Source-backed flashcards</LH2>
        </LDiv>
        <LSpan className="meta-chip" aria-live="polite">
          {reviewed.size} marked reviewed
        </LSpan>
      </LDiv>
      <LP className="muted">
        Self-review only. It records no mastery and does not affect Lesson 2 completion.
      </LP>
      <LButton
        type="button"
        className={styles.flashcard}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        <LSpan className="dense">Row {row.sourceRow} · tap to flip</LSpan>
        <LStrong lang={revealed ? "de" : "en"}>
          {revealed
            ? [...row.masculine, ...row.feminine]
                .map((form) => `${form.singular} → ${form.plural}`)
                .join(" · ")
            : row.meaningEn}
        </LStrong>
      </LButton>
      <LDiv className={styles.actions}>
        <LButton className="btn btn-secondary" type="button" onClick={() => advance(false)}>
          Again
        </LButton>
        <LButton className="btn btn-primary" type="button" onClick={() => advance(true)}>
          Mark reviewed
        </LButton>
        <Link className="btn btn-secondary" href={row.detailPath}>
          Open row
        </Link>
      </LDiv>
    </LSection>
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
    <LDiv className="stack">
      <LHeader className="page-header">
        <LP className={styles.eyebrow}>Optional collection · Lesson 2 companion</LP>
        <LH1>{projection.collection.titleDe}</LH1>
        <LP className="lede">
          All {projection.collection.sourceRowCount} rows from the learner note, preserved as
          written for study and review. This collection is separate from the core lesson path.
        </LP>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">48 source rows</LSpan>
          <LSpan className="meta-chip">{projection.collection.sourceFormLexemeCount} form lexemes</LSpan>
          <LSpan className="meta-chip">Optional — not core completion</LSpan>
        </LDiv>
      </LHeader>

      <LAside className={`panel ${styles.notice}`} aria-labelledby="collection-status-heading">
        <LH2 id="collection-status-heading">Source and media status</LH2>
        <LP>
          These forms are source-backed candidates and still need qualified German-language
          review. They are not presented as editorially approved course vocabulary.
        </LP>
        <LP>{projection.collection.media.message}</LP>
      </LAside>

      <LSection className={`panel ${styles.filters}`} aria-labelledby="filter-heading">
        <LH2 id="filter-heading">Find a profession</LH2>
        <LLabel>
          <LSpan>Search English or German</LSpan>
          <LInput
            className="hub-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. gardener, Gärtner, Gaertner"
          />
        </LLabel>
        <LLabel className={styles.checkbox}>
          <LInput
            type="checkbox"
            checked={alternativesOnly}
            onChange={(event) => setAlternativesOnly(event.target.checked)}
          />
          Show only rows with slash alternatives
        </LLabel>
        <LP className="dense" role="status" aria-live="polite">
          Showing {filteredRows.length} of {projection.rows.length} rows
        </LP>
      </LSection>

      <SourceBackedReview rows={filteredRows} />

      <LSection aria-labelledby="profession-list-heading">
        <LDiv className={styles.sectionHeading}>
          <LH2 id="profession-list-heading">Complete source list</LH2>
          <LSpan className="dense">Each row has a stable link</LSpan>
        </LDiv>
        {filteredRows.length === 0 ? (
          <LDiv className="panel">
            <LH3>No matching profession</LH3>
            <LP className="muted">Clear the search or include rows without alternatives.</LP>
          </LDiv>
        ) : (
          <LOl className={styles.grid}>
            {filteredRows.map((row) => (
              <LLi key={row.id} className={`panel ${styles.card}`} value={row.sourceRow}>
                <LDiv className={styles.cardTopline}>
                  <LSpan className="dense">Source row {row.sourceRow}</LSpan>
                  {row.hasAlternatives ? <LSpan className="meta-chip">Alternatives</LSpan> : null}
                </LDiv>
                <LH3>{row.meaningEn}</LH3>
                <FormsSummary row={row} />
                <Link className="btn btn-secondary" href={row.detailPath}>
                  Open all forms
                </Link>
              </LLi>
            ))}
          </LOl>
        )}
      </LSection>
    </LDiv>
  );
}
