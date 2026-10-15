import {describe,expect,it} from "vitest";
import {refinedIllustrationPath} from "../../apps/web/lib/study/refined-illustrations";

describe("refined vocabulary meaning illustrations",()=>{
  it("distinguishes stations, boarding platforms and railway tracks",()=>{
    const paths=["der Bahnhof","der Bahnsteig","das Gleis"].map(refinedIllustrationPath);
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(3);
    expect(refinedIllustrationPath("der Hauptbahnhof")).toBe(paths[0]);
  });
  it("draws the specific work setting or tool for the audited professions",()=>{
    const pairs=[["der Architekt","die Architektin"],["der Journalist","die Journalistin"],["der Schriftsteller","die Schriftstellerin"],["der Sekretär","die Sekretärin"],["der Kassierer","die Kassiererin"],["der Müller","die Müllerin"]];
    const paths=pairs.map(([male,female])=>{
      expect(refinedIllustrationPath(male!)).toBe(refinedIllustrationPath(female!));
      return refinedIllustrationPath(male!);
    });
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(pairs.length);
    expect(refinedIllustrationPath("der Kursraum")).toBe(refinedIllustrationPath("der Unterricht"));
    expect(refinedIllustrationPath("das Restaurant")).toBeTruthy();
  });
  it("uses different relationship cues for parents, siblings, children, elders and spouses",()=>{
    const meanings=["die Mutter","die Großmutter","die Schwester","die Tochter","die Ehefrau","die Frau","die Eltern"];
    const paths=meanings.map(refinedIllustrationPath);
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(meanings.length);
    expect(refinedIllustrationPath("der Bruder")).toBe(refinedIllustrationPath("die Schwester"));
    expect(refinedIllustrationPath("der Enkel")).toBe(refinedIllustrationPath("die Enkelin"));
    expect(refinedIllustrationPath("der Vater")).toBe(refinedIllustrationPath("die Mutter"));
  });
  it("shows one elder for singular grandparents and a pair only for plural grandparents",()=>{
    const elder=refinedIllustrationPath("die Oma");
    expect(elder).toBeTruthy();
    for(const word of ["der Opa","die Großmutter","der Großvater"]){
      expect(refinedIllustrationPath(word)).toBe(elder);
    }
    expect(refinedIllustrationPath("die Großeltern")).not.toBe(elder);
  });
  it("keeps exact matching without stealing unrelated compounds or names",()=>{
    expect(refinedIllustrationPath("  der   Müller ")).toBeTruthy();
    for(const word of ["Müller","der Restaurantkritiker","das Gleisbeispiel","constructor","der Autor"]){
      expect(refinedIllustrationPath(word)).toBeUndefined();
    }
  });
});
