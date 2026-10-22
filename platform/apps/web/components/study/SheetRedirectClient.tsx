"use client";

import { useEffect } from "react";
import { pagesBasePath } from "@/lib/content/pages-base-path";
import { legacyCountryRedirectHref, sheetRedirectHref } from "@/lib/study/sheet-routes";

/** Client navigation does not execute parser-time scripts; cover that transition too. */
export function SheetRedirectClient({ href }: { href?: string }) {
  useEffect(() => {
    const redirect = () => {
      const { pathname, search, hash } = window.location;
      const target = href
        ? sheetRedirectHref(href, search, hash, pagesBasePath())
        : legacyCountryRedirectHref(search, hash, pagesBasePath());
      if (target && `${pathname}${search}${hash}` !== target) window.location.replace(target);
    };
    redirect();
    window.addEventListener("hashchange", redirect);
    return () => window.removeEventListener("hashchange", redirect);
  }, [href]);
  return null;
}
