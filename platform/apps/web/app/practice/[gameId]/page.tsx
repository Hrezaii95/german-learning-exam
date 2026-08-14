import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { GameRenderer } from "@/components/games/GameRenderer";
import { PracticeGameWithNav } from "@/components/games/PracticeNavViews";
import {
  isPracticeGameId,
  PRACTICE_GAME_IDS,
  practiceCanonicalPath,
  type PracticeGameId,
} from "@/lib/games";
import {
  loadLearnerDetailProjection,
  loadLearnerProjection,
} from "@/lib/content/access";
import { resolveLearnerRoute } from "@/lib/content/routes";

type PageProps = {
  params: Promise<{ gameId: string }>;
};

export const dynamicParams = false; /* pages-export temporary */

export function generateStaticParams() {
  return PRACTICE_GAME_IDS.map((gameId) => ({ gameId }));
}

export default async function PracticeGamePage({ params }: PageProps) {
  const { gameId: segment } = await params;
  if (!isPracticeGameId(segment)) {
    notFound();
  }
  const gameId = segment as PracticeGameId;
  const projection = loadLearnerProjection();
  const details = loadLearnerDetailProjection();
  const pathname = practiceCanonicalPath(gameId);
  const resolved = resolveLearnerRoute(pathname, projection, details);
  if (resolved.kind !== "practice" || resolved.gameId !== gameId) {
    notFound();
  }

  return (
    <ShellLayout current="practice">
      <Suspense fallback={<GameRenderer gameId={gameId} />}>
        <PracticeGameWithNav gameId={gameId} />
      </Suspense>
    </ShellLayout>
  );
}
