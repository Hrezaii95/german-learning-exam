"use client";
import { useRef, useState } from "react";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import type { GeneratedTask,GradeResult,TaskAnswer } from "../../../../packages/wortwerk/src/tasks.js";
import { Corners } from "./mechanics/Corners";
import { Sort } from "./mechanics/Sort";
import { Build } from "./mechanics/Build";
import { Order } from "./mechanics/Order";
import { Gap } from "./mechanics/Gap";
import { Listen } from "./mechanics/Listen";
import { Hotspot } from "./mechanics/Hotspot";
import { Match } from "./mechanics/Match";
import { Record } from "./mechanics/Record";
import { Write } from "./mechanics/Write";
import { wortwerkStore } from "@/lib/wortwerk/store";
export type TaskAnswerEvidence={hinted?:boolean};
export type TaskRendererProps={task:GeneratedTask;onAnswer:(answer:TaskAnswer,evidence?:TaskAnswerEvidence)=>void;result?:GradeResult|null;disabled?:boolean;onLearn?:(word:string)=>void;allowHints?:boolean};
export function TaskRenderer(props:TaskRendererProps){return <TaskRendererTask key={props.task.id} {...props}/>;}
function TaskRendererTask(props:TaskRendererProps){
 const hintUsed=useRef(false);
 const [shown,setShown]=useState(false);
 const [answered,setAnswered]=useState(false);
 const eligible=props.allowHints!==false&&props.task.question.hintsAllowed===true&&props.task.dimension==="meaning"&&!!props.task.feedback.image;
 function answer(value:TaskAnswer){
  setAnswered(true);
  if(hintUsed.current)props.onAnswer(value,{hinted:true});else props.onAnswer(value);
 }
 const mechanicProps={...props,onAnswer:answer};
 const interaction=renderMechanic(mechanicProps);
 return <>{interaction}{eligible&&!props.result&&!answered?<div className="ww-illustration-hint" style={{color:"var(--ink, #203536)"}}>
  {shown?<><img src={withPagesBaseAssetPath(props.task.feedback.image!)} alt="Illustration hint" width={144} height={144} style={{maxWidth:"100%",objectFit:"contain",filter:"grayscale(1)"}}/><p role="status">Illustration hint shown. This answer counts as hinted practice.</p></>:<><button className="ww-button" type="button" disabled={props.disabled} onClick={()=>{hintUsed.current=true;setShown(true);}}>Show illustration hint</button><p className="ww-muted">Using the illustration counts as hinted practice.</p></>}
 </div>:null}</>;
}
function renderMechanic(props:TaskRendererProps){
 switch(props.task.mechanic){
  case "corners":return <Corners {...props}/>;
  case "sort":return <Sort {...props}/>;
  case "build":return <Build {...props}/>;
  case "order":return <Order {...props}/>;
  case "gap":return <Gap {...props}/>;
  case "listen":return <Listen {...props}/>;
  case "hotspot":return <Hotspot {...props} onLearn={props.onLearn ?? (word => { wortwerkStore.appendEvent("deck.add", { packId: props.task.packId, itemId: props.task.itemId, word }); })}/>;
  case "match":return <Match {...props}/>;
  case "record":return <Record {...props}/>;
  case "write":return <Write {...props}/>;
  default:return <p role="alert">This interaction is unavailable in this version.</p>;
 }
}
