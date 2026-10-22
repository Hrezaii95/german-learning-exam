"use client";

import { useMemo,useState } from "react";
import type { GeneratedTask,GradeResult,TaskAnswer,TaskTemplate } from "../../../../packages/wortwerk/src/tasks.js";
import { seededRng } from "../../../../packages/wortwerk/src/random.js";
import type { LanguageProfile } from "../../../../packages/content/src/types/packs.js";
import { PLAY_TEMPLATES } from "@/lib/wortwerk/runtime";
import { usePlayContent } from "./PlayProvider";
import { TaskRenderer } from "./TaskRenderer";

const ignoreLearn=(_word:string):void=>undefined;
const PAGE_SIZE=100;
function PreviewCard({task,template,language}:{task:GeneratedTask;template:TaskTemplate;language:LanguageProfile}){
  const [open,setOpen]=useState(false);
  const [result,setResult]=useState<GradeResult|null>(null);
  const [attempt,setAttempt]=useState(0);
  function answer(value:TaskAnswer){setResult(template.grade(task,value,language));}
  return <details onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{task.templateId} · {task.itemId}</summary>
    {open?<>
      <TaskRenderer key={attempt} task={{...task,id:`${task.id}:${attempt}`}} onAnswer={answer} result={result} onLearn={ignoreLearn}/>
      <button className="ww-button" type="button" onClick={()=>{setResult(null);setAttempt(value=>value+1);}}>Reset preview</button>
    </>:null}
  </details>;
}
function PreviewPack(){
  const content=usePlayContent();
  const [pick,setPick]=useState("");
  const [page,setPage]=useState(0);
  const active=content?.packs.find(entry=>entry.pack.id===pick)??content?.packs[0];
  const tasks=useMemo(()=>active?active.pack.items.flatMap(item=>PLAY_TEMPLATES.flatMap(template=>{
    if(!template.requires(item))return [];
    const task=template.generate(item,active.pack,active.language,active.difficulty,seededRng(`${item.id}:${template.id}:preview`));
    return task?[{task,template}]:[];
  })):[],[active]);
  const lastPage=Math.max(0,Math.ceil(tasks.length/PAGE_SIZE)-1);
  const currentPage=Math.min(page,lastPage);
  const visible=tasks.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  return <div className="ww-page">
    <h1>Task preview</h1>
    <p>Authoring view · answers here do not change XP, progress, or your personal deck. Models and source details appear after submission.</p>
    {active?<>
      <label>Content pack <select value={active.pack.id} onChange={event=>{setPick(event.target.value);setPage(0);}}>{content?.packs.map(entry=><option key={entry.pack.id} value={entry.pack.id}>{entry.pack.title}</option>)}</select></label>
      <p>{tasks.length} generated tasks · {active.pack.review.status}</p>
      {tasks.length?<>
        <p>Tasks {currentPage*PAGE_SIZE+1}–{Math.min((currentPage+1)*PAGE_SIZE,tasks.length)} of {tasks.length}. Open a task to try its question and feedback states.</p>
        {visible.map(({task,template})=><PreviewCard key={`${task.packId}:${task.templateId}:${task.itemId}`} task={task} template={template} language={active.language}/>)}
        {lastPage>0?<nav className="ww-actions" aria-label="Task preview pages">
          <button className="ww-button" type="button" disabled={currentPage===0} onClick={()=>setPage(value=>Math.max(0,value-1))}>Previous tasks</button>
          <span>Page {currentPage+1} of {lastPage+1}</span>
          <button className="ww-button" type="button" disabled={currentPage===lastPage} onClick={()=>setPage(value=>Math.min(lastPage,value+1))}>Next tasks</button>
        </nav>:null}
      </>:<p>This pack has no tasks supported by the installed templates.</p>}
    </>:<p>No content packs installed.</p>}
  </div>;
}
export function TaskPreview(){return <PreviewPack/>;}
