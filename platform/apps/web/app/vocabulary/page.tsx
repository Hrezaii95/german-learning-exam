import { ShellLayout } from "@/components/shell/ShellLayout";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";

export const metadata = { title: "All vocabulary", description: "Open the complete illustrated vocabulary catalogue." };
export default function Page() {
  return <ShellLayout current="all-vocabulary"><StaticHubRedirect href="/cheat-sheets/vocabulary" label="All vocabulary"/></ShellLayout>;
}
