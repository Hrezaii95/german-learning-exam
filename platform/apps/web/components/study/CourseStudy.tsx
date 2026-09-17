"use client";
import Link from "next/link";
import {useState,useEffect} from "react";
import type {StudyUnit} from "@/lib/study/course-lessons";
import {courseChapters} from "@/lib/study/lesson-four";
import {tagsForLesson} from "@/lib/study/scope";
import type {WordCard} from "@/lib/content/word-card-types";
import {wordStudyTags} from "@/lib/study/tags";
import {StudyScopeNotice,StudyTagList,useStudyScope} from "./StudyScope";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {WordFamilyPreview} from "../word-cards/WordFamilyPreview";

export function CourseStudy({unit,cards,speech}:{unit:StudyUnit;cards:WordCard[];speech:Record<string,string>}){
  const chapter=courseChapters.find(c=>c.number===unit.number)!;
  const [tab,setTab]=useState("Grammar");
  useEffect(()=>{const restore=()=>{const found=["Words","Grammar","Verbs","Phrases","Practice"].find(t=>t.toLowerCase()===window.location.hash.slice(1));if(found)setTab(found);};restore();window.addEventListener("hashchange",restore);return()=>window.removeEventListener("hashchange",restore);},[]);
  const [position,setPosition]=useState(0),[answer,setAnswer]=useState<string|null>(null),[score,setScore]=useState(0);
  const {matches}=useStudyScope();
  const question=unit.quiz[position];
  return <div className="study-workspace"><StudyScopeNotice tags={tagsForLesson(unit.number)}/><Link href="/lessons">← All lessons</Link><header className="study-page-header"><div><p className="study-eyebrow">Lesson {unit.number} · Momente A1.1</p><h1 lang="de">{chapter.title}</h1><p>{unit.summary}</p><StudyTagList tags={tagsForLesson(unit.number)}/></div></header><div className="study-row"><Link className="study-primary" href={`/book?page=coursebook-${chapter.kb}`}>Coursebook →</Link><Link className="study-secondary" href={`/book?page=workbook-${chapter.ab}`}>Workbook</Link><Link className="study-secondary" href={`/listening?lesson=${unit.number}`}>Listen & read transcripts</Link></div><nav className="study-tabs" aria-label={`Lesson ${unit.number} study sections`}>{["Words","Grammar","Verbs","Phrases","Practice"].map(t=><button type="button" key={t} aria-current={tab===t?"page":undefined} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    {tab==="Words"&&<><p>{cards.filter(c=>matches(wordStudyTags(c))).length} word families in your selection.</p><div className="card-grid">{cards.filter(c=>matches(wordStudyTags(c))).map(c=><WordFamilyPreview key={c.id} card={c} href={c.path} lessonIds={c.lessons.map(n=>`lesson:${n.padStart(2,"0")}`)}/>)}</div></>}
    {["Grammar","Verbs","Phrases"].includes(tab)&&<CoursePatterns units={[unit]} section={tab.toLowerCase()} speech={speech} direct/>}
    {tab==="Practice"&&<section className="study-recall">{question?<><p>Question {position+1} / {unit.quiz.length}</p><h2>{question.q}</h2><div className="study-row">{question.options.map(o=><button className="study-secondary" type="button" key={o} disabled={answer!==null} aria-pressed={answer===o} onClick={()=>{setAnswer(o);if(o===question.answer)setScore(score+1);}}>{o}</button>)}</div>{answer!==null&&<div role="status"><h3>{answer===question.answer?"Correct!":`Answer: ${question.answer}`}</h3><p>{question.why}</p><SaveButton item={{id:`l${unit.number}-quiz-${position}`,title:question.q,meaning:`${question.answer} — ${question.why}`,kind:"concept",lesson:unit.number,href:`/lessons/${String(unit.number).padStart(2,"0")}`}}/><button className="study-primary" type="button" onClick={()=>{setPosition(position+1);setAnswer(null);}}>Next question →</button></div>}</>:<><h2>{score} / {unit.quiz.length}</h2><button type="button" className="study-primary" onClick={()=>{setPosition(0);setScore(0);setAnswer(null);}}>Try again</button></>}</section>}
    <p className="muted">Vocabulary and patterns follow the supplied book and glossary. Explanations, quizzes and example sentences are study aids. Missing official exercise answers are labelled in the book.</p>
  </div>;
}

export function CoursePatterns({units,section,speech,direct=false,query=""}:{units:StudyUnit[];section:string;speech:Record<string,string>;direct?:boolean;query?:string}){
  const {matches}=useStudyScope();
  const say=(text:string)=><p><GermanText text={text}/><LineAudio compact text={text} src={speech[text]}/></p>;
  const concept=section==="verbs"?"verbs":section==="phrases"?"conversation":"grammar";
  const shown=units.filter(u=>direct||matches({...tagsForLesson(u.number),concepts:[concept]}));
  const contains=(text:string)=>text.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"));
  return <div className="course-patterns">{shown.map(unit=><section key={unit.number}><h2>Lesson {unit.number} · {section==="concepts"?"Grammar connections":section}</h2><div className="lesson-concepts">{(section==="grammar"||section==="concepts")&&unit.concepts.filter(c=>contains(`${c.title} ${c.de} ${c.en}`)).map(c=><article className="lesson-concept" id={c.id} key={c.id}><div><h3>{c.title}</h3>{say(c.de)}<p>{c.en}</p><details><summary>More examples</summary>{c.examples.map(e=><div key={e}>{say(e)}</div>)}</details><SaveButton item={{id:c.id,title:c.de,meaning:c.en,kind:"concept",lesson:unit.number,studyTags:{...tagsForLesson(unit.number),concepts:["grammar"]},href:`/lessons/${String(unit.number).padStart(2,"0")}#grammar`}}/>{c.source&&<small>{c.source}</small>}</div></article>)}{section==="verbs"&&unit.verbs.filter(v=>contains(`${v.verb} ${v.meaning} ${v.forms.join(" ")}`)).map(v=><article className="lesson-concept" key={v.verb}><div><h3 lang="de">{v.verb} <small>{v.meaning}</small></h3>{v.priority&&v.priority!=="core"&&<p className="study-tag">{v.priority==="classroom"?"Classroom recognition · reference forms":"Fixed phrase · reference forms"}</p>}<div className="verb-person-grid">{v.forms.map((f,i)=><div key={i}><small>{["ich","du","er / sie / es","wir","ihr","sie / Sie"][i]}</small>{say(`${["ich","du","er","wir","ihr","sie"][i]} ${f}`)}</div>)}</div><p>{v.tip}</p><SaveButton item={{id:`l${unit.number}-verb-${v.verb}`,title:v.verb,meaning:`${v.meaning}. ${v.forms.join(" · ")}`,kind:"concept",lesson:unit.number,studyTags:{...tagsForLesson(unit.number),concepts:["verbs"]},href:`/lessons/${String(unit.number).padStart(2,"0")}#verbs`}}/></div></article>)}{section==="phrases"&&unit.phrases.filter(p=>contains(`${p.de} ${p.en}`)).map((p,i)=><article className="lesson-concept" key={p.de}><div>{say(p.de)}<p>{p.en}</p>{p.note&&<p>{p.note}</p>}<SaveButton item={{id:`l${unit.number}-phrase-${i}`,title:p.de,meaning:p.en,kind:"phrase",lesson:unit.number,studyTags:{...tagsForLesson(unit.number),concepts:["conversation"]},href:`/lessons/${String(unit.number).padStart(2,"0")}#phrases`,audio:speech[p.de]??null}}/></div></article>)}</div></section>)}</div>;
}
