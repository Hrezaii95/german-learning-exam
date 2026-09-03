import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { WordFamilyCard } from "@/components/word-cards/WordFamilyCard";
import { WordCardBackLink } from "@/components/word-cards/WordCardBackLink";
import { BackLink } from "@/components/nav/BackLink";
import { loadWordCards, wordCardForPath } from "@/lib/content/word-cards";
import { DetailLearningControls } from "@/components/learner-state/DetailLearningControls";
import { tryDecodeEntityRouteSegment } from "@/lib/content/path-utils";
import styles from "@/components/word-cards/word-cards.module.css";

type PageProps = { params: Promise<{ entityId: string }> };
export const dynamicParams = true;
export function generateStaticParams() {
  return loadWordCards().cards.flatMap(card => [card.path, ...card.aliases.filter(p => p.startsWith("/vocabulary/"))]).map(path => ({ entityId: path.split("/").at(-1)! }));
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityId } = await params;
  const card = wordCardForPath(`/vocabulary/${entityId}`);
  return card ? { title: `${card.title} · Vocabulary`, description: card.rows.map(r => r.singular.text).join(" / "), alternates: { canonical: card.path } } : {};
}
export default async function VocabularyDetailPage({ params }: PageProps) {
  const { entityId } = await params;
  const card = wordCardForPath(`/vocabulary/${entityId}`);
  if (!card) notFound();
  const oldPath = card.aliases.find(p => p.startsWith("/vocabulary/id-"));
  const requestedLearningId = tryDecodeEntityRouteSegment(entityId);
  const learningId = requestedLearningId?.startsWith("lex:") ? requestedLearningId : oldPath ? tryDecodeEntityRouteSegment(oldPath.split("/").at(-1)!) : null;
  return <ShellLayout current="vocabulary"><div className="stack"><Suspense fallback={<BackLink href="/vocabulary" />}><WordCardBackLink /></Suspense><div className={styles.detailFrame}><WordFamilyCard key={card.id} card={card} /></div>{learningId && <DetailLearningControls key={learningId} contentId={learningId} />}</div></ShellLayout>;
}
