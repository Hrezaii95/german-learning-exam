"use client";
import { LButton, LDiv, LH3, LP, LSpan, LStrong } from "@/components/i18n/LocalizedElements";

import {useState} from "react";
import type {RecallQuestion} from "@/lib/study/sheet-recall";
import {SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";

export function SheetRecall({questions,speech,prefix,rate}:{questions:RecallQuestion[];speech:Record<string,string>;prefix:"country"|"home"|"sheet";rate?:number}){
  const [position,setPosition]=useState(0);
  const [answer,setAnswer]=useState<string|null>(null);
  const [score,setScore]=useState(0);
  const question=questions[position];
  if(!questions.length)return <LDiv className={`${prefix}-quiz`} role="status"><LH3>No matching practice items</LH3><LP>Change your study selection or clear the index filters to build a practice set.</LP></LDiv>;
  return <LDiv className={`${prefix}-quiz`}>
    {question?<><LSpan>Question {position+1} / {questions.length}</LSpan><LH3>{question.prompt}</LH3>
      <LDiv className={`${prefix}-quiz-options`}>{question.options.map(option=><LButton type="button" key={option} lang="de" disabled={answer!==null} aria-pressed={answer===option} data-answer={answer===null?undefined:question.answers.includes(option)?"correct":answer===option?"wrong":undefined} onClick={()=>{setAnswer(option);if(question.answers.includes(option))setScore(score+1);}}>{option}</LButton>)}</LDiv>
      {answer!==null&&<LDiv className={prefix==="country"?"country-quiz-feedback":`${prefix}-feedback`} role="status"><LStrong>{question.answers.includes(answer)?"Exactly.":"Keep this pattern:"}</LStrong><LP lang="de">{question.answerText} <LineAudio text={question.answerText} src={speech[question.answerText]} compact {...(rate===undefined?{}:{rate})}/></LP><LP>{question.explanation}</LP><LDiv className="study-row"><SaveButton item={question.item}/><LButton type="button" className="study-primary" onClick={()=>{setPosition(position+1);setAnswer(null);}}>Next →</LButton></LDiv></LDiv>}
    </>:<LDiv role="status"><LH3>{score} / {questions.length}</LH3><LP>{score===questions.length?"Every answer remembered. Try recalling the index next.":"Save the tricky items and try again."}</LP><LButton type="button" className="study-primary" onClick={()=>{setPosition(0);setAnswer(null);setScore(0);}}>Practise again</LButton></LDiv>}
  </LDiv>;
}
