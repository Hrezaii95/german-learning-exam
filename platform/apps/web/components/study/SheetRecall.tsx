"use client";
import {useState} from "react";
import type {RecallQuestion} from "@/lib/study/sheet-recall";
import {SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";

export function SheetRecall({questions,speech,prefix,rate}:{questions:RecallQuestion[];speech:Record<string,string>;prefix:"country"|"home"|"sheet";rate?:number}){
  const [position,setPosition]=useState(0);
  const [answer,setAnswer]=useState<string|null>(null);
  const [score,setScore]=useState(0);
  const question=questions[position];
  if(!questions.length)return <div className={`${prefix}-quiz`} role="status"><h3>No matching practice items</h3><p>Change your study selection or clear the index filters to build a practice set.</p></div>;
  return <div className={`${prefix}-quiz`}>
    {question?<><span>Question {position+1} / {questions.length}</span><h3>{question.prompt}</h3>
      <div className={`${prefix}-quiz-options`}>{question.options.map(option=><button type="button" key={option} lang="de" disabled={answer!==null} aria-pressed={answer===option} data-answer={answer===null?undefined:question.answers.includes(option)?"correct":answer===option?"wrong":undefined} onClick={()=>{setAnswer(option);if(question.answers.includes(option))setScore(score+1);}}>{option}</button>)}</div>
      {answer!==null&&<div className={prefix==="country"?"country-quiz-feedback":`${prefix}-feedback`} role="status"><strong>{question.answers.includes(answer)?"Exactly.":"Keep this pattern:"}</strong><p lang="de">{question.answerText} <LineAudio text={question.answerText} src={speech[question.answerText]} compact {...(rate===undefined?{}:{rate})}/></p><p>{question.explanation}</p><div className="study-row"><SaveButton item={question.item}/><button type="button" className="study-primary" onClick={()=>{setPosition(position+1);setAnswer(null);}}>Next →</button></div></div>}
    </>:<div role="status"><h3>{score} / {questions.length}</h3><p>{score===questions.length?"Every answer remembered. Try recalling the index next.":"Save the tricky items and try again."}</p><button type="button" className="study-primary" onClick={()=>{setPosition(0);setAnswer(null);setScore(0);}}>Practise again</button></div>}
  </div>;
}
