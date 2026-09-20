"use client";
import {useEffect,useState} from "react";
import {learningVerbs,modelTags,verbAnatomy} from "@/lib/study/verb-learning";
import {grammarPatterns,verbPersons,spokenVerb} from "@/lib/study/sheet-topics";
import type {WordCard} from "@/lib/content/word-card-types";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {OverviewPanel} from "./OverviewPanel";
import "./VerbWorkshop.css";

export function VerbWorkshop({cards,speech}:{cards:WordCard[];speech:Record<string,string>}){
  const {matches}=useStudyScope();
  const models=learningVerbs.filter(model=>matches(modelTags(model,cards)));
  const [selected,setSelected]=useState("wohnen"),[person,setPerson]=useState(0);
  const [pattern,setPattern]=useState(0);
  const [allVerbs,setAllVerbs]=useState(false),[fromBookmark,setFromBookmark]=useState(false);
  useEffect(()=>{
    const restore=()=>{
      const patternId=window.location.hash.replace(/^#pattern-/,"");
      const patternIndex=grammarPatterns.findIndex(item=>item.id===patternId);
      if(patternIndex>=0){
        if(patternIndex<3)setPattern(patternIndex);
        requestAnimationFrame(()=>{const target=document.getElementById(`pattern-${patternId}`);const details=target?.closest("details");if(details)details.open=true;(target??document.getElementById("sentence-position"))?.scrollIntoView({block:"start"});});
        return;
      }
      const match=window.location.hash.match(/^#verb-(.+)-([0-5])$/);
      if(!match)return;
      try{const name=decodeURIComponent(match[1]!);if(!learningVerbs.some(model=>model.verb===name))return;setSelected(name);setFromBookmark(true);setPerson(Number(match[2]));requestAnimationFrame(()=>document.getElementById("verb-explorer")?.scrollIntoView({block:"start"}));}catch{/* Ignore a malformed bookmark. */}
    };
    restore();window.addEventListener("hashchange",restore);return()=>window.removeEventListener("hashchange",restore);
  },[]);
  const model=models.find(model=>model.verb===selected)??(fromBookmark?learningVerbs.find(model=>model.verb===selected):models[0]);
  const atlas=allVerbs?models:[...(model&&models.includes(model)?[model]:[]),...models.filter(item=>item!==model)].slice(0,12);
  const anatomy=model?verbAnatomy(model,person):null;
  const example=grammarPatterns[pattern]!;
  return <>
    <section className="sheet-workshop" id="verb-explorer"><p className="study-eyebrow">Person → stem → ending</p><h2>See what changes. Hear the whole form.</h2>
      {model&&anatomy?<><StudyScopeNotice tags={modelTags(model,cards)} subject="This saved verb"/><div className="sheet-controls"><label>Choose a verb<select value={model.verb} onChange={event=>{setSelected(event.target.value);setFromBookmark(false);}}>{!models.includes(model)&&<option value={model.verb}>{model.verb} · outside selection</option>}{models.map(item=><option key={item.verb} value={item.verb}>{item.verb} · {item.meaning}</option>)}</select></label><label>Choose a person<select value={person} onChange={event=>setPerson(Number(event.target.value))}>{verbPersons.map((label,index)=><option key={label} value={index}>{label}</option>)}</select></label></div>
      <div className="verb-anatomy" aria-label="Published verb form, broken into parts"><div><small>Person</small><strong lang="de">{verbPersons[person]}</strong></div><span aria-hidden="true">+</span><div className="verb-stem"><small>{anatomy.whole?"Whole exception":anatomy.changed?"Changed stem":"Stem"}</small><strong lang="de">{anatomy.stem}</strong></div>{!anatomy.whole&&<><span aria-hidden="true">+</span><div className="verb-ending"><small>Ending</small><strong lang="de">{anatomy.ending||"∅"}</strong>{!anatomy.ending&&<span>No added ending</span>}</div></>}{anatomy.rest&&<div className="verb-tail"><small>{anatomy.restLabel}</small><strong lang="de">{anatomy.rest}</strong></div>}</div>
      <p className="verb-anatomy-note">{anatomy.note} These colors mark parts of the verb, not noun gender.</p>
      <div className="verb-stage" aria-live="polite"><small>{model.meaning}</small><p><GermanText text={spokenVerb(person,anatomy.form)}/><LineAudio text={spokenVerb(person,anatomy.form)} src={speech[spokenVerb(person,anatomy.form)]} compact/></p><p>{model.tip}</p><SaveButton item={{id:`conjugation-${model.verb}-${person}`,title:spokenVerb(person,anatomy.form),meaning:`${model.meaning} · ${verbPersons[person]}. ${model.tip}`,kind:"concept",href:`/cheat-sheets/verbs#verb-${encodeURIComponent(model.verb)}-${person}`,studyTags:modelTags(model,cards),audio:speech[spokenVerb(person,anatomy.form)]??null}}/></div>
      <div className="verb-person-grid">{verbPersons.map((label,index)=><button type="button" key={label} aria-pressed={person===index} onClick={()=>setPerson(index)}><small>{label}</small><strong lang="de">{model.forms[index]}</strong></button>)}</div></>:<p role="status">No verb models match your study selection. Change the lesson, concept or material source to explore a verb.</p>}
    </section>
    <OverviewPanel title={`${models.length} verbs, one selected person`}><p>Showing <b lang="de">{verbPersons[person]}</b>. Choose a verb to compare its pattern above.</p><div className="verb-atlas">{atlas.map(item=><button type="button" key={item.verb} aria-pressed={model?.verb===item.verb} onClick={()=>{setSelected(item.verb);setFromBookmark(false);}}><small lang="de">{item.verb}</small><strong lang="de">{item.forms[person]}</strong><span>{item.meaning}</span></button>)}</div>{models.length>12&&<button type="button" className="study-secondary" aria-expanded={allVerbs} onClick={()=>setAllVerbs(!allVerbs)}>{allVerbs?"Show a compact overview":`Show all ${models.length} verbs`}</button>}<p>{atlas.length} of {models.length} matching verbs shown. The verb selector above always includes the complete matching set.</p></OverviewPanel>
    <section className="sheet-workshop" id="sentence-position"><p className="study-eyebrow">The same idea, three sentence shapes · reference</p><h2>Keep your eye on the conjugated verb.</h2><div className="study-chips" role="group" aria-label="Sentence shape">{grammarPatterns.slice(0,3).map((item,index)=><button type="button" key={item.id} aria-pressed={pattern===index} onClick={()=>setPattern(index)}>{["Statement","W-question","Yes/no question"][index]}</button>)}</div><div className="verb-sentence-rail">{example.parts.map((part,index)=><div key={index} className={(pattern===2?index===0:index===1)?"is-verb":""}><small>{index===2?"Remaining information":`Position ${index+1}`}</small><span lang="de">{part}</span></div>)}</div><p><GermanText text={example.de}/><LineAudio text={example.de} src={speech[example.de]} compact/></p><p>{example.en}</p><p>{example.cue} Violet marks the conjugated verb.</p><SaveButton item={{id:`sheet-pattern-${example.id}`,title:example.de,meaning:example.cue,kind:"concept",href:`/cheat-sheets/verbs#pattern-${example.id}`,audio:speech[example.de]??null}}/>
    </section>
    <details className="sheet-sources"><summary>More sentence patterns · negatives, possession, work and origin</summary><div className="sentence-patterns">{grammarPatterns.slice(3).map(item=><article key={item.id} id={`pattern-${item.id}`}><h3>{item.title}</h3><p><GermanText text={item.de}/><LineAudio text={item.de} src={speech[item.de]} compact/></p><p>{item.en}</p><p>{item.cue}</p><SaveButton compact item={{id:`sheet-pattern-${item.id}`,title:item.de,meaning:item.cue,kind:"concept",href:`/cheat-sheets/verbs#pattern-${item.id}`,audio:speech[item.de]??null}}/></article>)}</div></details>
  </>;
}
