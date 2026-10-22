import { Icon } from "@/components/media/Icon";
import { pagesBasePath } from "@/lib/content/pages-base-path";
import { legacyCountryRedirectScript, sheetRedirectHref, sheetRedirectScript } from "@/lib/study/sheet-routes";
import { SheetRedirectClient } from "./SheetRedirectClient";

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Static compatibility page: retain the fragment before Next can hydrate the page. */
export function StaticSheetRedirect({ href, label }: { href: string; label: string }) {
  const target = sheetRedirectHref(href, "", "", pagesBasePath());
  return <>
    <link rel="canonical" href={target}/>
    <script dangerouslySetInnerHTML={{ __html: sheetRedirectScript(href, pagesBasePath()) }}/>
    <noscript dangerouslySetInnerHTML={{ __html: `<meta http-equiv="refresh" content="0;url=${escapeAttribute(target)}">` }}/>
    <p>This cheat sheet has moved. <a href={target}>Open {label} <Icon name="arrow"/></a></p>
    <SheetRedirectClient href={href}/>
  </>;
}

/** The directory keeps ordinary visits, redirecting only recognized old country bookmarks. */
export function LegacyCountryRedirect() {
  return <>
    <script dangerouslySetInnerHTML={{ __html: legacyCountryRedirectScript(pagesBasePath()) }}/>
    <SheetRedirectClient/>
  </>;
}
