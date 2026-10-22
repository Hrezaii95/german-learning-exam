import { describe,it,expect } from "vitest";
import { decodeScope,encodeScope,playHref,parsePlayScope } from "../../apps/web/lib/wortwerk/links";
import { matchesPlayScope,type ScopedBookItem } from "../../apps/web/lib/study/scope";
describe("Wortwerk shared scope links",()=>{
 it("round trips unicode and combined filters without an origin or base path",()=>{
  const scope={v:1 as const,book:"Überall",upTo:{lesson:5,page:62},lessons:[2,4],tags:["Äpfel"],sources:["course" as const],skills:["meaning"],items:["w-1"],count:20};
  expect(decodeScope(encodeScope(scope))).toEqual(scope);
  expect(playHref(scope,{assignment:"a&b"})).toContain("assignment=a%26b");
  expect(playHref(scope)).toMatch(/^\/play\/run\?scope=/);
 });
 it("ignores unknown fields, accepts old links and asks to update for future links",()=>{
  expect(parsePlayScope({v:0,tags:["x"],unknown:true})).toEqual({v:1,tags:["x"]});
  expect(()=>parsePlayScope({v:2})).toThrow("Please update");
  for(const value of ["!","_","eyJ2IjoyfQ"])expect(()=>decodeScope(value)).toThrow();
  expect(()=>parsePlayScope({v:1,count:0})).toThrow();
  expect(()=>parsePlayScope({v:1,sources:["other"]})).toThrow();
 });
 it("preserves empty item and lesson selections and unknown current pages",()=>{
  const item:ScopedBookItem={id:"x",bookRef:{book:"book",lesson:1,page:10},tags:[],source:"course"};
  expect(matchesPlayScope(item,{v:1,lessons:[]})).toBe(false);
  expect(matchesPlayScope(item,{v:1,items:[]})).toBe(false);
  expect(matchesPlayScope(item,{v:1,upTo:{lesson:1}})).toBe(false);
 });
 it("uses the page rule and source-specific lesson intersections",()=>{
  const item:ScopedBookItem={id:"x",bookRef:{book:"book",lesson:3,page:20},tags:["food"],source:"teacher-extra"};
  expect(matchesPlayScope(item,{v:1,book:"book",upTo:{lesson:3,page:20},lessons:[3],tags:["food"],sources:["teacher-extra"]})).toBe(true);
  expect(matchesPlayScope({...item,bookRef:{book:"book",lesson:3,page:21}},{v:1,upTo:{lesson:3,page:20}})).toBe(false);
  const noPage={...item,bookRef:{book:"book",lesson:3}};
  expect(matchesPlayScope(noPage,{v:1,upTo:{lesson:3,page:20}})).toBe(false);
  expect(matchesPlayScope(noPage,{v:1,upTo:{lesson:3,page:20}},{lessonDone:true})).toBe(true);
  expect(matchesPlayScope({...item,bookRef:{book:"book",lesson:2}},{v:1,upTo:{lesson:3,page:20}})).toBe(true);
 });
});
