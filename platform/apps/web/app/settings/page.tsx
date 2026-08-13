import { ShellLayout } from "@/components/shell/ShellLayout";
import { SettingsView } from "@/components/learner-state/SettingsView";

export default function SettingsPage() {
  return <ShellLayout current="settings"><SettingsView /></ShellLayout>;
}
