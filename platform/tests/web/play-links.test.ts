import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
import {decodeScope,encodeScope,type PlayScope} from "../../apps/web/lib/wortwerk/links";
import {defaultStudyScope,matchesPlayScope,type ScopedBookItem,type StudyScope,type StudySource} from "../../apps/web/lib/study/scope";
import {A1_PLAY_CATALOGUE_SOURCE,A1_PLAY_ITEMS,A1_PLAY_PACK_ID} from "../../apps/web/lib/study/play-catalogue.generated";
import {cardPathsPlaySelection,familyPlaySelection,sheetPlaySelection,vocabularyPlaySelection,wordFamilyPlaySelection,wordPlaySelection,type PlaySelection} from "../../apps/web/lib/study/play-links";
import {sheetDestinations} from "../../apps/web/lib/study/sheet-navigation";

type PackItem=ScopedBookItem&{sourceRef:NonNullable<ScopedBookItem["sourceRef"]>&{cardId:string;href:string}};
const raw=readFileSync(resolve("..",A1_PLAY_CATALOGUE_SOURCE.path));
const actual=JSON.parse(raw.toString("utf8")) as PackItem[];
function decoded(selection:PlaySelection):PlayScope{
  if(selection.href===null)throw new Error(selection.reason);
  const url=new URL(selection.href,"https://example.test");
  expect(url.pathname).toBe("/play/run");
  expect(url.searchParams.get("pack")).toBe(A1_PLAY_PACK_ID);
  const scope=decodeScope(url.searchParams.get("scope")!);
  expect(scope).toEqual(selection.scope);
  const matched=actual.filter(item=>matchesPlayScope(item,scope)).map(item=>item.id);
  expect(matched.length).toBeGreaterThan(0);
  expect(matched).toHaveLength(selection.itemCount);
  if(scope.items)expect(new Set(matched)).toEqual(new Set(scope.items));
  return scope;
}

describe("Lane 1 practice-link scopes",()=>{
  it("keeps its compact metadata aligned with the actual pack identities, tags and source-specific lessons",()=>{
    expect(createHash("sha256").update(raw).digest("hex")).toBe(A1_PLAY_CATALOGUE_SOURCE.sha256);
    expect(actual).toHaveLength(A1_PLAY_CATALOGUE_SOURCE.items);
    const expected=actual.map(item=>{
      const sources=item.sourceRef.sources;
      return {id:item.id,cardId:item.sourceRef.cardId,cardPath:item.sourceRef.href,tags:item.tags,source:item.source,bookRef:item.bookRef,
        sourceRef:{lessons:item.sourceRef.lessons,sources,sourceLessons:Object.fromEntries(sources.map(source=>[source,item.sourceRef.sourceLessons?.[source as StudySource]??item.sourceRef.lessons]))}};
    });
    expect(A1_PLAY_ITEMS).toEqual(expected);
  });

  it.each(sheetDestinations)("encodes a nonempty applicable default for $id",destination=>{
    const scope=decoded(sheetPlaySelection(destination.id,defaultStudyScope()));
    if(destination.kind!=="vocabulary")expect(actual.filter(item=>matchesPlayScope(item,scope)).every(item=>item.tags.includes(destination.subject))).toBe(true);
    expect(scope.lessons).toBeUndefined();
  });

  it("intersects workshop identity with active OR-tag filters rather than widening their union",()=>{
    const selected:StudyScope={...defaultStudyScope(),mode:"multiple",lessons:[11,12],concepts:["verbs"],source:"course"};
    const scope=decoded(sheetPlaySelection("past",selected));
    expect(scope.tags).toEqual(["verbs"]);
    for(const item of actual.filter(item=>matchesPlayScope(item,scope))){expect(item.tags).toContain("past");expect(item.tags).toContain("verbs");}
    expect(sheetPlaySelection("food",{...selected,lessons:[2]}).href).toBeNull();
  });

  it("uses sourceRef membership and lessons for course-primary teacher-extra rows",()=>{
    const ids=actual.filter(item=>item.sourceRef.cardId==="W126").map(item=>item.id);
    const selection=vocabularyPlaySelection({...defaultStudyScope(),mode:"multiple",lessons:[2,4],concepts:["people"],source:"teacher-extra"},ids);
    const scope=decoded(selection);
    expect(scope.sources).toEqual(["teacher-extra"]);
    expect(scope.lessons).toEqual([2,4]);
    expect(scope.items).toEqual(ids);
    expect(actual.filter(item=>ids.includes(item.id)).every(item=>item.source==="course")).toBe(true);
  });

  it("retains exact narrowed row/family/path sets and rejects aliases instead of guessing IDs",()=>{
    const row=actual.find(item=>item.sourceRef.cardId==="W126")!;
    expect(decoded(vocabularyPlaySelection(defaultStudyScope(),[row.id])).items).toEqual([row.id]);
    expect(decoded(familyPlaySelection(defaultStudyScope(),[row.sourceRef.cardId])).items).toEqual(actual.filter(item=>item.sourceRef.cardId===row.sourceRef.cardId).map(item=>item.id));
    expect(decoded(cardPathsPlaySelection(defaultStudyScope(),[[row.sourceRef.href]])).items).toEqual(actual.filter(item=>item.sourceRef.href===row.sourceRef.href).map(item=>item.id));
    expect(cardPathsPlaySelection(defaultStudyScope(),[["/vocabulary/not-a-real-family?nav=old"]]).href).toBeNull();
    expect(wordPlaySelection("W126").href).toBeNull();
  });

  it("represents dictionary-only country extras by their authored path and active source",()=>{
    const item=actual.find(item=>item.sourceRef.href==="/cheat-sheets/countries#country-BR")!;
    expect(item).toBeTruthy();
    const scope=decoded(cardPathsPlaySelection({...defaultStudyScope(),source:"study-extra"},[[item.sourceRef.href]]));
    expect(scope.items).toEqual([item.id]);expect(scope.sources).toEqual(["study-extra"]);
  });

  it("qualifies partial mapping without treating a country's unused alternative path as a missing entry",()=>{
    const item=actual[0]!;
    const families=familyPlaySelection(defaultStudyScope(),[item.sourceRef.cardId,"missing-family"]);
    decoded(families);expect(families.unavailableItemCount).toBe(1);
    const countries=cardPathsPlaySelection(defaultStudyScope(),[[item.sourceRef.href,"/unused-alternative"],["/missing-country"]]);
    decoded(countries);expect(countries.unavailableItemCount).toBe(1);
    expect(cardPathsPlaySelection(defaultStudyScope(),[[item.sourceRef.href,"/unused-alternative"]]).unavailableItemCount).toBe(0);
  });

  it("qualifies mapped rows excluded by the preserved active predicate rather than silently dropping its tags",()=>{
    const eligible=actual.find(item=>item.tags.includes("grammar"))!;
    const ineligible=actual.find(item=>!item.tags.includes("grammar"))!;
    const selection=vocabularyPlaySelection({...defaultStudyScope(),concepts:["grammar"]},[eligible.id,ineligible.id]);
    const scope=decoded(selection);
    expect(scope.tags).toEqual(["grammar"]);expect(scope.items).toEqual([eligible.id]);
    expect(selection.unavailableItemCount).toBe(1);
    expect(vocabularyPlaySelection({...defaultStudyScope(),concepts:["grammar"]},[ineligible.id]).href).toBeNull();
  });

  it("treats null, explicit empty, unknown-only and zero-lesson selections as unavailable",()=>{
    for(const selection of [vocabularyPlaySelection(null,["W126-0"]),vocabularyPlaySelection(defaultStudyScope(),null),vocabularyPlaySelection(defaultStudyScope(),[]),vocabularyPlaySelection(defaultStudyScope(),["unknown"]),vocabularyPlaySelection({...defaultStudyScope(),mode:"multiple",lessons:[]},["W126-0"]),wordFamilyPlaySelection("unknown"),wordPlaySelection("unknown"),wordPlaySelection("W126-0",null)]){
      expect(selection.href).toBeNull();expect(selection.scope).toBeNull();expect(selection.itemCount).toBe(0);
      if(selection.href===null)expect(selection.reason.length).toBeGreaterThan(0);
    }
  });

  it("does not let unrelated global or legacy Back predicates replace an explicit word choice",()=>{
    const legacy={...defaultStudyScope(),mode:"one" as const,lessons:[9],concepts:["food" as const],source:"study-extra" as const};
    const scope=decoded(wordFamilyPlaySelection("W126"));
    expect(scope.items).toEqual(actual.filter(item=>item.sourceRef.cardId==="W126").map(item=>item.id));
    expect(scope.lessons).toBeUndefined();
    expect(scope.sources).toBeUndefined();
    expect(vocabularyPlaySelection(legacy,scope.items!).href).toBeNull();
  });

  it("fits the actual complete row inventory into the game's bounded contract",()=>{
    const scope=decoded(vocabularyPlaySelection(defaultStudyScope(),actual.map(item=>item.id)));
    expect(scope.items).toBeUndefined();
    expect(actual.filter(item=>matchesPlayScope(item,scope))).toHaveLength(1330);
    expect(encodeScope(scope).length).toBeLessThan(256);
    const explicit={...scope,items:actual.map(item=>item.id)};
    expect(explicit.items.length).toBeLessThanOrEqual(2000);
    expect(encodeScope(explicit).length).toBeLessThanOrEqual(30000);
  });

  it("rejects an actual oversized explicit URL and keeps the accepted boundary exact",()=>{
    const ids=actual.map(item=>item.id);
    const active:StudyScope={...defaultStudyScope(),mode:"multiple",lessons:Array.from({length:12},(_,index)=>index+1)};
    const broad=ids.slice(0,-1);
    const oversized=vocabularyPlaySelection(active,broad);
    expect(oversized.href).toBeNull();
    expect(oversized.scope).toBeNull();
    if(oversized.href===null)expect(oversized.reason).toBe("This selection is too large for a practice link. Choose fewer words.");
    expect(broad).toEqual(ids.slice(0,-1));

    let low=1,high=broad.length-1,accepted=0;
    while(low<=high){
      const count=Math.floor((low+high)/2);
      if(vocabularyPlaySelection(active,ids.slice(0,count)).href===null)high=count-1;
      else {accepted=count;low=count+1;}
    }
    expect(accepted).toBeGreaterThan(0);
    expect(accepted).toBeLessThan(broad.length);
    const selected=ids.slice(0,accepted);
    const boundary=vocabularyPlaySelection(active,selected);
    const scope=decoded(boundary);
    expect(scope.items).toEqual(selected);
    expect(scope.lessons).toEqual(active.lessons);
    expect(boundary.itemCount).toBe(selected.length);
    expect(boundary.unavailableItemCount).toBe(0);
    if(boundary.href===null)throw new Error(boundary.reason);
    expect(Buffer.byteLength(boundary.href,"utf8")).toBeLessThanOrEqual(8000);
    expect(vocabularyPlaySelection(active,ids.slice(0,accepted+1)).href).toBeNull();
    const all=vocabularyPlaySelection(defaultStudyScope(),ids);
    expect(decoded(all).items).toBeUndefined();
    expect(all.itemCount).toBe(1330);
  });

  it("omits inactive All restrictions and preserves the real predicate's unassigned-row boundary with an explicit fixture",()=>{
    const all=decoded(vocabularyPlaySelection(defaultStudyScope(),actual.map(item=>item.id)));
    expect(all.lessons).toBeUndefined();expect(all.items).toBeUndefined();
    // Current A1 rows all have lessons; this fixture protects the future boundary.
    const original=actual[0]!;
    const unassigned:PackItem={...original,id:"unassigned-contract-fixture",sourceRef:{...original.sourceRef,lessons:[],sourceLessons:Object.fromEntries(original.sourceRef.sources.map(source=>[source,[]]))}};
    expect(matchesPlayScope(unassigned,all)).toBe(true);
    expect(matchesPlayScope(unassigned,{...all,lessons:[1]})).toBe(false);
    const through=decoded(vocabularyPlaySelection({...defaultStudyScope(),mode:"through",lessons:[2]},actual.map(item=>item.id)));
    expect(through.lessons).toEqual([1,2]);
  });
});
