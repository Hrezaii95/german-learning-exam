import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { loadExtraProfessionsProjection } from "@/lib/content/extra-professions";
import { wordCardForPath } from "@/lib/content/word-cards";
import { StaticHubRedirect } from "@/components/hubs/StaticHubRedirect";

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
      <StaticHubRedirect href={card.path} label={card.title} professionReturn/>
    </ShellLayout>
  );
}
