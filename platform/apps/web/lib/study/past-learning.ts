import {pastActivities,pastPeople,pastModes,pastGroups,openingHours,type PastMode} from "./past-sheet";
export type PastSettings={activity:number;person:number;mode:PastMode;hours:number;pattern:number};
export function pastBookmark(state:PastSettings,section:"lab"|"hours"|"patterns"="lab"){
 return `#past-${section}-${state.activity}-${state.person}-${state.mode}-${state.hours}-${state.pattern}`;
}
export function readPastBookmark(hash:string):(PastSettings&{section:"lab"|"hours"|"patterns"})|null{
 const match=hash.match(/^#past-(lab|hours|patterns)-(\d+)-(\d+)-(statement|time-first|question)-(\d+)-(\d+)$/);if(!match)return null;
 const activity=Number(match[2]),person=Number(match[3]),hours=Number(match[5]),pattern=Number(match[6]);
 return pastActivities[activity]&&pastPeople[person]&&openingHours[hours]&&pastGroups[pattern]&&pastModes.some(mode=>mode.id===match[4])?{section:match[1] as "lab"|"hours"|"patterns",activity,person,mode:match[4] as PastMode,hours,pattern}:null;
}
export const pastDayEvents=[
 {period:"Morning",activity:5,label:"Drink coffee"},
 {period:"During the day",activity:0,label:"Work"},
 {period:"Afternoon",activity:3,label:"Study German"},
 {period:"Evening",activity:12,label:"Watch television"},
] as const;
export const openingInterpretations=["The course starts at 08:00.","The practice is open from 08:00 until 13:00.","The practice opens from 08:00; no closing time is stated."] as const;
