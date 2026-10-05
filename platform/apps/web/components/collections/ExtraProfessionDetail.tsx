"use client";
import { LAside, LButton, LDiv, LH1, LH2, LHeader, LP, LSection, LSpan, LStrong, LTable, LTbody, LTd, LTh, LThead, LTr } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
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
    <LDiv className="stack">
      <LP>
        <Link className="back-link" href="/collections/professions">
          ← All optional professions
        </Link>
      </LP>
      <LHeader className="page-header">
        <LP className={styles.eyebrow}>Optional source row {row.sourceRow}</LP>
        <LH1>{row.meaningEn}</LH1>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">Candidate — German review pending</LSpan>
          <LSpan className="meta-chip">Does not affect Lesson 2 completion</LSpan>
        </LDiv>
      </LHeader>

      <LSection className="panel" aria-labelledby="forms-heading">
        <LH2 id="forms-heading">Forms exactly as supplied</LH2>
        <LDiv className={styles.tableWrap} tabIndex={0} role="region" aria-label="Profession forms table">
          <LTable className={styles.formsTable}>
            <LThead>
              <LTr>
                <LTh scope="col">Form</LTh>
                <LTh scope="col">Singular</LTh>
                <LTh scope="col">Plural</LTh>
              </LTr>
            </LThead>
            <LTbody>
              {pairs.map((form, index) => (
                <LTr key={`${form.label}-${form.singular}`}>
                  <LTh scope="row">
                    {form.label}{index > 0 && pairs[index - 1]?.label === form.label ? " alternative" : ""}
                  </LTh>
                  <LTd lang="de">{form.singular}</LTd>
                  <LTd lang="de">{form.plural}</LTd>
                </LTr>
              ))}
            </LTbody>
          </LTable>
        </LDiv>
      </LSection>

      <LSection className={`panel ${styles.review}`} aria-labelledby="row-review-heading">
        <LH2 id="row-review-heading">Quick self-review</LH2>
        <LP className="muted">Recall every German singular and plural, then reveal the source forms.</LP>
        <LButton
          type="button"
          className={styles.flashcard}
          aria-pressed={revealed}
          onClick={() => setRevealed((current) => !current)}
        >
          <LSpan className="dense">{revealed ? "Source forms" : "English prompt"}</LSpan>
          <LStrong lang={revealed ? "de" : "en"}>
            {revealed
              ? pairs.map((form) => `${form.singular} → ${form.plural}`).join(" · ")
              : row.meaningEn}
          </LStrong>
        </LButton>
        <LButton className="btn btn-secondary" type="button" onClick={() => setRevealed(false)}>
          Try again
        </LButton>
      </LSection>

      <LAside className={`panel ${styles.notice}`}>
        <LH2>Audio and images</LH2>
        <LP>This word does not have audio or an image yet.</LP>
      </LAside>
    </LDiv>
  );
}
