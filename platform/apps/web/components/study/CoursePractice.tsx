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
  const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[mode,setMode]=useState("meaning"),[answer,setAnswer]=useState<string|null>(null),[correct,setCorrect]=useState(0);
  const pool=mode==="article"?entries.filter(e=>/^(der|die|das) /.test(e.de)&&!e.de.includes(" / ")):entries;
  const current=pool[index];
  function restart(){setIndex(0);setRevealed(false);setAnswer(null);setCorrect(0);}
  return <div className="study-recall">
    <label>Practice mode<select value={mode} onChange={event=>{setMode(event.target.value);restart();}}><option value="meaning">Meaning → German</option><option value="article">Choose der / die / das</option></select></label>
    <p className="muted">{mode==="meaning"?"Say the German before revealing it. This is unscored recall; save difficult words for scheduled review.":"Choose the noun’s article. Each answer is checked once; feedback explains the correct form."}</p>
    {pool.length===0?<p role="status">No words match this selection and practice mode. Change the mode or broaden your study selection.</p>:current?<>
      <div className="study-row"><p>Card {index+1} / {pool.length}</p>{(index>0||revealed)&&<button className="study-secondary" type="button" onClick={restart}>Restart practice</button>}</div>
      <h3>{mode==="meaning"?current.en:current.de.replace(/^(der|die|das) /,"")}</h3>
      {mode==="article"&&<div className="study-row">{["der","die","das"].map(article=><button className="study-secondary" type="button" key={article} disabled={answer!==null} aria-pressed={answer===article} onClick={()=>{setAnswer(article);setRevealed(true);if(current.de.startsWith(`${article} `))setCorrect(count=>count+1);}}>{article}</button>)}</div>}
      {!revealed&&mode==="meaning"&&<button type="button" className="study-primary" onClick={()=>setRevealed(true)}>Reveal German</button>}
      {revealed&&<div role="status">
        <p><strong>{answer?(current.de.startsWith(`${answer} `)?"Correct!":`The article is ${current.de.split(" ")[0]}.`):"Answer revealed · compare with what you said"}</strong></p>
        {answer&&<p>Remember the article together with the noun. {current.displayForms?.[0]?.label??"The article belongs to this form of the word."}</p>}
        <p className={current.displayForms?.[0]?`study-tone-${current.displayForms[0].tone}`:undefined}><GermanText text={current.de}/><LineAudio text={current.de} src={current.audio} compact/></p>
        {current.example&&<details><summary>See an example</summary><p><GermanText text={current.example}/><LineAudio text={current.example} compact/></p><p>{current.translation}</p></details>}
        {current.studyTags&&<StudyTagList tags={current.studyTags}/>}
        <div className="study-row"><SaveButton item={{id:current.saveId??`card-${current.id}`,title:current.de,meaning:current.en,kind:"word",href:current.href,...(current.studyTags?{studyTags:current.studyTags}:{}),audio:current.audio}}/><Link href={current.href}>Open full card →</Link><button type="button" className="study-primary" onClick={()=>{setIndex(index+1);setRevealed(false);setAnswer(null);}}>{index+1===pool.length?"See my result":"Next card →"}</button></div>
      </div>}
    </>:<div role="status"><h3>Practice round complete</h3><p>{mode==="article"?`${correct} of ${pool.length} answers correct.`:`You revealed ${pool.length} word families. This is recall practice, not a checked score.`}</p><div className="study-row"><button className="study-primary" type="button" onClick={restart}>Practise again</button><Link href="/saved">Review saved words →</Link></div></div>}
  </div>;
}
