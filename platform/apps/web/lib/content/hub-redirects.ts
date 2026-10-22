import { SHEET_DIRECTORY_PATH, VOCABULARY_SHEET_PATH, sheetRedirectHref } from "../study/sheet-routes";

export const PROFESSIONS_SHEET_PATH = "/cheat-sheets/subjects/people";
export type HubRedirectDefaults = Readonly<Record<string, string>>;
export const PROFESSIONS_REDIRECT_DEFAULTS: HubRedirectDefaults = Object.freeze({ source: "teacher-extra" });
export type LegacyProfessionPattern = "same" | "e" | "en" | "umlaut" | "other";

/** Retain bounded old list state even where the new sheet has no matching control. */
export function professionReturnContext(search: string): Record<string, string | boolean | number> {
  const params = new URLSearchParams(search);
  const context: Record<string, string | boolean | number> = { entryContext: "hub", returnPath: PROFESSIONS_SHEET_PATH };
  const query = params.get("q");
  if (query) context.q = query.slice(0,120);
  const source = params.get("source");
  if (source === null) context.sheetSource = "teacher-extra";
  else if (["course","teacher-extra","study-extra"].includes(source)) context.sheetSource = source;
  const pattern = params.get("pattern");
  if (pattern && ["same","e","en","umlaut","other"].includes(pattern)) context.professionPattern = pattern;
  if (params.get("alternatives") === "1") context.professionAlternatives = true;
  const limit = Number(params.get("limit"));
  if (Number.isInteger(limit) && limit >= 6 && limit <= 48) context.professionLimit = limit;
  return context;
}

export function withProfessionReturnContext(search: string): string {
  return withMissingHubDefaults(search,{ nav: JSON.stringify(professionReturnContext(search)) });
}

const RETIRED_HUBS: Readonly<Record<string, { href: string; defaults?: HubRedirectDefaults }>> = Object.freeze({
  "/vocabulary": { href: VOCABULARY_SHEET_PATH },
  "/hubs": { href: SHEET_DIRECTORY_PATH },
  "/concepts": { href: "/grammar" },
  "/collections/professions": { href: PROFESSIONS_SHEET_PATH, defaults: PROFESSIONS_REDIRECT_DEFAULTS },
});

export function retiredHubDestination(path: string): { href: string; defaults?: HubRedirectDefaults } | undefined {
  return Object.hasOwn(RETIRED_HUBS, path) ? RETIRED_HUBS[path] : undefined;
}

export function canonicalHubPath(path: string): string {
  return retiredHubDestination(path)?.href ?? path;
}

/** Existing query bytes are untouched; only genuinely absent defaults are appended. */
export function withMissingHubDefaults(search: string, defaults: HubRedirectDefaults = {}): string {
  const params = new URLSearchParams(search);
  let result = search;
  for (const [name, value] of Object.entries(defaults)) {
    if (params.has(name)) continue;
    const encoded = new URLSearchParams({ [name]: value }).toString();
    result += result ? `${result.endsWith("?") || result.endsWith("&") ? "" : "&"}${encoded}` : `?${encoded}`;
  }
  return result;
}

export function hubRedirectHref(href: string, search = "", hash = "", basePath = "", defaults: HubRedirectDefaults = {}, professionReturn = false): string {
  const query = withMissingHubDefaults(search, defaults);
  return sheetRedirectHref(href, professionReturn ? withProfessionReturnContext(query) : query, hash, basePath);
}

export function hubRedirectScript(href: string, basePath = "", defaults: HubRedirectDefaults = {}, professionReturn = false): string {
  const target = JSON.stringify(sheetRedirectHref(href, "", "", basePath)).replace(/</g, "\\u003c");
  const values = JSON.stringify(defaults).replace(/</g, "\\u003c");
  const navigation = professionReturn ? `if(!params.has("nav")){const nav={entryContext:"hub",returnPath:${JSON.stringify(PROFESSIONS_SHEET_PATH)}};const q=params.get("q");if(q)nav.q=q.slice(0,120);const source=params.get("source");if(source===null)nav.sheetSource="teacher-extra";else if(["course","teacher-extra","study-extra"].includes(source))nav.sheetSource=source;const pattern=params.get("pattern");if(["same","e","en","umlaut","other"].includes(pattern))nav.professionPattern=pattern;if(params.get("alternatives")==="1")nav.professionAlternatives=true;const limit=Number(params.get("limit"));if(Number.isInteger(limit)&&limit>=6&&limit<=48)nav.professionLimit=limit;const encoded=new URLSearchParams({nav:JSON.stringify(nav)}).toString();search+=search?(search.endsWith("?")||search.endsWith("&")?"":"&")+encoded:"?"+encoded;}` : "";
  return `(()=>{let search=window.location.search;const params=new URLSearchParams(search);for(const [name,value] of Object.entries(${values})){if(!params.has(name)){const encoded=new URLSearchParams({[name]:value}).toString();search+=search?(search.endsWith("?")||search.endsWith("&")?"":"&")+encoded:"?"+encoded;params.set(name,value);}}${navigation}window.location.replace(${target}+search+window.location.hash);})();`;
}
