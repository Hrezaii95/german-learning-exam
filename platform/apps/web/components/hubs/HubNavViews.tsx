"use client";

import { useSearchParams } from "next/navigation";
import type { LearnerHubDefinition } from "@/lib/content/hub-types";
import { searchParamsToRecord } from "@/lib/content/search-params-record";
import { HubListView } from "./HubViews";

/**
 * Client boundary for hub filters: reads `q`/`lesson`/`category` via
 * useSearchParams so the server page stays static-export compatible.
 */
export function HubListViewWithParams({ hub }: { hub: LearnerHubDefinition }) {
  const params = useSearchParams();
  return <HubListView hub={hub} searchParams={searchParamsToRecord(params)} />;
}
