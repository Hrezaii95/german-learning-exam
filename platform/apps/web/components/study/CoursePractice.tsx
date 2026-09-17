"use client";
import Link from "next/link";
import {useState} from "react";
import {useStudyScope,StudyTagList} from "./StudyScope";
import {useStudy,SaveButton,GermanText} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import type {DictionaryEntry} from "@/lib/study/types";
import {courseChapters} from "@/lib/study/lesson-four";
import {tagsForLesson} from "@/lib/study/scope";

export function CoursePractice(){
  const study=useStudy();const {scope,matches}=useStudyScope();
  if(!study)return null;
  if(!study.ready)return <p role="status">Loading your practice cards…</p>;
  const entries=study.dictionary.filter(e=>e.kind==="word"&&e.studyTags&&matches(e.studyTags));
  const lessons=courseChapters.filter(c=>c.number>=3&&matches(tagsForLesson(c.number)));
  return <section className="panel course-practice"><h2>Recall your selected words</h2><p>{entries.length} word families · Your study selection sets the practice pool.</p><Recall key={JSON.stringify(scope)} entries={entries}/><div className="study-row">{lessons.map(c=><Link key={c.number} href={`/lessons/${String(c.number).padStart(2,"0")}#practice`}>Lesson {c.number} quiz →</Link>)}</div><p><Link href="/saved">Review only the cards you saved →</Link></p></section>;
}
function Recall({entries}:{entries:DictionaryEntry[]}){
  const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[mode,setMode]=useState("meaning"),[answer,setAnswer]=useState<string|null>(null);
  const pool=mode==="article"?entries.filter(e=>/^(der|die|das) /.test(e.de)&&!e.de.includes(" / ")):entries;
  const current=pool[index%Math.max(pool.length,1)];
  return <div className="study-recall"><label>Practice mode<select value={mode} onChange={e=>{setMode(e.target.value);setIndex(0);setRevealed(false);setAnswer(null);}}><option value="meaning">Meaning → German</option><option value="article">Choose der / die / das</option></select></label>{current?<><p>Card {index%pool.length+1} / {pool.length}</p><h3>{mode==="meaning"?current.en:current.de.replace(/^(der|die|das) /,"")}</h3>{mode==="article"&&<div className="study-row">{["der","die","das"].map(a=><button className="study-secondary" type="button" key={a} disabled={answer!==null} onClick={()=>{setAnswer(a);setRevealed(true);}}>{a}</button>)}</div>}{!revealed&&mode==="meaning"&&<button type="button" className="study-primary" onClick={()=>setRevealed(true)}>Reveal German</button>}{revealed&&<div role="status">{answer&&<p>{current.de.startsWith(answer+" ")?"Correct!":"Remember the article together with the noun."}</p>}<p className={current.displayForms?.[0]?`study-tone-${current.displayForms[0].tone}`:undefined}><GermanText text={current.de}/><LineAudio text={current.de} src={current.audio} compact/></p>{current.studyTags&&<StudyTagList tags={current.studyTags}/>}<SaveButton item={{id:current.saveId??`card-${current.id}`,title:current.de,meaning:current.en,kind:"word",href:current.href,...(current.studyTags?{studyTags:current.studyTags}:{}),audio:current.audio}}/><Link href={current.href}>Open full card →</Link><button type="button" className="study-primary" onClick={()=>{setIndex(index+1);setRevealed(false);setAnswer(null);}}>Next card →</button></div>}</>:<p>No words match this selection and practice mode.</p>}</div>;
}
