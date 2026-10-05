"use client";
import { LButton, LDetails, LDiv, LH2, LH3, LLabel, LOption, LP, LSection, LSelect, LStrong, LSummary } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
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
  if(!study.ready)return <LP role="status">Loading your practice cards…</LP>;
  const entries=study.dictionary.filter(e=>e.kind==="word"&&e.studyTags&&matches(e.studyTags));
  const lessons=courseChapters.filter(c=>c.number>=3&&matches(tagsForLesson(c.number)));
  return <LSection className="panel course-practice"><LH2>Recall your selected words</LH2><LP>{entries.length} word families · Your study selection sets the practice pool.</LP><Recall key={JSON.stringify(scope)} entries={entries}/><LDiv className="study-row">{lessons.map(c=><Link key={c.number} href={`/lessons/${String(c.number).padStart(2,"0")}#practice`}>Lesson {c.number} quiz →</Link>)}</LDiv><LP><Link href="/saved">Review only the cards you saved →</Link></LP></LSection>;
}
function Recall({entries}:{entries:DictionaryEntry[]}){
  const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[mode,setMode]=useState("meaning"),[answer,setAnswer]=useState<string|null>(null),[correct,setCorrect]=useState(0);
  const pool=mode==="article"?entries.filter(e=>/^(der|die|das) /.test(e.de)&&!e.de.includes(" / ")):entries;
  const current=pool[index];
  function restart(){setIndex(0);setRevealed(false);setAnswer(null);setCorrect(0);}
  return <LDiv className="study-recall">
    <LLabel>Practice mode<LSelect value={mode} onChange={event=>{setMode(event.target.value);restart();}}><LOption value="meaning">Meaning → German</LOption><LOption value="article">Choose der / die / das</LOption></LSelect></LLabel>
    <LP className="muted">{mode==="meaning"?"Say the German before revealing it. This is unscored recall; save difficult words for scheduled review.":"Choose the noun’s article. Each answer is checked once; feedback explains the correct form."}</LP>
    {pool.length===0?<LP role="status">No words match this selection and practice mode. Change the mode or broaden your study selection.</LP>:current?<>
      <LDiv className="study-row"><LP>Card {index+1} / {pool.length}</LP>{(index>0||revealed)&&<LButton className="study-secondary" type="button" onClick={restart}>Restart practice</LButton>}</LDiv>
      <LH3>{mode==="meaning"?current.en:current.de.replace(/^(der|die|das) /,"")}</LH3>
      {mode==="article"&&<LDiv className="study-row">{["der","die","das"].map(article=><LButton className="study-secondary" type="button" key={article} disabled={answer!==null} aria-pressed={answer===article} onClick={()=>{setAnswer(article);setRevealed(true);if(current.de.startsWith(`${article} `))setCorrect(count=>count+1);}}>{article}</LButton>)}</LDiv>}
      {!revealed&&mode==="meaning"&&<LButton type="button" className="study-primary" onClick={()=>setRevealed(true)}>Reveal German</LButton>}
      {revealed&&<LDiv role="status">
        <LP><LStrong>{answer?(current.de.startsWith(`${answer} `)?"Correct!":`The article is ${current.de.split(" ")[0]}.`):"Answer revealed · compare with what you said"}</LStrong></LP>
        {answer&&<LP>Remember the article together with the noun. {current.displayForms?.[0]?.label??"The article belongs to this form of the word."}</LP>}
        <LP className={current.displayForms?.[0]?`study-tone-${current.displayForms[0].tone}`:undefined}><GermanText text={current.de}/><LineAudio text={current.de} src={current.audio} compact/></LP>
        {current.example&&<LDetails><LSummary>See an example</LSummary><LP><GermanText text={current.example}/><LineAudio text={current.example} compact/></LP><LP>{current.translation}</LP></LDetails>}
        {current.studyTags&&<StudyTagList tags={current.studyTags}/>}
        <LDiv className="study-row"><SaveButton item={{id:current.saveId??`card-${current.id}`,title:current.de,meaning:current.en,kind:"word",href:current.href,...(current.studyTags?{studyTags:current.studyTags}:{}),audio:current.audio}}/><Link href={current.href}>Open full card →</Link><LButton type="button" className="study-primary" onClick={()=>{setIndex(index+1);setRevealed(false);setAnswer(null);}}>{index+1===pool.length?"See my result":"Next card →"}</LButton></LDiv>
      </LDiv>}
    </>:<LDiv role="status"><LH3>Practice round complete</LH3><LP>{mode==="article"?`${correct} of ${pool.length} answers correct.`:`You revealed ${pool.length} word families. This is recall practice, not a checked score.`}</LP><LDiv className="study-row"><LButton className="study-primary" type="button" onClick={restart}>Practise again</LButton><Link href="/saved">Review saved words →</Link></LDiv></LDiv>}
  </LDiv>;
}
