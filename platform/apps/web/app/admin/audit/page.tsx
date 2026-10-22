import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminAudit } from "@/components/admin/AdminAudit";
export const metadata = { title: "Admin · Audit", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminAudit /></Suspense></ShellLayout>; }
