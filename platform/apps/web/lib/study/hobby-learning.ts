import {hobbyModels,hobbyPeople,abilityLevels,frequencyWords,abilitySentence,abilityMeaning,frequencySentence,frequencyMeaning} from "./hobbies-sheet";

export type HobbySettings={hobby:number;person:number;level:number;question:boolean;frequency:number};
export function hobbyBookmark(state:HobbySettings,section:"ability"|"frequency"="ability"){
 return `#hobby-${section}-${state.hobby}-${state.person}-${state.level}-${state.question?1:0}-${state.frequency}`;
}
export function readHobbyBookmark(hash:string):({section:"ability"|"frequency"|"contrast";contrast?:number}&HobbySettings)|null{
 const contrast=hash.match(/^#hobby-contrast-(\d+)-([0-2])$/);
 if(contrast&&hobbyModels[Number(contrast[1])])return {section:"contrast",contrast:Number(contrast[2]),hobby:Number(contrast[1]),person:0,level:1,question:false,frequency:1};
 const match=hash.match(/^#hobby-(ability|frequency)-(\d+)-(\d+)-(\d+)-(0|1)-(\d+)$/);
 if(!match)return null;
 const hobby=Number(match[2]),person=Number(match[3]),level=Number(match[4]),frequency=Number(match[6]);
 if(!hobbyModels[hobby]||!hobbyPeople[person]||!abilityLevels[level]||!frequencyWords[frequency])return null;
 return {section:match[1] as "ability"|"frequency",hobby,person,level,question:match[5]==="1",frequency};
}
export function hobbyContrasts(hobby:number){
 const item=hobbyModels[hobby];if(!item)throw new RangeError("Choose a known hobby.");
 return [
  {kind:"ability",label:"CAN · ability",de:abilitySentence(hobby,0,1,false),en:abilityMeaning(hobby,0,1,false),cue:"können + infinitive at the end"},
  {kind:"enjoyment",label:"LIKE · enjoyment",de:`Ich ${item.forms[0]} gern${item.tail?` ${item.tail}`:""}.`,en:`I like ${item.ing}.`,cue:"conjugated activity verb + gern"},
  {kind:"frequency",label:"OFTEN · frequency",de:frequencySentence(hobby,1),en:frequencyMeaning(hobby,1),cue:"conjugated activity verb + frequency"},
 ];
}
/** Example patterns only: oft/manchmal have no fixed number of days or percentage. */
export const frequencyWeekExamples=[
 [true,true,true,true,true,true,true],
 [true,true,false,true,true,false,true],
 [false,true,false,false,false,true,false],
 [false,false,false,false,false,false,false],
];

/** Keep the original cooking concept identities across overview and recall. */
export function hobbyContrastSaveId(hobby:number,index:number){return hobby===1?`l7-meaning-${index}`:`l7-contrast-${hobby}-${hobbyContrasts(hobby)[index]!.kind}`;}
