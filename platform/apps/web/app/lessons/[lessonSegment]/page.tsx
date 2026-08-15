import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { LessonOverview } from "@/components/lessons/ActivityAndBrowser";
import { LessonOverviewWithNav } from "@/components/lessons/LessonNavViews";
import { loadLearnerProjection } from "@/lib/content/access";
import { lessonPageMetadata } from "@/lib/content/page-metadata";
import { resolveLearnerRoute } from "@/lib/content/routes";

type PageProps = {
  params: Promise<{ lessonSegment: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return loadLearnerProjection().lessons.map((lesson) => ({
    lessonSegment: lesson.routeSegment,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonSegment } = await params;
  const lesson = loadLearnerProjection().lessons.find(
    (item) => item.routeSegment === lessonSegment,
  );
  return lesson ? lessonPageMetadata(lesson) : {};
}

export default async function LessonPage({ params }: PageProps) {
  const { lessonSegment } = await params;
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
