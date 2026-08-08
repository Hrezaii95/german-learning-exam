import { ShellLayout } from "@/components/shell/ShellLayout";
import { DashboardView } from "@/components/lessons/LessonViews";
import { loadLearnerProjection } from "@/lib/content/access";

export default function HomePage() {
  const projection = loadLearnerProjection();
  return (
    <ShellLayout current="dashboard">
      <DashboardView projection={projection} />
    </ShellLayout>
  );
}
