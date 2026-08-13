"use client";

import { useSearchParams } from "next/navigation";
import { parseNavigationContextParam } from "@/lib/content/navigation-context";
import { searchParamsToRecord } from "@/lib/content/search-params-record";
import type { LearnerSearchProjection } from "@/lib/content/search-types";
import { SearchView } from "./SearchViews";

/**
 * Client boundary for global search: reads `q` + `nav` via useSearchParams so
 * the server page stays static-export compatible without dropping filters or
 * back-context.
 */
export function SearchViewWithParams({
  projection,
}: {
  projection: LearnerSearchProjection;
}) {
  const params = useSearchParams();
  const record = searchParamsToRecord(params);
  const navigation = parseNavigationContextParam(params.get("nav"));
  return (
    <SearchView
      projection={projection}
      searchParams={record}
      navigation={navigation}
    />
  );
}
