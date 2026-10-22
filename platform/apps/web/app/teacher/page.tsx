import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { TeacherHome } from "@/components/teacher/TeacherHome";
export const metadata = { title: "Teacher", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><TeacherHome /></Suspense></ShellLayout>; }
