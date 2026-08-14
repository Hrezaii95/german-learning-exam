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

export const dynamicParams = false; /* pages-export temporary */

export function generateStaticParams() {
  const details = loadLearnerDetailProjection();
  return details.details
    .filter((item) => item.hubSegment === "phrases")
    .map((item) => ({
      entityId: encodeDetailRouteSegment(item.id),
    }));
}

export default async function PhraseDetailPage({ params }: PageProps) {
  const { entityId: entitySegment } = await params;
  const details = loadLearnerDetailProjection();
  const entityId = tryDecodeEntityRouteSegment(entitySegment);
  if (entityId == null || detailHubForId(entityId) !== "phrases") {
    notFound();
  }
  const detail = details.detailsById[entityId];
  if (!detail || detail.kind !== "QAPair" || detail.hubSegment !== "phrases") notFound();

  return (
    <ShellLayout current="phrases">
      <Suspense fallback={<DetailView detail={detail} />}>
        <DetailViewWithNav detail={detail} />
      </Suspense>
    </ShellLayout>
  );
}
