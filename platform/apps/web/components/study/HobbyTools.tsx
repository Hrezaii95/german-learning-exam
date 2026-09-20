"use client";
import {useEffect,useState} from "react";
import {hobbyModels} from "@/lib/study/hobbies-sheet";
import {hobbyContrastSaveId,hobbyContrasts,frequencyWeekExamples,readHobbyBookmark} from "@/lib/study/hobby-learning";
import {weekDays} from "@/lib/study/time-sheet";
import {tagsForLesson} from "@/lib/study/scope";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {StudyScopeNotice} from "./StudyScope";
import "./HobbyTimeLearning.css";

const activityDrawings=[
 "M12 64q10-10 20 0t20 0t20 0t20 0M12 79q10-10 20 0t20 0t20 0t20 0M25 54l28-16 19 16M36 44 21 29l20-14M73 29a8 8 0 1 0 .1 0",
 "M20 56h60v18q0 12-12 12H32q-12 0-12-12ZM20 61H9m71 0h11M15 49h70M50 40V29M33 22q-8 9 0 17M66 22q-8 9 0 17M35 49q15-20 30 0",
 "M53 12a8 8 0 1 0 .1 0M49 30 40 50l-17-8M45 37l19 11 18-16M41 51 60 57 48 75 26 91M53 64l22 26M38 38l-12-16",
 "M30 14a9 9 0 1 0 .1 0M30 33v31M30 43l24 5 9-12M30 64 15 91M30 64l17 27M67 18q12 0 12 12v14H59V30q0-12 8-12ZM55 40q0 19 13 19t13-19M68 59v28M56 90h24",
 "M49 13a11 11 0 1 0 .1 0M33 35l-12 14v26M66 36l14 15v25M23 43q14-3 27 6 13-9 27-6v42q-13-5-27 4-13-9-27-4ZM50 49v40",
 "M22 57a18 18 0 1 0 .1 0M78 57a18 18 0 1 0 .1 0M22 75 39 45l21 30H22M60 75l15-37M66 35h14M34 43h14M53 12a8 8 0 1 0 .1 0M51 30 37 41 52 52 46 65M50 31 66 39",
 "M20 49h47l11-21 11 4-1 22-13 9-7 25M63 65H30l-5 23M30 51l-14 13-8-8M44 15a8 8 0 1 0 .1 0M45 33v19l14 10M44 36l28 8M39 66l-2 22",
 "M72 13 85 22 63 56q10 17-3 29-15 13-34-1-17-13-5-28 9-11 25-4ZM72 21 44 65M77 25 49 69M31 61a9 9 0 1 0 .1 0M27 82l-7-7M71 13l5-7M83 20l6-6",
];
export function HobbyIllustration({index}:{index:number}){return <svg className="hobby-illustration" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="currentColor" opacity=".04" stroke="none"/><path d={activityDrawings[index]}/></svg>;}

export function FrequencyWeek({frequency}:{frequency:number}){return <div className="frequency-week-example"><p><b>One possible week</b>, with one opportunity each day. Filled circles show doing the activity; dashes show not doing it. This is a memory picture, not a definition of how many days each word means.</p><div className="frequency-week">{weekDays.map((day,index)=><div key={day}><span lang="de">{day.slice(0,2)}</span><b role="img" aria-label={frequencyWeekExamples[frequency]![index]?`${day}: activity`:`${day}: no activity`}>{frequencyWeekExamples[frequency]![index]?"●":"—"}</b></div>)}</div></div>;}

export function HobbyContrastPractice({hobby,speech}:{hobby:number;speech:Record<string,string>}){
 const [step,setStep]=useState(0),[answer,setAnswer]=useState<string|null>(null);
 useEffect(()=>{const restore=()=>{const state=readHobbyBookmark(window.location.hash);if(state?.section==="contrast"&&state.hobby===hobby){setStep(state.contrast??0);setAnswer(null);}};restore();window.addEventListener("hashchange",restore);return()=>window.removeEventListener("hashchange",restore);},[hobby]);
 const contrasts=hobbyContrasts(hobby),target=contrasts[step%3]!;
 const options=[...contrasts.slice(step*2%3),...contrasts.slice(0,step*2%3)];
 return <section id="hobby-contrast-practice" className="sheet-practice"><p className="study-eyebrow">Reference practice · Lesson 7</p><h2>Can, like, or often?</h2><StudyScopeNotice tags={tagsForLesson(7)} subject="This contrast practice"/><p>Same activity: {hobbyModels[hobby]!.ing}. Choose the German sentence that matches this meaning.</p><div className="sheet-quiz"><h3>{target.en}</h3><div className="sheet-quiz-options">{options.map(option=><button type="button" key={option.kind} disabled={answer!==null} lang="de" data-answer={answer===null?undefined:option.kind===target.kind?"correct":option.kind===answer?"wrong":undefined} onClick={()=>setAnswer(option.kind)}>{option.de}</button>)}</div>{answer!==null&&<div className="sheet-feedback" role="status"><strong>{answer===target.kind?"Exactly.":"Keep these meanings separate:"}</strong><p><GermanText text={target.de}/><LineAudio compact text={target.de} src={speech[target.de]}/></p><p>{target.cue}. Ability does not tell us whether someone enjoys the activity or does it often.</p><SaveButton item={{id:hobbyContrastSaveId(hobby,step%3),title:target.de,meaning:target.en,kind:"concept",lesson:7,studyTags:tagsForLesson(7),href:`/cheat-sheets/hobbies#hobby-contrast-${hobby}-${step}`,audio:speech[target.de]??null}}/><button type="button" className="study-primary" onClick={()=>{setStep((step+1)%3);setAnswer(null);}}>Next contrast →</button></div>}</div></section>;
}
