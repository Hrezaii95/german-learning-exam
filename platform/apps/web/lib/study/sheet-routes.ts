import { countries } from "./countries";

export const SHEET_DIRECTORY_PATH = "/cheat-sheets";
export const COUNTRIES_SHEET_PATH = "/cheat-sheets/countries";
export const VOCABULARY_SHEET_PATH = "/cheat-sheets/vocabulary";
export const LEGACY_VOCABULARY_SHEET_PATH = "/cheat-sheets/plurals";
export const LEGACY_SUBJECT_DIRECTORY_PATH = "/cheat-sheets/subjects";

const LEGACY_COUNTRY_ANCHORS = [
  "country-overview", "country-patterns", "country-passport", "country-index", "country-practice",
  "country-overview-title", "patterns-title", "passport-title", "languages-title", "index-title", "practice-title",
  ...countries.map(country => `country-${country.id}`),
];
const legacyCountryAnchors = new Set(LEGACY_COUNTRY_ANCHORS);

export function countrySheetHref(id: string): string {
  return `${COUNTRIES_SHEET_PATH}#country-${id}`;
}

/** Saved items in older backups may still carry the original root pathname. */
export function countryIdFromSheetHref(href: string): string | undefined {
  if (!href.startsWith("/") || href.startsWith("//")) return undefined;
  try {
    const url = new URL(href, "https://sheet.invalid");
    const path = url.pathname.replace(/\/$/, "");
    if (path !== SHEET_DIRECTORY_PATH && path !== COUNTRIES_SHEET_PATH) return undefined;
    const anchor = decodeURIComponent(url.hash.slice(1));
    return countries.find(country => anchor === `country-${country.id}`)?.id;
  } catch {
    return undefined;
  }
}

/** Old country links are distinguished from ordinary directory visits by their anchor. */
export function isLegacyCountryHash(hash: string): boolean {
  if (!hash.startsWith("#")) return false;
  try {
    return legacyCountryAnchors.has(decodeURIComponent(hash.slice(1)));
  } catch {
    return false;
  }
}

/** Resolve old encoded Back contexts without requiring a visit to a redirect page. */
export function canonicalSheetPath(path: string, resultId?: string): string {
  if (path === LEGACY_VOCABULARY_SHEET_PATH) return VOCABULARY_SHEET_PATH;
  if (path === LEGACY_SUBJECT_DIRECTORY_PATH) return SHEET_DIRECTORY_PATH;
  if (path === SHEET_DIRECTORY_PATH && resultId && isLegacyCountryHash(`#${resultId}`)) return COUNTRIES_SHEET_PATH;
  return path;
}

/** Prefix only the pathname; preserve the browser's original query and fragment byte for byte. */
export function sheetRedirectHref(href: string, search = "", hash = "", basePath = ""): string {
  if (!/^\/(?!\/)[\w/-]*$/.test(href) || href.split("/").some(part => part === "." || part === "..")) {
    throw new Error("A sheet redirect requires an app-relative pathname.");
  }
  const base = basePath.replace(/\/+$/, "");
  if (base && !/^\/(?!\/)[\w/-]+$/.test(base)) throw new Error("Invalid sheet redirect base path.");
  if ((search && !search.startsWith("?")) || (hash && !hash.startsWith("#"))) throw new Error("Invalid sheet redirect suffix.");
  const path = href === "/" ? "/" : `${href.replace(/\/+$/, "")}/`;
  return `${base}${path}${search}${hash}`;
}

export function legacyCountryRedirectHref(search: string, hash: string, basePath = ""): string | null {
  return isLegacyCountryHash(hash) ? sheetRedirectHref(COUNTRIES_SHEET_PATH, search, hash, basePath) : null;
}

function scriptJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Missing sheet redirect script value.");
  return encoded.replace(/</g, "\\u003c");
}

/** Parser-time scripts run before hydration, including on an offline static export. */
export function sheetRedirectScript(href: string, basePath = ""): string {
  const target = scriptJson(sheetRedirectHref(href, "", "", basePath));
  return `window.location.replace(${target}+window.location.search+window.location.hash);`;
}

export function legacyCountryRedirectScript(basePath = ""): string {
  const target = scriptJson(sheetRedirectHref(COUNTRIES_SHEET_PATH, "", "", basePath));
  const pathname = scriptJson(sheetRedirectHref(SHEET_DIRECTORY_PATH, "", "", basePath).slice(0, -1));
  return `(()=>{const pathname=${pathname},redirect=()=>{const current=window.location.pathname;if(current!==pathname&&current!==pathname+"/")return;let anchor;try{anchor=decodeURIComponent(window.location.hash.slice(1));}catch{return;}if(${scriptJson(LEGACY_COUNTRY_ANCHORS)}.includes(anchor)){window.location.replace(${target}+window.location.search+window.location.hash);}};window.addEventListener("hashchange",redirect);redirect();})();`;
}
