"use client";
import { LArticle, LDetails, LDiv, LH2, LH3, LP, LSection, LSummary } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
import {courseChapters} from "@/lib/study/lesson-four";
import {tagsForLesson} from "@/lib/study/scope";
import {savedStudyTags} from "@/lib/study/saved-tags";
import {useStudyScope} from "./StudyScope";
import {useStudy} from "./StudyProvider";
export function CourseDashboard(){
  const {matches}=useStudyScope();const study=useStudy();
  const chapters=courseChapters.filter(c=>matches(tagsForLesson(c.number)));
  const saved=Object.values(study?.state.saved??{}).filter(i=>matches(savedStudyTags(i,study?.dictionary)));
  return <LSection className="course-dashboard" aria-labelledby="course-map-heading">
    <LDiv className="study-section-heading"><LDiv><LH2 id="course-map-heading">Your selected lessons</LH2><LP>{chapters.length} lessons · {saved.length} saved review items</LP></LDiv></LDiv>
    <LDiv className="course-map">{chapters.map(chapter=>{
      const pages=[...Array.from({length:4},(_,i)=>`coursebook-${chapter.kb+i}`),...Array.from({length:4},(_,i)=>`workbook-${chapter.ab+i}`)];
      const done=pages.filter(id=>study?.state.completedPages.includes(id)).length;
      const current=study?.state.lastLesson===chapter.number;
      return <LArticle className="course-map-card" key={chapter.number} data-dashboard-lesson={chapter.number} data-current={current||undefined}>
        <LP className="study-eyebrow">Lesson {chapter.number}{current?" · Last visited":""}</LP>
        <LH3><Link lang="de" href={`/lessons/${String(chapter.number).padStart(2,"0")}`}>{chapter.title}</Link></LH3>
        <LP>{chapter.topic}</LP>
        <LDetails><LSummary>Book progress{study?.ready?` · ${done}/8 pages`:""}</LSummary>
          <LP>{study?.ready?`${done} of 8 pages marked studied. This records reading, not a tested skill.`:"Loading book progress…"}</LP>
          <Link href={`/book?page=coursebook-${chapter.kb}`}>Read Lesson {chapter.number} in the book →</Link>
        </LDetails>
      </LArticle>;
    })}</LDiv>
    {!chapters.length&&<LP>No lessons match these filters. Teacher extras are available in Vocabulary and My review.</LP>}
  </LSection>;
}
