import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { DetailView } from "@/components/details/DetailViews";
import { DetailViewWithNav } from "@/components/details/DetailNavViews";
import {
  loadLearnerDetailProjection,
} from "@/lib/content/access";
import {
  detailHubForId,
  encodeDetailRouteSegment,
} from "@/lib/content/detail-types";
import { tryDecodeEntityRouteSegment } from "@/lib/content/path-utils";

type PageProps = {
  params: Promise<{ entityId: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  const details = loadLearnerDetailProjection();
  return details.details
    .filter((item) => item.hubSegment === "vocabulary")
    .map((item) => ({
      entityId: encodeDetailRouteSegment(item.id),
    }));
}

export default async function VocabularyDetailPage({ params }: PageProps) {
  const { entityId: entitySegment } = await params;
  const details = loadLearnerDetailProjection();
  const entityId = tryDecodeEntityRouteSegment(entitySegment);
  if (entityId == null || detailHubForId(entityId) !== "vocabulary") {
    notFound();
  }
  const detail = details.detailsById[entityId];
  if (!detail || detail.kind !== "Lexeme" || detail.hubSegment !== "vocabulary") notFound();

  return (
    <ShellLayout current="vocabulary">
      <Suspense fallback={<DetailView detail={detail} />}>
        <DetailViewWithNav detail={detail} />
      </Suspense>
    </ShellLayout>
  );
}
