import { Suspense } from "react";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { GameSelector } from "@/components/games/GameSelector";
import { PracticeSelectorWithNav } from "@/components/games/PracticeNavViews";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Practice",
  "Short practice rounds built from your lessons, with instant feedback on every answer.",
);

export default function PracticeIndexPage() {
  return (
    <ShellLayout current="practice">
      <Suspense fallback={<GameSelector />}>
        <PracticeSelectorWithNav />
      </Suspense>
    </ShellLayout>
  );
}
