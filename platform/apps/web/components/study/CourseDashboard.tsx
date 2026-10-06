"use client";

import {
  LArticle, LDetails, LDiv, LH3, LP, LSpan, LSummary,
} from "@/components/i18n/LocalizedElements";
import Link from "@/components/i18n/LocalizedLink";
import { courseChapters } from "@/lib/study/lesson-four";
import { tagsForLesson } from "@/lib/study/scope";
import { useStudyScope } from "./StudyScope";
import { useStudy } from "./StudyProvider";

export function CourseDashboard() {
  const { matches } = useStudyScope();
  const study = useStudy();
  const chapters = courseChapters.filter(chapter => matches(tagsForLesson(chapter.number)));

  return (
    <LDetails className="course-dashboard dashboard-progress">
      <LSummary>Browse A1 lessons</LSummary>
      <LP className="dense">Book reading is tracked separately from checked practice.</LP>
      <LDiv className="stack">
        {chapters.map(chapter => {
          const pages = [
            ...Array.from({ length: 4 }, (_, index) => `coursebook-${chapter.kb + index}`),
            ...Array.from({ length: 4 }, (_, index) => `workbook-${chapter.ab + index}`),
          ];
          const done = pages.filter(id => study?.state.completedPages.includes(id)).length;
          const current = study?.state.lastLesson === chapter.number;
          return (
            <LArticle className="course-map-card" key={chapter.number} data-dashboard-lesson={chapter.number} data-current={current || undefined}>
              <LP className="study-eyebrow"><LSpan>Lesson {chapter.number}</LSpan>{current && <> · <LSpan>Last visited</LSpan></>}</LP>
              <LH3><Link lang="de" href={`/lessons/${String(chapter.number).padStart(2, "0")}`}>{chapter.title}</Link></LH3>
              <LP>{chapter.topic}</LP>
              {study?.ready ? <LP><LSpan>Pages marked studied</LSpan>: {done} / {pages.length}</LP> : <LP>Loading book progress…</LP>}
              <Link href={`/book?page=coursebook-${chapter.kb}`}>Read Lesson {chapter.number} in the book →</Link>
            </LArticle>
          );
        })}
      </LDiv>
      {!chapters.length && <LP>No lessons match these filters. Teacher extras are available in Vocabulary and My review.</LP>}
    </LDetails>
  );
}
