import { ShellLayout } from "@/components/shell/ShellLayout";
import { LoginView } from "@/components/account/LoginView";
export const metadata = { title: "Sign in", description: "Sign in to sync your German learning progress across devices." };
export default function LoginPage() { return <ShellLayout current={null}><LoginView /></ShellLayout>; }
