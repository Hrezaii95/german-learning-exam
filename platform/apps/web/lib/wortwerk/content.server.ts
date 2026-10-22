import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackItem } from "../../../../packages/content/src/types/packs.js";
import { assertContentPack, validateDifficultyProfile } from "../../../../packages/content/src/validation/packs.js";
import { assertPackResource } from "../../../../packages/content/src/validation/pack-resources.js";
import { loadPackRegistry, packFile } from "../../../../packages/wortwerk/src/loader.server.js";
export type PlayPack = {pack:ContentPack;language:LanguageProfile;difficulty:DifficultyProfile;fixture:boolean;resources:Partial<Record<"story"|"exam",Record<string,unknown>>>};
export type WortwerkContent = {packs:PlayPack[];languages?:LanguageProfile[];difficulties?:DifficultyProfile[]};
const json=(path:string):unknown=>JSON.parse(readFileSync(path,"utf8")) as unknown;
function platformRoot():string{
 for(const candidate of [resolve(process.cwd()),resolve(process.cwd(),"../.."),resolve(process.cwd(),"..")])
  if(existsSync(join(candidate,"content/languages")))return candidate;
 throw new Error("Cannot locate content directory");
}
/** Test media must resolve to existing source assets; no synthetic speech fallback. */
function fixtureMedia(item:PackItem,root:string):PackItem{
 const result=structuredClone(item);
 if(result.audio&&!existsSync(join(root,"apps/web/public",result.audio.src)))delete result.audio;
 if(result.image&&!existsSync(join(root,"apps/web/public",result.image)))delete result.image;
 if(result.type==="dialogue")for(const turn of result.turns)
  if(turn.audio&&!existsSync(join(root,"apps/web/public",turn.audio.src)))delete turn.audio;
 return result;
}
export function loadWortwerkContent():WortwerkContent{
 const root=platformRoot();const registry=loadPackRegistry(join(root,"content"));
 const packs:PlayPack[]=registry.packs.map(({pack,language,difficulty,resources})=>({pack,language,difficulty,resources,fixture:false}));
 const fixtures=join(root,"tests/fixtures/packs");
 if(existsSync(fixtures))for(const entry of readdirSync(fixtures,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const directory=join(fixtures,entry.name);
  if(!entry.isDirectory()||!existsSync(join(directory,"pack.json"))||!existsSync(join(directory,"difficulty.json")))continue;
  const manifest=json(join(directory,"pack.json")) as ContentPack;
  const language=registry.languages.get(manifest.language);
  const difficulty=json(join(directory,"difficulty.json")) as DifficultyProfile;
  if(!language||validateDifficultyProfile(difficulty).length||difficulty.id!==manifest.difficulty)throw new Error("Invalid fixture profile");
  const items=(manifest.itemFiles??[]).flatMap(file=>json(packFile(directory,file)) as PackItem[]).map(item=>fixtureMedia(item,root));
  const pack={...manifest,items};assertContentPack(pack,language);
  const resources:PlayPack["resources"]={};
  for(const key of ["story","exam"] as const)if(manifest[key]){
   const resource=json(packFile(directory,manifest[key]));assertPackResource(resource,key,pack);resources[key]=resource as Record<string,unknown>;
  }
  packs.push({pack,language,difficulty,fixture:true,resources});
 }
 return {packs,languages:[...registry.languages.values()],difficulties:[...new Map([...registry.difficulties.values(),...packs.map(entry=>entry.difficulty)].map(profile=>[profile.id,profile])).values()]};
}
