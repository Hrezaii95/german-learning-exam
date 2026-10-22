"use client";
import { Icon } from "@/components/media/Icon";
import {useState} from "react";
import {foodModels,foodSentence,foodMeaning,foodSaveId} from "@/lib/study/food-sheet";
import {foodPortionCue,foodOrderChoices,foodBookmark,type FoodSettings} from "@/lib/study/food-learning";
import {tagsForLesson} from "@/lib/study/scope";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {StudyScopeNotice} from "./StudyScope";
import {foodIllustrationPaths} from "@/lib/study/food-illustrations";
import {SubjectVocabularyVisual} from "./SubjectIllustration";


export function FoodIllustration({index}:{index:number}){return <SubjectVocabularyVisual className="food-illustration" de={foodModels[index]?.de??""} category="Food" cardId={`food-${index}`} subject="food" drawing={{kind:`food:${index}`,path:foodIllustrationPaths[index]}}/>;}

export function FoodOrdering({state,speech,onNext}:{state:FoodSettings;speech:Record<string,string>;onNext:()=>void}){
 const [role,setRole]=useState("customer"),[revealed,setRevealed]=useState<number[]>([]),[answer,setAnswer]=useState<string|null>(null);
 const sentence=foodSentence(state.food,"wish",false),cue=foodPortionCue(state.food);
 const turns=[{role:"waiter",de:"Sie wünschen?",en:"What would you like?",id:"l9-phrase-12"},{role:"customer",de:sentence,en:foodMeaning(state.food,"wish",false),id:foodSaveId(state.food,"wish",false)},{role:"waiter",de:"Hier bitte.",en:"There you are.",id:"l9-phrase-11"},{role:"waiter",de:"Guten Appetit!",en:"Enjoy your meal!",id:"l9-phrase-10"}];
 return <section id="food-order"><h2>Your turn at the café.</h2><StudyScopeNotice tags={tagsForLesson(9)} subject="This ordering practice"/><p>Use your selected food. Say your hidden turn aloud, then reveal and listen. This is a self-check, not a pronunciation score.</p><label>Your role<select value={role} onChange={event=>{setRole(event.target.value);setRevealed([]);}}><option value="customer">Customer</option><option value="waiter">Waiter</option></select></label><div className="food-order-turns">{turns.map((turn,index)=><article key={index} data-role={turn.role}><small>{index+1} · {turn.role.toUpperCase()}{turn.role===role?" · YOUR TURN":""}</small>{turn.role!==role||revealed.includes(index)?<><p><GermanText text={turn.de}/><LineAudio compact text={turn.de} src={speech[turn.de]}/></p><p>{turn.en}</p><SaveButton item={{id:turn.id,title:turn.de,meaning:turn.en,kind:"phrase",lesson:9,href:`/cheat-sheets/food${foodBookmark({...state,mode:"wish",negative:false},"order")}`,audio:speech[turn.de]??null}}/></>:<><p>{turn.en}</p><button type="button" className="study-secondary" onClick={()=>setRevealed([...revealed,index])}>Reveal my turn</button></>}</article>)}</div><div className="sheet-practice"><h3>Which article completes your order?</h3><p>Choose the sentence for <b lang="de">{foodModels[state.food]!.de}</b>.</p><div className="sheet-quiz-options">{foodOrderChoices(state.food).map(option=><button type="button" key={option} lang="de" disabled={answer!==null} data-answer={answer===null?undefined:option===sentence?"correct":option===answer?"wrong":undefined} onClick={()=>setAnswer(option)}>{option}</button>)}</div>{answer!==null&&<div className="sheet-feedback" role="status"><strong>{answer===sentence?"Exactly.":"Look at the noun that names the serving."}</strong><p lang="de">{sentence}</p><p>{cue.cue}</p><button type="button" className="study-primary" onClick={onNext}>Try another food <Icon name="arrow"/></button></div>}</div></section>;
}
