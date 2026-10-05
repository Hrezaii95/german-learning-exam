"use client";
import { LArticle, LB, LDetails, LDiv, LH3, LH4, LP, LSmall, LSummary } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
import {useState} from "react";
import type {CoursePatternEntry} from "@/lib/study/course-patterns";
import {coursePatternTags} from "@/lib/study/course-patterns";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {appendNavigationContext,type NavigationContext} from "@/lib/content/navigation-context";

export function CoursePatternCard({entry,speech,compact=false,navigation}:{entry:CoursePatternEntry;speech:Record<string,string>;compact?:boolean;navigation?:NavigationContext}) {
  const [expanded,setExpanded]=useState(false);
  const de=entry.kind==="grammar"?entry.value.de:entry.kind==="verbs"?entry.value.verb:entry.value.de;
  const meaning=entry.kind==="grammar"?entry.value.en:entry.kind==="verbs"?entry.value.meaning:entry.value.en;
  const lessonPath=`/lessons/${String(entry.lesson).padStart(2,"0")}`;
  const href=`${lessonPath}#${entry.kind}`;
  const returnableLesson=navigation?appendNavigationContext(lessonPath,navigation):lessonPath;
  const say=(text:string)=><LP><GermanText text={text}/><LineAudio compact text={text} src={speech[text]}/></LP>;
  const detail=()=>{
    if(entry.kind==="grammar") {const examples=entry.value.examples.map(example=><LDiv key={example}>{say(example)}</LDiv>);return compact?<LDiv>{examples}</LDiv>:<LDetails><LSummary>More examples</LSummary>{examples}</LDetails>;}
    if(entry.kind==="phrases") return entry.value.note?<LP>{entry.value.note}</LP>:null;
    const v=entry.value;
    return <>
      {v.priority&&v.priority!=="core"&&<LP className="study-tag">{v.priority==="classroom"?"Classroom recognition · reference forms":"Fixed phrase · reference forms"}</LP>}
      <LDiv className="verb-person-grid">{v.forms.map((form,index)=><LDiv key={index}><LSmall>{["ich","du","er / sie / es","wir","ihr","sie / Sie"][index]}</LSmall>{say(`${["ich","du","er","wir","ihr","sie"][index]} ${form}`)}</LDiv>)}</LDiv>
      {v.participle&&<LDiv><LB>Perfekt:</LB>{say(`${v.auxiliary==="sein"?"ist":"hat"} ${v.participle}`)}</LDiv>}
      {v.preterite&&<><LH4>Präteritum</LH4><LDiv className="verb-person-grid">{v.preterite.map((form,index)=><LDiv key={index}>{say(`${["ich","du","er","wir","ihr","sie"][index]} ${form}`)}</LDiv>)}</LDiv></>}
      <LP>{v.tip}</LP>
    </>;
  };
  return <LArticle className={`lesson-concept${compact?" course-pattern-preview":""}`} id={entry.key} data-course-pattern={entry.key}><LDiv>
    {compact&&<LP className="study-eyebrow">Lesson {entry.lesson} · {entry.kind==="grammar"?"Grammar":entry.kind==="verbs"?"Verb":"Phrase"}</LP>}
    {entry.kind==="grammar"?<LH3>{entry.value.title}</LH3>:entry.kind==="verbs"?<LH3 lang="de">{de} <LSmall>{meaning}</LSmall></LH3>:null}
    {(entry.kind!=="verbs"||compact)&&say(de)}
    {entry.kind!=="verbs"&&<LP>{meaning}</LP>}
    {compact&&entry.kind!=="phrases"?<LDetails open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}><LSummary>{entry.kind==="verbs"?"Conjugation & usage":"Examples"}</LSummary>{expanded&&detail()}</LDetails>:detail()}
    <SaveButton item={{id:entry.key,title:de,meaning:entry.kind==="verbs"?`${meaning}. ${entry.value.forms.join(" · ")}`:meaning,kind:entry.kind==="phrases"?"phrase":"concept",lesson:entry.lesson,studyTags:coursePatternTags(entry),href,...(entry.kind==="phrases"?{audio:speech[de]??null}:{})}}/>
    {compact&&<LDiv className="study-row"><Link href={`${returnableLesson}#${entry.kind}`}>Learn in Lesson {entry.lesson} →</Link><Link href={`${returnableLesson}#practice`}>Practise →</Link></LDiv>}
    {entry.value.source&&<LSmall>{entry.value.source}</LSmall>}
  </LDiv></LArticle>;
}
