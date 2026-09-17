import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { LessonOverview } from "@/components/lessons/ActivityAndBrowser";
import { LessonOverviewWithNav } from "@/components/lessons/LessonNavViews";
import { loadLearnerProjection } from "@/lib/content/access";
import { lessonPageMetadata } from "@/lib/content/page-metadata";
import { resolveLearnerRoute } from "@/lib/content/routes";
import { LessonFour } from "@/components/study/LessonFour";
import {CourseStudy} from "@/components/study/CourseStudy";
import {studyUnits} from "@/lib/study/course-lessons";
import {loadWordCards} from "@/lib/content/word-cards";
import { loadStudySpeech } from "@/lib/study/catalog";

type PageProps = {
  params: Promise<{ lessonSegment: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [...loadLearnerProjection().lessons.map((lesson) => ({
    lessonSegment: lesson.routeSegment,
  })), ...studyUnits.map(u=>({lessonSegment:String(u.number).padStart(2,"0")}))];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonSegment } = await params;
  if (lessonSegment === "04") return { title: "Lesson 4 · Das Bild ist so schön.", description: "Furniture, prices and opinions: learn with original audio, an interactive book and personal review." };
  if (lessonSegment === "03") return { title: "Lesson 3 · Das ist meine Schwester." };
  if (lessonSegment === "05") return {title:"Lesson 5 · Ist das ein Tisch?"};
  if (lessonSegment === "06") return {title:"Lesson 6 · Wir haben einen Termin."};
  if (lessonSegment === "12") return {title:"Lesson 12 · Im Frühling bin ich nach Hamburg gefahren."};
  if (lessonSegment === "11") return {title:"Lesson 11 · Was haben Sie gestern gemacht?"};
  if (lessonSegment === "10") return {title:"Lesson 10 · Wann kommst du denn an?"};
  if (lessonSegment === "09") return {title:"Lesson 9 · Ich mag Hamburger."};
  if (lessonSegment === "08") return {title:"Lesson 8 · Ich habe leider keine Zeit."};
  if (lessonSegment === "07") return {title:"Lesson 7 · Sie können super tanzen!"};
  const lesson = loadLearnerProjection().lessons.find(
    (item) => item.routeSegment === lessonSegment,
  );
  return lesson ? lessonPageMetadata(lesson) : {};
}

export default async function LessonPage({ params }: PageProps) {
  const { lessonSegment } = await params;
  if (lessonSegment === "04") return <ShellLayout current="lessons"><LessonFour speech={loadStudySpeech()} /></ShellLayout>;
  const unit=studyUnits.find(u=>String(u.number).padStart(2,"0")===lessonSegment);
  if (unit) return <ShellLayout current="lessons"><CourseStudy unit={unit} cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(unit.number))} speech={loadStudySpeech()}/></ShellLayout>;
  const projection = loadLearnerProjection();
  const resolved = resolveLearnerRoute(`/lessons/${lessonSegment}`, projection);
  if (resolved.kind !== "lesson") {
    notFound();
  }
  const lesson = projection.lessons.find((item) => item.id === resolved.lessonId);
  if (!lesson) {
    notFound();
  }

  const lessonActivities = projection.activities.filter(
    (activity) => activity.lessonId === lesson.id,
  );
  const prerequisiteLesson = lesson.routeSegment === "02" ? projection.lessons.find((item) => item.routeSegment === "01") : undefined;
  const prerequisiteActivities = prerequisiteLesson
    ? projection.activities.filter((activity) => activity.lessonId === prerequisiteLesson.id)
    : [];

  // Static shell: do not read searchParams on the server. Nav context is parsed
  // in a client boundary under Suspense (fallback has no inbound nav).
  return (
    <ShellLayout current="lessons">
      <Suspense
        fallback={
          <LessonOverview lesson={lesson} activities={lessonActivities} />
        }
      >
        <LessonOverviewWithNav
          lesson={lesson}
          activities={lessonActivities}
          {...(prerequisiteLesson ? { prerequisiteLesson } : {})}
          prerequisiteActivities={prerequisiteActivities}
        />
      </Suspense>
    </ShellLayout>
  );
}
