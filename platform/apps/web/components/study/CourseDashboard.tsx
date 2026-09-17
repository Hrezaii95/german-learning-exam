"use client";
import Link from "next/link";
import {courseChapters} from "@/lib/study/lesson-four";
import {tagsForLesson} from "@/lib/study/scope";
import {savedStudyTags} from "@/lib/study/saved-tags";
import {useStudyScope} from "./StudyScope";
import {useStudy} from "./StudyProvider";
export function CourseDashboard(){
  const {matches}=useStudyScope();const study=useStudy();
  const chapters=courseChapters.filter(c=>matches(tagsForLesson(c.number)));
  const saved=Object.values(study?.state.saved??{}).filter(i=>matches(savedStudyTags(i,study?.dictionary)));
  return <section className="course-dashboard"><div className="study-section-heading"><div><h2>Your selected lessons</h2><p>{chapters.length} lessons · {saved.length} saved review items</p></div><Link className="study-primary" href="/saved">Review your saved items →</Link></div><div className="card-grid">{chapters.map(c=>{const pages=[...Array.from({length:4},(_,i)=>`coursebook-${c.kb+i}`),...Array.from({length:4},(_,i)=>`workbook-${c.ab+i}`)];const done=pages.filter(id=>study?.state.completedPages.includes(id)).length;return <article className="panel" key={c.number} data-dashboard-lesson={c.number}><p className="study-eyebrow">Lesson {c.number}</p><h3 lang="de">{c.title}</h3><p>{c.topic}</p>{study?.ready&&<progress value={done} max={8} aria-label={`Lesson ${c.number} book pages studied`}/>}<p>{study?.ready?`${done} / 8 lesson pages marked studied`:"Loading book progress…"}</p><div className="study-row"><Link href={`/lessons/${String(c.number).padStart(2,"0")}`}>Study lesson →</Link><Link href={`/book?page=coursebook-${c.kb}`}>Read book</Link></div></article>;})}</div>{!chapters.length&&<p>No lessons match these filters. Teacher extras are available in Vocabulary and My review.</p>}</section>;
}
