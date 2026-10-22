"use client";
import { Icon } from "@/components/media/Icon";
import {useEffect,useState} from "react";
import {hobbyModels} from "@/lib/study/hobbies-sheet";
import {hobbyContrastSaveId,hobbyContrasts,frequencyWeekExamples,readHobbyBookmark} from "@/lib/study/hobby-learning";
import {weekDays} from "@/lib/study/time-sheet";
import {tagsForLesson} from "@/lib/study/scope";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {StudyScopeNotice} from "./StudyScope";
import {hobbyIllustrationPaths} from "@/lib/study/hobby-illustrations";
import {SubjectVocabularyVisual} from "./SubjectIllustration";
import "../../app/cheat-sheets/hobby-time.css";


export function HobbyIllustration({index}:{index:number}){return <SubjectVocabularyVisual className="hobby-illustration" de={hobbyModels[index]?.de??""} category="Activity" cardId={`hobby-${index}`} subject="hobbies" drawing={{kind:`hobby:${index}`,path:hobbyIllustrationPaths[index]}}/>;}

export function FrequencyWeek({frequency}:{frequency:number}){return <div className="frequency-week-example"><p><b>One possible week</b>, with one opportunity each day. Filled circles show doing the activity; dashes show not doing it. This is a memory picture, not a definition of how many days each word means.</p><div className="frequency-week">{weekDays.map((day,index)=><div key={day}><span lang="de">{day.slice(0,2)}</span><b role="img" aria-label={frequencyWeekExamples[frequency]![index]?`${day}: activity`:`${day}: no activity`}>{frequencyWeekExamples[frequency]![index]?"●":"—"}</b></div>)}</div></div>;}

export function HobbyContrastPractice({hobby,speech}:{hobby:number;speech:Record<string,string>}){
 const [step,setStep]=useState(0),[answer,setAnswer]=useState<string|null>(null);
 useEffect(()=>{const restore=()=>{const state=readHobbyBookmark(window.location.hash);if(state?.section==="contrast"&&state.hobby===hobby){setStep(state.contrast??0);setAnswer(null);}};restore();window.addEventListener("hashchange",restore);return()=>window.removeEventListener("hashchange",restore);},[hobby]);
 const contrasts=hobbyContrasts(hobby),target=contrasts[step%3]!;
 const options=[...contrasts.slice(step*2%3),...contrasts.slice(0,step*2%3)];
 return <section id="hobby-contrast-practice" className="sheet-practice"><p className="study-eyebrow">Reference practice · Lesson 7</p><h2>Can, like, or often?</h2><StudyScopeNotice tags={tagsForLesson(7)} subject="This contrast practice"/><p>Same activity: {hobbyModels[hobby]!.ing}. Choose the German sentence that matches this meaning.</p><div className="sheet-quiz"><h3>{target.en}</h3><div className="sheet-quiz-options">{options.map(option=><button type="button" key={option.kind} disabled={answer!==null} lang="de" data-answer={answer===null?undefined:option.kind===target.kind?"correct":option.kind===answer?"wrong":undefined} onClick={()=>setAnswer(option.kind)}>{option.de}</button>)}</div>{answer!==null&&<div className="sheet-feedback" role="status"><strong>{answer===target.kind?"Exactly.":"Keep these meanings separate:"}</strong><p><GermanText text={target.de}/><LineAudio compact text={target.de} src={speech[target.de]}/></p><p>{target.cue}. Ability does not tell us whether someone enjoys the activity or does it often.</p><SaveButton item={{id:hobbyContrastSaveId(hobby,step%3),title:target.de,meaning:target.en,kind:"concept",lesson:7,studyTags:tagsForLesson(7),href:`/cheat-sheets/hobbies#hobby-contrast-${hobby}-${step}`,audio:speech[target.de]??null}}/><button type="button" className="study-primary" onClick={()=>{setStep((step+1)%3);setAnswer(null);}}>Next contrast <Icon name="arrow"/></button></div>}</div></section>;
}
