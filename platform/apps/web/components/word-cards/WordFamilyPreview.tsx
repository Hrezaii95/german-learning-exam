
import { LArticle, LDiv, LP, LSpan } from "@/components/i18n/LocalizedElements";
import Link from "@/components/i18n/LocalizedLink";
import type { WordCard, WordForm } from "@/lib/content/word-card-types";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { LemmaAudioButton } from "@/components/media/MeaningPlate";
import { lessonLabel } from "@/lib/content/lesson-label";
import styles from "./word-family-preview.module.css";
import { GermanLookup, SaveButton } from "@/components/study/StudyProvider";
import { LineAudio } from "@/components/study/StudyAudio";
import {StudyTagList} from "@/components/study/StudyScope";
import { savedWordCard } from "@/lib/study/saved-word-card";

function Form({ form }: { form: WordForm }) {
  return <LDiv className={styles.form}><LSpan className={styles[form.tone]} lang="de"><GermanLookup text={form.text}/></LSpan>{form.audio ? <LemmaAudioButton audio={{ publicPath: form.audio, spokenText: form.text }} label={form.text} /> : <LineAudio text={form.text} compact />}</LDiv>;
}

/** Compact entry in the existing browse grid; opens the full approved card. */
export function WordFamilyPreview({ card, href, lessonIds, headingLevel=2 }: { card: WordCard; href: string; lessonIds: readonly string[]; headingLevel?:2|3 }) {
  const Heading=headingLevel===3?"h3":"h2";
  return <LArticle className={`hub-card hub-card--vocabulary ${styles.card}`} data-hub-card="vocabulary" data-word-family={card.id}>
    {card.image && <LDiv className="hub-card__media"><img className="hub-card__image" src={withPagesBaseAssetPath(card.image.path)} alt={card.image.alt} width={400} height={400} loading="lazy" decoding="async" /></LDiv>}
    <LDiv className={styles.body}>
      <Heading className="hub-card__title"><Link className="hub-card__link" href={href} prefetch={false}>{card.title}</Link></Heading>
      {card.rows.map((row, index) => <LDiv className={styles.row} key={`${index}-${row.singular.text}`}><LSpan className={styles.label}>{row.label}</LSpan><Form form={row.singular} />{row.plurals.map(form => <LDiv key={form.text}><LSpan className={styles.label}>Plural</LSpan><Form form={form} /></LDiv>)}</LDiv>)}
      <LDiv className="hub-card__meta">{card.studyTags?<StudyTagList tags={card.studyTags}/>:<LP className="meta-row">{lessonIds.map(id=><LSpan key={id} className="meta-chip">{lessonLabel(id)}</LSpan>)}</LP>}</LDiv>
      <Link className="btn btn-secondary" href={href} prefetch={false}>Study this word family</Link>
      <SaveButton item={savedWordCard(card)} />
    </LDiv>
  </LArticle>;
}
