import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminOverview } from "@/components/admin/AdminOverview";
export const metadata = { title: "Admin", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminOverview /></Suspense></ShellLayout>; }
