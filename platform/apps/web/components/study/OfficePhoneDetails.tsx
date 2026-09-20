"use client";
import {useState} from "react";
import Link from "next/link";
import type {WordCard} from "@/lib/content/word-card-types";
import {officePracticeDigits as practiceDigits,officePhoneSpeech} from "@/lib/study/object-learning";
import {spellingName,spellingUtterance} from "@/lib/study/conversation-learning";
import {LineAudio} from "./StudyAudio";

export function OfficePhoneDetails({alphabet,speech}:{alphabet:WordCard[];speech:Record<string,string>}){
 const [index,setIndex]=useState(0),[answer,setAnswer]=useState(""),[checked,setChecked]=useState(false),[name,setName]=useState("Sara");
 const spelling=spellingName(name),correct=answer.replace(/\s/g,"")===practiceDigits[index];
 return <section id="phone-details"><h2>Catch the digits. Spell the name.</h2><div className="phone-lab"><div className="phone-turn"><h3>Listen and write four digits.</h3><p>Short practice sequences, including a leading zero.</p><LineAudio text={officePhoneSpeech[index]!} src={speech[officePhoneSpeech[index]!]} label="practice digits"/><label>Digits you heard<input inputMode="numeric" autoComplete="off" value={answer} onChange={event=>{setAnswer(event.target.value);setChecked(false);}} maxLength={12}/></label><button type="button" className="study-primary" disabled={!answer.trim()} onClick={()=>setChecked(true)}>Check digits</button>{checked&&<div role="status"><p>{correct?"Exactly.":"Listen again and compare:"} <b>{practiceDigits[index]}</b></p><p>Read each digit separately. Keep a zero at the beginning.</p><button type="button" className="study-secondary" onClick={()=>{setIndex((index+1)%practiceDigits.length);setAnswer("");setChecked(false);}}>Next sequence →</button></div>}</div><div className="phone-turn"><h3>Spell a caller’s name.</h3><label>Name to spell<input value={name} onChange={event=>setName(event.target.value)} maxLength={80} autoComplete="off" spellCheck={false}/></label>{spelling.error?<p role="status">{spelling.error}</p>:<><p lang="de">{spelling.letters.join(" · ")}</p><LineAudio text={spellingUtterance(spelling.letters,alphabet)} label="name spelling"/></>}<p>Custom names use device-generated German speech. The name is not saved.</p><Link href="/cheat-sheets/conversation#conversation-spelling">All thirty letter sounds →</Link></div></div></section>;
}
