import { ShellLayout } from "@/components/shell/ShellLayout";
import { AdminOverview } from "@/components/admin/AdminOverview";
export const metadata = { title: "System health" };
export default function Page() { return <ShellLayout current={null}><AdminOverview system /></ShellLayout>; }
