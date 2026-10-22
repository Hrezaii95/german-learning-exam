import { ShellLayout } from "@/components/shell/ShellLayout";
import { AccountView } from "@/components/account/AccountView";
export const metadata = { title: "Your account", description: "Manage your password, synced devices and personal learning data." };
export default function AccountPage() { return <ShellLayout current={null}><AccountView /></ShellLayout>; }
