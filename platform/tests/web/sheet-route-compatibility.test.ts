import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { countries } from "../../apps/web/lib/study/countries";
import {
  COUNTRIES_SHEET_PATH, VOCABULARY_SHEET_PATH, canonicalSheetPath, countryIdFromSheetHref,
  countrySheetHref, isLegacyCountryHash, legacyCountryRedirectHref, legacyCountryRedirectScript,
  sheetRedirectHref, sheetRedirectScript,
} from "../../apps/web/lib/study/sheet-routes";
import { savedCountry } from "../../apps/web/lib/study/sheet-recall";
import { savedStudyTags } from "../../apps/web/lib/study/saved-tags";
import { countryStudyTags } from "../../apps/web/lib/study/sheet-scope";

describe("static sheet URL compatibility", () => {
  const search = "?q=B%C3%BCcher&tags=&q=second+word&view=plurals";
  const hash = "#sheet-card-l9-ketchup%3A1";

  it.each(["", "/german-learning-exam"])("keeps exact query and fragment with base %s", base => {
    const expected = `${base}${VOCABULARY_SHEET_PATH}/${search}${hash}`;
    expect(sheetRedirectHref(VOCABULARY_SHEET_PATH, search, hash, base)).toBe(expected);
    const replace = vi.fn();
    runInNewContext(sheetRedirectScript(VOCABULARY_SHEET_PATH, base), {
      window: { location: { search, hash, replace } },
    });
    expect(replace).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("accepts actual old country rows and sections, leaving ordinary directory anchors alone", () => {
    for (const country of countries) {
      const hash = `#country-${country.id}`;
      expect(isLegacyCountryHash(hash)).toBe(true);
      expect(legacyCountryRedirectHref(search, hash)).toBe(`${COUNTRIES_SHEET_PATH}/${search}${hash}`);
      expect(countryIdFromSheetHref(`/cheat-sheets/?saved=1${hash}`)).toBe(country.id);
      expect(countryIdFromSheetHref(`${COUNTRIES_SHEET_PATH}/?saved=1${hash}`)).toBe(country.id);
    }
    for (const hash of ["#country-overview", "#country-patterns", "#country-passport", "#country-index", "#country-practice", "#languages-title"]) {
      const replace = vi.fn();
      runInNewContext(legacyCountryRedirectScript("/german-learning-exam"), { window: { location: { pathname: "/german-learning-exam/cheat-sheets/", search, hash, replace }, addEventListener: vi.fn() } });
      expect(replace).toHaveBeenCalledExactlyOnceWith(`/german-learning-exam${COUNTRIES_SHEET_PATH}/${search}${hash}`);
    }
    for (const hash of ["", "#subjects", "#vocabulary", "#country-UNKNOWN", "#country-DE-more", "#country-%ZZ"]) {
      expect(legacyCountryRedirectHref(search, hash)).toBeNull();
      const replace = vi.fn();
      runInNewContext(legacyCountryRedirectScript(), { window: { location: { pathname: "/cheat-sheets/", search, hash, replace }, addEventListener: vi.fn() } });
      expect(replace).not.toHaveBeenCalled();
    }
  });

  it.each(["", "/german-learning-exam"])("handles same-document country hash changes without hydration with base %s", base => {
    const pathname = `${base}/cheat-sheets/`;
    const location = { pathname, search, hash: "#subjects", replace: vi.fn() };
    const listeners = new Map<string, () => void>();
    runInNewContext(legacyCountryRedirectScript(base), {
      window: {
        location,
        addEventListener: (event: string, listener: () => void) => listeners.set(event, listener),
      },
    });
    expect(location.replace).not.toHaveBeenCalled();
    const hashChange = listeners.get("hashchange");
    expect(hashChange).toBeTypeOf("function");

    for (const hash of ["#vocabulary", "#country-UNKNOWN", "#country-DE-more", "#country-%ZZ"]) {
      location.hash = hash;
      hashChange!();
      expect(location.replace).not.toHaveBeenCalled();
    }
    for (const hash of ["#country%2DDE", "#country-passport"]) {
      location.hash = hash;
      hashChange!();
      expect(location.replace).toHaveBeenLastCalledWith(`${base}${COUNTRIES_SHEET_PATH}/${search}${hash}`);
    }
    expect(location.replace).toHaveBeenCalledTimes(2);
    location.replace.mockClear();
    location.hash = "#country-DE";
    for (const path of [`${base}/lessons/04/`, `${base}${COUNTRIES_SHEET_PATH}/`, "/other/cheat-sheets/"]) {
      location.pathname = path;
      hashChange!();
      expect(location.replace).not.toHaveBeenCalled();
    }
    location.pathname = pathname.slice(0, -1);
    hashChange!();
    expect(location.replace).toHaveBeenCalledExactlyOnceWith(`${base}${COUNTRIES_SHEET_PATH}/${search}#country-DE`);
  });

  it("emits canonical country hrefs without changing saved identities or source tags", () => {
    for (const country of countries) {
      const saved = savedCountry(country);
      expect(saved.id).toBe(`country-${country.id}`);
      expect(saved.href).toBe(countrySheetHref(country.id));
      const { studyTags: _, ...untagged } = saved;
      expect(savedStudyTags(untagged)).toEqual(countryStudyTags(country));
      expect(savedStudyTags({ ...untagged, href: `/cheat-sheets#country-${country.id}` })).toEqual(saved.studyTags);
    }
    expect(canonicalSheetPath("/cheat-sheets/plurals")).toBe(VOCABULARY_SHEET_PATH);
    expect(canonicalSheetPath("/cheat-sheets/subjects")).toBe("/cheat-sheets");
    expect(canonicalSheetPath("/cheat-sheets", "country-DE")).toBe(COUNTRIES_SHEET_PATH);
    expect(canonicalSheetPath("/cheat-sheets")).toBe("/cheat-sheets");
  });

  it("rejects redirect targets outside app-relative pathname syntax", () => {
    for (const target of ["https://evil.example", "//evil.example", "/../outside", "/cheat-sheets?q=x", "/cheat-sheets#anchor", "/<script>"]) {
      expect(() => sheetRedirectHref(target)).toThrow();
    }
  });
});
