"use client";

import Link from "next/link";
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
  return <div className={styles.library}>
    <header className={styles.libraryHeader}><p>{teachersOnly ? "TEACHER’S JOB LIST" : `YOUR VOCABULARY · THROUGH LESSON ${LAST_AVAILABLE_LESSON}`}</p><h1>{teachersOnly ? "Every job. All its forms." : "Learn words as families."}</h1><div className={styles.libraryMeta}>{teachersOnly ? `${catalog.teacherRowCount} teacher jobs, with alternatives grouped.` : `${catalog.vocabularyCount} vocabulary entries · ${catalog.numberCount} numbers · ${catalog.spellingCount} spelling cards`}</div></header>
    <div className={styles.filters}><label className={styles.searchField}>Find a word<input type="search" value={query} maxLength={200} placeholder="German, English, plural…" onChange={e => { setQuery(e.target.value); setSelected(null); }} /></label><label>Lesson<select aria-label="Lesson" value={connected?(scope.mode==="all"?"all":scope.mode==="one"?String(scope.lessons[0]):"selection"):lesson} onChange={e => { if(connected)setScope({...scope,mode:e.target.value==="all"?"all":"one",lessons:e.target.value==="all"?[]:[Number(e.target.value)]});setLesson(e.target.value); setSelected(null); }}><option value="all">All lessons</option>{availableLessons().map(n=><option value={n} key={n}>Lesson {n}</option>)}{connected&&["multiple","through"].includes(scope.mode)&&<option value="selection">{scopeLabel(scope)}</option>}</select></label><label>Topic<select aria-label="Topic" value={category} onChange={e => { setCategory(e.target.value); setSelected(null); }}><option value="all">All topics</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Study focus<select aria-label="Study focus" value={priority} onChange={e => { setPriority(e.target.value); setSelected(null); }}><option value="all">All words</option>{["Core", "Context", "Classroom", "Teacher extra"].map(p => <option key={p}>{p}</option>)}</select></label></div>
    <div className={styles.resultBar}><p role="status">{matches.length} {matches.length === 1 ? "family" : "families"}{card && ` · ${index + 1} of ${matches.length}`}</p><button className={styles.textButton} type="button" onClick={() => setIndexOpen(!indexOpen)}>{indexOpen ? "Hide word list" : "Choose from word list"}</button><button className={styles.textButton} type="button" onClick={() => { setScope(defaultStudyScope()); setQuery(""); setLesson("all"); setCategory("all"); setPriority("all"); setSelected(null); }}>Clear filters</button></div>
    {indexOpen && <nav className={styles.wordIndex} aria-label="Matching word families">{matches.map(c => <button key={c.id} type="button" aria-current={c.id === card?.id ? "true" : undefined} onClick={() => { setSelected(c.id); setIndexOpen(false); }}><span lang="de">{c.rows.map(r => r.singular.text).join(" / ")}</span><small>{c.title}</small></button>)}</nav>}
    {card ? <><nav className={styles.cardNavigation} aria-label="Vocabulary cards"><button className={styles.secondary} type="button" disabled={index === 0} onClick={() => setSelected(matches[index - 1]!.id)}>← Previous family</button><Link href={card.path} prefetch={false}>Open this card</Link><button className={styles.secondary} type="button" disabled={index === matches.length - 1} onClick={() => setSelected(matches[index + 1]!.id)}>Next family →</button></nav><WordFamilyCard key={card.id} card={card} /></> : <p className={styles.empty}>No word families match these filters. Try a shorter word or clear the filters.</p>}
    <footer className={styles.libraryFooter}>{teachersOnly ? <Link href="/vocabulary">Browse all vocabulary →</Link> : <Link href="/collections/professions">Your 48 teacher jobs →</Link>}<Link href="/references">Book &amp; audio sources</Link></footer>
  </div>;
}

export function WordCardLibraryWithParams(props: { catalog: WordCardCatalog; teachersOnly?: boolean }) {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const rawLesson = params.get("lesson") ?? "all";
  const initialLesson = rawLesson.replace(/^0(?=[1-9]$)/, "");
  const initialCategory = params.get("category") ?? "all";
  return <WordCardLibrary key={`${initialQuery}|${initialLesson}|${initialCategory}`} {...props} initialQuery={initialQuery} initialLesson={initialLesson} initialCategory={initialCategory} />;
}
