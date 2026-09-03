"use client";

import { useSearchParams } from "next/navigation";
import { BackLink } from "@/components/nav/BackLink";
import { parseNavigationContextParam, resolveBackHref } from "@/lib/content/navigation-context";

/** Preserve the original hub/search filters when returning from a new card. */
export function WordCardBackLink() {
  const params = useSearchParams();
  const navigation = parseNavigationContextParam(params.get("nav"));
  return <BackLink href={navigation ? resolveBackHref(navigation, "hub") : "/vocabulary"} />;
}
