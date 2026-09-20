import {describe,it,expect} from "vitest";
import {objectModels,colourSwatches} from "../../apps/web/lib/study/object-sheet";
import {officeModels,officeSentence} from "../../apps/web/lib/study/office-sheet";
import {defaultObjectSettings,objectBookmark,readObjectBookmark,objectDescription,objectMaterials,objectShapes,objectTeachingSpeech,officeBookmark,readOfficeBookmark,officeRoles} from "../../apps/web/lib/study/object-learning";
import {wordRecallQuestions} from "../../apps/web/lib/study/sheet-recall";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {loadCollectionSpeech,loadStudySpeech,loadDictionary} from "../../apps/web/lib/study/catalog";
import {officePhoneSpeech} from "../../apps/web/lib/study/object-learning";
import {existsSync} from "node:fs";
import {resolve} from "node:path";
describe("same-object descriptions",()=>{
  it("restores valid choices and rejects unknown or contradictory saved settings",()=>{
    for(let index=0;index<objectModels.length;index++)for(const shape of objectShapes[index]!)for(const negative of [true,false])for(const material of objectMaterials[index]!){const state={...defaultObjectSettings(index),shape,negative,material};expect(readObjectBookmark(objectBookmark(state))).toEqual(state);}
    for(const hash of ["#object-0-1-0-braun-Holz-plain","#object-99-0-1-braun-Holz-plain","#object-1-0-2-blau-Metall-plain","#object-1-0-2-blau-Papier-rund","#object-0-0-1-red-Holz-plain","#object-%ZZ"])expect(readObjectBookmark(hash)).toBeNull();
  });
  it("negates a different guess while keeping the pictured object's correct name",()=>{
    for(let index=0;index<objectModels.length;index++){const state={...defaultObjectSettings(index),negative:true},lines=objectDescription(state);expect(lines[0]!.de).not.toContain(objectModels[index]!.noun);expect(lines[1]!.de).toBe(`Das ist ${objectModels[index]!.indefinite} ${objectModels[index]!.noun}.`);}
  });
  it("keeps material, colour and optional shape speech complete",()=>{
    for(let index=0;index<objectModels.length;index++)for(const colour of colourSwatches)for(const shape of objectShapes[index]!){for(const line of objectDescription({...defaultObjectSettings(index),colour:colour[0],shape}))expect(objectTeachingSpeech).toContain(line.de);}
  });
});
describe("lesson sheet card recall",()=>{
 it("resolves exact description and phone clips, with extra shape words labelled honestly",()=>{
  const speech={...loadCollectionSpeech(),...loadStudySpeech()};
  for(const text of [...objectTeachingSpeech,...officePhoneSpeech]){expect(speech[text],text).toBeTruthy();expect(existsSync(resolve("apps/web/public",speech[text]!.slice(1))),text).toBe(true);}
  const shape=loadDictionary().find(entry=>entry.de==="Sie ist eckig.");expect(shape?.studyTags?.source).toBe("study-extra");expect(shape?.audio).toBe(speech["Sie ist eckig."]);
 });
 it("uses only selected card identities and retains meaningful answer feedback",()=>{
  const all=loadWordCards().cards,selected=all.filter(card=>card.studyTags?.lessons.includes(6)).slice(0,3),questions=wordRecallQuestions(selected,all);
  expect(questions).toHaveLength(3);expect(wordRecallQuestions([],all)).toEqual([]);
  for(const question of questions){expect(selected.some(card=>question.item.id===`card-${card.id}`)).toBe(true);expect(question.answerText).toBeTruthy();expect(question.options).toContain(question.answers[0]);}
 });
});
describe("office sentence roles",()=>{
  it("preserves all four modes, genders, negatives and plural patterns",()=>{
    for(let index=0;index<officeModels.length;index++)for(const mode of ["identify","have","need","find"] as const)for(const negative of [true,false])for(const plural of [true,false]){const state={index,mode,negative,plural};expect(readOfficeBookmark(officeBookmark(state))).toEqual(state);const roles=officeRoles(state);expect(`${roles.subject} ${roles.verb} ${roles.object}`).toBe(officeSentence(index,mode,negative,plural));expect(roles.caseLabel).toContain(mode==="identify"?"Nominative":"Accusative");}
    expect(readOfficeBookmark("#office-999-need-0-0")).toBeNull();expect(readOfficeBookmark("#office-0-eat-0-0")).toBeNull();
  });
});
