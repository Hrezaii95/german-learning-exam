import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../../../packages/content/src/types/packs.js";
import type { LearningCapability,RunTask } from "../../../../packages/learning/src/wortwerk/index.js";
import { GRAMMAR_LISTENING_TEMPLATES } from "../../../../packages/wortwerk/src/templates/grammar-listening.js";
import { CORNERS_TEMPLATES } from "../../../../packages/wortwerk/src/templates/corners.js";
import { seededRng } from "../../../../packages/wortwerk/src/random.js";
import type { GeneratedTask,TaskTemplate } from "../../../../packages/wortwerk/src/tasks.js";
import { matchesPlayScope,type PlayScope } from "../study/scope";
export const PLAY_TEMPLATES:readonly TaskTemplate[]=[...new Map([...CORNERS_TEMPLATES,...GRAMMAR_LISTENING_TEMPLATES].map(template=>[template.id,template])).values()];
export function playableCapabilities(pack:ContentPack,language:LanguageProfile,difficulty:DifficultyProfile,scope:PlayScope={v:1}):LearningCapability[]{
 return pack.items.filter(item=>matchesPlayScope(item,scope)).flatMap(item=>{
  const templates=PLAY_TEMPLATES.filter(template=>(!scope.skills?.length||scope.skills.includes(template.skill)||scope.skills.includes(template.dimension))
    &&template.requires(item)&&template.generate(item,pack,language,difficulty,seededRng(`${item.id}:${template.id}:eligibility`))!==null);
  return templates.length?[{packId:pack.id,itemId:item.id,dimensions:[...new Set(templates.map(template=>template.dimension))],templates:templates.map(({id,dimension,skill,format})=>({id,dimension,skill,format}))}]:[];
 });
}
export function materializeTask(task:RunTask,pack:ContentPack,language:LanguageProfile,difficulty:DifficultyProfile,seed:string):GeneratedTask|null{
 const item=pack.items.find(item=>item.id===task.itemId);
 const template=PLAY_TEMPLATES.find(template=>template.id===task.templateId);
 return item&&template?template.generate(item,pack,language,difficulty,seededRng(seed)):null;
}
export function templateFor(id:string):TaskTemplate|undefined{return PLAY_TEMPLATES.find(template=>template.id===id);}
