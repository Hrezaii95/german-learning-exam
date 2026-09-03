import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { loadExtraProfessionsProjection } from "@/lib/content/extra-professions";
import Link from "next/link";
import { WordFamilyCard } from "@/components/word-cards/WordFamilyCard";
import { wordCardForPath } from "@/lib/content/word-cards";
import styles from "@/components/word-cards/word-cards.module.css";

type PageProps = {
  params: Promise<{ sourceRow: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return loadExtraProfessionsProjection().rows.map((row) => ({
    sourceRow: row.routeSegment,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sourceRow } = await params;
  const row = loadExtraProfessionsProjection().rowsBySegment[sourceRow];
  if (!row) return {};
  return {
    title: `${row.meaningEn} · Optional professions`,
    description: `Source-backed masculine and feminine forms from professions row ${row.sourceRow}.`,
  };
}

export default async function ExtraProfessionDetailPage({ params }: PageProps) {
  const { sourceRow } = await params;
  const row = loadExtraProfessionsProjection().rowsBySegment[sourceRow];
  if (!row) notFound();
  const card = wordCardForPath(row.detailPath);
  if (!card) notFound();

  return (
    <ShellLayout current="vocabulary">
      <div className={styles.detailFrame}><nav className={styles.cardNavigation} aria-label="Vocabulary cards"><Link href="/collections/professions">← Teacher jobs</Link><Link href="/vocabulary">All vocabulary</Link></nav><WordFamilyCard key={card.id} card={card} /></div>
    </ShellLayout>
  );
}
