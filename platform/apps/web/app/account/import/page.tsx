import { ShellLayout } from "@/components/shell/ShellLayout";
import { ImportProgressView } from "@/components/account/ImportProgressView";
export const metadata = { title: "Import progress", description: "Bring your German learning backup to this device and optionally sync it to your account." };
export default function ImportProgressPage() { return <ShellLayout current={null}><ImportProgressView /></ShellLayout>; }
