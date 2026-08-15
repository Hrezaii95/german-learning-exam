import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { SettingsView } from "@/components/learner-state/SettingsView";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Settings & data",
  "Choose your timezone and audio speed, and export, import or clear the learning data held in this browser.",
);

export default function SettingsPage() {
  return <ShellLayout current="settings"><SettingsView /></ShellLayout>;
}
