"use client";
import {useState} from "react";
import type {BookPage} from "@/lib/study/types";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";

export function BookAnswers({page,speech,rate}:{page:BookPage;speech:Record<string,string>;rate:number}){
  const answers=page.answers??[];
  const [open,setOpen]=useState(false);
  const [hidden,setHidden]=useState<string[]>([]);
  if(!answers.length)return <p className="book-answer-empty">No supplied answer key for this page. Reference pages and open-ended tasks may not have a fixed answer.</p>;
  return <section className="book-answers" aria-label={`Answers for ${page.kind} page ${page.printedPage}`}>
    <button type="button" className="book-answer-toggle" aria-expanded={open} onClick={()=>{setOpen(!open);setHidden([]);}}><span>{open?"Hide answers":"Show answers"}</span><span>{answers.length} available · {page.pageLabel??`Page ${page.printedPage}`}</span><span aria-hidden="true">{open?"−":"+"}</span></button>
    {open&&<div className="book-answer-list"><p className="book-answer-intro">Try the exercise first, then compare. Sample responses are examples, so your wording may differ.</p>{answers.map(answer=>{const shown=!hidden.includes(answer.id);return <article key={answer.id} data-book-answer={answer.id}><header><div><h3>{answer.exercise}</h3><span className="study-tag">{answer.kind==="sample"?"Official sample response":answer.source==="workbook-transcript"?"From the publisher’s recording":"Official solution"}</span></div><button type="button" className="study-secondary" aria-expanded={shown} aria-label={`${shown?"Hide":"Show"} answer: ${answer.exercise}`} onClick={()=>setHidden(shown?[...hidden,answer.id]:hidden.filter(id=>id!==answer.id))}>{shown?"Hide answer":"Show answer"}</button></header>{shown&&<div className="book-answer-content"><div lang="de">{answer.text.split(/\n+/).map((text,index)=><p key={index}><GermanText text={text}/><LineAudio text={text} src={speech[text]} compact rate={rate}/></p>)}</div>{answer.note&&<p className="book-answer-note">{answer.note}</p>}<div className="book-answer-footer"><small>{answer.sourceTitle} · p. {answer.sourcePage} · © Hueber Verlag</small><SaveButton item={{id:answer.id,title:`${page.kind==="coursebook"?"Coursebook":"Workbook"} · ${page.pageLabel??page.printedPage} · ${answer.exercise}`,meaning:answer.text,kind:"concept",href:`/book?page=${page.id}`,lesson:page.lesson}}/></div></div>}</article>;})}<p className="book-answer-note">Only answers present in the available sources are shown. A missing exercise number does not mean your own response is wrong.</p></div>}
  </section>;
}
