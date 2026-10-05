"use client";
import { LArticle, LAside, LButton, LDiv, LH1, LH2, LHeader, LInput, LLabel, LOption, LP, LSelect, LSmall, LSpan, LStrong } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
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
 return <LDiv className="study-workspace listening-workspace">
  <LHeader className="study-page-header"><LDiv><LP className="study-eyebrow">Listening hub</LP><LH1>Listen. Read. Listen again.</LH1><LP>Choose one recording. Listen first, then explore its publisher transcript.</LP></LDiv></LHeader>
  <LDiv className="sheet-controls"><LLabel>Find a recording<LInput value={query} onChange={event=>{setLimit(12);navigate(event.target.value,kind);}} placeholder="Exercise or transcript text…"/></LLabel><LLabel>Book<LSelect value={kind} onChange={event=>{setLimit(12);navigate(query,event.target.value);}}><LOption value="all">Both books</LOption><LOption value="coursebook">Coursebook</LOption><LOption value="workbook">Workbook</LOption></LSelect></LLabel><AudioSpeedControl control={speed}/></LDiv>
  <LP role="status">{tracks.length} recordings in your selection.</LP>
  <LDiv className="listening-focus-layout">
   {active?<LArticle className="panel listening-focus" data-course-track={active.id}><LP className="study-eyebrow">{active.kind==="coursebook"?"Coursebook":"Workbook"} · Lesson {active.lesson}</LP><LH2>{active.label}</LH2><StudyScopeNotice tags={tagsForLesson(active.lesson)} subject="This selected recording"/>{outsideResults&&<LP>This recording is outside the current results. <LButton type="button" className="study-secondary" onClick={()=>navigate(query,kind)}>Return to matching recordings</LButton></LP>}<OriginalTrack key={active.id} track={active} rate={speed.speed}/><Link href={bookContextHref(active.pageId,{track:active.id})}>Open this exercise in the book →</Link></LArticle>:<LP>No recordings match. Change the study selection or search.</LP>}
   <LAside className="recording-browser" aria-label="Choose a recording"><LH2>Recordings</LH2><LDiv>{tracks.slice(0,limit).map(track=><LButton type="button" key={track.id} aria-pressed={active?.id===track.id} onClick={()=>navigate(query,kind,track.id)}><LSmall>{track.kind==="coursebook"?"Coursebook":"Workbook"} · Lesson {track.lesson}</LSmall><LStrong>{track.label}</LStrong><LSpan>{track.transcript?"Transcript available":"Original recording"}</LSpan></LButton>)}</LDiv>{limit<tracks.length&&<LButton type="button" className="study-secondary" onClick={()=>setLimit(limit+12)}>Show 12 more recordings</LButton>}</LAside>
  </LDiv>
 </LDiv>;
}
