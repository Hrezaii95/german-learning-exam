import {clockHours,clockMinutes,clockWords,clockSentence,digitalTime,weekDays,weekDaysEnglish,timePlaces,planMeaning,type ClockMode} from "./time-sheet";

export type ClockSettings={hour:number;minute:number;mode:ClockMode};
export type PlanSettings={day:number;place:number;front:boolean;withTime:boolean;hour:number;minute:number};
export function clockBookmark(state:ClockSettings){return `#clock-${state.hour}-${state.minute}-${state.mode}`;}
export function readClockBookmark(hash:string):ClockSettings|null{
 const match=hash.match(/^#clock-(\d+)-(\d+)-(everyday|official)$/);if(!match)return null;
 const hour=Number(match[1]),minute=Number(match[2]);
 return clockHours.includes(hour)&&clockMinutes.includes(minute)?{hour,minute,mode:match[3] as ClockMode}:null;
}
export function planBookmark(state:PlanSettings){return `#plan-${state.day}-${state.place}-${state.front?1:0}-${state.withTime?1:0}-${state.hour}-${state.minute}`;}
export function readPlanBookmark(hash:string):PlanSettings|null{
 const match=hash.match(/^#plan-(\d+)-(\d+)-(0|1)-(0|1)-(\d+)-(\d+)$/);if(!match)return null;
 const day=Number(match[1]),place=Number(match[2]),hour=Number(match[5]),minute=Number(match[6]);
 return weekDays[day]&&timePlaces[place]&&clockHours.includes(hour)&&clockMinutes.includes(minute)?{day,place,front:match[3]==="1",withTime:match[4]==="1",hour,minute}:null;
}
export function timedPlanSentence(state:PlanSettings){
 return timedPlanParts(state).join(" ");
}
export function timedPlanParts(state:PlanSettings){
 if(!state.withTime)return state.front?[`Am ${weekDays[state.day]}`,"gehen","wir",`${timePlaces[state.place]!.to}.`]:["Wir","gehen",`am ${weekDays[state.day]}`,`${timePlaces[state.place]!.to}.`];
 const time=`am ${weekDays[state.day]} um ${clockWords(state.hour,state.minute,"official")}`;
 return state.front?[time[0]!.toUpperCase()+time.slice(1),"gehen","wir",`${timePlaces[state.place]!.to}.`]:["Wir","gehen",time,`${timePlaces[state.place]!.to}.`];
}
export function timedPlanSaveId(state:PlanSettings){return `l8-plan-${state.day}-${state.place}-${state.front}${state.withTime?`-at-${state.hour}-${state.minute}`:""}`;}
export function timedPlanMeaning(state:PlanSettings){return state.withTime?`We are going to ${timePlaces[state.place]!.en} on ${weekDaysEnglish[state.day]} at ${digitalTime(state.hour,state.minute)}.`:planMeaning(state.day,state.place);}

export const timeTeachingPlans=weekDays.flatMap((_,day)=>[true,false].map(front=>({day,place:0,front,withTime:true,hour:15,minute:30})));
export const timeTeachingSpeech=["um drei Uhr","eine Stunde","zwei Stunden",...timeTeachingPlans.map(timedPlanSentence)];

const clockPracticeTimes=[{hour:15,minute:30},{hour:13,minute:15},{hour:20,minute:45},{hour:0,minute:5},{hour:11,minute:25},{hour:17,minute:35}];
/** Everyday choices use twelve-hour equivalents, so no two answers sound identical. */
export function clockListeningQuestion(index:number,mode:ClockMode){
 const target=clockPracticeTimes[index%clockPracticeTimes.length];if(!target||index<0||!Number.isInteger(index))throw new RangeError("Choose a known clock question.");
 const hour=mode==="everyday"?target.hour%12:target.hour;
 const options=[{hour,minute:target.minute},{hour:(hour+1)%(mode==="everyday"?12:24),minute:target.minute},{hour,minute:(target.minute+15)%60}];
 const answer=options[0]!;options.push(...options.splice(0,index%options.length));
 return {text:clockSentence(target.hour,target.minute,mode),answer,options,context:mode==="everyday"?"Twelve-hour clock: morning or evening depends on context.":"Official twenty-four-hour time."};
}
