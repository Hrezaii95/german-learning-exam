"use client";
import {useState} from "react";
import {pastDayEvents,pastBookmark,openingInterpretations,type PastSettings} from "@/lib/study/past-learning";
import {pastActivities,openingHours} from "@/lib/study/past-sheet";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {ClockFace} from "./TimeTools";
import "./PastLearning.css";

const eventPaths=[
 "M19 37h53v28q0 16-27 16T19 65ZM72 42h9q17 16-9 22M13 88h64M32 13q-8 9 0 18m20-18q-8 9 0 18",
 "M15 35h70v48H15ZM37 35V20h26v15M15 53q35 15 70 0M43 53h14v12H43Z",
 "M16 23q18-7 34 5 16-12 34-5v59q-18-6-34 5-16-11-34-5ZM50 28v59M25 37l16 3m-16 8 16 3m-16 8 16 3m19-22 15-3m-15 14 15-3",
 "M13 25h74v51H13ZM37 76v12m26-12v12M29 89h42M38 8l12 15L66 7M24 35h52v32H24Z",
];
export function PastEventIllustration({index}:{index:number}){return <svg className="past-event-art" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#efe7fa" stroke="none"/><path d={eventPaths[index]}/></svg>;}
export function PastDayTimeline({activity,onChoose}:{activity:number;onChoose:(activity:number)=>void}){return <div><p>A possible yesterday. Choose an event to tell its story; these are example activities, not a fixed daily routine.</p><div className="past-day-timeline">{pastDayEvents.map((event,index)=><button type="button" key={event.activity} aria-pressed={activity===event.activity} onClick={()=>onChoose(event.activity)}><small>{index+1} · {event.period}</small><PastEventIllustration index={index}/><strong lang="de">{pastActivities[event.activity]!.verb}</strong><span>{event.label}</span></button>)}</div></div>;}

export function OpeningHoursSign({state,speech}:{state:PastSettings;speech:Record<string,string>}){
 const [answer,setAnswer]=useState<number|null>(null),opening=openingHours[state.hours]!;
 return <div className="opening-sign"><h3>{opening.id==="point"?"Course starts":"Practice opening hours"}</h3><div className="opening-clocks"><div><ClockFace hour={opening.start} minute={0}/><b>08:00</b></div>{opening.id==="interval"?<><span aria-hidden="true">→</span><div><ClockFace hour={opening.end!} minute={0}/><b>13:00</b></div></>:opening.id==="start"?<span aria-label="No end stated">→ …</span>:null}</div><p><GermanText text={opening.de}/><LineAudio compact text={opening.de} src={speech[opening.de]}/></p><details><summary>Show meaning</summary><p>{opening.en}</p></details><SaveButton item={{id:`l11-hours-${state.hours}`,title:opening.de,meaning:opening.en,kind:"phrase",lesson:11,href:`/cheat-sheets/past${pastBookmark(state,"hours")}`,audio:speech[opening.de]??null}}/><div className="opening-reading-quiz"><h3>What does this sign tell you?</h3><div className="sheet-quiz-options">{openingInterpretations.map((option,index)=><button type="button" key={option} disabled={answer!==null} data-answer={answer===null?undefined:index===state.hours?"correct":index===answer?"wrong":undefined} onClick={()=>setAnswer(index)}>{option}</button>)}</div>{answer!==null&&<div className="sheet-feedback" role="status"><strong>{answer===state.hours?"Correct.":"Read the time signal again."}</strong><p>{openingInterpretations[state.hours]}</p><p><span lang="de">um</span> names one clock time; <span lang="de">von … bis</span> gives both ends; <span lang="de">ab</span> gives a starting point.</p><button type="button" className="study-secondary" onClick={()=>setAnswer(null)}>Try again</button></div>}</div></div>;
}
