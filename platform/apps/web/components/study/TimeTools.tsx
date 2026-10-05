"use client";
import { LArticle, LAside, LB, LButton, LDetails, LDiv, LH2, LP, LSection, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";

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
 return <LAside className="half-memory"><LStrong lang="de">halb {clockWords((hour+1)%12,0,"everyday").replace(" Uhr","").replace(/^ein$/,"eins")} → {now}:30</LStrong><LP>Halfway <LB>to {next}</LB>. At {now}:30, the next hour is still thirty minutes away.</LP><LDiv className="half-hour-track"><LSpan>{now}:00</LSpan><LB>{now}:30 →</LB><LSpan>{next}:00</LSpan></LDiv>{(minute===25||minute===35)&&<LP lang="de">{minute===25?"fünf vor halb":"fünf nach halb"} {clockWords((hour+1)%12,0,"everyday").replace(" Uhr","").replace(/^ein$/,"eins")} = {now}:{minute}</LP>}</LAside>;
}

export function ClockListening({speech}:{speech:Record<string,string>}){
 const [mode,setMode]=useState<ClockMode>("everyday"),[index,setIndex]=useState(0),[answer,setAnswer]=useState<string|null>(null);
 const question=clockListeningQuestion(index,mode),correct=digitalTime(question.answer.hour,question.answer.minute);
 return <LSection id="clock-listening" className="sheet-practice"><LP className="study-eyebrow">Reference listening · Lesson 8</LP><LH2>Hear a time. Choose its clock.</LH2><StudyScopeNotice tags={tagsForLesson(8)} subject="This clock practice"/><LDiv className="time-mode" role="group" aria-label="Listening clock style">{(["everyday","official"] as const).map(value=><LButton type="button" key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setIndex(0);setAnswer(null);}}>{value==="everyday"?"Everyday · 12-hour":"Official · 24-hour"}</LButton>)}</LDiv><LP>{question.context}</LP><LineAudio text={question.text} src={speech[question.text]} label="time to identify"/><LDiv className="clock-choice-grid">{question.options.map(option=>{const value=digitalTime(option.hour,option.minute),display=mode==="everyday"?`${option.hour%12||12}:${String(option.minute).padStart(2,"0")}`:value;return <LButton type="button" key={value} aria-label={`Choose ${display}`} disabled={answer!==null} data-answer={answer===null?undefined:value===correct?"correct":value===answer?"wrong":undefined} onClick={()=>setAnswer(value)}><ClockFace hour={option.hour} minute={option.minute} label={`Clock showing ${display}`}/><LB>{display}</LB></LButton>;})}</LDiv>{answer!==null&&<LDiv className="sheet-feedback" role="status"><LStrong>{answer===correct?"Exactly.":"Listen again and compare:"}</LStrong><LP lang="de">{question.text}</LP><LP>The short hand shows the hour; the long hand shows the minutes. With halb, name the next hour.</LP><SaveButton item={{id:clockSaveId(question.answer.hour,question.answer.minute,mode),title:question.text,meaning:mode==="everyday"?"Twelve-hour time; use the situation to tell morning from evening.":`It is ${correct}.`,kind:"phrase",lesson:8,studyTags:tagsForLesson(8),href:`/cheat-sheets/time${clockBookmark({...question.answer,mode})}`,audio:speech[question.text]??null}}/><LButton type="button" className="study-primary" onClick={()=>{setIndex((index+1)%6);setAnswer(null);}}>Next clock →</LButton></LDiv>}</LSection>;
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
 return <LDiv className="weekly-plan-board"><LP>Choose a day to build a plan below. Saved plans appear here and remain in My review; selecting one restores its settings.</LP><LDiv className="weekly-plan-grid">{weekDays.map((day,index)=>{const saved=plans.filter(row=>row.plan.day===index);return <LArticle key={day} data-selected={state.day===index}><LButton type="button" aria-pressed={state.day===index} onClick={()=>onChooseDay(index)}><LSmall>der</LSmall><LStrong lang="de">{day}</LStrong><LSpan>{weekDaysEnglish[index]}</LSpan><LB lang="de">am {day}</LB></LButton>{state.day===index&&<LDiv className="week-draft"><LSmall>Current draft</LSmall><LP lang="de">{state.withTime?`${digitalTime(state.hour,state.minute)} · `:""}{timePlaces[state.place]!.to}</LP></LDiv>}{saved.length?<LDetails><LSummary>{saved.length} saved {saved.length===1?"plan":"plans"}</LSummary>{saved.map(({item,plan})=><LButton type="button" className="week-saved-plan" key={item.id} onClick={()=>onRestore(plan)}><LSpan lang="de">{plan.withTime?`${digitalTime(plan.hour,plan.minute)} · `:""}{timePlaces[plan.place]!.to}</LSpan><LSpan>Open saved plan</LSpan></LButton>)}</LDetails>:<LP className="week-empty">No saved plans</LP>}</LArticle>;})}</LDiv></LDiv>;
}
