"use client";
import { ResponseTask, type MechanicProps } from "./Gap";
import { QuestionAudio } from "../QuestionAudio";
import { useState } from "react";
/** A listening wrapper uses source clips, with transcripts reserved for feedback. */
export function Listen(props:MechanicProps){return <ListenTask key={props.task.id} {...props}/>;}
function ListenTask(props:MechanicProps){
  const rates=props.task.question.audioRates??[1];
  const [rate,setRate]=useState(rates[0]??1);
  return <ResponseTask {...props} audioPlaybackRate={rate}>
    {rates.length>1?<div role="group" aria-label="Playback speed">{rates.map(value=><button type="button" key={value} className="ww-button" style={{minHeight:44,minWidth:44}} disabled={props.disabled} aria-pressed={rate===value} onClick={()=>setRate(value)}>{value}×</button>)}</div>:null}
    {props.task.question.audioSequence?.map((audio,index)=><div key={`${index}:${audio.src}`}><p>Clip {index+1}</p><QuestionAudio audio={audio}/></div>)}
  </ResponseTask>;
}
