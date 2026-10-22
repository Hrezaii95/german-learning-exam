"use client";

import { useEffect } from "react";
import { pagesBasePath } from "@/lib/content/pages-base-path";
import { hubRedirectHref, type HubRedirectDefaults } from "@/lib/content/hub-redirects";

export function HubRedirectClient({ href, defaults, professionReturn }: { href: string; defaults: HubRedirectDefaults; professionReturn: boolean }) {
  useEffect(() => {
    const redirect = () => {
      const { pathname, search, hash } = window.location;
      const target = hubRedirectHref(href, search, hash, pagesBasePath(), defaults, professionReturn);
      if (`${pathname}${search}${hash}` !== target) window.location.replace(target);
    };
    redirect();
    window.addEventListener("hashchange", redirect);
    return () => window.removeEventListener("hashchange", redirect);
  }, [href, defaults, professionReturn]);
  return null;
}
