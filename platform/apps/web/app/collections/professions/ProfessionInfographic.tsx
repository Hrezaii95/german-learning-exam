
import { LB, LDiv, LSection, LSmall, LSpan, LStrong } from "@/components/i18n/LocalizedElements";
import type { ExtraProfessionRow } from "@/lib/content/extra-professions";
import { resolvePublishedPronunciationExact } from "@/lib/content/media-availability";
import styles from "./professions.module.css";
import { GermanText } from "@/components/study/StudyProvider";
import { LineAudio } from "@/components/study/StudyAudio";

type Gender = "masculine" | "feminine";

function articleAndNoun(value: string): { article: string; noun: string } {
  const [article = "", ...rest] = value.split(" ");
  return { article, noun: rest.join(" ") };
}

export function countRowPronunciationPreviews(row: ExtraProfessionRow, pronunciation: Record<string, string> = {}): number {
  return [...row.masculine, ...row.feminine].reduce(
    (count, form) =>
      count +
      (pronunciation[form.singular] || resolvePublishedPronunciationExact(form.singular).state === "preview" ? 1 : 0) +
      (pronunciation[form.plural] || resolvePublishedPronunciationExact(form.plural).state === "preview" ? 1 : 0),
    0,
  );
}

function FormLane({
  label,
  gender,
  forms,
  compact = false,
  pronunciation,
}: {
  label: string;
  gender: Gender;
  forms: ExtraProfessionRow["masculine"];
  compact?: boolean;
  pronunciation?: Record<string, string>;
}) {
  return (
    <LSection
      className={`${styles.formLane} ${styles[gender]} ${compact ? styles.compactLane : ""}`}
      aria-label={`${label} forms`}
    >
      <LDiv className={styles.genderHeader}>
        <LSpan className={styles.genderGlyph} aria-hidden="true">
          {gender === "masculine" ? "M" : "F"}
        </LSpan>
        <LStrong>{label}</LStrong>
        <LSpan className={styles.genderRule}>
          {gender === "masculine" ? "der · blue" : "die · pink"}
        </LSpan>
      </LDiv>

      <LDiv className={styles.alternativeStack}>
        {forms.map((form, index) => {
          const singular = articleAndNoun(form.singular);
          const plural = articleAndNoun(form.plural);
          const singularAudio = resolvePublishedPronunciationExact(form.singular).state;
          const pluralAudio = resolvePublishedPronunciationExact(form.plural).state;
          return (
            <LDiv className={styles.formPair} key={`${gender}-${form.singular}`}>
              {index > 0 ? (
                <LDiv className={styles.alternativeDivider} aria-label="Slash alternative">
                  <LSpan aria-hidden="true">／</LSpan> source alternative
                </LDiv>
              ) : null}
              <LDiv className={styles.numberForm}>
                <LSpan className={styles.numberLabel}>one person · singular</LSpan>
                <LSpan className={styles.germanForm} lang="de">
                  {pronunciation ? <GermanText text={form.singular}/> : <><LB className={styles.articleToken}>{singular.article}</LB><LSpan>{singular.noun}</LSpan></>}
                </LSpan>
                {pronunciation ? <LineAudio text={form.singular} src={pronunciation[form.singular]} compact/> : <LSpan className={styles.audioState} data-audio-state={singularAudio}>
                  {singularAudio === "preview" ? "Audio preview ready" : "Audio not available yet"}
                </LSpan>}
              </LDiv>
              <LSpan className={styles.numberArrow} aria-label="changes to plural">
                →
              </LSpan>
              <LDiv className={`${styles.numberForm} ${styles.pluralForm}`}>
                <LSpan className={styles.numberLabel}>more than one · plural</LSpan>
                <LSpan className={styles.germanForm} lang="de">
                  {pronunciation ? <GermanText text={form.plural}/> : <><LB className={styles.pluralArticle}>{plural.article}</LB><LSpan>{plural.noun}</LSpan></>}
                </LSpan>
                {pronunciation ? <LineAudio text={form.plural} src={pronunciation[form.plural]} compact/> : <LSpan className={styles.audioState} data-audio-state={pluralAudio}>
                  {pluralAudio === "preview" ? "Audio preview ready" : "Audio not available yet"}
                </LSpan>}
              </LDiv>
            </LDiv>
          );
        })}
      </LDiv>
    </LSection>
  );
}

export function ProfessionInfographic({
  row,
  compact = false,
  pronunciation,
}: {
  row: ExtraProfessionRow;
  compact?: boolean;
  pronunciation?: Record<string, string>;
}) {
  return (
    <LDiv className={`${styles.infographic} ${compact ? styles.compactGraphic : ""}`}>
      <FormLane label="Masculine person form" gender="masculine" forms={row.masculine} compact={compact} {...(pronunciation ? { pronunciation } : {})} />
      <LDiv className={styles.personRelationship} aria-label="Masculine and feminine person forms are paired">
        <LSpan aria-hidden="true">↔</LSpan>
        <LSmall>paired person forms</LSmall>
      </LDiv>
      <FormLane label="Feminine person form" gender="feminine" forms={row.feminine} compact={compact} {...(pronunciation ? { pronunciation } : {})} />
    </LDiv>
  );
}
