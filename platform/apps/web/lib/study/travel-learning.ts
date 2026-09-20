import {travelVerbs,travelPeople,travelModes,announcementModels,travelSaveId,type TravelMode} from "./travel-sheet";
export type TravelSettings={verb:number;person:number;mode:TravelMode;announcement:number};
export function travelBookmark(state:TravelSettings,section:"bracket"|"listening"="bracket"){
 return `#travel-${section}-${state.verb}-${state.person}-${state.mode}-${state.announcement}`;
}
export function readTravelBookmark(hash:string):(TravelSettings&{section:"bracket"|"listening"})|null{
 const match=hash.match(/^#travel-(bracket|listening)-(\d+)-(\d+)-(statement|w-question|yes-no|modal)-(\d+)$/);if(!match)return null;
 const verb=Number(match[2]),person=Number(match[3]),announcement=Number(match[5]);
 return travelVerbs[verb]&&travelPeople[person]&&travelModes.some(mode=>mode.id===match[4])&&announcementModels[announcement]?{section:match[1] as "bracket"|"listening",verb,person,mode:match[4] as TravelMode,announcement}:null;
}
export const travelRouteSteps=[
 {verb:4,word:"einsteigen",cue:"GET ON",meaning:"Enter the train or bus."},
 {verb:5,word:"umsteigen",cue:"CHANGE",meaning:"Switch to another train or bus."},
 {verb:6,word:"aussteigen",cue:"GET OFF",meaning:"Leave the train or bus."},
] as const;
export function travelAnnouncementChoices(index:number){const model=announcementModels[index]!;const offset=index%model.choices.length;return [...model.choices.slice(offset),...model.choices.slice(0,offset)];}

export function travelAnnouncementSaveId(index:number){return index===6?travelSaveId(0,0,"statement"):index===7?travelSaveId(5,3,"statement"):`l10-announcement-${index}`;}
