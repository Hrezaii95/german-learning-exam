"use client";
import { LButton, LDiv, LFooter, LH1, LHeader, LInput, LLabel, LNav, LOption, LP, LSelect, LSmall, LSpan } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { wordCardSearchKey, type WordCardCatalog } from "@/lib/content/word-card-types";
import { WordFamilyCard } from "./WordFamilyCard";
import styles from "./word-cards.module.css";
import {useStudyScope} from "@/components/study/StudyScope";
import {wordStudyTags} from "@/lib/study/tags";
import {matchesStudyScope,availableLessons,LAST_AVAILABLE_LESSON,defaultStudyScope,scopeLabel} from "@/lib/study/scope";

export function WordCardLibrary({ catalog, teachersOnly = false, initialQuery = "", initialLesson = "all", initialCategory = "all" }: { catalog: WordCardCatalog; teachersOnly?: boolean; initialQuery?: string; initialLesson?: string; initialCategory?: string }) {
  const {scope,setScope,ready,connected}=useStudyScope();
  const applied=useRef(false);
  useEffect(()=>{if(!ready||applied.current||!connected)return;applied.current=true;if(availableLessons().includes(Number(initialLesson)))setScope({...scope,mode:"one",lessons:[Number(initialLesson)]});},[ready,connected,initialLesson,scope,setScope]);
  const [query, setQuery] = useState(initialQuery.slice(0, 200));
  const [lesson, setLesson] = useState(initialLesson);
  const [category, setCategory] = useState(initialCategory);
  const [priority, setPriority] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const pool = useMemo(() => teachersOnly ? catalog.cards.filter(c => c.teacherRows.length > 0) : catalog.cards, [catalog, teachersOnly]);
  const categories = [...new Set(pool.map(c => c.category))].sort();
  const matches = useMemo(() => pool.filter(card => {
    const terms = wordCardSearchKey(query.trim()).split(/\s+/).filter(Boolean);
    const tags=wordStudyTags(card);
    return matchesStudyScope(tags,scope)&&terms.every(term => card.searchText.includes(term)) && (connected || lesson === "all" || card.lessons.includes(lesson) || tags.lessons.includes(Number(lesson))) && (category === "all" || category === card.category) && (priority === "all" || card.priorities.includes(priority));
  }), [pool, query, lesson, category, priority,scope,connected]);
  const index = Math.max(0, matches.findIndex(c => c.id === selected));
  const card = matches[index];
  return <LDiv className={styles.library}>
    <LHeader className={styles.libraryHeader}><LP>{teachersOnly ? "TEACHER’S JOB LIST" : `YOUR VOCABULARY · THROUGH LESSON ${LAST_AVAILABLE_LESSON}`}</LP><LH1>{teachersOnly ? "Every job. All its forms." : "Learn words as families."}</LH1><LDiv className={styles.libraryMeta}>{teachersOnly ? `${catalog.teacherRowCount} teacher jobs, with alternatives grouped.` : `${catalog.vocabularyCount} vocabulary entries · ${catalog.numberCount} numbers · ${catalog.spellingCount} spelling cards`}</LDiv></LHeader>
    <LDiv className={styles.filters}><LLabel className={styles.searchField}>Find a word<LInput type="search" value={query} maxLength={200} placeholder="German, English, plural…" onChange={e => { setQuery(e.target.value); setSelected(null); }} /></LLabel><LLabel>Lesson<LSelect aria-label="Lesson" value={connected?(scope.mode==="all"?"all":scope.mode==="one"?String(scope.lessons[0]):"selection"):lesson} onChange={e => { if(connected)setScope({...scope,mode:e.target.value==="all"?"all":"one",lessons:e.target.value==="all"?[]:[Number(e.target.value)]});setLesson(e.target.value); setSelected(null); }}><LOption value="all">All lessons</LOption>{availableLessons().map(n=><LOption value={n} key={n}>Lesson {n}</LOption>)}{connected&&["multiple","through"].includes(scope.mode)&&<LOption value="selection">{scopeLabel(scope)}</LOption>}</LSelect></LLabel><LLabel>Topic<LSelect aria-label="Topic" value={category} onChange={e => { setCategory(e.target.value); setSelected(null); }}><LOption value="all">All topics</LOption>{categories.map(c => <LOption key={c}>{c}</LOption>)}</LSelect></LLabel><LLabel>Study focus<LSelect aria-label="Study focus" value={priority} onChange={e => { setPriority(e.target.value); setSelected(null); }}><LOption value="all">All words</LOption>{["Core", "Context", "Classroom", "Teacher extra"].map(p => <LOption key={p}>{p}</LOption>)}</LSelect></LLabel></LDiv>
    <LDiv className={styles.resultBar}><LP role="status">{matches.length} {matches.length === 1 ? "family" : "families"}{card && ` · ${index + 1} of ${matches.length}`}</LP><LButton className={styles.textButton} type="button" onClick={() => setIndexOpen(!indexOpen)}>{indexOpen ? "Hide word list" : "Choose from word list"}</LButton><LButton className={styles.textButton} type="button" onClick={() => { setScope(defaultStudyScope()); setQuery(""); setLesson("all"); setCategory("all"); setPriority("all"); setSelected(null); }}>Clear filters</LButton></LDiv>
    {indexOpen && <LNav className={styles.wordIndex} aria-label="Matching word families">{matches.map(c => <LButton key={c.id} type="button" aria-current={c.id === card?.id ? "true" : undefined} onClick={() => { setSelected(c.id); setIndexOpen(false); }}><LSpan lang="de">{c.rows.map(r => r.singular.text).join(" / ")}</LSpan><LSmall>{c.title}</LSmall></LButton>)}</LNav>}
    {card ? <><LNav className={styles.cardNavigation} aria-label="Vocabulary cards"><LButton className={styles.secondary} type="button" disabled={index === 0} onClick={() => setSelected(matches[index - 1]!.id)}>← Previous family</LButton><Link href={card.path} prefetch={false}>Open this card</Link><LButton className={styles.secondary} type="button" disabled={index === matches.length - 1} onClick={() => setSelected(matches[index + 1]!.id)}>Next family →</LButton></LNav><WordFamilyCard key={card.id} card={card} /></> : <LP className={styles.empty}>No word families match these filters. Try a shorter word or clear the filters.</LP>}
    <LFooter className={styles.libraryFooter}>{teachersOnly ? <Link href="/vocabulary">Browse all vocabulary →</Link> : <Link href="/collections/professions">Your 48 teacher jobs →</Link>}<Link href="/references">Book &amp; audio sources</Link></LFooter>
  </LDiv>;
}

export function WordCardLibraryWithParams(props: { catalog: WordCardCatalog; teachersOnly?: boolean }) {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const rawLesson = params.get("lesson") ?? "all";
  const initialLesson = rawLesson.replace(/^0(?=[1-9]$)/, "");
  const initialCategory = params.get("category") ?? "all";
  return <WordCardLibrary key={`${initialQuery}|${initialLesson}|${initialCategory}`} {...props} initialQuery={initialQuery} initialLesson={initialLesson} initialCategory={initialCategory} />;
}
