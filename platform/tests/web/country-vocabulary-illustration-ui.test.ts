import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {afterEach,describe,expect,it,vi} from "vitest";
import {CountryVocabularyIllustration} from "../../apps/web/components/study/CountryVocabularyIllustration";
import {countries,countryName} from "../../apps/web/lib/study/countries";
import {countryForVocabularyIllustration,geographyIconPath} from "../../apps/web/lib/study/geography-illustrations";

afterEach(()=>vi.unstubAllEnvs());

describe("country and geography infographic illustrations",()=>{
  it("keeps all registered flags accurate inside the same fine-line drawing frame",()=>{
    for(const country of countries){
      const markup=renderToStaticMarkup(createElement(CountryVocabularyIllustration,{id:country.id}));
      expect(markup).toContain(`data-country-illustration="${country.id}"`);
      expect(markup).toContain('viewBox="0 0 100 100"');
      expect(markup).toContain('stroke="currentColor" stroke-width="2.6"');
      expect(markup).toContain('opacity=".055"');
      expect(markup).toContain(`/flags/${country.id.toLowerCase()}.svg`);
      expect(markup).not.toContain("<text");
      const flag=readFileSync(resolve("apps/web/public/flags",`${country.id.toLowerCase()}.svg`),"utf8");
      expect(flag).toContain("<svg");
      expect(flag).toMatch(/<(?:path|rect|circle|polygon)\b/u);
    }
  });

  it("uses the Pages base for the flag image without changing the shared country-page flag",()=>{
    vi.stubEnv("NEXT_PUBLIC_GL_PAGES_BASE_PATH","/german-learning-exam");
    const markup=renderToStaticMarkup(createElement(CountryVocabularyIllustration,{id:"IR"}));
    expect(markup).toContain('href="/german-learning-exam/flags/ir.svg"');
    expect(renderToStaticMarkup(createElement(CountryVocabularyIllustration,{id:"unknown"}))).toBe("");
  });

  it("recognizes exact country names and their bare country-row variants without substring guesses",()=>{
    for(const country of countries){
      expect(countryForVocabularyIllustration(countryName(country),"Country")?.id).toBe(country.id);
      expect(countryForVocabularyIllustration(country.name,"Country")?.id).toBe(country.id);
    }
    expect(countryForVocabularyIllustration("Iran","Noun")).toBeUndefined();
    expect(countryForVocabularyIllustration("Schweiz","Language")).toBeUndefined();
    expect(countryForVocabularyIllustration("Schweizer Käse","Country")).toBeUndefined();
    expect(countryForVocabularyIllustration("Iranisch","Country")).toBeUndefined();
    expect(countryForVocabularyIllustration("  der   Iran ","Country")?.id).toBe("IR");
  });

  it("gives all eight source directions a distinct compass needle",()=>{
    const directions=["der Norden","der Nordosten","der Osten","der Südosten","der Süden","der Südwesten","der Westen","der Nordwesten"];
    const paths=directions.map(direction=>geographyIconPath(direction));
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(8);
    expect(geographyIconPath("der Norden")).toContain("M50 73V27");
    expect(geographyIconPath("der Süden")).toContain("M50 27v46");
    expect(geographyIconPath("der Osten")).toContain("M27 50h46");
    expect(geographyIconPath("der Westen")).toContain("M73 50H27");
  });

  it("distinguishes a tropical island and continent focus drawings with no monogram fallback",()=>{
    const words=["die Insel","Europa","Asien","Nordamerika","der Kontinent"];
    const paths=words.map(word=>geographyIconPath(word));
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(words.length);
    expect(geographyIconPath("constructor")).toBeUndefined();
    expect(geographyIconPath("das Inselhotel")).toBeUndefined();
  });
});
