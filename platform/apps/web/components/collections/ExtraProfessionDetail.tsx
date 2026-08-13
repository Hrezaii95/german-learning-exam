"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExtraProfessionRow } from "@/lib/content/extra-professions";
import styles from "./extra-professions.module.css";

export function ExtraProfessionDetail({ row }: { row: ExtraProfessionRow }) {
  const [revealed, setRevealed] = useState(false);
  const pairs = [
    ...row.masculine.map((form) => ({ ...form, label: "Masculine" })),
    ...row.feminine.map((form) => ({ ...form, label: "Feminine" })),
  ];

  return (
    <div className="stack">
      <p>
        <Link className="back-link" href="/collections/professions">
          ← All optional professions
        </Link>
      </p>
      <header className="page-header">
        <p className={styles.eyebrow}>Optional source row {row.sourceRow}</p>
        <h1>{row.meaningEn}</h1>
        <div className="meta-row">
          <span className="meta-chip">Candidate — German review pending</span>
          <span className="meta-chip">Does not affect Lesson 2 completion</span>
        </div>
      </header>

      <section className="panel" aria-labelledby="forms-heading">
        <h2 id="forms-heading">Forms exactly as supplied</h2>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Profession forms table">
          <table className={styles.formsTable}>
            <thead>
              <tr>
                <th scope="col">Form</th>
                <th scope="col">Singular</th>
                <th scope="col">Plural</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((form, index) => (
                <tr key={`${form.label}-${form.singular}`}>
                  <th scope="row">
                    {form.label}{index > 0 && pairs[index - 1]?.label === form.label ? " alternative" : ""}
                  </th>
                  <td lang="de">{form.singular}</td>
                  <td lang="de">{form.plural}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`panel ${styles.review}`} aria-labelledby="row-review-heading">
        <h2 id="row-review-heading">Quick self-review</h2>
        <p className="muted">Recall every German singular and plural, then reveal the source forms.</p>
        <button
          type="button"
          className={styles.flashcard}
          aria-pressed={revealed}
          onClick={() => setRevealed((current) => !current)}
        >
          <span className="dense">{revealed ? "Source forms" : "English prompt"}</span>
          <strong lang={revealed ? "de" : "en"}>
            {revealed
              ? pairs.map((form) => `${form.singular} → ${form.plural}`).join(" · ")
              : row.meaningEn}
          </strong>
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => setRevealed(false)}>
          Try again
        </button>
      </section>

      <aside className={`panel ${styles.notice}`}>
        <h2>Media status</h2>
        <p>No audio or image is published for this row. The interface does not show fake media controls.</p>
      </aside>
    </div>
  );
}
