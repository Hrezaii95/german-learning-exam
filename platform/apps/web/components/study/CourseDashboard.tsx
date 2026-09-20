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
  return <section className="course-dashboard" aria-labelledby="course-map-heading">
    <div className="study-section-heading"><div><h2 id="course-map-heading">Your selected lessons</h2><p>{chapters.length} lessons · {saved.length} saved review items</p></div></div>
    <div className="course-map">{chapters.map(chapter=>{
      const pages=[...Array.from({length:4},(_,i)=>`coursebook-${chapter.kb+i}`),...Array.from({length:4},(_,i)=>`workbook-${chapter.ab+i}`)];
      const done=pages.filter(id=>study?.state.completedPages.includes(id)).length;
      const current=study?.state.lastLesson===chapter.number;
      return <article className="course-map-card" key={chapter.number} data-dashboard-lesson={chapter.number} data-current={current||undefined}>
        <p className="study-eyebrow">Lesson {chapter.number}{current?" · Last visited":""}</p>
        <h3><Link lang="de" href={`/lessons/${String(chapter.number).padStart(2,"0")}`}>{chapter.title}</Link></h3>
        <p>{chapter.topic}</p>
        <details><summary>Book progress{study?.ready?` · ${done}/8 pages`:""}</summary>
          <p>{study?.ready?`${done} of 8 pages marked studied. This records reading, not a tested skill.`:"Loading book progress…"}</p>
          <Link href={`/book?page=coursebook-${chapter.kb}`}>Read Lesson {chapter.number} in the book →</Link>
        </details>
      </article>;
    })}</div>
    {!chapters.length&&<p>No lessons match these filters. Teacher extras are available in Vocabulary and My review.</p>}
  </section>;
}
