"use client";
import {useState} from "react";
import Link from "next/link";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import {sheetNavigationContext} from "@/lib/study/sheet-browse";
import type {WordCard} from "@/lib/content/word-card-types";
import {foodModels,foodSentence,foodMeaning,foodSaveId} from "@/lib/study/food-sheet";
import {foodMenuGroups,foodPortionCue,foodOrderChoices,foodBookmark,type FoodSettings} from "@/lib/study/food-learning";
import {tagsForLesson} from "@/lib/study/scope";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {StudyScopeNotice} from "./StudyScope";
import "./FoodLearning.css";

const foodDrawings=[
 "M16 43a34 27 0 0 1 68 0ZM17 50h66M16 56l14 7 13-7 14 7 14-7 13 7M17 70h66v7H17ZM31 28h3m16-5h3m16 5h3",
 "M13 48h74q-3 36-37 36T13 48ZM22 44q-15-25 8-25l20 22M48 42q-7-34 14-29l-3 27M65 43q5-29 21-15l-6 17M23 39l17 6m26-13-7 13",
 "M18 45 67 19l17 21-17 43H18ZM18 60h58M67 19v64M24 37q11-17 22-4M30 26q6-9 12-2",
 "M20 39h51v27q0 16-25 16T20 66ZM71 43h10q19 16-10 21M14 89h64M33 13q-9 10 0 18m19-18q-9 10 0 18",
 "M12 47h76q-3 36-38 36T12 47ZM17 42q33-16 66 0M29 14q-8 10 0 19m20-21q-8 10 0 19m20-17q-8 10 0 19",
 "M50 33q-35-20-36 18-1 34 36 35 37-1 36-35-1-38-36-18ZM50 32l-9-18 14 9 14-8-10 16M50 25V11",
 "M18 16h64v70H18ZM18 39h64M18 62h64M40 16v70M61 16v70",
 "M16 49q-4-27 34-29 38 2 34 29v14q-7 22-34 22-27 0-34-22ZM38 32 27 55m31-25L45 55m28-16L63 58",
 "M50 13C33 13 17 50 20 67c4 24 56 24 60 0C83 50 67 13 50 13ZM37 64a13 13 0 1 0 26 0 13 13 0 1 0-26 0",
 "M38 25q29-20 42 5 16 29-17 42-21 5-37-16ZM32 51 17 71q-16-6-9 8 3 8 11 6 8 10 12 1 2-6-3-9l18-13M55 32q22-5 17 16",
 "M15 49 61 16l24 28v39H15ZM15 49h70M36 63a5 5 0 1 0 .1 0M66 59a5 5 0 1 0 .1 0M52 75a3 3 0 1 0 .1 0M46 34l14 5",
 "M20 38 13 14l9-3 12 31M36 42 32 9h10l5 33M50 42l5-29 10 2-5 31M67 41l9-24 10 4-9 26M14 40h73L77 87H25ZM42 63h19",
];
export function FoodIllustration({index}:{index:number}){return <svg className="food-illustration" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#f4e4bd" stroke="none" opacity=".45"/><path d={foodDrawings[index]}/></svg>;}

export function FoodMenu({food,onChoose,cards,speech}:{food:number;onChoose:(index:number)=>void;cards:WordCard[];speech:Record<string,string>}){
 const [group,setGroup]=useState(0);const selected=foodModels[food]!,card=cards.find(card=>card.rows.some(row=>row.singular.text===selected.de)),row=card?.rows.find(row=>row.singular.text===selected.de),cue=foodPortionCue(food);
 return <><div className="food-menu-groups" role="group" aria-label="Menu category">{foodMenuGroups.map((item,index)=><button type="button" key={item.label} aria-pressed={group===index} onClick={()=>setGroup(index)}>{item.label}</button>)}</div><div className="food-board">{foodMenuGroups[group]!.items.map(index=>{const item=foodModels[index]!;return <button type="button" key={item.de} data-gender={item.tone} aria-pressed={food===index} onClick={()=>{onChoose(index);if(window.matchMedia("(max-width:600px)").matches)requestAnimationFrame(()=>document.getElementById("selected-food")?.scrollIntoView({block:"start"}));}}><FoodIllustration index={index}/><strong lang="de">{item.de}</strong><small>{item.en}</small></button>;})}</div><div id="selected-food" className="food-selected" data-gender={selected.tone} aria-live="polite"><FoodIllustration index={food}/><div><small>SELECTED FOOD · {selected.tone==="plural"?"PLURAL":selected.tone==="male"?"MASCULINE":selected.tone==="female"?"FEMININE":"NEUTER"}</small><h3><GermanText text={selected.de}/><LineAudio compact text={selected.de} src={row?.singular.audio??speech[selected.de]}/></h3><p>{row?.meaning??selected.en}</p>{row?.plurals.length?<div className="food-plural"><small>PLURAL</small>{row.plurals.map(plural=><p key={plural.text}><GermanText text={plural.text}/><LineAudio compact text={plural.text} src={plural.audio??speech[plural.text]}/></p>)}</div>:<p>{selected.tone==="plural"?"Used in the plural here.":"No plural taught for this food in the course; practise the serving below."}</p>}<p><b>Your order: </b><GermanText text={foodSentence(food,"wish",false)}/><LineAudio compact text={foodSentence(food,"wish",false)} src={speech[foodSentence(food,"wish",false)]}/></p><SaveButton item={{id:foodSaveId(food,"wish",false),title:foodSentence(food,"wish",false),meaning:foodMeaning(food,"wish",false),kind:"phrase",lesson:9,href:`/cheat-sheets/food${foodBookmark({food,mode:"wish",negative:false,speakerLikes:true,youLike:true,compound:0})}`,audio:speech[foodSentence(food,"wish",false)]??null}}/>{card&&<p><Link href={appendNavigationContext(card.path,sheetNavigationContext("/cheat-sheets/food",{query:selected.de,category:"all",saved:false,page:1},card.id))}>Open full word card →</Link></p>}</div></div><aside className="food-portion-cue"><b lang="de">{cue.head} → {selected.order}</b>{cue.cue}</aside></>;
}

export function FoodOrdering({state,speech,onNext}:{state:FoodSettings;speech:Record<string,string>;onNext:()=>void}){
 const [role,setRole]=useState("customer"),[revealed,setRevealed]=useState<number[]>([]),[answer,setAnswer]=useState<string|null>(null);
 const sentence=foodSentence(state.food,"wish",false),cue=foodPortionCue(state.food);
 const turns=[{role:"waiter",de:"Sie wünschen?",en:"What would you like?",id:"l9-phrase-12"},{role:"customer",de:sentence,en:foodMeaning(state.food,"wish",false),id:foodSaveId(state.food,"wish",false)},{role:"waiter",de:"Hier bitte.",en:"There you are.",id:"l9-phrase-11"},{role:"waiter",de:"Guten Appetit!",en:"Enjoy your meal!",id:"l9-phrase-10"}];
 return <section id="food-order"><h2>Your turn at the café.</h2><StudyScopeNotice tags={tagsForLesson(9)} subject="This ordering practice"/><p>Use your selected food. Say your hidden turn aloud, then reveal and listen. This is a self-check, not a pronunciation score.</p><label>Your role<select value={role} onChange={event=>{setRole(event.target.value);setRevealed([]);}}><option value="customer">Customer</option><option value="waiter">Waiter</option></select></label><div className="food-order-turns">{turns.map((turn,index)=><article key={index} data-role={turn.role}><small>{index+1} · {turn.role.toUpperCase()}{turn.role===role?" · YOUR TURN":""}</small>{turn.role!==role||revealed.includes(index)?<><p><GermanText text={turn.de}/><LineAudio compact text={turn.de} src={speech[turn.de]}/></p><p>{turn.en}</p><SaveButton item={{id:turn.id,title:turn.de,meaning:turn.en,kind:"phrase",lesson:9,href:`/cheat-sheets/food${foodBookmark({...state,mode:"wish",negative:false},"order")}`,audio:speech[turn.de]??null}}/></>:<><p>{turn.en}</p><button type="button" className="study-secondary" onClick={()=>setRevealed([...revealed,index])}>Reveal my turn</button></>}</article>)}</div><div className="sheet-practice"><h3>Which article completes your order?</h3><p>Choose the sentence for <b lang="de">{foodModels[state.food]!.de}</b>.</p><div className="sheet-quiz-options">{foodOrderChoices(state.food).map(option=><button type="button" key={option} lang="de" disabled={answer!==null} data-answer={answer===null?undefined:option===sentence?"correct":option===answer?"wrong":undefined} onClick={()=>setAnswer(option)}>{option}</button>)}</div>{answer!==null&&<div className="sheet-feedback" role="status"><strong>{answer===sentence?"Exactly.":"Look at the noun that names the serving."}</strong><p lang="de">{sentence}</p><p>{cue.cue}</p><button type="button" className="study-primary" onClick={onNext}>Try another food →</button></div>}</div></section>;
}
