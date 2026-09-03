import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { WordFamilyCard } from "@/components/word-cards/WordFamilyCard";
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
  const cards = loadWordCards().cards;
  const index = cards.findIndex(c => c.id === card.id);
  const oldPath = card.aliases.find(p => p.startsWith("/vocabulary/id-"));
  const requestedLearningId = tryDecodeEntityRouteSegment(entityId);
  const learningId = requestedLearningId?.startsWith("lex:") ? requestedLearningId : oldPath ? tryDecodeEntityRouteSegment(oldPath.split("/").at(-1)!) : null;
  return <ShellLayout current="vocabulary"><div className={styles.detailFrame}><nav className={styles.cardNavigation} aria-label="Vocabulary cards"><Link href="/vocabulary">← All vocabulary</Link>{index > 0 && <Link href={cards[index - 1]!.path} prefetch={false}>Previous family</Link>}{index < cards.length - 1 && <Link href={cards[index + 1]!.path} prefetch={false}>Next family →</Link>}</nav><WordFamilyCard key={card.id} card={card} /></div>{learningId && <DetailLearningControls key={learningId} contentId={learningId} />}</ShellLayout>;
}
