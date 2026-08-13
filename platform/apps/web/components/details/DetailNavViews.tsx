"use client";

import { useSearchParams } from "next/navigation";
import type { LearnerDetailRecord } from "@/lib/content/detail-types";
import { parseNavigationContextParam } from "@/lib/content/navigation-context";
import { DetailView } from "@/components/details/DetailViews";

/** Client boundary so detail pages stay SSG-compatible (nav via useSearchParams). */
export function DetailViewWithNav({ detail }: { detail: LearnerDetailRecord }) {
  const searchParams = useSearchParams();
  const navigation = parseNavigationContextParam(searchParams.get("nav"));
  return <DetailView detail={detail} navigation={navigation} />;
}
