import { ShellLayout } from "@/components/shell/ShellLayout";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";

export const metadata = { title: "Cheat sheets", description: "Browse vocabulary subjects and topic workshops." };
export default function Page() {
  return <ShellLayout current="cheat-sheets"><StaticHubRedirect href="/cheat-sheets" label="Cheat sheets"/></ShellLayout>;
}
