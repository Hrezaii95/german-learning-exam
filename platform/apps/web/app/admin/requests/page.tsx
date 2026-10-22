import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminDataRequests } from "@/components/admin/AdminDataRequests";
export const metadata = { title: "Admin · Requests", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminDataRequests /></Suspense></ShellLayout>; }
