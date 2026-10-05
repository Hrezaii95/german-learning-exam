"use client";
import { LButton, LDiv, LLi, LOl, LP, LSection, LSpan, LStrong } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
import {useEffect,useState} from "react";
import {courseChapters} from "@/lib/study/lesson-four";
import {parseNavigationContextParam,resolveBackHref} from "@/lib/content/navigation-context";

export function LessonLearningPath({lesson,checkpoint,learnHref,practiceHref,onLearn,onPractice,onContinue,ready=true,section}:{lesson:number;checkpoint:string;learnHref:string;practiceHref:string;onLearn?:()=>void;onPractice?:()=>void;onContinue?:()=>void;ready?:boolean;section?:string}) {
  const chapter=courseChapters.find(chapter=>chapter.number===lesson)!;
  const [back,setBack]=useState<string|null>(null);
  useEffect(()=>{
    const context=parseNavigationContextParam(new URLSearchParams(window.location.search).get("nav"));
    if(context)setBack(resolveBackHref(context,"lesson"));
  },[]);
  return <LSection className="lesson-learning-path" aria-label={`Lesson ${lesson} learning path`}>
    {lesson>2&&back&&<Link className="study-back" href={back}>← Back to my results</Link>}
    <LOl>
      <LLi>{onLearn?<LButton type="button" disabled={!ready} onClick={onLearn}>1 · Learn</LButton>:<Link href={learnHref}>1 · Learn</Link>}<LSpan>Words, patterns & examples</LSpan></LLi>
      <LLi><Link href={`/listening?lesson=${lesson}`}>2 · Listen</Link><LSpan>Original audio & transcripts</LSpan></LLi>
      <LLi>{onPractice?<LButton type="button" disabled={!ready} onClick={onPractice}>3 · Practise</LButton>:<Link href={practiceHref}>3 · Practise</Link>}<LSpan>Recall, answer & check</LSpan></LLi>
    </LOl>
    <LDiv className="study-row"><Link href={`/book?page=coursebook-${chapter.kb}`}>Coursebook</Link><Link href={`/book?page=workbook-${chapter.ab}`}>Workbook</Link>{onContinue&&<LButton className="study-secondary" type="button" disabled={!ready} onClick={onContinue}>Continue {section??"learning"} →</LButton>}</LDiv>
    <LP className="lesson-checkpoint"><LStrong>Your checkpoint:</LStrong> {checkpoint} Reading and saved items are separate from checked practice.</LP>
  </LSection>;
}
