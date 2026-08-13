"use client";

import { useSearchParams } from "next/navigation";
import { parseNavigationContextParam } from "@/lib/content/navigation-context";
import type { PracticeGameId } from "@/lib/games";
import { GameRenderer } from "./GameRenderer";
import { GameSelector } from "./GameSelector";
import { BackLink } from "@/components/nav/BackLink";
import { resolveBackHref } from "@/lib/content/navigation-context";

export function PracticeSelectorWithNav() {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  const backHref = resolveBackHref(navigation, "hub");
  const highlight = navigation?.resultId ?? null;

  return (
    <div className="stack">
      <BackLink href={backHref} />
      <GameSelector navigation={navigation} highlightConceptId={highlight} />
    </div>
  );
}

export function PracticeGameWithNav({ gameId }: { gameId: PracticeGameId }) {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  return <GameRenderer gameId={gameId} navigation={navigation} />;
}
