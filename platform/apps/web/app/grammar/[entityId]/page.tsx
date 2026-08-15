import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { DetailView } from "@/components/details/DetailViews";
import { DetailViewWithNav } from "@/components/details/DetailNavViews";
import { loadLearnerDetailProjection } from "@/lib/content/access";
import {
  detailHubForId,
  encodeDetailRouteSegment,
} from "@/lib/content/detail-types";
import { detailPageMetadata } from "@/lib/content/page-metadata";
import { tryDecodeEntityRouteSegment } from "@/lib/content/path-utils";

type PageProps = {
  params: Promise<{ entityId: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return loadLearnerDetailProjection().details
    .filter((item) => item.hubSegment === "grammar")
    .map((item) => ({ entityId: encodeDetailRouteSegment(item.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityId: entitySegment } = await params;
  const entityId = tryDecodeEntityRouteSegment(entitySegment);
  const detail =
    entityId == null
      ? null
      : (loadLearnerDetailProjection().detailsById[entityId] ?? null);
  return detail && detail.hubSegment === "grammar" ? detailPageMetadata(detail) : {};
}

export default async function GrammarDetailPage({ params }: PageProps) {
  const { entityId: entitySegment } = await params;
  const details = loadLearnerDetailProjection();
  const entityId = tryDecodeEntityRouteSegment(entitySegment);
  if (entityId == null || detailHubForId(entityId) !== "grammar") notFound();
  const detail = details.detailsById[entityId];
  if (!detail || detail.kind !== "GrammarConcept" || detail.hubSegment !== "grammar") {
    notFound();
  }

  return (
    <ShellLayout current="grammar">
      <Suspense fallback={<DetailView detail={detail} />}>
        <DetailViewWithNav detail={detail} />
      </Suspense>
    </ShellLayout>
  );
}
