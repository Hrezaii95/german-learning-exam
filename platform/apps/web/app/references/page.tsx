import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReferencesView } from "@/components/content/ReferencesView";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "References",
  "Where the course material, audio and images come from, and the credits that go with them.",
);

export default function ReferencesPage() {
  return (
    <ShellLayout current="references">
      <ReferencesView />
    </ShellLayout>
  );
}
