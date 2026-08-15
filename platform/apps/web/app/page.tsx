import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { DashboardView } from "@/components/lessons/LessonViews";
import { loadLearnerProjection } from "@/lib/content/access";
import { SITE_NAME } from "@/lib/content/page-metadata";

/**
 * The home page shares the root layout's route segment, so the layout's title
 * template does not apply to it (Next.js applies a template to child segments
 * only). `absolute` therefore carries the full title, which keeps this page's
 * `<title>` in the same shape as every other route regardless of that rule.
 */
export const metadata: Metadata = {
  title: { absolute: `Your learning studio | ${SITE_NAME}` },
  description:
    "Pick up where you left off: your lessons, what to review today, and a short practice round.",
};

export default function HomePage() {
  const projection = loadLearnerProjection();
  return (
    <ShellLayout current="dashboard">
      <DashboardView projection={projection} />
    </ShellLayout>
  );
}
