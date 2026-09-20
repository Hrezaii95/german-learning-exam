"use client";
import Link from "next/link";
import {useState,useEffect,useRef} from "react";
import {useSearchParams} from "next/navigation";
import type {BookManifest} from "@/lib/study/types";
import type {StudyUnit} from "@/lib/study/course-lessons";
import {availableLessons,tagsForLesson} from "@/lib/study/scope";
import {CoursePatterns} from "./CourseStudy";
import {OriginalTrack} from "./BookReader";
import {AudioSpeedControl,useAudioSpeed} from "@/components/audio/AudioSpeedControl";
import {useStudyScope,StudyTagList} from "./StudyScope";

export function CourseHubAdditions({units,section,speech}:{units:StudyUnit[];section:string;speech:Record<string,string>}){
  const params=useSearchParams();
  return <CoursePatterns units={units} section={section} speech={speech} query={params.get("q")??""}/>;
}
export function CourseListening({book}:{book:BookManifest}){
  const audioSpeed=useAudioSpeed(); const rate=audioSpeed.speed;
  const {scope,setScope,ready,matches}=useStudyScope();
  const params=useSearchParams();
  const applied=useRef(false);
  useEffect(()=>{if(!ready||applied.current)return;applied.current=true;const n=Number(params.get("lesson"));if(availableLessons().includes(n))setScope({...scope,mode:"one",lessons:[n]});},[params,ready,scope,setScope]);
  const [query,setQuery]=useState(params.get("q")??""),[kind,setKind]=useState("all");
  const tracks=book.audio.filter(t=>matches(tagsForLesson(t.lesson))&&(kind==="all"||kind===t.kind)&&`${t.label} ${t.transcript?.lines.map(l=>l.text).join(" ")}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  return <div className="study-workspace"><header className="study-page-header"><div><p className="study-eyebrow">Listening hub</p><h1>Listen. Read. Listen again.</h1><p>Original coursebook and workbook recordings with their publisher transcripts.</p></div></header><div className="sheet-controls"><label>Find a recording<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Exercise or transcript text…"/></label><label>Book<select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Both books</option><option value="coursebook">Coursebook</option><option value="workbook">Workbook</option></select></label><AudioSpeedControl control={audioSpeed}/></div><p role="status">{tracks.length} recordings in your selection.</p><div className="course-listening">{tracks.map(t=><article className="panel" key={t.id} data-course-track={t.id}><StudyTagList tags={tagsForLesson(t.lesson)}/><h2>{t.kind==="coursebook"?"Coursebook":"Workbook"} · Lesson {t.lesson}</h2><OriginalTrack track={t} rate={rate}/><Link href={`/book?page=${t.pageId}`}>Open this exercise in the book →</Link></article>)}</div>{!tracks.length&&<p>No recordings match. Change the study selection or search.</p>}</div>;
}
