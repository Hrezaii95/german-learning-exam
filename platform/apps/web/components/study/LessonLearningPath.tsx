"use client";
import Link from "next/link";
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
  return <section className="lesson-learning-path" aria-label={`Lesson ${lesson} learning path`}>
    {lesson>2&&back&&<Link className="study-back" href={back}>← Back to my results</Link>}
    <ol>
      <li>{onLearn?<button type="button" disabled={!ready} onClick={onLearn}>1 · Learn</button>:<Link href={learnHref}>1 · Learn</Link>}<span>Words, patterns & examples</span></li>
      <li><Link href={`/listening?lesson=${lesson}`}>2 · Listen</Link><span>Original audio & transcripts</span></li>
      <li>{onPractice?<button type="button" disabled={!ready} onClick={onPractice}>3 · Practise</button>:<Link href={practiceHref}>3 · Practise</Link>}<span>Recall, answer & check</span></li>
    </ol>
    <div className="study-row"><Link href={`/book?page=coursebook-${chapter.kb}`}>Coursebook</Link><Link href={`/book?page=workbook-${chapter.ab}`}>Workbook</Link>{onContinue&&<button className="study-secondary" type="button" disabled={!ready} onClick={onContinue}>Continue {section??"learning"} →</button>}</div>
    <p className="lesson-checkpoint"><strong>Your checkpoint:</strong> {checkpoint} Reading and saved items are separate from checked practice.</p>
  </section>;
}
