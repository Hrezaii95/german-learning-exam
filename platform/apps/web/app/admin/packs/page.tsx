import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminPacks } from "@/components/admin/AdminPacks";
export const metadata = { title: "Admin · Packs", description: "Your German learning account and class workspace." };
export default function Page() { return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><AdminPacks /></Suspense></ShellLayout>; }
