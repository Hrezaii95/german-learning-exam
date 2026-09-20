import {describe,expect,it} from "vitest";
import {loadExtraProfessionsProjection} from "../../apps/web/lib/content/extra-professions";
import {professionPatternIds} from "../../apps/web/app/collections/professions/profession-patterns";

describe("profession plural learning groups",()=>{
  const {rowsBySegment}=loadExtraProfessionsProjection();
  it("groups the actual source forms and preserves alternatives across groups",()=>{
    expect(professionPatternIds(rowsBySegment["13"]!)).toEqual(["same"]);
    expect(professionPatternIds(rowsBySegment["24"]!)).toEqual(["e"]);
    expect(professionPatternIds(rowsBySegment["46"]!)).toEqual(["en"]);
    expect(professionPatternIds(rowsBySegment["23"]!)).toEqual(["umlaut"]);
    expect(professionPatternIds(rowsBySegment["37"]!)).toEqual(["other"]);
    expect(professionPatternIds(rowsBySegment["39"]!)).toEqual(["same","e"]);
    expect(professionPatternIds(rowsBySegment["31"]!)).toEqual(["en","same"]);
  });
});
