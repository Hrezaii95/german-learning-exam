import type { Metadata } from "next";
import Link from "next/link";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { SITE_NAME } from "@/lib/content/page-metadata";

/**
 * `not-found.tsx` sits in the root layout's own segment, so the layout's title
 * template does not reach it; `absolute` supplies the finished title directly.
 */
export const metadata: Metadata = {
  title: { absolute: `Page not found | ${SITE_NAME}` },
  description: "This address is not part of the app. Go back to your studio to keep learning.",
};

export default function NotFound() {
  return (
    <ShellLayout current={null}>
      <div className="not-found panel">
        <h1>Page not found</h1>
        <p className="muted">
          This route is not part of the Lessons 1–2 Alpha shell. Unknown lessons,
          activities, unimplemented hub details, and future surfaces do not fall
          back to the dashboard.
        </p>
        <Link className="btn btn-primary" href="/">
          Back to dashboard
        </Link>
      </div>
    </ShellLayout>
  );
}
