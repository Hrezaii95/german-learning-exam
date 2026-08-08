import Link from "next/link";
import { ShellLayout } from "@/components/shell/ShellLayout";

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
