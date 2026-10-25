import { Suspense } from "react";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { PracticeHub, PracticeHubWithNav } from "@/components/study/PracticeHub";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Practice",
  "Recall selected words, check lesson answers, practise conversation, or continue to Play.",
);

export default function PracticeIndexPage() {
  return (
    <ShellLayout current="practice">
      <Suspense fallback={<PracticeHub />}>
        <PracticeHubWithNav />
      </Suspense>
    </ShellLayout>
  );
}
