import { describe,expect,it } from "vitest";
import {readFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {countries,countryName,countryFrom,countryWhere,countryTo,spokenLanguage,languageMeanings,countryOriginMeaning} from "../../apps/web/lib/study/countries";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
const country=(id:string)=>countries.find(c=>c.id===id)!;
describe("country cheat sheet",()=>{
  it("includes every existing country card plus the additional book mentions",()=>{
    expect(countries).toHaveLength(41);
    expect(countries.filter(c=>!c.extra)).toHaveLength(28);
    expect(new Set(countries.map(c=>c.id)).size).toBe(41);
    for(const card of loadWordCards().cards.filter(c=>c.category==="Country")) expect(countries.some(c=>card.rows.some(r=>r.singular.text===countryName(c))),card.id).toBe(true);
    const hits=JSON.parse(readFileSync(resolve("../research/country-cheatsheet/source-country-hits.json"),"utf8")) as Record<string,unknown>;
    for(const name of Object.keys(hits)) expect(countries.some(c=>c.name===name),name).toBe(true);
  });
  it("keeps gender and dative articles distinct",()=>{
    expect(country("CH").group).toBe("female");expect(countryFrom(country("CH"))).toBe("aus der Schweiz");
    expect(country("IR").group).toBe("male");expect(countryFrom(country("IR"))).toBe("aus dem Iran");
    expect(country("DE").group).toBe("neuter");expect(countryFrom(country("DE"))).toBe("aus Deutschland");
    expect(countryFrom(country("US"))).toBe("aus den USA");
  });
  it("handles plural country endings without guessing from -en",()=>{
    expect(countryFrom(country("NL"))).toBe("aus den Niederlanden");
    expect(countryWhere(country("NL"))).toBe("in den Niederlanden");
    expect(countryTo(country("NL"))).toBe("in die Niederlande");
    expect(countryFrom(country("MV"))).toBe("aus den Malediven");
    for(const id of ["PL","SE","IT"])expect(country(id).group).toBe("neuter");
  });
  it("teaches both accepted Iran constructions",()=>{
    expect(country("IR").note).toContain("aus dem Iran");expect(country("IR").note).toContain("aus Iran");
    expect(countryWhere(country("IR"))).toBe("im Iran");expect(countryTo(country("IR"))).toBe("in den Iran");
  });
  it("separates countries from languages and includes multilingual examples",()=>{
    expect(country("IR").languages).toContain("Persisch (Farsi)");expect(country("AT").languages).toEqual(["Deutsch"]);
    expect(country("BR").languages).toEqual(["Portugiesisch"]);expect(country("CH").languages).toHaveLength(4);
    for(const c of countries)for(const language of c.languages)expect(languageMeanings[spokenLanguage(language)],language).toBeTruthy();
    expect(languageMeanings.Russisch).toBe("Russian");
    expect(countryOriginMeaning(country("US"))).toBe("I come from the United States.");
  });
  it("provides an exact audio asset for every displayed country sentence and language",()=>{
    const mapping=JSON.parse(readFileSync(resolve("apps/web/generated/country-speech.json"),"utf8")) as Record<string,string>;
    const texts=JSON.parse(readFileSync(resolve("apps/web/generated/country-speech-texts.json"),"utf8")) as string[];
    expect(texts.length).toBeGreaterThan(200);
    for(const text of texts){expect(mapping[text],text).toMatch(/^\/(book\/speech|audio)\//);expect(statSync(resolve("apps/web/public",mapping[text]!.slice(1))).size).toBeGreaterThan(1000);}
  });
});
