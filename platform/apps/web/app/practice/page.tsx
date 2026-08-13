import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { GameSelector } from "@/components/games/GameSelector";
import { PracticeSelectorWithNav } from "@/components/games/PracticeNavViews";

export default function PracticeIndexPage() {
  return (
    <ShellLayout current="practice">
      <Suspense fallback={<GameSelector />}>
        <PracticeSelectorWithNav />
      </Suspense>
    </ShellLayout>
  );
}
