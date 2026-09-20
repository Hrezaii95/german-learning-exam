import {monthEnglish,journeyActivities,journeyPeople} from "./journey-sheet";
import {germanNumber} from "./sheet-topics";
export const journeyMonths=Object.keys(monthEnglish);
export type JourneySettings={activity:number;person:number;question:boolean;month:string;year:number};
export function journeyBookmark(state:JourneySettings,section:"calendar"|"lab"|"years"="lab"){
 return `#journey-${section}-${state.activity}-${state.person}-${Number(state.question)}-${journeyMonths.indexOf(state.month)}-${state.year}`;
}
export function readJourneyBookmark(hash:string):(JourneySettings&{section:"calendar"|"lab"|"years"})|null{
 const match=hash.match(/^#journey-(calendar|lab|years)-(\d+)-(\d+)-(0|1)-(\d+)-(\d{4})$/);if(!match)return null;
 const activity=Number(match[2]),person=Number(match[3]),month=journeyMonths[Number(match[5])],year=Number(match[6]);
 return journeyActivities[activity]&&journeyPeople[person]&&month&&year>=1900&&year<=2099?{section:match[1] as "calendar"|"lab"|"years",activity,person,question:match[4]==="1",month,year}:null;
}
export const journeyStages=[{label:"Travel",activity:0},{label:"Arrive",activity:4},{label:"Visit",activity:10},{label:"Take photos",activity:12}] as const;
export function yearChunks(year:number){
 if(!Number.isInteger(year)||year<1900||year>2099)throw new RangeError("Choose a year from 1900 to 2099.");
 return [year<2000?"neunzehnhundert":"zweitausend",...(year%100?[germanNumber(year%100)]:[])];
}
