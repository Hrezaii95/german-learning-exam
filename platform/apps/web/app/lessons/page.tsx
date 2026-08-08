import { ShellLayout } from "@/components/shell/ShellLayout";
import { LessonBrowser } from "@/components/lessons/ActivityAndBrowser";
import { loadLearnerProjection } from "@/lib/content/access";

export default function LessonsPage() {
  const projection = loadLearnerProjection();
  return (
    <ShellLayout current="lessons">
      <LessonBrowser lessons={projection.lessons} />
    </ShellLayout>
  );
}
