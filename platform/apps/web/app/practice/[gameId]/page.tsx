import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";
import { pageMetadata } from "@/lib/content/page-metadata";
import {
  buildPracticeGameCatalog,
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

export const dynamicParams = true;

export function generateStaticParams() {
  return PRACTICE_GAME_IDS.map((gameId) => ({ gameId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gameId: segment } = await params;
  const game = buildPracticeGameCatalog().find((item) => item.id === segment);
  // Keep recognizable legacy metadata while the static page hands off to Play.
  return game ? pageMetadata(`${game.title} · Practice`, "This practice area has moved to Play.") : {};
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
      <StaticHubRedirect href="/play" label="Play" />
    </ShellLayout>
  );
}
