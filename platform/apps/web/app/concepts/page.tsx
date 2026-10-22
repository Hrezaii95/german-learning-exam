import { ShellLayout } from "@/components/shell/ShellLayout";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";

export const metadata = { title: "Grammar", description: "Grammar patterns and their connected vocabulary." };
export default function Page() {
  return <ShellLayout current="grammar"><StaticHubRedirect href="/grammar" label="Grammar"/></ShellLayout>;
}
