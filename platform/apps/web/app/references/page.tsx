import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReferencesView } from "@/components/content/ReferencesView";

export default function ReferencesPage() {
  return (
    <ShellLayout current="references">
      <ReferencesView />
    </ShellLayout>
  );
}
