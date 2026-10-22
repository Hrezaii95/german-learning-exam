import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { StudentDetail } from "@/components/teacher/StudentDetail";
export const metadata = { title: "Teacher · Student", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><StudentDetail /></Suspense></ShellLayout>; }
