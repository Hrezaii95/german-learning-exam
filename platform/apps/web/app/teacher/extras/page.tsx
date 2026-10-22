import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { TeacherExtras } from "@/components/teacher/TeacherExtras";
export const metadata = { title: "Teacher · Extras", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><TeacherExtras /></Suspense></ShellLayout>; }
