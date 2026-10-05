"use client";
import { LArticle, LAside, LButton, LDiv, LH1, LH2, LH3, LHeader, LP, LSection, LSpan, LStrong } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
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
    <LDiv className="stack">
      <LP><Link className="back-link" href="/collections/professions">← All optional professions</Link></LP>
      <LHeader className={`page-header ${styles.detailHero}`}>
        <LDiv>
          <LP className={styles.eyebrow}>Optional source row {row.sourceRow}</LP>
          <LH1>{row.meaningEn}</LH1>
          <LP className="lede">Compare person form, article, gender, and exact source plural at a glance.</LP>
        </LDiv>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">Candidate — German review pending</LSpan>
          <LSpan className="meta-chip">{previewCount > 0 ? `${previewCount} exact audio previews` : "Audio not available yet"}</LSpan>
          <LSpan className="meta-chip">Does not affect Lesson 2 completion</LSpan>
        </LDiv>
      </LHeader>

      <LSection className={`panel ${styles.visualPanel}`} aria-labelledby="form-map-heading">
        <LDiv className={styles.sectionHeading}>
          <LDiv><LP className={styles.eyebrow}>Infographic</LP><LH2 id="form-map-heading">Person-form and plural map</LH2></LDiv>
          <LSpan className="dense">Blue = masculine · pink = feminine · violet = plural</LSpan>
        </LDiv>
        <ProfessionInfographic row={row} />
      </LSection>

      <LSection className="panel" aria-labelledby="audio-heading">
        <LDiv className={styles.sectionHeading}>
          <LDiv><LP className={styles.eyebrow}>Pronunciation</LP><LH2 id="audio-heading">Exact-form audio</LH2></LDiv>
          <LSpan className={previewCount > 0 ? styles.readyBadge : styles.missingBadge}>{previewCount} of {forms.length * 2} forms available</LSpan>
        </LDiv>
        <LP className="muted">Playable clips are owner-authorized synthesized previews and still await independent German listening review.</LP>
        <LDiv className={styles.audioGrid}>
          {forms.flatMap((form) => [
            { key: `${form.gender}-${form.singular}`, kind: `${form.gender}${form.alternative ? " alternative" : ""} singular`, text: form.singular },
            { key: `${form.gender}-${form.plural}-plural`, kind: `${form.gender}${form.alternative ? " alternative" : ""} plural`, text: form.plural },
          ]).map((item) => (
            <LArticle className={styles.audioCard} key={item.key}>
              <LSpan className="dense">{item.kind}</LSpan>
              <LH3 lang="de">{item.text}</LH3>
              <PronunciationControl media={resolvePublishedPronunciationExact(item.text)} label={item.text} />
            </LArticle>
          ))}
        </LDiv>
      </LSection>

      <LSection className={`panel ${styles.review}`} aria-labelledby="row-review-heading">
        <LH2 id="row-review-heading">Quick self-review</LH2>
        <LP className="muted">Recall every German singular and plural, then reveal the source forms.</LP>
        <LButton type="button" className={styles.flashcard} aria-pressed={revealed} onClick={() => setRevealed((current) => !current)}>
          <LSpan className="dense">{revealed ? "Source forms" : "English prompt"}</LSpan>
          <LStrong lang={revealed ? "de" : "en"}>{revealed ? forms.map((form) => `${form.singular} → ${form.plural}`).join(" · ") : row.meaningEn}</LStrong>
        </LButton>
        <LButton className="btn btn-secondary" type="button" onClick={() => setRevealed(false)}>Try again</LButton>
      </LSection>

      <LAside className={`panel ${styles.notice}`}>
        <LH2>Content boundary</LH2>
        <LP>German forms are reproduced exactly from the optional learner note and remain candidates pending qualified German-language review.</LP>
        <LP>There is no course illustration for this profession. The diagram above is a text-based meaning graphic, not an illustration from the course.</LP>
      </LAside>
    </LDiv>
  );
}
