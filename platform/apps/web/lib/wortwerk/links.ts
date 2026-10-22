import type { PlayScope, StudySource } from "../study/scope";
export type { PlayScope } from "../study/scope";
export class ScopeLinkError extends Error {
  constructor(public readonly code:"invalid"|"update-required",message:string){super(message);this.name="ScopeLinkError";}
}
function fail():never {throw new ScopeLinkError("invalid","This practice link is invalid. Choose a scope to start again.");}
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value);}
function integer(value:unknown,max=10000):value is number{return Number.isInteger(value)&&Number(value)>0&&Number(value)<=max;}
function strings(value:unknown,max=2000):string[]{
  if(!Array.isArray(value)||value.length>max||value.some(v=>typeof v!=="string"||!v.trim()||v.length>200))return fail();
  return [...new Set(value as string[])];
}
export function parsePlayScope(value:unknown):PlayScope{
  if(!record(value))return fail();
  if(typeof value.v==="number"&&value.v>1)throw new ScopeLinkError("update-required","Please update the app to open this practice link.");
  // v0 links used the same fields before versioning; missing v is accepted as v0.
  if(value.v!==undefined&&value.v!==0&&value.v!==1)return fail();
  const scope:PlayScope={v:1};
  if(value.book!==undefined){if(typeof value.book!=="string"||!value.book.trim()||value.book.length>200)return fail();scope.book=value.book;}
  if(value.upTo!==undefined){
    if(!record(value.upTo)||!integer(value.upTo.lesson))return fail();
    scope.upTo={lesson:value.upTo.lesson};
    if(value.upTo.page!==undefined){if(!integer(value.upTo.page))return fail();scope.upTo.page=value.upTo.page;}
  }
  if(value.lessons!==undefined){if(!Array.isArray(value.lessons)||value.lessons.length>1000||!value.lessons.every(n=>integer(n)))return fail();scope.lessons=[...new Set(value.lessons as number[])].sort((a,b)=>a-b);}
  for(const field of ["tags","skills","items"] as const)if(value[field]!==undefined)scope[field]=strings(value[field]);
  if(value.sources!==undefined){const sources=strings(value.sources,3);if(sources.some(s=>!["course","teacher-extra","study-extra"].includes(s)))return fail();scope.sources=sources as StudySource[];}
  if(value.count!==undefined){if(!integer(value.count,100))return fail();scope.count=value.count;}
  return scope;
}
export function encodeScope(scope:PlayScope):string{
  const bytes=new TextEncoder().encode(JSON.stringify(parsePlayScope(scope)));
  return btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join("")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
export function decodeScope(encoded:string):PlayScope{
  if(!encoded||encoded.length>30000||!/^[A-Za-z0-9_-]+={0,2}$/.test(encoded))return fail();
  try{
    const bytes=Uint8Array.from(atob(encoded.replace(/-/g,"+").replace(/_/g,"/")),char=>char.charCodeAt(0));
    return parsePlayScope(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as unknown);
  }catch(error){if(error instanceof ScopeLinkError)throw error;return fail();}
}
export function playHref(scope:PlayScope,options:{assignment?:string;mode?:"run"|"quick"|"free";pack?:string}={}):string{
  const query=new URLSearchParams({scope:encodeScope(scope)});
  if(options.assignment)query.set("assignment",options.assignment);
  if(options.mode)query.set("mode",options.mode);
  if(options.pack)query.set("pack",options.pack);
  return `/play/run?${query.toString()}`;
}
