"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useSearchParams} from "next/navigation";
import type {BookManifest} from "@/lib/study/types";
import {availableLessons,tagsForLesson} from "@/lib/study/scope";
import {bookContextHref} from "@/lib/study/book-reading";
import {AudioSpeedControl,useAudioSpeed} from "@/components/audio/AudioSpeedControl";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {OriginalTrack} from "./BookRecording";
import "./BookLearning.css";

export function CourseListening({book}:{book:Pick<BookManifest,"audio">}){
 const speed=useAudioSpeed(),params=useSearchParams();
 const {scope,setScope,ready,matches}=useStudyScope(),applied=useRef(false);
 const [limit,setLimit]=useState(12);
 useEffect(()=>{if(!ready||applied.current)return;applied.current=true;const lesson=Number(params.get("lesson"));if(availableLessons().includes(lesson))setScope({...scope,mode:"one",lessons:[lesson]});},[params,ready,scope,setScope]);
 const query=params.get("q")??"",kind=["coursebook","workbook"].includes(params.get("kind")??"")?params.get("kind")!:"all";
 const tracks=book.audio.filter(track=>matches(tagsForLesson(track.lesson))&&(kind==="all"||kind===track.kind)&&`${track.label} ${track.transcript?.lines.map(line=>line.text).join(" ")}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
 const active=book.audio.find(track=>track.id===params.get("track"))??tracks[0];
 const outsideResults=active&&!tracks.some(track=>track.id===active.id);
 function navigate(nextQuery:string,nextKind:string,track?:string){
  const next=new URLSearchParams();if(nextQuery)next.set("q",nextQuery);if(nextKind!=="all")next.set("kind",nextKind);if(track)next.set("track",track);
  window.history.replaceState(null,"",`${window.location.pathname}${next.size?`?${next}`:""}`);
 }
 return <div className="study-workspace listening-workspace">
  <header className="study-page-header"><div><p className="study-eyebrow">Listening hub</p><h1>Listen. Read. Listen again.</h1><p>Choose one recording. Listen first, then explore its publisher transcript.</p></div></header>
  <div className="sheet-controls"><label>Find a recording<input value={query} onChange={event=>{setLimit(12);navigate(event.target.value,kind);}} placeholder="Exercise or transcript text…"/></label><label>Book<select value={kind} onChange={event=>{setLimit(12);navigate(query,event.target.value);}}><option value="all">Both books</option><option value="coursebook">Coursebook</option><option value="workbook">Workbook</option></select></label><AudioSpeedControl control={speed}/></div>
  <p role="status">{tracks.length} recordings in your selection.</p>
  <div className="listening-focus-layout">
   {active?<article className="panel listening-focus" data-course-track={active.id}><p className="study-eyebrow">{active.kind==="coursebook"?"Coursebook":"Workbook"} · Lesson {active.lesson}</p><h2>{active.label}</h2><StudyScopeNotice tags={tagsForLesson(active.lesson)} subject="This selected recording"/>{outsideResults&&<p>This recording is outside the current results. <button type="button" className="study-secondary" onClick={()=>navigate(query,kind)}>Return to matching recordings</button></p>}<OriginalTrack key={active.id} track={active} rate={speed.speed}/><Link href={bookContextHref(active.pageId,{track:active.id})}>Open this exercise in the book →</Link></article>:<p>No recordings match. Change the study selection or search.</p>}
   <aside className="recording-browser" aria-label="Choose a recording"><h2>Recordings</h2><div>{tracks.slice(0,limit).map(track=><button type="button" key={track.id} aria-pressed={active?.id===track.id} onClick={()=>navigate(query,kind,track.id)}><small>{track.kind==="coursebook"?"Coursebook":"Workbook"} · Lesson {track.lesson}</small><strong>{track.label}</strong><span>{track.transcript?"Transcript available":"Original recording"}</span></button>)}</div>{limit<tracks.length&&<button type="button" className="study-secondary" onClick={()=>setLimit(limit+12)}>Show 12 more recordings</button>}</aside>
  </div>
 </div>;
}
