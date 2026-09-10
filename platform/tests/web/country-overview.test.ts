import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {countries} from "../../apps/web/lib/study/countries";
import geography from "../../apps/web/generated/country-map.json";
describe("country flags and map overview",()=>{
  it("maps exactly the selected 41 names",()=>{expect(geography.countries.map(c=>c.id).sort()).toEqual(countries.map(c=>c.id).sort());expect(new Set(geography.countries.map(c=>c.id)).size).toBe(41);});
  it("keeps England distinct within Great Britain",()=>{const england=geography.countries.find(c=>c.id==="GB-ENG")!;const britain=geography.countries.find(c=>c.id==="GB")!;expect(britain.path).toContain(england.path);expect(britain.path.length).toBeGreaterThan(england.path.length);expect(britain.center).not.toEqual(england.center);});
  it("adds discoverable markers for tiny countries",()=>{for(const id of ["SG","LI","MV","AD","MC","MU"])expect(geography.countries.find(c=>c.id===id)?.marker,id).toBe(true);});
  it("keeps every country label within the overview map",()=>{for(const c of geography.countries){expect(c.path).toMatch(/^M/);expect(c.center[0]).toBeGreaterThanOrEqual(0);expect(c.center[0]).toBeLessThanOrEqual(1000);expect(c.center[1]).toBeGreaterThanOrEqual(0);expect(c.center[1]).toBeLessThanOrEqual(410);}});
  it("ships a verified self-hosted SVG flag for every country",()=>{const manifest=JSON.parse(readFileSync(resolve("../research/country-map/flag-manifest.json"),"utf8")) as {assets:{country:string;path:string;sha256:string}[]};expect(manifest.assets).toHaveLength(41);for(const c of countries){const asset=manifest.assets.find(a=>a.country===c.id)!;const bytes=readFileSync(resolve("apps/web/public",asset.path));expect(bytes.toString()).toContain('<svg');expect(bytes.toString()).not.toContain('<script');expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);}});
});
