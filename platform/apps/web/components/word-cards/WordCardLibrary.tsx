"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { wordCardSearchKey, type WordCardCatalog } from "@/lib/content/word-card-types";
import { WordFamilyCard } from "./WordFamilyCard";
import styles from "./word-cards.module.css";

export function WordCardLibrary({ catalog, teachersOnly = false, initialQuery = "", initialLesson = "all", initialCategory = "all" }: { catalog: WordCardCatalog; teachersOnly?: boolean; initialQuery?: string; initialLesson?: string; initialCategory?: string }) {
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
    return terms.every(term => card.searchText.includes(term)) && (lesson === "all" || card.lessons.includes(lesson) || (card.lessons.includes("1–3") && ["1", "2", "3"].includes(lesson))) && (category === "all" || category === card.category) && (priority === "all" || card.priorities.includes(priority));
  }), [pool, query, lesson, category, priority]);
  const index = Math.max(0, matches.findIndex(c => c.id === selected));
  const card = matches[index];
  return <div className={styles.library}>
    <header className={styles.libraryHeader}><p>{teachersOnly ? "TEACHER’S JOB LIST" : "YOUR VOCABULARY · THROUGH LESSON 3"}</p><h1>{teachersOnly ? "Every job. All its forms." : "Learn words as families."}</h1><div className={styles.libraryMeta}>{teachersOnly ? `${catalog.teacherRowCount} teacher jobs, with alternatives grouped.` : `${catalog.vocabularyCount} vocabulary entries · ${catalog.numberCount} numbers · ${catalog.spellingCount} spelling cards`}</div></header>
    <div className={styles.filters}><label className={styles.searchField}>Find a word<input type="search" value={query} maxLength={200} placeholder="German, English, plural…" onChange={e => { setQuery(e.target.value); setSelected(null); }} /></label><label>Lesson<select aria-label="Lesson" value={lesson} onChange={e => { setLesson(e.target.value); setSelected(null); }}><option value="all">All lessons</option><option value="1">Lesson 1</option><option value="2">Lesson 2</option><option value="3">Lesson 3</option><option value="Module 1">Module 1</option><option value="Teacher notes">Teacher extras</option></select></label><label>Topic<select aria-label="Topic" value={category} onChange={e => { setCategory(e.target.value); setSelected(null); }}><option value="all">All topics</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Study focus<select aria-label="Study focus" value={priority} onChange={e => { setPriority(e.target.value); setSelected(null); }}><option value="all">All words</option>{["Core", "Context", "Classroom", "Teacher extra"].map(p => <option key={p}>{p}</option>)}</select></label></div>
    <div className={styles.resultBar}><p role="status">{matches.length} {matches.length === 1 ? "family" : "families"}{card && ` · ${index + 1} of ${matches.length}`}</p><button className={styles.textButton} type="button" onClick={() => setIndexOpen(!indexOpen)}>{indexOpen ? "Hide word list" : "Choose from word list"}</button><button className={styles.textButton} type="button" onClick={() => { setQuery(""); setLesson("all"); setCategory("all"); setPriority("all"); setSelected(null); }}>Clear filters</button></div>
    {indexOpen && <nav className={styles.wordIndex} aria-label="Matching word families">{matches.map(c => <button key={c.id} type="button" aria-current={c.id === card?.id ? "true" : undefined} onClick={() => { setSelected(c.id); setIndexOpen(false); }}><span lang="de">{c.rows.map(r => r.singular.text).join(" / ")}</span><small>{c.title}</small></button>)}</nav>}
    {card ? <><nav className={styles.cardNavigation} aria-label="Vocabulary cards"><button className={styles.secondary} type="button" disabled={index === 0} onClick={() => setSelected(matches[index - 1]!.id)}>← Previous family</button><Link href={card.path} prefetch={false}>Open this card</Link><button className={styles.secondary} type="button" disabled={index === matches.length - 1} onClick={() => setSelected(matches[index + 1]!.id)}>Next family →</button></nav><WordFamilyCard key={card.id} card={card} /></> : <p className={styles.empty}>No word families match these filters. Try a shorter word or clear the filters.</p>}
    <footer className={styles.libraryFooter}>{teachersOnly ? <Link href="/vocabulary">Browse all vocabulary →</Link> : <Link href="/collections/professions">Your 48 teacher jobs →</Link>}<Link href="/references">Book &amp; audio sources</Link></footer>
  </div>;
}

export function WordCardLibraryWithParams(props: { catalog: WordCardCatalog; teachersOnly?: boolean }) {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const rawLesson = params.get("lesson") ?? "all";
  const initialLesson = rawLesson.replace(/^0(?=[123]$)/, "");
  const initialCategory = params.get("category") ?? "all";
  return <WordCardLibrary key={`${initialQuery}|${initialLesson}|${initialCategory}`} {...props} initialQuery={initialQuery} initialLesson={initialLesson} initialCategory={initialCategory} />;
}
