"use client";
import { LArticle, LButton, LDiv, LH3, LHeader, LP, LSection, LSmall, LSpan } from "@/components/i18n/LocalizedElements";

import {useState} from "react";
import type {BookPage} from "@/lib/study/types";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";

export function BookAnswers({page,speech,rate}:{page:BookPage;speech:Record<string,string>;rate:number}){
  const answers=page.answers??[];
  const [open,setOpen]=useState(false);
  const [hidden,setHidden]=useState<string[]>([]);
  if(!answers.length)return <LP className="book-answer-empty">No supplied answer key for this page. Reference pages and open-ended tasks may not have a fixed answer.</LP>;
  return <LSection className="book-answers" aria-label={`Answers for ${page.kind} page ${page.printedPage}`}>
    <LButton type="button" className="book-answer-toggle" aria-expanded={open} onClick={()=>{setOpen(!open);setHidden([]);}}><LSpan>{open?"Hide answers":"Show answers"}</LSpan><LSpan>{answers.length} available · {page.pageLabel??`Page ${page.printedPage}`}</LSpan><LSpan aria-hidden="true">{open?"−":"+"}</LSpan></LButton>
    {open&&<LDiv className="book-answer-list"><LP className="book-answer-intro">Try the exercise first, then compare. Sample responses are examples, so your wording may differ.</LP>{answers.map(answer=>{const shown=!hidden.includes(answer.id);return <LArticle key={answer.id} data-book-answer={answer.id}><LHeader><LDiv><LH3>{answer.exercise}</LH3><LSpan className="study-tag">{answer.kind==="sample"?"Official sample response":answer.source==="workbook-transcript"?"From the publisher’s recording":"Official solution"}</LSpan></LDiv><LButton type="button" className="study-secondary" aria-expanded={shown} aria-label={`${shown?"Hide":"Show"} answer: ${answer.exercise}`} onClick={()=>setHidden(shown?[...hidden,answer.id]:hidden.filter(id=>id!==answer.id))}>{shown?"Hide answer":"Show answer"}</LButton></LHeader>{shown&&<LDiv className="book-answer-content"><LDiv lang="de">{answer.text.split(/\n+/).map((text,index)=><LP key={index}><GermanText text={text}/><LineAudio text={text} src={speech[text]} compact rate={rate}/></LP>)}</LDiv>{answer.note&&<LP className="book-answer-note">{answer.note}</LP>}<LDiv className="book-answer-footer"><LSmall>{answer.sourceTitle} · p. {answer.sourcePage} · © Hueber Verlag</LSmall><SaveButton item={{id:answer.id,title:`${page.kind==="coursebook"?"Coursebook":"Workbook"} · ${page.pageLabel??page.printedPage} · ${answer.exercise}`,meaning:answer.text,kind:"concept",href:`/book?page=${page.id}`,lesson:page.lesson}}/></LDiv></LDiv>}</LArticle>;})}<LP className="book-answer-note">Only answers present in the available sources are shown. A missing exercise number does not mean your own response is wrong.</LP></LDiv>}
  </LSection>;
}
