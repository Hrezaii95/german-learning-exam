"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../../packages/wortwerk/src/tasks.js";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { QuestionAudio } from "../QuestionAudio";
import { TaskFeedback } from "../TaskFeedback";

export type MechanicProps = {task:GeneratedTask;onAnswer:(answer:TaskAnswer)=>void;result?:GradeResult|null;disabled?:boolean};
const target={minHeight:44,minWidth:44};

/** Every response path shares one guarded submission and one feedback projection. */
export function Gap(props:MechanicProps){return <ResponseTask key={props.task.id} {...props}/>;}
export function ResponseTask({task,onAnswer,result,disabled=false,children,audioPlaybackRate}:MechanicProps&{children?:ReactNode;audioPlaybackRate?:number}){
  const title=useId();
  const prompt=useRef<HTMLHeadingElement>(null);
  const input=useRef<HTMLInputElement>(null);
  const submitted=useRef(false);
  const [waiting,setWaiting]=useState(false);
  const [text,setText]=useState("");
  const [tiles,setTiles]=useState<string[]>([]);
  const [announcement,setAnnouncement]=useState("");
  const locked=disabled||waiting||!!result;
  const question=task.question;
  const tokens=question.tokens??[];
  useEffect(()=>{if(question.input==="text")input.current?.focus();else prompt.current?.focus();},[question.input]);
  function submit(answer:TaskAnswer){
    if(locked||submitted.current)return;
    if(typeof answer==="string"&&!answer.trim())return;
    submitted.current=true;setWaiting(true);onAnswer(answer);
  }
  function addTile(id:string){
    if(locked||tiles.includes(id))return;
    setTiles([...tiles,id]);setAnnouncement(`Tile ${tiles.length+1} placed.`);
  }
  function move(index:number,delta:number){
    if(locked||index+delta<0||index+delta>=tiles.length)return;
    const next=[...tiles];[next[index],next[index+delta]]=[next[index+delta]!,next[index]!];setTiles(next);
    setAnnouncement(`Tile moved to position ${index+delta+1}.`);
  }
  return <section className="ww-task" aria-labelledby={title}>
    <h2 id={title} ref={prompt} tabIndex={-1}>{question.instruction}</h2>
    {result?<TaskFeedback feedback={task.feedback} result={result} lang={question.lang}/>:<>
      {question.text?<p className="ww-prompt" lang={question.lang} style={{overflowWrap:"break-word",hyphens:"auto"}}>{question.text}</p>:null}
      {question.audio?<QuestionAudio key={question.audio.src} audio={question.audio} {...(audioPlaybackRate!==undefined?{playbackRate:audioPlaybackRate}:{})}/>:null}
      {children}
      {question.input==="choice"?<>
        <button type="button" className="ww-button" style={target} draggable={!locked} disabled={locked}
          onDragStart={event=>event.dataTransfer.setData("text/plain",task.id)}>Drag this task to an option, or choose an option below</button>
        <div className="ww-options" role="group" aria-label="Answer options">
          {question.options.map((option,index)=><button key={option.id} type="button" className="ww-option" style={target} disabled={locked}
            onClick={()=>submit(option.id)} onDragOver={event=>event.preventDefault()}
            onDrop={event=>{event.preventDefault();if(event.dataTransfer.getData("text/plain")===task.id)submit(option.id);}}>
            {option.image?<img src={withPagesBaseAssetPath(option.image)} alt={`Option ${index+1}`} width={144} height={144}/>:<span lang={question.lang}>{option.text??`Option ${index+1}`}</span>}
          </button>)}
        </div>
      </>:question.input==="sequence"?<>
        <p>Choose tiles in order. You can also drag a tile to “Place next tile”.</p>
        <div className="ww-options" role="group" aria-label="Available tiles">
          {tokens.map((token,index)=><button key={token.id} type="button" className="ww-option" style={target} draggable={!locked&&!tiles.includes(token.id)} disabled={locked||tiles.includes(token.id)}
            onClick={()=>addTile(token.id)} onDragStart={event=>event.dataTransfer.setData("text/plain",`${task.id}|${token.id}`)}>
            <span lang={question.lang}>{token.text?.trim()?token.text:"Space"}</span>{" "}<span className="sr-only"> · tile {index+1}</span>
          </button>)}
        </div>
        <button type="button" className="ww-button" style={target} disabled={locked} onDragOver={event=>event.preventDefault()}
          onDrop={event=>{event.preventDefault();const value=event.dataTransfer.getData("text/plain");const token=tokens.find(t=>value===`${task.id}|${t.id}`);if(token)addTile(token.id);}}>Place next tile</button>
        <ol aria-label="Your tile order">
          {tiles.map((id,index)=><li key={id}>
            <span lang={question.lang}>{tokens.find(token=>token.id===id)?.text?.trim()||"Space"}</span>{" "}
            <button type="button" className="ww-button" style={target} disabled={locked||index===0} aria-label={`Move tile ${index+1} earlier`} onClick={()=>move(index,-1)}>Earlier</button>{" "}
            <button type="button" className="ww-button" style={target} disabled={locked||index===tiles.length-1} aria-label={`Move tile ${index+1} later`} onClick={()=>move(index,1)}>Later</button>{" "}
            <button type="button" className="ww-button" style={target} disabled={locked} aria-label={`Remove tile ${index+1}`} onClick={()=>setTiles(tiles.filter(tile=>tile!==id))}>Remove</button>
          </li>)}
        </ol>
        <button type="button" className="ww-button" style={target} disabled={locked||!tiles.length} onClick={()=>setTiles([])}>Start again</button>{" "}
        <button type="button" className="ww-button" style={target} disabled={locked||tiles.length!==tokens.length} onClick={()=>submit(tiles)}>Check answer</button>
      </>:<form onSubmit={event=>{event.preventDefault();submit(text);}}>
        <label htmlFor={`${title}-answer`}>Your answer</label>
        <input id={`${title}-answer`} ref={input} value={text} disabled={locked} autoComplete="off" autoCapitalize="none" spellCheck={false} lang={question.lang} onChange={event=>setText(event.target.value)} style={{...target,maxWidth:"100%"}}/>
        {question.helperKeys.length?<div role="group" aria-label="Typing helpers">{question.helperKeys.map(key=><button type="button" key={key} className="ww-button" style={target} disabled={locked} onClick={()=>{const start=input.current?.selectionStart??text.length;const end=input.current?.selectionEnd??start;setText(text.slice(0,start)+key+text.slice(end));input.current?.focus();}}>{key}</button>)}</div>:null}
        <button type="submit" className="ww-button" style={target} disabled={locked||!text.trim()}>Check answer</button>
      </form>}
    </>}
    <p role="status" aria-live="polite">{result?(result.correct?"Correct answer.":result.outcome==="almost"?"Almost. Check the form.":"Answer shown. You can practise this again."):waiting?"Answer submitted.":announcement}</p>
  </section>;
}
