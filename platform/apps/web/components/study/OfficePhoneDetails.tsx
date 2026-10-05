"use client";
import { LB, LButton, LDiv, LH2, LH3, LInput, LLabel, LP, LSection } from "@/components/i18n/LocalizedElements";

import {useState} from "react";
import Link from "@/components/i18n/LocalizedLink";
import type {WordCard} from "@/lib/content/word-card-types";
import {officePracticeDigits as practiceDigits,officePhoneSpeech} from "@/lib/study/object-learning";
import {spellingName,spellingUtterance} from "@/lib/study/conversation-learning";
import {LineAudio} from "./StudyAudio";

export function OfficePhoneDetails({alphabet,speech}:{alphabet:WordCard[];speech:Record<string,string>}){
 const [index,setIndex]=useState(0),[answer,setAnswer]=useState(""),[checked,setChecked]=useState(false),[name,setName]=useState("Sara");
 const spelling=spellingName(name),correct=answer.replace(/\s/g,"")===practiceDigits[index];
 return <LSection id="phone-details"><LH2>Catch the digits. Spell the name.</LH2><LDiv className="phone-lab"><LDiv className="phone-turn"><LH3>Listen and write four digits.</LH3><LP>Short practice sequences, including a leading zero.</LP><LineAudio text={officePhoneSpeech[index]!} src={speech[officePhoneSpeech[index]!]} label="practice digits"/><LLabel>Digits you heard<LInput inputMode="numeric" autoComplete="off" value={answer} onChange={event=>{setAnswer(event.target.value);setChecked(false);}} maxLength={12}/></LLabel><LButton type="button" className="study-primary" disabled={!answer.trim()} onClick={()=>setChecked(true)}>Check digits</LButton>{checked&&<LDiv role="status"><LP>{correct?"Exactly.":"Listen again and compare:"} <LB>{practiceDigits[index]}</LB></LP><LP>Read each digit separately. Keep a zero at the beginning.</LP><LButton type="button" className="study-secondary" onClick={()=>{setIndex((index+1)%practiceDigits.length);setAnswer("");setChecked(false);}}>Next sequence →</LButton></LDiv>}</LDiv><LDiv className="phone-turn"><LH3>Spell a caller’s name.</LH3><LLabel>Name to spell<LInput value={name} onChange={event=>setName(event.target.value)} maxLength={80} autoComplete="off" spellCheck={false}/></LLabel>{spelling.error?<LP role="status">{spelling.error}</LP>:<><LP lang="de">{spelling.letters.join(" · ")}</LP><LineAudio text={spellingUtterance(spelling.letters,alphabet)} label="name spelling"/></>}<LP>Custom names use device-generated German speech. The name is not saved.</LP><Link href="/cheat-sheets/conversation#conversation-spelling">All thirty letter sounds →</Link></LDiv></LDiv></LSection>;
}
