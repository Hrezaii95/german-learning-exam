import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
export const metadata = { title: "Dashboard", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><StudentDashboard /></Suspense></ShellLayout>; }
