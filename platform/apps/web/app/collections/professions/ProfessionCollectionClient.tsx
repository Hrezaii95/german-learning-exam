"use client";
import { LArticle, LB, LButton, LDetails, LDiv, LH1, LH2, LH3, LHeader, LInput, LLabel, LLi, LOl, LOption, LP, LSection, LSelect, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
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
import {parseNavigationContextParam,resolveBackHref} from "@/lib/content/navigation-context";
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

  if (!row) return <LP className="muted">No professions match the current filters.</LP>;
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
    <LSection className={`panel ${styles.review}`} aria-labelledby="optional-review-heading">
      <LDiv className={styles.sectionHeading}>
        <LDiv>
          <LP className={styles.eyebrow}>Recall the four forms</LP>
          <LH2 id="optional-review-heading">Can you name this profession?</LH2>
        </LDiv>
        <LSpan className="meta-chip" aria-live="polite">{rows.filter(item => reviewed.has(item.id)).length} marked reviewed</LSpan>
      </LDiv>
      <LP className="muted">Self-review only. It records no mastery and does not affect Lesson 2 completion.</LP>
      <LButton
        type="button"
        className={styles.flashcard}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        <LSpan className="dense">{index % rows.length + 1} of {rows.length} · {revealed ? "tap to hide" : "say the forms, then tap to reveal"}</LSpan>
        <LStrong lang={revealed ? "de" : "en"}>
          {revealed
            ? [...row.masculine, ...row.feminine].map((form) => `${form.singular} → ${form.plural}`).join(" · ")
            : row.meaningEn}
        </LStrong>
      </LButton>
      {revealed ? <ProfessionInfographic row={row} compact {...(pronunciation ? { pronunciation } : {})} /> : null}
      <LDiv className={styles.actions}>
        <LButton className="btn btn-secondary" type="button" onClick={() => advance(false)}>Again</LButton>
        <LButton className="btn btn-primary" type="button" disabled={study !== null && !study.ready} onClick={() => advance(true)}>Mark reviewed</LButton>
        <Link className="btn btn-secondary" href={`${row.detailPath}${returnQuery}`}>Study this word family</Link>
      </LDiv>
    </LSection>
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
  const [origin,setOrigin]=useState<string|null>(null);
  useEffect(()=>{
    setQuery(browseQuery(readBrowse()));
    const context=parseNavigationContextParam(new URLSearchParams(window.location.search).get("nav"));
    if(context)setOrigin(resolveBackHref(context));
  },[]);
  if(origin)return <Link href={origin}>← Back to learning</Link>;
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
    <LDiv className="stack">
      <LHeader className={`page-header ${styles.hero}`}>
        <LDiv>
          <LP className={styles.eyebrow}>People & work · Lesson 2 companion</LP>
          <LH1><LSpan lang="de">Berufe</LSpan> · Professions</LH1>
          <LP className="lede">
            Learn a job as a family: one man, one woman, and more than one. Hear each form, notice its ending, then try it from memory.
          </LP>
        </LDiv>
        <LDiv role="group" className={styles.legend} aria-label="Infographic legend">
          <LSpan className={styles.legendMasculine}><LB>M</LB> masculine · der</LSpan>
          <LSpan className={styles.legendFeminine}><LB>F</LB> feminine · die</LSpan>
          <LSpan className={styles.legendPlural}><LB>∞</LB> plural · die</LSpan>
          <LSpan className={styles.legendAlternative}><LB>／</LB> another word</LSpan>
        </LDiv>
        <LDiv className="meta-row">
          <Link href="#profession-patterns">See the patterns</Link>
          <Link href="#profession-list">Find a profession</Link>
          <Link href="#profession-practice" onClick={()=>setReviewOpen(true)}>Practise the forms</Link>
        </LDiv>
      </LHeader>

      <LSection id="profession-patterns" className={styles.patternOverview} aria-labelledby="pattern-heading">
        <LDiv><LP className={styles.eyebrow}>One → more than one</LP><LH2 id="pattern-heading">Remember the change, not four separate words.</LH2>
        <LP>These groups describe the masculine plurals in this collection. Select a pattern to explore its jobs. A job with alternative words can appear in more than one group.</LP></LDiv>
        <LDiv className={styles.patternGrid}>{professionPatterns.filter(item=>item.id!=="other").map(item=>{
          const count=scopedRows.filter(row=>professionPatternIds(row).includes(item.id)).length;
          const example=projection.rowsBySegment[item.example]!;
          const picture=cardsByRow?.[example.id]?.image;
          return <LButton type="button" className={styles.patternCard} key={item.id} aria-label={`${item.title}: ${example.masculine[0]!.singular} → ${example.masculine[0]!.plural} · ${count} jobs`} aria-pressed={pattern===item.id} disabled={!count} onClick={()=>changeBrowse({pattern:pattern===item.id?"all":item.id})}>
            {picture&&<img src={withPagesBaseAssetPath(picture.path)} alt={picture.alt} width={240} height={140} loading="lazy"/>}
            <LStrong>{item.title}</LStrong><LSpan>{item.cue}</LSpan>
            <LSpan className={styles.maleText} lang="de">{example.masculine[0]!.singular}</LSpan><LSpan aria-hidden="true">↓</LSpan><LSpan className={styles.pluralText} lang="de">{example.masculine[0]!.plural}</LSpan>
            <LSmall>{count} {count===1?"job":"jobs"} in your selection</LSmall>
          </LButton>;
        })}</LDiv>
        <LDiv className={styles.feminineTrail}><LStrong>A useful feminine pattern</LStrong><LP lang="de"><LSpan className={styles.maleText}>der Lehrer</LSpan> → <LSpan className={styles.femaleText}>die Lehrer<LB>in</LB></LSpan> → <LSpan className={styles.pluralText}>die Lehrer<LB>innen</LB></LSpan></LP>
          <LP>Many forms here use <LB>-in → -innen</LB>. Some also change a vowel: Arzt → Ärztin. Other pairs use different words, such as Feuerwehrmann / Feuerwehrfrau. Learn those together.</LP><LButton type="button" className="study-secondary" onClick={()=>changeBrowse({pattern:"other"})}>Explore other plural changes</LButton></LDiv>
      </LSection>

      <LSection id="profession-list" className={`panel ${styles.filters}`} aria-labelledby="filter-heading">
        <LH2 id="filter-heading">Find a profession</LH2>
        <LLabel>
          <LSpan>Search English or German</LSpan>
          <LInput className="hub-input" type="search" value={query} onChange={(event) => changeBrowse({query:event.target.value})} placeholder="e.g. gardener, Gärtner, Gaertner" />
        </LLabel>
        <LLabel className={styles.checkbox}>
          <LInput type="checkbox" checked={alternativesOnly} onChange={(event) => changeBrowse({alternativesOnly:event.target.checked})} />
          Show jobs with alternative words
        </LLabel>
        <LLabel>Masculine plural pattern<LSelect className="hub-input" value={pattern} onChange={event=>changeBrowse({pattern:event.target.value as BrowseState["pattern"]})}><LOption value="all">All patterns</LOption>{professionPatterns.map(item=><LOption key={item.id} value={item.id}>{item.title}</LOption>)}</LSelect></LLabel>
        <LP className="dense" role="status" aria-live="polite">{filteredRows.length} of {projection.rows.length} professions match · showing {Math.min(limit,filteredRows.length)}</LP>
        {(query||alternativesOnly||pattern!=="all")&&<LButton type="button" className="study-secondary" onClick={()=>changeBrowse(initialBrowse)}>Clear collection filters</LButton>}
      </LSection>

      <LSection aria-labelledby="profession-list-heading">
        <LDiv className={styles.sectionHeading}>
          <LH2 id="profession-list-heading">Explore the word families</LH2>
          <LSpan className="dense">Listen · understand · save</LSpan>
        </LDiv>
        <LP className="muted">Pronunciation is generated German audio. Select a German form to look up its meaning.</LP>
        {filteredRows.length === 0 ? (
          <LDiv className="panel"><LH3>No matching profession</LH3><LP className="muted">Check your lesson, concept and source selection above, clear the search, or include rows without alternatives.</LP></LDiv>
        ) : (
          <LOl className={`${styles.grid} ${styles.previewGrid}`}>
            {filteredRows.slice(0,limit).map((row) => {
              const card=cardsByRow?.[row.id];
              return (
                <LLi key={row.id} value={row.sourceRow}>
                  {card?<WordFamilyPreview card={card} href={`${row.detailPath}${returnQuery}`} lessonIds={card.lessons} headingLevel={3}/>:<LArticle className={`panel ${styles.card}`}><LH3>{row.meaningEn}</LH3><ProfessionInfographic row={row} compact {...(pronunciation ? { pronunciation } : {})}/><Link href={`${row.detailPath}${returnQuery}`}>Study this word family</Link></LArticle>}
                </LLi>
              );
            })}
          </LOl>
        )}
        {limit<filteredRows.length&&<LButton type="button" className="study-secondary" onClick={()=>changeBrowse({limit:limit+6})}>Show {Math.min(6,filteredRows.length-limit)} more {filteredRows.length-limit===1?"profession":"professions"}</LButton>}
      </LSection>
      <LDetails id="profession-practice" className={styles.practiceDetails} open={reviewOpen} onToggle={event=>setReviewOpen(event.currentTarget.open)}>
        <LSummary>Practise your {filteredRows.length} matching {filteredRows.length===1?"profession":"professions"}</LSummary>
        {reviewOpen&&<SourceBackedReview key={filteredRows.map(row=>row.id).join("|")} rows={filteredRows} returnQuery={returnQuery} {...(pronunciation?{pronunciation}:{})}/>}
      </LDetails>
      <LDetails className={`panel ${styles.notice}`}><LSummary>Sources &amp; pronunciation notes</LSummary>
        <LP>{projection.collection.sourceRowCount} entries and {projection.collection.sourceFormLexemeCount} forms from the learner note. Alternatives are preserved. This is optional material, not core completion.</LP>
        <LP><LStrong>Text:</LStrong> exact source candidates; qualified German-language review pending.</LP>
        <LP><LStrong>Illustrations:</LStrong> existing app learning illustrations, separate from the supplied note.</LP>
        <LP><LStrong>Audio:</LStrong> {audioAssetCount} exact audio previews across {audioRowCount} entries. {pronunciation ? "Generated pronunciations use the same files as the word cards. A missing file uses clearly labelled device speech. Independent German listening review is pending." : "Only exact existing computer-generated previews are offered; other forms are marked as not available yet."}</LP>
      </LDetails>
    </LDiv>
  );
}
