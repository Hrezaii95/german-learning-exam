import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AssignmentResults } from "@/components/teacher/AssignmentResults";
export const metadata = { title: "Teacher · Assignment", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AssignmentResults /></Suspense></ShellLayout>; }
