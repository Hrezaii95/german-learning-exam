import Link from "next/link";
import type { WordCard, WordForm } from "@/lib/content/word-card-types";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { LemmaAudioButton } from "@/components/media/MeaningPlate";
import { lessonLabel } from "@/lib/content/lesson-label";
import styles from "./word-family-preview.module.css";

function Form({ form }: { form: WordForm }) {
  return <div className={styles.form}><span className={styles[form.tone]} lang="de">{form.text}</span>{form.audio && <LemmaAudioButton audio={{ publicPath: form.audio, spokenText: form.text }} label={form.text} />}</div>;
}

/** Compact entry in the existing browse grid; opens the full approved card. */
export function WordFamilyPreview({ card, href, lessonIds }: { card: WordCard; href: string; lessonIds: readonly string[] }) {
  return <article className={`hub-card hub-card--vocabulary ${styles.card}`} data-hub-card="vocabulary" data-word-family={card.id}>
    {card.image && <div className="hub-card__media"><img className="hub-card__image" src={withPagesBaseAssetPath(card.image.path)} alt={card.image.alt} width={400} height={400} loading="lazy" decoding="async" /></div>}
    <div className={styles.body}>
      <h2 className="hub-card__title"><Link className="hub-card__link" href={href} prefetch={false}>{card.title}</Link></h2>
      {card.rows.map((row, index) => <div className={styles.row} key={`${index}-${row.singular.text}`}><span className={styles.label}>{row.label}</span><Form form={row.singular} />{row.plurals.map(form => <div key={form.text}><span className={styles.label}>Plural</span><Form form={form} /></div>)}</div>)}
      <p className="meta-row hub-card__meta">{lessonIds.map(id => <span key={id} className="meta-chip">{lessonLabel(id)}</span>)}</p>
      <Link className="btn btn-secondary" href={href} prefetch={false}>Study this word family</Link>
    </div>
  </article>;
}
