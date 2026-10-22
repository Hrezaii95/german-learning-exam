import Link from "next/link";
import type { WordCard, WordForm } from "@/lib/content/word-card-types";
import { LemmaAudioButton } from "@/components/media/MeaningPlate";
import { lessonLabel } from "@/lib/content/lesson-label";
import styles from "./word-family-preview.module.css";
import { GermanLookup, SaveButton } from "@/components/study/StudyProvider";
import { LineAudio } from "@/components/study/StudyAudio";
import {StudyTagList} from "@/components/study/StudyScope";
import { savedWordCard } from "@/lib/study/saved-word-card";
import { SubjectVocabularyVisual } from "@/components/study/SubjectIllustration";

function Form({ form }: { form: WordForm }) {
  return <div className={styles.form}><span className={styles[form.tone]} lang="de"><GermanLookup text={form.text}/></span>{form.audio ? <LemmaAudioButton audio={{ publicPath: form.audio, spokenText: form.text }} label={form.text} /> : <LineAudio text={form.text} compact />}</div>;
}

/** Compact entry in the existing browse grid; opens the full approved card. */
export function WordFamilyPreview({ card, href, lessonIds, headingLevel=2 }: { card: WordCard; href: string; lessonIds: readonly string[]; headingLevel?:2|3 }) {
  const Heading=headingLevel===3?"h3":"h2";
  return <article className={`hub-card hub-card--vocabulary ${styles.card}`} data-hub-card="vocabulary" data-word-family={card.id}>
    <div className="hub-card__media"><div className="hub-card__visual" data-tone={card.rows[0]?.singular.tone??"plain"}><SubjectVocabularyVisual de={card.rows[0]?.singular.text??card.title} category={card.category} cardId={card.id} subject={card.studyTags?.concepts[0]??"everyday"} fallback="subject"/></div></div>
    <div className={styles.body}>
      <Heading className="hub-card__title"><Link className="hub-card__link" href={href} prefetch={false}>{card.title}</Link></Heading>
      {card.rows.map((row, index) => <div className={styles.row} key={`${index}-${row.singular.text}`}><span className={styles.label}>{row.label}</span><Form form={row.singular} />{row.plurals.map(form => <div key={form.text}><span className={styles.label}>Plural</span><Form form={form} /></div>)}</div>)}
      <div className="hub-card__meta">{card.studyTags?<StudyTagList tags={card.studyTags}/>:<p className="meta-row">{lessonIds.map(id=><span key={id} className="meta-chip">{lessonLabel(id)}</span>)}</p>}</div>
      <Link className="btn btn-secondary" href={href} prefetch={false}>Study this word family</Link>
      <SaveButton item={savedWordCard(card)} />
    </div>
  </article>;
}
