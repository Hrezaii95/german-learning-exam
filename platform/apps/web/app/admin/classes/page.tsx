import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminClasses } from "@/components/admin/AdminClasses";
export const metadata = { title: "Admin · Classes", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminClasses /></Suspense></ShellLayout>; }
