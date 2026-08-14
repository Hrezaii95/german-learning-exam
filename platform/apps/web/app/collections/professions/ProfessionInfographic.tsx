import type { ExtraProfessionRow } from "@/lib/content/extra-professions";
import { resolvePublishedPronunciationExact } from "@/lib/content/media-availability";
import styles from "./professions.module.css";

type Gender = "masculine" | "feminine";

function articleAndNoun(value: string): { article: string; noun: string } {
  const [article = "", ...rest] = value.split(" ");
  return { article, noun: rest.join(" ") };
}

export function countRowPronunciationPreviews(row: ExtraProfessionRow): number {
  return [...row.masculine, ...row.feminine].reduce(
    (count, form) =>
      count +
      (resolvePublishedPronunciationExact(form.singular).state === "preview" ? 1 : 0) +
      (resolvePublishedPronunciationExact(form.plural).state === "preview" ? 1 : 0),
    0,
  );
}

function FormLane({
  label,
  gender,
  forms,
  compact = false,
}: {
  label: string;
  gender: Gender;
  forms: ExtraProfessionRow["masculine"];
  compact?: boolean;
}) {
  return (
    <section
      className={`${styles.formLane} ${styles[gender]} ${compact ? styles.compactLane : ""}`}
      aria-label={`${label} forms`}
    >
      <div className={styles.genderHeader}>
        <span className={styles.genderGlyph} aria-hidden="true">
          {gender === "masculine" ? "M" : "F"}
        </span>
        <strong>{label}</strong>
        <span className={styles.genderRule}>
          {gender === "masculine" ? "der · blue" : "die · pink"}
        </span>
      </div>

      <div className={styles.alternativeStack}>
        {forms.map((form, index) => {
          const singular = articleAndNoun(form.singular);
          const plural = articleAndNoun(form.plural);
          const singularAudio = resolvePublishedPronunciationExact(form.singular).state;
          const pluralAudio = resolvePublishedPronunciationExact(form.plural).state;
          return (
            <div className={styles.formPair} key={`${gender}-${form.singular}`}>
              {index > 0 ? (
                <div className={styles.alternativeDivider} aria-label="Slash alternative">
                  <span aria-hidden="true">／</span> source alternative
                </div>
              ) : null}
              <div className={styles.numberForm}>
                <span className={styles.numberLabel}>one person · singular</span>
                <span className={styles.germanForm} lang="de">
                  <b className={styles.articleToken}>{singular.article}</b>
                  <span>{singular.noun}</span>
                </span>
                <span className={styles.audioState} data-audio-state={singularAudio}>
                  {singularAudio === "preview" ? "Audio preview ready" : "Audio not available yet"}
                </span>
              </div>
              <span className={styles.numberArrow} aria-label="changes to plural">
                →
              </span>
              <div className={`${styles.numberForm} ${styles.pluralForm}`}>
                <span className={styles.numberLabel}>more than one · plural</span>
                <span className={styles.germanForm} lang="de">
                  <b className={styles.pluralArticle}>{plural.article}</b>
                  <span>{plural.noun}</span>
                </span>
                <span className={styles.audioState} data-audio-state={pluralAudio}>
                  {pluralAudio === "preview" ? "Audio preview ready" : "Audio not available yet"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProfessionInfographic({
  row,
  compact = false,
}: {
  row: ExtraProfessionRow;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.infographic} ${compact ? styles.compactGraphic : ""}`}>
      <FormLane label="Masculine person form" gender="masculine" forms={row.masculine} compact={compact} />
      <div className={styles.personRelationship} aria-label="Masculine and feminine person forms are paired">
        <span aria-hidden="true">↔</span>
        <small>paired person forms</small>
      </div>
      <FormLane label="Feminine person form" gender="feminine" forms={row.feminine} compact={compact} />
    </div>
  );
}
