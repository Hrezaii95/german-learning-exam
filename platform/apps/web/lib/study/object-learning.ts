import {objectModels,colourSwatches,materialModels} from "./object-sheet";
import {officeModels,officeSentence,type OfficeMode} from "./office-sheet";
import {germanNumber} from "./sheet-topics";

export const officePracticeDigits=["0176","2048","6039"];
export const officePhoneSpeech=officePracticeDigits.map(digits=>[...digits].map(n=>germanNumber(Number(n))).join(", "));

export type ObjectShape="plain"|"rund"|"eckig";
export type ObjectSettings={index:number;negative:boolean;guess:number;colour:string;material:string;shape:ObjectShape};
export const objectMaterials:readonly (readonly string[])[]=[["Holz","Metall","Kunststoff"],["Papier"],["Metall","Kunststoff"],["Glas","Plastik","Metall"],["Metall","Kunststoff"]];
export const objectShapes:readonly (readonly ObjectShape[])[]=[["plain","rund","eckig"],["plain","eckig"],["plain","rund","eckig"],["plain","rund"],["plain"]];
export function defaultObjectSettings(index=0):ObjectSettings{
  const item=objectModels[index];if(!item)throw new RangeError("Choose a known object.");
  return {index,negative:false,guess:(index+1)%objectModels.length,colour:item.colour,material:item.material,shape:"plain"};
}
export function objectBookmark(state:ObjectSettings){return `#object-${[state.index,state.negative?1:0,state.guess,state.colour,state.material,state.shape].map(value=>encodeURIComponent(String(value))).join("-")}`;}
export function readObjectBookmark(hash:string):ObjectSettings|null{
  if(!hash.startsWith("#object-"))return null;
  try{
    const parts=hash.slice(8).split("-").map(decodeURIComponent);if(parts.length!==6)return null;
    const [rawIndex,negative,rawGuess,colour,material,shape]=parts,index=Number(rawIndex),guess=Number(rawGuess);
    if(!/^\d$/.test(rawIndex!)||!objectModels[index]||!/^\d$/.test(rawGuess!)||!objectModels[guess]||guess===index||!["0","1"].includes(negative!)||!colourSwatches.some(row=>row[0]===colour)||!objectMaterials[index]?.includes(material!)||!objectShapes[index]?.includes(shape as ObjectShape))return null;
    return {index,negative:negative==="1",guess,colour:colour!,material:material!,shape:shape as ObjectShape};
  }catch{return null;}
}
/** The picture stays truthful: negate a different guessed label, then name the actual object. */
export function objectDescription(state:ObjectSettings){
  const item=objectModels[state.index],guess=objectModels[state.guess];
  if(!item||!guess||state.guess===state.index)throw new RangeError("Choose an object and a different guessed label.");
  const material=materialModels.find(row=>row[0]===state.material),colour=colourSwatches.find(row=>row[0]===state.colour);
  if(!material||!objectMaterials[state.index]?.includes(state.material)||!colour||!objectShapes[state.index]?.includes(state.shape))throw new RangeError("Choose one of this object's material, colour and shape options.");
  const article=item.article[0]!.toUpperCase()+item.article.slice(1),pronoun=item.pronoun[0]!.toUpperCase()+item.pronoun.slice(1);
  const lines:{de:string;en:string;gender:typeof item.gender}[]=[];
  if(state.negative)lines.push({de:`Das ist ${guess.negative} ${guess.noun}.`,en:`That is not a ${guess.en}.`,gender:guess.gender});
  lines.push({de:`Das ist ${item.indefinite} ${item.noun}.`,en:`That is a ${item.en}.`,gender:item.gender},{de:`${article} ${item.noun} ist aus ${state.material}.`,en:`The ${item.en} is made of ${material[1]}.`,gender:item.gender},{de:`${pronoun} ist ${state.colour}.`,en:`It is ${colour[1]}.`,gender:item.gender});
  if(state.shape!=="plain")lines.push({de:`${pronoun} ist ${state.shape}.`,en:`It is ${state.shape==="rund"?"round":"angular"}.`,gender:item.gender});
  return lines;
}
export const objectTeachingSpeech=[...new Set(objectModels.flatMap((_,index)=>{
  const base=defaultObjectSettings(index);
  return [...colourSwatches.map(row=>({...base,colour:row[0]})),...objectMaterials[index]!.map(material=>({...base,material})),...objectShapes[index]!.map(shape=>({...base,shape})),{...base,negative:true}].flatMap(state=>objectDescription(state).map(line=>line.de));
}))];

export type OfficeSettings={index:number;mode:OfficeMode;negative:boolean;plural:boolean};
export function officeBookmark(state:OfficeSettings){return `#office-${state.index}-${state.mode}-${state.negative?1:0}-${state.plural?1:0}`;}
export function readOfficeBookmark(hash:string):OfficeSettings|null{const match=hash.match(/^#office-(\d+)-(identify|have|need|find)-(0|1)-(0|1)$/);if(!match||!officeModels[Number(match[1])])return null;return {index:Number(match[1]),mode:match[2] as OfficeMode,negative:match[3]==="1",plural:match[4]==="1"};}
export function officeRoles(state:OfficeSettings){
  const text=officeSentence(state.index,state.mode,state.negative,state.plural);
  const [subject,verb,...object]=text.split(" ");
  return {subject:subject!,verb:verb!,object:object.join(" "),text,caseLabel:state.mode==="identify"?"Nominative · naming phrase":"Accusative · object"};
}
