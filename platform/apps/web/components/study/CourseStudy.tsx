"use client";
import Link from "next/link";
import {useState} from "react";
import {LessonLearningPath} from "./LessonLearningPath";
import {useLessonSession} from "./useLessonSession";
import type {LessonSession} from "@/lib/study/types";
import type {StudyUnit} from "@/lib/study/course-lessons";
import {courseChapters} from "@/lib/study/lesson-four";
import {tagsForLesson} from "@/lib/study/scope";
import type {WordCard} from "@/lib/content/word-card-types";
import {wordStudyTags} from "@/lib/study/tags";
import {StudyScopeNotice,StudyTagList,useStudyScope} from "./StudyScope";
import {SaveButton} from "./StudyProvider";
import {CoursePatternCard} from "./CoursePatternCard";
import {coursePatternEntries,coursePatternTags} from "@/lib/study/course-patterns";
import {WordFamilyPreview} from "../word-cards/WordFamilyPreview";
import {appendNavigationContext} from "@/lib/content/navigation-context";

export function CourseStudy({unit,cards,speech}:{unit:StudyUnit;cards:WordCard[];speech:Record<string,string>}){
  const chapter=courseChapters.find(c=>c.number===unit.number)!;
  const session = useLessonSession(unit);
  const {tab,position,answer,score} = session;
  const {matches}=useStudyScope();
  const question=unit.quiz[position];
  const [wordLimit,setWordLimit]=useState(12);
  const selectedCards=cards.filter(card=>matches(wordStudyTags(card)));
  function showSection(section:LessonSession["tab"]) {
    session.chooseTab(section);
    requestAnimationFrame(()=>document.querySelector(".study-tabs")?.scrollIntoView({block:"start"}));
  }
  return <div className="study-workspace" aria-busy={!session.ready}><StudyScopeNotice tags={tagsForLesson(unit.number)}/><Link href="/lessons">← All lessons</Link><header className="study-page-header"><div><p className="study-eyebrow">Lesson {unit.number} · Momente A1.1</p><h1 lang="de">{chapter.title}</h1><p>{unit.summary}</p><StudyTagList tags={tagsForLesson(unit.number)}/></div></header><LessonLearningPath lesson={unit.number} checkpoint={unit.summary} learnHref="#words" practiceHref="#practice" onLearn={()=>showSection("Words")} onPractice={()=>showSection("Practice")} onContinue={()=>showSection(tab)} ready={session.ready} section={tab.toLowerCase()}/><p><Link href={`/book?page=coursebook-${unit.number===3?159:unit.number===5?160:unit.number===12?170:unit.number===11?168:unit.number===10?167:unit.number===9?166:unit.number===8?164:unit.number===7?162:161}`}>Partner activities →</Link>{[6,9,12].includes(unit.number)&&<> · <Link href={`/book?page=coursebook-${unit.number===12?77:unit.number===9?59:41}`}>Module {unit.number/3} magazine & review →</Link></>}</p><nav className="study-tabs" aria-label={`Lesson ${unit.number} study sections`}>{["Words","Grammar","Verbs","Phrases","Practice"].map(t=><button type="button" key={t} disabled={!session.ready} aria-current={tab===t?"page":undefined} onClick={()=>session.chooseTab(t as LessonSession["tab"])}>{t}</button>)}</nav>
    {tab==="Words"&&<><p>{selectedCards.length} word families in your selection.</p><div className="card-grid">{selectedCards.slice(0,wordLimit).map(c=><WordFamilyPreview key={c.id} card={c} href={appendNavigationContext(c.path,{entryContext:"lesson",returnPath:`/lessons/${String(unit.number).padStart(2,"0")}`})} lessonIds={c.lessons.map(n=>`lesson:${n.padStart(2,"0")}`)}/>)}</div><div className="library-pagination"><p role="status">Showing {Math.min(wordLimit,selectedCards.length)} of {selectedCards.length} word families</p>{wordLimit<selectedCards.length&&<button type="button" className="study-secondary" onClick={()=>setWordLimit(limit=>limit+12)}>Show more words</button>}</div></>}
    {["Grammar","Verbs","Phrases"].includes(tab)&&<CoursePatterns units={[unit]} section={tab.toLowerCase()} speech={speech} direct/>}
    {tab==="Practice"&&<section className="study-recall"><p className="study-eyebrow">Checked lesson practice</p>{question?<><div className="study-row"><p>Question {position+1} / {unit.quiz.length}</p>{(position>0||answer!==null)&&<button className="study-secondary" type="button" onClick={()=>session.restart()}>Restart quiz</button>}</div><h2>{question.q}</h2><div className="study-row">{question.options.map(o=><button className="study-secondary" type="button" key={o} disabled={!session.ready||answer!==null} aria-pressed={answer===o} onClick={()=>session.chooseAnswer(o)}>{o}</button>)}</div>{answer!==null&&<div role="status"><h3>{answer===question.answer?"Correct!":`Answer: ${question.answer}`}</h3><p>{question.why}</p><SaveButton item={{id:`l${unit.number}-quiz-${position}`,title:question.q,meaning:`${question.answer} — ${question.why}`,kind:"concept",lesson:unit.number,href:`/lessons/${String(unit.number).padStart(2,"0")}`}}/><button className="study-primary" type="button" onClick={()=>session.next()}>{position+1===unit.quiz.length?"See my result":"Next question →"}</button></div>}</>:<><h2>Practice round complete</h2><p>{score} / {unit.quiz.length} answers correct.</p><p>Revisit the examples for any difficult patterns, then try another round.</p><button type="button" className="study-primary" onClick={()=>session.restart()}>Try again</button></>}</section>}
    <p className="muted">Vocabulary and patterns follow the supplied book and glossary. Explanations, quizzes and example sentences are study aids. Missing official exercise answers are labelled in the book.</p>
  </div>;
}

export function CoursePatterns({units,section,speech,direct=false,query=""}:{units:StudyUnit[];section:string;speech:Record<string,string>;direct?:boolean;query?:string}){
  const {matches}=useStudyScope();
  const entries=coursePatternEntries(units,section,query).filter(entry=>direct||matches(coursePatternTags(entry)));
  return <div className="course-patterns">{units.map(unit=>{
    const rows=entries.filter(entry=>entry.lesson===unit.number);
    return rows.length?<section key={unit.number}><h2>Lesson {unit.number} · {section==="concepts"?"Grammar connections":section}</h2><div className="lesson-concepts">{rows.map(entry=><CoursePatternCard key={entry.key} entry={entry} speech={speech}/>)}</div></section>:null;
  })}</div>;
}
