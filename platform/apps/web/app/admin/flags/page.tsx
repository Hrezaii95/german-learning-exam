import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminFlags } from "@/components/admin/AdminFlags";
export const metadata = { title: "Admin · Flags", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminFlags /></Suspense></ShellLayout>; }
