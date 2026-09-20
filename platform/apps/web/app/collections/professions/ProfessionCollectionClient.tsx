"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ExtraProfessionRow,
  ExtraProfessionsProjection,
} from "@/lib/content/extra-professions";
import {
  ProfessionInfographic,
  countRowPronunciationPreviews,
} from "./ProfessionInfographic";
import {useStudy} from "@/components/study/StudyProvider";
import {WordFamilyPreview} from "@/components/word-cards/WordFamilyPreview";
import {withPagesBaseAssetPath} from "@/lib/content/pages-base-path";
import {professionPatterns,professionPatternIds,type ProfessionPattern} from "./profession-patterns";
import { useStudyScope } from "@/components/study/StudyScope";
import { matchesStudyScope } from "@/lib/study/scope";
import type { WordCard } from "@/lib/content/word-card-types";
import styles from "./professions.module.css";

function foldSearch(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function SourceBackedReview({ rows, pronunciation, returnQuery }: { rows: readonly ExtraProfessionRow[]; pronunciation?: Record<string, string>; returnQuery:string }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const study = useStudy();
  const [localReviewed, setLocalReviewed] = useState<ReadonlySet<string>>(new Set());
  const reviewed = study ? new Set(study.state.reviewedProfessions ?? []) : localReviewed;
  const row = rows[index % Math.max(rows.length, 1)];

  if (!row) return <p className="muted">No professions match the current filters.</p>;
  const activeRow = row;

  function advance(markReviewed: boolean) {
    if (markReviewed) {
      if (study) {
        if (!study.update(old => ({...old, reviewedProfessions: [...new Set([...(old.reviewedProfessions ?? []), activeRow.id])]}))) return;
      } else setLocalReviewed(current => new Set([...current, activeRow.id]));
    }
    setRevealed(false);
    setIndex((current) => (current + 1) % rows.length);
  }

  return (
    <section className={`panel ${styles.review}`} aria-labelledby="optional-review-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Recall the four forms</p>
          <h2 id="optional-review-heading">Can you name this profession?</h2>
        </div>
        <span className="meta-chip" aria-live="polite">{rows.filter(item => reviewed.has(item.id)).length} marked reviewed</span>
      </div>
      <p className="muted">Self-review only. It records no mastery and does not affect Lesson 2 completion.</p>
      <button
        type="button"
        className={styles.flashcard}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        <span className="dense">{index % rows.length + 1} of {rows.length} · {revealed ? "tap to hide" : "say the forms, then tap to reveal"}</span>
        <strong lang={revealed ? "de" : "en"}>
          {revealed
            ? [...row.masculine, ...row.feminine].map((form) => `${form.singular} → ${form.plural}`).join(" · ")
            : row.meaningEn}
        </strong>
      </button>
      {revealed ? <ProfessionInfographic row={row} compact {...(pronunciation ? { pronunciation } : {})} /> : null}
      <div className={styles.actions}>
        <button className="btn btn-secondary" type="button" onClick={() => advance(false)}>Again</button>
        <button className="btn btn-primary" type="button" disabled={study !== null && !study.ready} onClick={() => advance(true)}>Mark reviewed</button>
        <Link className="btn btn-secondary" href={`${row.detailPath}${returnQuery}`}>Study this word family</Link>
      </div>
    </section>
  );
}

type BrowseState={query:string;alternativesOnly:boolean;pattern:ProfessionPattern|"all";limit:number};
const initialBrowse:BrowseState={query:"",alternativesOnly:false,pattern:"all",limit:6};
function readBrowse():BrowseState {
  const params=new URLSearchParams(window.location.search);
  const pattern=params.get("pattern");
  const limit=Number(params.get("limit"));
  return {query:params.get("q")??"",alternativesOnly:params.get("alternatives")==="1",
    pattern:professionPatterns.some(item=>item.id===pattern)?pattern as ProfessionPattern:"all",
    limit:Number.isInteger(limit)&&limit>=6?Math.min(limit,48):6};
}
function browseQuery(value:BrowseState) {
  const params=new URLSearchParams();
  if(value.query) params.set("q",value.query);
  if(value.alternativesOnly) params.set("alternatives","1");
  if(value.pattern!=="all") params.set("pattern",value.pattern);
  if(value.limit>6) params.set("limit",String(value.limit));
  return params.size?`?${params}`:"";
}

export function ProfessionBackLink() {
  const [query,setQuery]=useState("");
  useEffect(()=>setQuery(browseQuery(readBrowse())),[]);
  return <Link href={`/collections/professions${query}#profession-list`}>← Professions</Link>;
}

export function ProfessionCollectionClient({ projection, cardsByRow }: { projection: ExtraProfessionsProjection; cardsByRow?: Record<string, WordCard> }) {
  const { scope } = useStudyScope();
  const pronunciation = useMemo(() => cardsByRow ? Object.fromEntries(Object.values(cardsByRow).flatMap(card => card.rows.flatMap(row => [row.singular, ...row.plurals])).filter(form => form.audio).map(form => [form.text, form.audio!])) : undefined, [cardsByRow]);
  const [browse,setBrowse]=useState<BrowseState>(initialBrowse);
  const [reviewOpen,setReviewOpen]=useState(false);
  const {query,alternativesOnly,pattern,limit}=browse;
  useEffect(()=>{
    const restore=()=>setBrowse(readBrowse());
    restore();
    window.addEventListener("popstate",restore);
    return()=>window.removeEventListener("popstate",restore);
  },[]);
  function changeBrowse(change:Partial<BrowseState>) {
    const next={...browse,limit:6,...change};
    setBrowse(next);
    window.history.replaceState(window.history.state,"",`${window.location.pathname}${browseQuery(next)}${window.location.hash}`);
  }
  const scopedRows=useMemo(()=>projection.rows.filter(row=>matchesStudyScope(cardsByRow?.[row.id]?.studyTags ?? {lessons:[2],concepts:["people"],source:"teacher-extra"},scope)),[projection.rows,cardsByRow,scope]);
  const filteredRows = useMemo(() => {
    const needle = foldSearch(query.trim());
    return scopedRows.filter(
      (row) =>
        (!alternativesOnly || row.hasAlternatives) &&
        (pattern==="all" || professionPatternIds(row).includes(pattern)) &&
        (needle === "" || foldSearch(row.searchText).includes(needle)),
    );
  }, [alternativesOnly, scopedRows, query, pattern]);
  const returnQuery=browseQuery(browse);
  const audioRowCount = projection.rows.filter(row => countRowPronunciationPreviews(row, pronunciation) > 0).length;
  const audioAssetCount = projection.rows.reduce((total, row) => total + countRowPronunciationPreviews(row, pronunciation), 0);

  return (
    <div className="stack">
      <header className={`page-header ${styles.hero}`}>
        <div>
          <p className={styles.eyebrow}>People & work · Lesson 2 companion</p>
          <h1><span lang="de">Berufe</span> · Professions</h1>
          <p className="lede">
            Learn a job as a family: one man, one woman, and more than one. Hear each form, notice its ending, then try it from memory.
          </p>
        </div>
        <div className={styles.legend} aria-label="Infographic legend">
          <span className={styles.legendMasculine}><b>M</b> masculine · der</span>
          <span className={styles.legendFeminine}><b>F</b> feminine · die</span>
          <span className={styles.legendPlural}><b>∞</b> plural · die</span>
          <span className={styles.legendAlternative}><b>／</b> another word</span>
        </div>
        <div className="meta-row">
          <Link href="#profession-patterns">See the patterns</Link>
          <Link href="#profession-list">Find a profession</Link>
          <Link href="#profession-practice" onClick={()=>setReviewOpen(true)}>Practise the forms</Link>
        </div>
      </header>

      <section id="profession-patterns" className={styles.patternOverview} aria-labelledby="pattern-heading">
        <div><p className={styles.eyebrow}>One → more than one</p><h2 id="pattern-heading">Remember the change, not four separate words.</h2>
        <p>These groups describe the masculine plurals in this collection. Select a pattern to explore its jobs. A job with alternative words can appear in more than one group.</p></div>
        <div className={styles.patternGrid}>{professionPatterns.filter(item=>item.id!=="other").map(item=>{
          const count=scopedRows.filter(row=>professionPatternIds(row).includes(item.id)).length;
          const example=projection.rowsBySegment[item.example]!;
          const picture=cardsByRow?.[example.id]?.image;
          return <button type="button" className={styles.patternCard} key={item.id} aria-label={`${item.title}: ${example.masculine[0]!.singular} → ${example.masculine[0]!.plural} · ${count} jobs`} aria-pressed={pattern===item.id} disabled={!count} onClick={()=>changeBrowse({pattern:pattern===item.id?"all":item.id})}>
            {picture&&<img src={withPagesBaseAssetPath(picture.path)} alt={picture.alt} width={240} height={140} loading="lazy"/>}
            <strong>{item.title}</strong><span>{item.cue}</span>
            <span className={styles.maleText} lang="de">{example.masculine[0]!.singular}</span><span aria-hidden="true">↓</span><span className={styles.pluralText} lang="de">{example.masculine[0]!.plural}</span>
            <small>{count} {count===1?"job":"jobs"} in your selection</small>
          </button>;
        })}</div>
        <div className={styles.feminineTrail}><strong>A useful feminine pattern</strong><p lang="de"><span className={styles.maleText}>der Lehrer</span> → <span className={styles.femaleText}>die Lehrer<b>in</b></span> → <span className={styles.pluralText}>die Lehrer<b>innen</b></span></p>
          <p>Many forms here use <b>-in → -innen</b>. Some also change a vowel: Arzt → Ärztin. Other pairs use different words, such as Feuerwehrmann / Feuerwehrfrau. Learn those together.</p><button type="button" className="study-secondary" onClick={()=>changeBrowse({pattern:"other"})}>Explore other plural changes</button></div>
      </section>

      <section id="profession-list" className={`panel ${styles.filters}`} aria-labelledby="filter-heading">
        <h2 id="filter-heading">Find a profession</h2>
        <label>
          <span>Search English or German</span>
          <input className="hub-input" type="search" value={query} onChange={(event) => changeBrowse({query:event.target.value})} placeholder="e.g. gardener, Gärtner, Gaertner" />
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={alternativesOnly} onChange={(event) => changeBrowse({alternativesOnly:event.target.checked})} />
          Show jobs with alternative words
        </label>
        <label>Masculine plural pattern<select className="hub-input" value={pattern} onChange={event=>changeBrowse({pattern:event.target.value as BrowseState["pattern"]})}><option value="all">All patterns</option>{professionPatterns.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <p className="dense" role="status" aria-live="polite">{filteredRows.length} of {projection.rows.length} professions match · showing {Math.min(limit,filteredRows.length)}</p>
        {(query||alternativesOnly||pattern!=="all")&&<button type="button" className="study-secondary" onClick={()=>changeBrowse(initialBrowse)}>Clear collection filters</button>}
      </section>

      <section aria-labelledby="profession-list-heading">
        <div className={styles.sectionHeading}>
          <h2 id="profession-list-heading">Explore the word families</h2>
          <span className="dense">Listen · understand · save</span>
        </div>
        <p className="muted">Pronunciation is generated German audio. Select a German form to look up its meaning.</p>
        {filteredRows.length === 0 ? (
          <div className="panel"><h3>No matching profession</h3><p className="muted">Check your lesson, concept and source selection above, clear the search, or include rows without alternatives.</p></div>
        ) : (
          <ol className={`${styles.grid} ${styles.previewGrid}`}>
            {filteredRows.slice(0,limit).map((row) => {
              const card=cardsByRow?.[row.id];
              return (
                <li key={row.id} value={row.sourceRow}>
                  {card?<WordFamilyPreview card={card} href={`${row.detailPath}${returnQuery}`} lessonIds={card.lessons} headingLevel={3}/>:<article className={`panel ${styles.card}`}><h3>{row.meaningEn}</h3><ProfessionInfographic row={row} compact {...(pronunciation ? { pronunciation } : {})}/><Link href={`${row.detailPath}${returnQuery}`}>Study this word family</Link></article>}
                </li>
              );
            })}
          </ol>
        )}
        {limit<filteredRows.length&&<button type="button" className="study-secondary" onClick={()=>changeBrowse({limit:limit+6})}>Show {Math.min(6,filteredRows.length-limit)} more {filteredRows.length-limit===1?"profession":"professions"}</button>}
      </section>
      <details id="profession-practice" className={styles.practiceDetails} open={reviewOpen} onToggle={event=>setReviewOpen(event.currentTarget.open)}>
        <summary>Practise your {filteredRows.length} matching {filteredRows.length===1?"profession":"professions"}</summary>
        {reviewOpen&&<SourceBackedReview key={filteredRows.map(row=>row.id).join("|")} rows={filteredRows} returnQuery={returnQuery} {...(pronunciation?{pronunciation}:{})}/>}
      </details>
      <details className={`panel ${styles.notice}`}><summary>Sources &amp; pronunciation notes</summary>
        <p>{projection.collection.sourceRowCount} entries and {projection.collection.sourceFormLexemeCount} forms from the learner note. Alternatives are preserved. This is optional material, not core completion.</p>
        <p><strong>Text:</strong> exact source candidates; qualified German-language review pending.</p>
        <p><strong>Illustrations:</strong> existing app learning illustrations, separate from the supplied note.</p>
        <p><strong>Audio:</strong> {audioAssetCount} exact audio previews across {audioRowCount} entries. {pronunciation ? "Generated pronunciations use the same files as the word cards. A missing file uses clearly labelled device speech. Independent German listening review is pending." : "Only exact existing computer-generated previews are offered; other forms are marked as not available yet."}</p>
      </details>
    </div>
  );
}
