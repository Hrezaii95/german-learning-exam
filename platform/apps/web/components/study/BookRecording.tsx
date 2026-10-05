"use client";
import { LButton, LDiv, LP, LSpan, LStrong } from "@/components/i18n/LocalizedElements";

import {useEffect,useRef,useState} from "react";
import type {BookTrack} from "@/lib/study/types";
import {withPagesBaseAssetPath} from "@/lib/content/pages-base-path";
import {bookContextHref,recordingTime} from "@/lib/study/book-reading";
import {ListeningTranscript} from "@/components/audio/ListeningTranscript";
import {useStudy} from "./StudyProvider";
import {stopStudyAudio} from "./StudyAudio";

export function OriginalTrack({track,rate,transcriptLine}:{track:BookTrack;rate:number;transcriptLine?:number}){
 const ref=useRef<HTMLAudioElement>(null),lastRecorded=useRef(0);
 const [failed,setFailed]=useState(false),[repeat,setRepeat]=useState(false);
 const study=useStudy(),resume=study?.state.audioProgress?.[track.id]??0;
 useEffect(()=>{if(ref.current)ref.current.playbackRate=rate;},[rate]);
 function remember(force=false){
  const position=Math.floor(ref.current?.currentTime??0);
  if(!study?.ready||!Number.isFinite(position)||position<0||position>14400||(!force&&Math.abs(position-lastRecorded.current)<5))return;
  lastRecorded.current=position;
  study.update(old=>old.audioProgress?.[track.id]===position?old:{...old,audioProgress:{...old.audioProgress,[track.id]:position}});
 }
 async function playFrom(position:number){
  const audio=ref.current;if(!audio)return;
  try{setFailed(false);audio.currentTime=position;await audio.play();}catch{setFailed(true);}
 }
 return <LDiv className="book-track" data-recording-id={track.id}>
  <LDiv className="study-row"><LStrong>{track.label}</LStrong><LSpan className="study-tag">Original audio</LSpan></LDiv>
  {/* The publisher transcript provides a readable alternative below. */}
  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
  <audio ref={ref} src={withPagesBaseAssetPath(track.src)} controls preload="none" loop={repeat}
   aria-label={`${track.kind} ${track.label}, original recording`} onError={()=>setFailed(true)}
   onPlay={event=>{stopStudyAudio(event.currentTarget);event.currentTarget.playbackRate=rate;}}
   onTimeUpdate={()=>remember()} onPause={()=>remember(true)}
   onEnded={()=>{study?.update(old=>({...old,audioProgress:{...old.audioProgress,[track.id]:0}}));lastRecorded.current=0;}}/>
  <LDiv className="study-row recording-tools">
   <LButton type="button" className="study-secondary" onClick={()=>void playFrom(0)}>Play from start</LButton>
   {resume>0&&<LButton type="button" className="study-secondary" onClick={()=>void playFrom(resume)}>Resume at {recordingTime(resume)}</LButton>}
   <LButton type="button" className="study-secondary" aria-pressed={repeat} onClick={()=>setRepeat(!repeat)}>Repeat recording</LButton>
  </LDiv>
  <ListeningTranscript key={`${track.id}-${transcriptLine??"closed"}`} transcript={track.transcript} href={bookContextHref(track.pageId,{track:track.id})} lesson={track.lesson} initialOpen={transcriptLine!==undefined} {...(transcriptLine!==undefined?{activeLine:transcriptLine}:{})}/>
  {failed&&<LP role="alert">Recording could not play. <LButton type="button" onClick={()=>{setFailed(false);ref.current?.load();}}>Retry audio</LButton></LP>}
 </LDiv>;
}
