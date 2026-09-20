import {describe,it,expect} from "vitest";
import {existsSync} from "node:fs";
import {resolve} from "node:path";
import {foodModels,foodModes,foodSentence,foodSaveId} from "../../apps/web/lib/study/food-sheet";
import {foodBookmark,readFoodBookmark,foodPortionCue,foodOrderChoices,foodMenuGroups} from "../../apps/web/lib/study/food-learning";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {loadCollectionSpeech,loadStudySpeech} from "../../apps/web/lib/study/catalog";

describe("food learning",()=>{
 it("restores valid builder, reply and compound settings and rejects invalid links",()=>{
  for(let food=0;food<foodModels.length;food++)for(const {id:mode} of foodModes)for(const negative of [false,true])for(const section of ["lab","replies","compounds","order"] as const){const state={food,mode,negative,speakerLikes:false,youLike:true,compound:3};expect(readFoodBookmark(foodBookmark(state,section))).toEqual({...state,section});}
  expect(readFoodBookmark("#food-lab-99-wish-0-1-1-0")).toBeNull();expect(readFoodBookmark("#food-compounds-0-wish-0-1-1-99")).toBeNull();
 });
 it("keeps the food gender distinct from a portion or piece",()=>{
  expect(foodPortionCue(6)).toMatchObject({head:"das Stück",tone:"neuter"});expect(foodModels[6]!.tone).toBe("female");
  expect(foodPortionCue(9)).toMatchObject({head:"die Portion",tone:"female"});expect(foodModels[9]!.tone).toBe("neuter");
  expect(foodPortionCue(10).head).toBe("das Stück");expect(foodPortionCue(11).head).toBe("die Portion");
 });
 it("includes every food in one useful menu group and gives exactly one correct order",()=>{
  expect(foodMenuGroups.slice(1).flatMap(group=>group.items).sort((a,b)=>a-b)).toEqual(foodModels.map((_,index)=>index));
  foodModels.forEach((_,index)=>{const choices=foodOrderChoices(index);expect(new Set(choices).size).toBe(3);expect(choices.filter(choice=>choice===foodSentence(index,"wish",false))).toHaveLength(1);});
  expect(foodSaveId(1,"wish",false)).toBe("l9-phrase-14");
 });
 it("uses the actual course noun forms and existing recorded speech",()=>{
  const cards=loadWordCards().cards,speech={...loadCollectionSpeech(),...loadStudySpeech()};
  for(const [index,food] of foodModels.entries()){
   const row=cards.flatMap(card=>card.rows).find(row=>row.singular.text===food.de);expect(row,food.de).toBeTruthy();
   for(const text of [food.de,foodSentence(index,"wish",false)]){expect(speech[text],text).toBeTruthy();expect(existsSync(resolve("apps/web/public",speech[text]!.slice(1))),text).toBe(true);}
  }
  for(const text of ["Sie wünschen?","Hier bitte.","Guten Appetit!"])expect(speech[text],text).toBeTruthy();
 });
});
