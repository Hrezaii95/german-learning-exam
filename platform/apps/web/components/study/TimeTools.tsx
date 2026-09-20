"use client";
import {useState} from "react";
import {clockListeningQuestion,clockBookmark,readPlanBookmark,type PlanSettings} from "@/lib/study/time-learning";
import {clockSaveId,clockWords,digitalTime,weekDays,weekDaysEnglish,timePlaces,type ClockMode} from "@/lib/study/time-sheet";
import {tagsForLesson} from "@/lib/study/scope";
import {SaveButton,useStudy} from "./StudyProvider";
import {StudyScopeNotice} from "./StudyScope";
import {LineAudio} from "./StudyAudio";
import "./HobbyTimeLearning.css";

export function ClockFace({hour,minute,label}:{hour:number;minute:number;label?:string}){
 return <svg viewBox="0 0 300 300" role="img" aria-label={label??`Clock showing ${digitalTime(hour,minute)}`} className="learning-clock"><circle cx="150" cy="150" r="140" fill="#fffdf8" stroke="#465a57" strokeWidth="3"/>{Array.from({length:60},(_,i)=><line key={i} x1="150" y1={i%5?18:15} x2="150" y2={i%5?23:29} stroke="#596c68" strokeWidth={i%5?1:3} transform={`rotate(${i*6} 150 150)`}/>)}{Array.from({length:12},(_,i)=>{const n=i+1,a=n*Math.PI/6;return <text key={n} x={150+108*Math.sin(a)} y={155-108*Math.cos(a)} textAnchor="middle" fontSize="20" fill="#263d3a">{n}</text>;})}<line x1="150" y1="150" x2="150" y2="75" stroke="#765194" strokeWidth="9" strokeLinecap="round" transform={`rotate(${(hour%12)*30+minute/2} 150 150)`}/><line x1="150" y1="150" x2="150" y2="42" stroke="#246b73" strokeWidth="5" strokeLinecap="round" transform={`rotate(${minute*6} 150 150)`}/><circle cx="150" cy="150" r="7" fill="#263d3a"/></svg>;
}
export function HalfHourCue({hour,minute}:{hour:number;minute:number}){
 const now=hour%12||12,next=(hour+1)%12||12;
 return <aside className="half-memory"><strong lang="de">halb {clockWords((hour+1)%12,0,"everyday").replace(" Uhr","").replace(/^ein$/,"eins")} → {now}:30</strong><p>Halfway <b>to {next}</b>. At {now}:30, the next hour is still thirty minutes away.</p><div className="half-hour-track"><span>{now}:00</span><b>{now}:30 →</b><span>{next}:00</span></div>{(minute===25||minute===35)&&<p lang="de">{minute===25?"fünf vor halb":"fünf nach halb"} {clockWords((hour+1)%12,0,"everyday").replace(" Uhr","").replace(/^ein$/,"eins")} = {now}:{minute}</p>}</aside>;
}

export function ClockListening({speech}:{speech:Record<string,string>}){
 const [mode,setMode]=useState<ClockMode>("everyday"),[index,setIndex]=useState(0),[answer,setAnswer]=useState<string|null>(null);
 const question=clockListeningQuestion(index,mode),correct=digitalTime(question.answer.hour,question.answer.minute);
 return <section id="clock-listening" className="sheet-practice"><p className="study-eyebrow">Reference listening · Lesson 8</p><h2>Hear a time. Choose its clock.</h2><StudyScopeNotice tags={tagsForLesson(8)} subject="This clock practice"/><div className="time-mode" role="group" aria-label="Listening clock style">{(["everyday","official"] as const).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setIndex(0);setAnswer(null);}}>{value==="everyday"?"Everyday · 12-hour":"Official · 24-hour"}</button>)}</div><p>{question.context}</p><LineAudio text={question.text} src={speech[question.text]} label="time to identify"/><div className="clock-choice-grid">{question.options.map(option=>{const value=digitalTime(option.hour,option.minute),display=mode==="everyday"?`${option.hour%12||12}:${String(option.minute).padStart(2,"0")}`:value;return <button type="button" key={value} aria-label={`Choose ${display}`} disabled={answer!==null} data-answer={answer===null?undefined:value===correct?"correct":value===answer?"wrong":undefined} onClick={()=>setAnswer(value)}><ClockFace hour={option.hour} minute={option.minute} label={`Clock showing ${display}`}/><b>{display}</b></button>;})}</div>{answer!==null&&<div className="sheet-feedback" role="status"><strong>{answer===correct?"Exactly.":"Listen again and compare:"}</strong><p lang="de">{question.text}</p><p>The short hand shows the hour; the long hand shows the minutes. With halb, name the next hour.</p><SaveButton item={{id:clockSaveId(question.answer.hour,question.answer.minute,mode),title:question.text,meaning:mode==="everyday"?"Twelve-hour time; use the situation to tell morning from evening.":`It is ${correct}.`,kind:"phrase",lesson:8,studyTags:tagsForLesson(8),href:`/cheat-sheets/time${clockBookmark({...question.answer,mode})}`,audio:speech[question.text]??null}}/><button type="button" className="study-primary" onClick={()=>{setIndex((index+1)%6);setAnswer(null);}}>Next clock →</button></div>}</section>;
}

export function WeeklyPlanBoard({state,onChooseDay,onRestore}:{state:PlanSettings;onChooseDay:(day:number)=>void;onRestore:(state:PlanSettings)=>void}){
 const study=useStudy();
 const plans=Object.values(study?.state.saved??{}).flatMap(item=>{
  if(!item.href?.startsWith("/cheat-sheets/time"))return [];
  let plan=readPlanBookmark(`#${item.href.split("#")[1]??""}`);
  const legacy=item.id.match(/^l8-plan-(\d+)-(\d+)-(true|false)$/);
  if(!plan&&legacy&&weekDays[Number(legacy[1])]&&timePlaces[Number(legacy[2])])plan={day:Number(legacy[1]),place:Number(legacy[2]),front:legacy[3]==="true",withTime:false,hour:15,minute:30};
  return plan?[{item,plan}]:[];
 });
 return <div className="weekly-plan-board"><p>Choose a day to build a plan below. Saved plans appear here and remain in My review; selecting one restores its settings.</p><div className="weekly-plan-grid">{weekDays.map((day,index)=>{const saved=plans.filter(row=>row.plan.day===index);return <article key={day} data-selected={state.day===index}><button type="button" aria-pressed={state.day===index} onClick={()=>onChooseDay(index)}><small>der</small><strong lang="de">{day}</strong><span>{weekDaysEnglish[index]}</span><b lang="de">am {day}</b></button>{state.day===index&&<div className="week-draft"><small>Current draft</small><p lang="de">{state.withTime?`${digitalTime(state.hour,state.minute)} · `:""}{timePlaces[state.place]!.to}</p></div>}{saved.length?<details><summary>{saved.length} saved {saved.length===1?"plan":"plans"}</summary>{saved.map(({item,plan})=><button type="button" className="week-saved-plan" key={item.id} onClick={()=>onRestore(plan)}><span lang="de">{plan.withTime?`${digitalTime(plan.hour,plan.minute)} · `:""}{timePlaces[plan.place]!.to}</span><span>Open saved plan</span></button>)}</details>:<p className="week-empty">No saved plans</p>}</article>;})}</div></div>;
}
