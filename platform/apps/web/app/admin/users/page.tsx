import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminUsers } from "@/components/admin/AdminUsers";
export const metadata = { title: "Admin · Users", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminUsers /></Suspense></ShellLayout>; }
