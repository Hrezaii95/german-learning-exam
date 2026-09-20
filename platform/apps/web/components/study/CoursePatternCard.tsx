"use client";
import Link from "next/link";
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
  const say=(text:string)=><p><GermanText text={text}/><LineAudio compact text={text} src={speech[text]}/></p>;
  const detail=()=>{
    if(entry.kind==="grammar") {const examples=entry.value.examples.map(example=><div key={example}>{say(example)}</div>);return compact?<div>{examples}</div>:<details><summary>More examples</summary>{examples}</details>;}
    if(entry.kind==="phrases") return entry.value.note?<p>{entry.value.note}</p>:null;
    const v=entry.value;
    return <>
      {v.priority&&v.priority!=="core"&&<p className="study-tag">{v.priority==="classroom"?"Classroom recognition · reference forms":"Fixed phrase · reference forms"}</p>}
      <div className="verb-person-grid">{v.forms.map((form,index)=><div key={index}><small>{["ich","du","er / sie / es","wir","ihr","sie / Sie"][index]}</small>{say(`${["ich","du","er","wir","ihr","sie"][index]} ${form}`)}</div>)}</div>
      {v.participle&&<div><b>Perfekt:</b>{say(`${v.auxiliary==="sein"?"ist":"hat"} ${v.participle}`)}</div>}
      {v.preterite&&<><h4>Präteritum</h4><div className="verb-person-grid">{v.preterite.map((form,index)=><div key={index}>{say(`${["ich","du","er","wir","ihr","sie"][index]} ${form}`)}</div>)}</div></>}
      <p>{v.tip}</p>
    </>;
  };
  return <article className={`lesson-concept${compact?" course-pattern-preview":""}`} id={entry.key} data-course-pattern={entry.key}><div>
    {compact&&<p className="study-eyebrow">Lesson {entry.lesson} · {entry.kind==="grammar"?"Grammar":entry.kind==="verbs"?"Verb":"Phrase"}</p>}
    {entry.kind==="grammar"?<h3>{entry.value.title}</h3>:entry.kind==="verbs"?<h3 lang="de">{de} <small>{meaning}</small></h3>:null}
    {(entry.kind!=="verbs"||compact)&&say(de)}
    {entry.kind!=="verbs"&&<p>{meaning}</p>}
    {compact&&entry.kind!=="phrases"?<details open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}><summary>{entry.kind==="verbs"?"Conjugation & usage":"Examples"}</summary>{expanded&&detail()}</details>:detail()}
    <SaveButton item={{id:entry.key,title:de,meaning:entry.kind==="verbs"?`${meaning}. ${entry.value.forms.join(" · ")}`:meaning,kind:entry.kind==="phrases"?"phrase":"concept",lesson:entry.lesson,studyTags:coursePatternTags(entry),href,...(entry.kind==="phrases"?{audio:speech[de]??null}:{})}}/>
    {compact&&<div className="study-row"><Link href={`${returnableLesson}#${entry.kind}`}>Learn in Lesson {entry.lesson} →</Link><Link href={`${returnableLesson}#practice`}>Practise →</Link></div>}
    {entry.value.source&&<small>{entry.value.source}</small>}
  </div></article>;
}
