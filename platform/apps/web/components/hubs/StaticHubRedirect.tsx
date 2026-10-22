import { Icon } from "@/components/media/Icon";
import { pagesBasePath } from "@/lib/content/pages-base-path";
import { hubRedirectHref, hubRedirectScript, type HubRedirectDefaults } from "@/lib/content/hub-redirects";
import { HubRedirectClient } from "./HubRedirectClient";

/** Share the sheet pathname helper, adding absent defaults for retired study areas. */
export function StaticHubRedirect({ href, label, defaults = {}, professionReturn = false }: { href: string; label: string; defaults?: HubRedirectDefaults; professionReturn?: boolean }) {
  const canonical = hubRedirectHref(href, "", "", pagesBasePath(), defaults);
  const target = hubRedirectHref(href, "", "", pagesBasePath(), defaults, professionReturn);
  const refresh = target.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return <>
    <link rel="canonical" href={canonical}/>
    <script dangerouslySetInnerHTML={{ __html: hubRedirectScript(href, pagesBasePath(), defaults, professionReturn) }}/>
    <noscript dangerouslySetInnerHTML={{ __html: `<meta http-equiv="refresh" content="0;url=${refresh}">` }}/>
    <p>This study area has moved. <a href={target}>Open {label} <Icon name="arrow"/></a></p>
    <HubRedirectClient href={href} defaults={defaults} professionReturn={professionReturn}/>
  </>;
}
