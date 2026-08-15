import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { LessonBrowser } from "@/components/lessons/ActivityAndBrowser";
import { loadLearnerProjection } from "@/lib/content/access";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Lessons",
  "Every lesson in order, with the activities inside each one and how far you have got.",
);

export default function LessonsPage() {
  const projection = loadLearnerProjection();
  return (
    <ShellLayout current="lessons">
      <LessonBrowser lessons={projection.lessons} />
    </ShellLayout>
  );
}
