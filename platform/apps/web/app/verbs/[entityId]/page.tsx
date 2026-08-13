import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { DetailView } from "@/components/details/DetailViews";
import { DetailViewWithNav } from "@/components/details/DetailNavViews";
import {
  loadLearnerDetailProjection,
  loadLearnerProjection,
} from "@/lib/content/access";
import {
  DETAIL_HUB_BY_ID,
  encodeDetailRouteSegment,
  isDetailRepresentativeId,
} from "@/lib/content/detail-types";
import { tryDecodeEntityRouteSegment } from "@/lib/content/path-utils";
import { resolveLearnerRoute } from "@/lib/content/routes";

type PageProps = {
  params: Promise<{ entityId: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  const details = loadLearnerDetailProjection();
  return details.representatives
    .filter((item) => item.hubSegment === "verbs")
    .map((item) => ({
      entityId: encodeDetailRouteSegment(item.id),
    }));
}

export default async function VerbDetailPage({ params }: PageProps) {
  const { entityId: entitySegment } = await params;
  const projection = loadLearnerProjection();
  const details = loadLearnerDetailProjection();
  const entityId = tryDecodeEntityRouteSegment(entitySegment);
  if (entityId == null || !isDetailRepresentativeId(entityId)) {
    notFound();
  }
  if (DETAIL_HUB_BY_ID[entityId] !== "verbs") {
    notFound();
  }
  const pathname = `/verbs/${encodeDetailRouteSegment(entityId)}`;
  const resolved = resolveLearnerRoute(pathname, projection, details);
  if (resolved.kind !== "detail" || resolved.entityId !== entityId) {
    notFound();
  }
  const detail = details.representativesById[entityId];
  if (!detail) notFound();

  return (
    <ShellLayout current="verbs">
      <Suspense fallback={<DetailView detail={detail} />}>
        <DetailViewWithNav detail={detail} />
      </Suspense>
    </ShellLayout>
  );
}
