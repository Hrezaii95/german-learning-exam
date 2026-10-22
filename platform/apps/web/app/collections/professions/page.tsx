import { ShellLayout } from "@/components/shell/ShellLayout";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";
import { PROFESSIONS_REDIRECT_DEFAULTS } from "@/lib/content/hub-redirects";

export const metadata = { title: "People, family and professions", description: "Optional professions now share the People vocabulary sheet." };
export default function Page() {
  return <ShellLayout current="subjects"><StaticHubRedirect href="/cheat-sheets/subjects/people" label="People vocabulary" defaults={PROFESSIONS_REDIRECT_DEFAULTS}/></ShellLayout>;
}
